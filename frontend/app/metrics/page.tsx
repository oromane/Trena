import { RefreshCw, Watch } from 'lucide-react';
import Nav from '@/components/Nav';
import GarminLink from '@/components/GarminLink';
import { saveDailyMetrics, syncGarmin, unlinkGarmin } from '@/app/actions';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getGarminStatus } from '@/lib/engine';

const GARMIN_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  linked: { text: 'Compte Garmin lié — lance une première synchronisation.', ok: true },
  unlinked: { text: 'Compte Garmin délié.', ok: true },
  link_error: {
    text: 'Login Garmin refusé — vérifie email / mot de passe (et le code MFA si activé).',
    ok: false,
  },
  sync_error: { text: 'Échec de synchronisation — réessaie dans une minute.', ok: false },
};

function garminMessage(flag?: string) {
  if (!flag) return undefined;
  if (flag.startsWith('synced_')) {
    const n = flag.slice('synced_'.length);
    return { text: `Synchronisation terminée : ${n} jour(s) de données importés.`, ok: true };
  }
  return GARMIN_MESSAGES[flag];
}

const INPUT_CLS =
  'rounded-lg border border-white/10 bg-ats-bg2 px-3 py-2 text-sm outline-none placeholder:text-ats-gray focus:border-ats-green/50';

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ garmin?: string }>;
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: metrics }, garmin] = await Promise.all([
    supabase
      .from('daily_metrics')
      .select('*')
      .eq('user_id', user!.id)
      .order('recorded_date', { ascending: false })
      .limit(14),
    getGarminStatus(user!.id),
  ]);

  const { garmin: garminFlag } = await searchParams;
  const msg = garminMessage(garminFlag);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold">Métriques physiologiques</h1>
        <p className="mt-2 text-sm text-ats-muted">
          Alimente le moteur de décision : HRV, sommeil, FC repos — automatiquement
          via Garmin, ou à la main.
        </p>

        {msg && (
          <p
            className={`mt-5 rounded-xl border px-4 py-2.5 text-sm ${
              msg.ok
                ? 'border-ats-green/20 bg-ats-green/5 text-ats-green'
                : 'border-ats-red/20 bg-ats-red/5 text-ats-red'
            }`}
          >
            {msg.text}
          </p>
        )}

        {/* -------------------------------------------------- Garmin */}
        <section className="card mt-6 p-6">
          <div className="flex items-center gap-2 text-ats-muted">
            <Watch className="h-4 w-4" />
            <span className="text-[11px] font-medium uppercase tracking-[0.2em]">
              Garmin Connect
            </span>
          </div>

          {garmin.linked ? (
            <div className="mt-4">
              <p className="text-sm">
                <span className="font-medium text-ats-green">✓ Compte lié</span>
                <span className="text-ats-muted">
                  {' '}
                  — la sync tourne automatiquement chaque matin avant l&apos;ajustement
                  de séance.
                </span>
              </p>
              <div className="mt-4 flex items-center gap-4">
                <form action={syncGarmin}>
                  <button className="inline-flex items-center gap-2 rounded-xl bg-ats-green px-4 py-2 text-sm font-semibold text-ats-bg transition-transform hover:scale-[1.02]">
                    <RefreshCw className="h-4 w-4" />
                    Synchroniser 14 jours
                  </button>
                </form>
                <form action={unlinkGarmin}>
                  <button className="text-xs text-ats-gray hover:text-ats-muted">
                    Délier le compte
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <GarminLink />
          )}
        </section>

        {/* -------------------------------------------------- saisie manuelle */}
        <section className="card mt-4 p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ats-muted">
            Saisie manuelle
          </p>
          <form action={saveDailyMetrics} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="recorded_date" type="date" defaultValue={today} required className={INPUT_CLS} />
            <input name="hrv_ms" type="number" step="0.1" min="0" placeholder="HRV (ms)" className={INPUT_CLS} />
            <input name="sleep_minutes" type="number" min="0" placeholder="Sommeil (minutes)" className={INPUT_CLS} />
            <input name="resting_heart_rate" type="number" min="0" placeholder="FC repos (bpm)" className={INPUT_CLS} />
            <button className="rounded-xl bg-ats-card2 py-2 text-sm font-semibold text-ats-text transition-colors hover:bg-ats-gray/40 sm:col-span-2">
              Enregistrer
            </button>
          </form>
        </section>

        {/* -------------------------------------------------- historique */}
        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-ats-muted">
              <th className="py-2 font-medium">Date</th>
              <th className="font-medium">HRV (ms)</th>
              <th className="font-medium">Sommeil</th>
              <th className="font-medium">FC repos</th>
            </tr>
          </thead>
          <tbody className="metric">
            {(metrics ?? []).map((m) => (
              <tr key={m.id} className="border-b border-white/5">
                <td className="py-2">{m.recorded_date}</td>
                <td>{m.hrv_ms ?? '—'}</td>
                <td>
                  {m.sleep_minutes
                    ? `${Math.floor(m.sleep_minutes / 60)}h${String(m.sleep_minutes % 60).padStart(2, '0')}`
                    : '—'}
                </td>
                <td>{m.resting_heart_rate ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
