import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

const ENGINE_URL = process.env.PERFORMANCE_ENGINE_URL ?? 'http://performance-engine:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? '';

/** POST /api/garmin/link/mfa — Étape 2 : code MFA */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const body = await request.json();
  const { session_id, mfa_code } = body as { session_id: string; mfa_code: string };

  if (!session_id || !mfa_code) {
    return NextResponse.json({ error: 'session_id et mfa_code requis' }, { status: 400 });
  }

  const res = await fetch(`${ENGINE_URL}/garmin/link/mfa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Key': INTERNAL_KEY,
    },
    body: JSON.stringify({ user_id: user.id, session_id, mfa_code }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: detail }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
