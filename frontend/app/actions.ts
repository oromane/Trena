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
