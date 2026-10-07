/**
 * Flux d'activités récentes, toutes disciplines confondues — la partie
 * « Strava » du hub : ce que tu as fait, dans l'ordre, en un coup d'œil.
 */
import Link from 'next/link';
import { Gauge, Heart, Route, Timer, Weight } from 'lucide-react';
import type { DashboardOverview, FeedEntry } from '@/lib/engine';
import {
  ACCENT,
  DISCIPLINE_HREF,
  disciplineIcon,
  fmtDistance,
  fmtDuration,
  fmtTonnage,
  relativeDay,
  sessionLabel,
} from '@/components/home/shared';

function Metric({
  icon: Icon,
  value,
}: {
  icon: typeof Timer;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ats-muted">
      <Icon className="h-3 w-3 text-ats-gray" />
      <span className="metric">{value}</span>
    </span>
  );
}

function Row({ entry, today }: { entry: FeedEntry; today: string }) {
  const Icon = disciplineIcon(entry.icon);
  const a = ACCENT[entry.accent];

  const metrics: { icon: typeof Timer; value: string }[] = [];
  if (entry.duration_minutes)
    metrics.push({ icon: Timer, value: fmtDuration(entry.duration_minutes) });
  if (entry.distance_m)
    metrics.push({ icon: Route, value: fmtDistance(entry.distance_m) });
  if (entry.tonnage_kg)
    metrics.push({ icon: Weight, value: fmtTonnage(entry.tonnage_kg) });
  if (entry.avg_hr)
    metrics.push({ icon: Heart, value: `${entry.avg_hr} bpm` });
  if (entry.trimp) metrics.push({ icon: Gauge, value: `${entry.trimp} TRIMP` });

  // La course n'a pas de page dédiée : la ligne reste alors non cliquable
  // plutôt que de renvoyer vers une destination arbitraire.
  const href = DISCIPLINE_HREF[entry.discipline];

  const inner = (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${a.border} ${a.bg}`}
      >
        <Icon className={`h-5 w-5 ${a.text}`} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          <p className="truncate font-semibold text-ats-text">
            {entry.title || sessionLabel(entry.session_type)}
          </p>
          <span className="text-[11px] text-ats-gray">
            {relativeDay(entry.date, today)}
          </span>
        </div>
        <p className={`mt-0.5 text-[11px] font-medium ${a.text}`}>
          {entry.discipline_label}
        </p>
        {metrics.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {metrics.map((m, i) => (
              <Metric key={i} icon={m.icon} value={m.value} />
            ))}
          </div>
        )}
      </div>
    </>
  );

  const base = 'flex items-start gap-4 px-5 py-4';
  return href ? (
    <Link href={href} className={`${base} transition-colors hover:bg-ats-card2/50`}>
      {inner}
    </Link>
  ) : (
    <div className={base}>{inner}</div>
  );
}

export default function ActivityFeed({ data }: { data: DashboardOverview }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
          Activités récentes
        </h2>
        <span className="text-[11px] text-ats-gray">
          Importées depuis Garmin
        </span>
      </div>

      {data.recent.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-ats-muted">
            Aucune activité importée pour l&apos;instant.
          </p>
          <p className="mt-1 text-[11px] text-ats-gray">
            Elles apparaîtront ici après la synchronisation de ta montre,
            toutes disciplines confondues.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-white/5 overflow-hidden">
          {data.recent.map((e) => (
            <Row key={e.id} entry={e} today={data.date} />
          ))}
        </div>
      )}
    </section>
  );
}
