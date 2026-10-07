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
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (!data) {
    await supabase.from('profiles').insert({
      id: user.id,
      weekly_availability_mask: [60, 60, 60, 60, 60, 120, 120],
    });
  }
}

export async function saveDailyMetrics(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('daily_metrics').upsert(
    {
      user_id: user.id,
      recorded_date: String(formData.get('recorded_date')),
      hrv_ms: formData.get('hrv_ms') ? Number(formData.get('hrv_ms')) : null,
      sleep_minutes: formData.get('sleep_minutes') ? Number(formData.get('sleep_minutes')) : null,
      resting_heart_rate: formData.get('resting_heart_rate')
        ? Number(formData.get('resting_heart_rate'))
        : null,
    },
    { onConflict: 'user_id,recorded_date' }
  );
  if (error) throw new Error(error.message);
  revalidatePath('/profile');
  revalidatePath('/dashboard');
}

// ----------------------------------------------------------------- Séances

// ---------------------------------------- bibliothèque de séances (test)

// ------------------------------------------------------------------ Profil
export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: String(formData.get('full_name') ?? '').trim() || null,
      sessions_per_week: formData.get('sessions_per_week')
        ? Number(formData.get('sessions_per_week'))
        : null,
    })
    .eq('id', user.id);
  if (error) throw new Error(error.message);

  // Le nombre de séances/semaine ne vaut que si le plan est régénéré :
  // on le fait automatiquement (best effort, silencieux sans objectif actif).
  let flag = 'profile_saved';
  if (formData.get('sessions_per_week')) {
    try {
      await engineFetch('/plan/generate', { user_id: user.id, persist: true });
      flag = 'profile_saved_plan';
    } catch {
      flag = 'profile_saved_noplan';
    }
  }
  revalidatePath('/profile');
  revalidatePath('/dashboard');
  redirect(`/profile?status=${flag}`);
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
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('profiles')
    .update({
      hr_max: formData.get('hr_max') ? Number(formData.get('hr_max')) : null,
      hr_rest: formData.get('hr_rest') ? Number(formData.get('hr_rest')) : null,
      sex: formData.get('sex') ? String(formData.get('sex')) : null,
    })
    .eq('id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/profile');
  redirect('/profile?status=profile_saved');
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}
