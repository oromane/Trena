'use server';

/**
 * Actions « Amis » : l'identité vient toujours de la session Supabase côté
 * serveur, le navigateur n'envoie que le code ou l'identifiant de relation.
 * Le moteur vérifie que l'utilisateur est bien membre de la relation.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';

const ENGINE_URL = process.env.PERFORMANCE_ENGINE_URL ?? 'http://performance-engine:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? '';

async function userId(): Promise<string> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user.id;
}

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${ENGINE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Key': INTERNAL_KEY },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function refresh() {
  revalidatePath('/amis');
  revalidatePath('/dashboard');
}

export type AddFriendState = { ok: boolean; message: string } | null;

export async function addFriend(_prev: AddFriendState, formData: FormData): Promise<AddFriendState> {
  const code = String(formData.get('code') ?? '').trim();
  if (code.length < 4) return { ok: false, message: 'Entre le code ami complet.' };
  const { ok, data } = await post('/social/request', { user_id: await userId(), code });
  if (!ok) return { ok: false, message: data?.detail ?? 'Demande impossible pour le moment.' };
  refresh();
  return data.status === 'accepted'
    ? { ok: true, message: `Vous êtes maintenant amis avec ${data.name}.` }
    : { ok: true, message: `Demande envoyée à ${data.name}.` };
}

export async function respondFriend(formData: FormData) {
  await post('/social/respond', {
    user_id: await userId(),
    friendship_id: String(formData.get('friendship_id')),
    accept: formData.get('accept') === 'true',
  });
  refresh();
}

export async function removeFriend(formData: FormData) {
  await post('/social/remove', {
    user_id: await userId(),
    friendship_id: String(formData.get('friendship_id')),
  });
  refresh();
}

export async function saveSharePrefs(formData: FormData) {
  await post('/social/prefs', {
    user_id: await userId(),
    share_activities: formData.get('share_activities') === 'on',
    share_physio: formData.get('share_physio') === 'on',
  });
  refresh();
}

export async function regenerateFriendCode() {
  await post('/social/code', { user_id: await userId() });
  refresh();
}
