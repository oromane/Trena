/**
 * Séries de tendances (90 j) pour le graphique du profil, via le moteur.
 * Remplace la lecture directe des tables depuis le navigateur (P0-2).
 */
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

const ENGINE_URL = process.env.PERFORMANCE_ENGINE_URL ?? 'http://performance-engine:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? '';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const res = await fetch(
    `${ENGINE_URL}/profile/trends?user_id=${encodeURIComponent(user.id)}&days=90`,
    { headers: { 'X-Internal-Key': INTERNAL_KEY }, cache: 'no-store' }
  );
  if (!res.ok) return NextResponse.json({ metrics: [], wellness: [] }, { status: 502 });
  return NextResponse.json(await res.json());
}
