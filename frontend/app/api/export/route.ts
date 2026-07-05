/**
 * Export complet des données de l'utilisateur connecté (JSON téléchargeable).
 * RLS Supabase : seules les lignes de l'utilisateur sont accessibles.
 */
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const [profile, objectives, metrics, sessions] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('objectives').select('*').eq('user_id', user.id)
      .order('target_date', { ascending: true }),
    supabase.from('daily_metrics').select('*').eq('user_id', user.id)
      .order('recorded_date', { ascending: true }),
    supabase.from('training_sessions').select('*').eq('user_id', user.id)
      .order('scheduled_date', { ascending: true }),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    app: 'Trena',
    user: { id: user.id, email: user.email },
    profile: profile.data,
    objectives: objectives.data ?? [],
    daily_metrics: metrics.data ?? [],
    training_sessions: sessions.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="trena-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
