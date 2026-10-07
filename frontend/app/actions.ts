'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';

const ENGINE_URL = process.env.PERFORMANCE_ENGINE_URL ?? 'http://performance-engine:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? '';

async function requireUser() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}

async function engineFetch(path: string, body: unknown) {
  const res = await fetch(`${ENGINE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Key': INTERNAL_KEY,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Engine ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Crée le profil s'il n'existe pas (appelé au premier accès dashboard). */
export async function ensureProfile() {
  const { user } = await requireUser();
  await engineFetch('/profile/ensure', { user_id: user.id });
}

/** Valeur numérique d'un champ, ou undefined s'il est vide (champ non envoyé). */
function num(formData: FormData, key: string): number | undefined {
  const v = formData.get(key);
  return v === null || v === '' ? undefined : Number(v);
}

/** Valeur numérique, ou null s'il est vide (le champ est effacé). */
function numOrNull(formData: FormData, key: string): number | null {
  return num(formData, key) ?? null;
}

export async function saveDailyMetrics(formData: FormData) {
  const { user } = await requireUser();
  // Seuls les champs remplis sont envoyés : un champ vide n'efface pas la
  // valeur synchronisée par Garmin.
  const metric = Object.fromEntries(
    Object.entries({
      recorded_date: String(formData.get('recorded_date')),
      hrv_ms: num(formData, 'hrv_ms'),
      sleep_minutes: num(formData, 'sleep_minutes'),
      resting_heart_rate: num(formData, 'resting_heart_rate'),
    }).filter(([, v]) => v !== undefined)
  );
  await engineFetch('/ingest/daily-metrics', { user_id: user.id, metrics: [metric] });
  revalidatePath('/profile');
  revalidatePath('/dashboard');
}

// ----------------------------------------------------------------- Séances

// ---------------------------------------- bibliothèque de séances (test)

// ------------------------------------------------------------------ Profil
export async function updateProfile(formData: FormData) {
  const { user } = await requireUser();
  const ok = await saveProfileFields(user.id, {
    full_name: String(formData.get('full_name') ?? ''),
    sessions_per_week: numOrNull(formData, 'sessions_per_week'),
  });
  revalidatePath('/profile');
  revalidatePath('/dashboard');
  redirect(`/profile?status=${ok ? 'profile_saved' : 'profile_invalid'}`);
}

/** Écrit via le moteur (liste blanche + validation). false si refusé (422). */
async function saveProfileFields(userId: string, fields: Record<string, unknown>) {
  try {
    await engineFetch('/profile/update', { user_id: userId, ...fields });
    return true;
  } catch (e) {
    console.error('profile update refused:', e);
    return false;
  }
}

export async function updateEmail(formData: FormData) {
  const { supabase } = await requireUser();
  const email = String(formData.get('email'));
  const { error } = await supabase.auth.updateUser({ email });
  redirect(`/profile?status=${error ? 'email_error' : 'email_pending'}`);
}

export async function updatePassword(formData: FormData) {
  const { supabase } = await requireUser();
  const password = String(formData.get('password'));
  if (password.length < 8) redirect('/profile?status=password_short');
  const { error } = await supabase.auth.updateUser({ password });
  redirect(`/profile?status=${error ? 'password_error' : 'password_saved'}`);
}

// ------------------------------------------------------------------ Garmin
// Note: la liaison Garmin est gérée via le composant client GarminLink
// et les API routes /api/garmin/link et /api/garmin/link/mfa.

export async function unlinkGarmin() {
  const { user } = await requireUser();
  const res = await fetch(`${ENGINE_URL}/garmin/link/${user.id}`, {
    method: 'DELETE',
    headers: { 'X-Internal-Key': INTERNAL_KEY },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Engine ${res.status}`);
  revalidatePath('/profile');
  redirect('/profile?garmin=unlinked');
}

/** Synchronise les 14 derniers jours depuis Garmin Connect (métriques + bien-être + activités). */
export async function syncGarmin() {
  const { user } = await requireUser();
  // Synchro non-bloquante : l'endpoint enfile un job de fond et répond
  // aussitôt ({status:'running'}). L'avancement est suivi côté page via le
  // dernier sync_run (running → success/partial/error), rafraîchi par polling.
  let flag = 'syncing';
  try {
    await engineFetch('/garmin/sync', { user_id: user.id, days: 14 });
  } catch (e) {
    console.error('garmin sync failed:', e);
    flag = 'sync_error';
  }
  revalidatePath('/profile');
  redirect(`/profile?garmin=${flag}`);
}

/** Importe les activités réalisées des 30 derniers jours (TRIMP réel). */
export async function importGarminActivities() {
  const { user } = await requireUser();
  let flag = 'sync_error';
  try {
    const r = await engineFetch('/garmin/import-activities', {
      user_id: user.id,
      days: 30,
    });
    flag = `imported_${r.imported ?? 0}`;
  } catch (e) {
    console.error('garmin import failed:', e);
  }
  revalidatePath('/profile');
  revalidatePath('/dashboard');
  redirect(`/profile?garmin=${flag}`);
}

/** Paramètres cardiaques du profil (TRIMP réel : FC max, FC repos, sexe). */
export async function updateHeartProfile(formData: FormData) {
  const { user } = await requireUser();
  const sex = String(formData.get('sex') ?? '');
  const ok = await saveProfileFields(user.id, {
    hr_max: numOrNull(formData, 'hr_max'),
    hr_rest: numOrNull(formData, 'hr_rest'),
    sex: sex === 'M' || sex === 'F' ? sex : null,
  });
  revalidatePath('/profile');
  redirect(`/profile?status=${ok ? 'profile_saved' : 'profile_invalid'}`);
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}
