/**
 * Démarre le flux OAuth Google Calendar.
 * `state` anti-CSRF signé HMAC (stateless, aucun cookie requis) :
 *   state = "<timestamp>.<hmac(user_id + '.' + timestamp)>"
 * Vérifié dans le callback en recalculant la signature pour l'utilisateur
 * de la session — un attaquant ne peut pas forger le state d'un tiers.
 */
import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

const ENGINE_URL = process.env.PERFORMANCE_ENGINE_URL ?? 'http://performance-engine:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? '';
const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000';

function signState(userId: string, ts: number): string {
  return createHmac('sha256', INTERNAL_KEY)
    .update(`${userId}.${ts}`)
    .digest('hex');
}

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${SITE_URL}/login`);

  const ts = Date.now();
  const state = `${ts}.${signState(user.id, ts)}`;
  const redirectUri = `${SITE_URL}/api/google/callback`;

  const res = await fetch(`${ENGINE_URL}/calendar/oauth/authorize-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Key': INTERNAL_KEY },
    body: JSON.stringify({ redirect_uri: redirectUri, state }),
    cache: 'no-store',
  });
  if (!res.ok) {
    return NextResponse.redirect(`${SITE_URL}/dashboard?calendar=config_error`);
  }
  const { url } = await res.json();
  return NextResponse.redirect(url);
}
