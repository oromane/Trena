/**
 * Proxy authentifié vers le conseiller IA du moteur.
 *
 * L'identité vient exclusivement de la session Supabase côté serveur : le
 * client n'envoie que la question, jamais de user_id. La réponse NDJSON du
 * moteur est relayée telle quelle (streaming).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

const ENGINE_URL = process.env.PERFORMANCE_ENGINE_URL ?? 'http://performance-engine:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? '';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  let question = '';
  try {
    const body = await request.json();
    question = typeof body?.question === 'string' ? body.question.trim() : '';
  } catch {
    // corps invalide : traité ci-dessous
  }
  if (question.length < 2 || question.length > 500) {
    return NextResponse.json({ error: 'Question de 2 à 500 caractères.' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${ENGINE_URL}/advisor/ask/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': INTERNAL_KEY },
      body: JSON.stringify({ user_id: user.id, question }),
      cache: 'no-store',
      // Relaie l'annulation côté navigateur jusqu'au moteur (libère le LLM).
      signal: request.signal,
    });
  } catch {
    return NextResponse.json({ error: 'Moteur injoignable.' }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 429 ? 429 : 502;
    const error =
      status === 429 ? 'Trop de questions, réessaie dans un moment.' : 'Conseiller indisponible.';
    return NextResponse.json({ error }, { status });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
