/**
 * Totaux agrégés toutes disciplines — semaine en cours et mois en cours,
 * plus la barre de la semaine (jours actifs). Le côté « Garmin » du hub.
 */
import type { DashboardOverview } from '@/lib/engine';
import { fmtDistance, fmtDuration, fmtTonnage } from '@/components/home/shared';

const DAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function Stat({
  value,
  label,
  accent = 'text-ats-text',
}: {
  value: string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="card-2 p-4">
      <p className={`metric text-xl font-semibold leading-tight ${accent}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-ats-muted">{label}</p>
    </div>
  );
}

export default function TotalsPanel({ data }: { data: DashboardOverview }) {
  const { week, month } = data.totals;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {/* Semaine */}
      <div className="card p-5 lg:col-span-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
            Cette semaine
          </h2>
          <p className="text-[11px] text-ats-gray">
            {data.active_days_28} jours actifs sur 28
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            value={String(week.sessions)}
            label="séances réalisées"
            accent="text-ats-green-fg"
          />
          <Stat value={fmtDuration(week.minutes)} label="temps d'activité" />
          <Stat
            value={fmtDistance(week.distance_m)}
            label="distance parcourue"
            accent="text-ats-blue-fg"
          />
          <Stat
            value={fmtTonnage(week.tonnage_kg)}
            label="tonnage soulevé"
            accent="text-ats-violet-fg"
          />
        </div>

        {/* Bande des 7 jours */}
        <div className="mt-5 flex gap-1.5">
          {data.week.map((d, i) => {
            const done = d.completed > 0;
            const planned = d.planned > 0;
            return (
              <div key={d.date} className="flex-1 text-center">
                <div
                  title={`${d.completed}/${d.planned} séance(s)`}
                  className={`h-1.5 w-full rounded-full ${
                    done
                      ? 'bg-ats-green'
                      : planned && !d.is_past
                        ? 'bg-ats-card2'
                        : planned
                          ? 'bg-ats-orange/40'
                          : 'bg-ats-card2/50'
                  }`}
                />
                <span
                  className={`mt-1.5 block text-[10px] ${
                    d.is_today ? 'font-bold text-ats-text' : 'text-ats-gray'
                  }`}
                >
                  {DAY_INITIALS[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mois */}
      <div className="card p-5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
          Ce mois-ci
        </h2>
        <div className="mt-4 space-y-3">
          {[
            { label: 'Séances', value: String(month.sessions) },
            { label: 'Temps total', value: fmtDuration(month.minutes) },
            { label: 'Distance', value: fmtDistance(month.distance_m) },
            { label: 'Tonnage', value: fmtTonnage(month.tonnage_kg) },
            { label: 'Charge (TRIMP)', value: month.trimp ? String(month.trimp) : '—' },
          ].map((r) => (
            <div
              key={r.label}
              className="flex items-baseline justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0"
            >
              <span className="text-xs text-ats-muted">{r.label}</span>
              <span className="metric text-sm font-semibold text-ats-text">
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
