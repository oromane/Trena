/**
 * Callback OAuth Google : vérifie le `state` HMAC (stateless), délègue
 * l'échange code → tokens au moteur (chiffrement + persistance), redirige.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

const ENGINE_URL = process.env.PERFORMANCE_ENGINE_URL ?? 'http://performance-engine:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? '';
const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000';
const STATE_MAX_AGE_MS = 30 * 60 * 1000; // 30 min

function dash(flag: string) {
  return NextResponse.redirect(`${SITE_URL}/dashboard?calendar=${flag}`);
}

function verifyState(state: string, userId: string): boolean {
  const dot = state.indexOf('.');
  if (dot <= 0) return false;
  const ts = Number(state.slice(0, dot));
  if (!Number.isFinite(ts) || Date.now() - ts > STATE_MAX_AGE_MS) return false;
  const given = Buffer.from(state.slice(dot + 1), 'hex');
  const expected = createHmac('sha256', INTERNAL_KEY)
    .update(`${userId}.${ts}`)
    .digest();
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (params.get('error')) return dash('denied');

  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) return dash('state_error');

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${SITE_URL}/login`);

  if (!verifyState(state, user.id)) return dash('state_error');

  const res = await fetch(`${ENGINE_URL}/calendar/oauth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Key': INTERNAL_KEY },
    body: JSON.stringify({
      user_id: user.id,
      code,
      redirect_uri: `${SITE_URL}/api/google/callback`,
    }),
    cache: 'no-store',
  });
  return dash(res.ok ? 'linked' : 'exchange_error');
}
