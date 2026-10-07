/**
 * Export complet des données de l'utilisateur connecté (JSON téléchargeable).
 * Servi par le moteur (P0-2) : profil, objectifs, métriques, bien-être et
 * séances. Les jetons Garmin/Google chiffrés ne sont jamais exportés.
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
    `${ENGINE_URL}/profile/export?user_id=${encodeURIComponent(user.id)}`,
    { headers: { 'X-Internal-Key': INTERNAL_KEY }, cache: 'no-store' }
  );
  if (!res.ok) {
    return NextResponse.json({ error: 'Export momentanément indisponible.' }, { status: 502 });
  }
  const data = await res.json();
  const payload = { ...data, user: { id: user.id, email: user.email } };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="trena-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
