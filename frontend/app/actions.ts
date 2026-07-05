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

export async function createObjective(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('objectives').insert({
    user_id: user.id,
    title: String(formData.get('title')),
    target_date: String(formData.get('target_date')),
    sport_type: String(formData.get('sport_type')),
    target_time_seconds: formData.get('target_time_minutes')
      ? Number(formData.get('target_time_minutes')) * 60
      : null,
    is_active: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/objectives');
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
  revalidatePath('/metrics');
  revalidatePath('/dashboard');
}

export async function updateAvailability(formData: FormData) {
  const { supabase, user } = await requireUser();
  const mask = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) =>
    Number(formData.get(d) ?? 0)
  );
  const { error } = await supabase
    .from('profiles')
    .update({ weekly_availability_mask: mask })
    .eq('id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/settings');
}

export async function generatePlan() {
  const { user } = await requireUser();
  await engineFetch('/plan/generate', { user_id: user.id, persist: true });
  revalidatePath('/dashboard');
}

export async function runDailyAdjust() {
  const { user } = await requireUser();
  await engineFetch('/daily-adjust/run', { user_id: user.id });
  revalidatePath('/dashboard');
}

/** Publie les séances planifiées non encore synchronisées dans Google Calendar. */
export async function publishPlanToCalendar() {
  const { user } = await requireUser();
  let flag = 'publish_error';
  try {
    const result = await engineFetch('/calendar/publish', { user_id: user.id });
    flag = `published_${result.events_created ?? 0}`;
  } catch (e) {
    console.error('publish failed:', e);
  }
  revalidatePath('/dashboard');
  redirect(`/dashboard?calendar=${flag}`);
}

/** Supprime la liaison Google Calendar (tokens effacés en base). */
export async function unlinkGoogleCalendar() {
  const { user } = await requireUser();
  const res = await fetch(`${ENGINE_URL}/calendar/tokens/${user.id}`, {
    method: 'DELETE',
    headers: { 'X-Internal-Key': INTERNAL_KEY },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Engine ${res.status}: ${await res.text()}`);
  revalidatePath('/dashboard');
}

/** Supprime TOUS les événements Trena du Google Calendar (doublons inclus). */
export async function purgeCalendar() {
  const { user } = await requireUser();
  let flag = 'purge_error';
  try {
    const r = await engineFetch('/calendar/purge', { user_id: user.id });
    flag = `purged_${r.events_deleted ?? 0}`;
  } catch (e) {
    console.error('purge failed:', e);
  }
  revalidatePath('/dashboard');
  redirect(`/dashboard?calendar=${flag}`);
}

// ----------------------------------------------------------------- Séances
export async function rescheduleSession(formData: FormData) {
  const { user } = await requireUser();
  await engineFetch('/sessions/reschedule', {
    user_id: user.id,
    session_id: String(formData.get('session_id')),
    new_date: String(formData.get('new_date')),
    new_time: formData.get('new_time') ? String(formData.get('new_time')) : null,
  });
  revalidatePath('/dashboard');
}

export async function createSession(formData: FormData) {
  const { user } = await requireUser();
  await engineFetch('/sessions/create', {
    user_id: user.id,
    scheduled_date: String(formData.get('scheduled_date')),
    scheduled_time: formData.get('scheduled_time')
      ? String(formData.get('scheduled_time'))
      : null,
    session_type: String(formData.get('session_type')),
    duration_minutes: Number(formData.get('duration_minutes')),
  });
  revalidatePath('/dashboard');
}

export async function deleteSession(formData: FormData) {
  const { user } = await requireUser();
  await engineFetch('/sessions/delete', {
    user_id: user.id,
    session_id: String(formData.get('session_id')),
  });
  revalidatePath('/dashboard');
}

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
  revalidatePath('/profile');
  revalidatePath('/dashboard');
  redirect('/profile?status=profile_saved');
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
  revalidatePath('/metrics');
  redirect('/metrics?garmin=unlinked');
}

/** Synchronise les 14 derniers jours depuis Garmin Connect. */
export async function syncGarmin() {
  const { user } = await requireUser();
  let flag = 'sync_error';
  try {
    const r = await engineFetch('/garmin/sync', { user_id: user.id, days: 14 });
    flag = `synced_${r.days_with_data ?? 0}`;
  } catch (e) {
    console.error('garmin sync failed:', e);
  }
  revalidatePath('/metrics');
  revalidatePath('/dashboard');
  redirect(`/metrics?garmin=${flag}`);
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}
