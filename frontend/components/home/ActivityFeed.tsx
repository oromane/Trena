/**
 * Flux d'activités récentes, toutes disciplines confondues — la partie
 * « Strava » du hub : ce que tu as fait, dans l'ordre, en un coup d'œil.
 */
import Link from 'next/link';
import { ChevronDown, Gauge, Heart, Route, Timer, Weight } from 'lucide-react';
import type { DashboardOverview, FeedEntry } from '@/lib/engine';
import { MascotAvatar } from '@/components/brand/Mascot';
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
  return (
    <div>
      {href ? (
        <Link href={href} className={`${base} transition-colors hover:bg-ats-card2/50`}>
          {inner}
        </Link>
      ) : (
        <div className={base}>{inner}</div>
      )}
      <Analysis entry={entry} />
    </div>
  );
}

const TAG_TONE: Record<string, string> = {
  record: 'text-ats-violet-fg',
  efficiency: 'text-ats-green-fg',
  hard: 'text-ats-orange-fg',
  easy: 'text-ats-blue-fg',
};

/**
 * Analyse de la séance, hors du lien de la ligne (un élément interactif ne
 * doit pas être imbriqué dans un autre). <details> natif : aucun JS client.
 */
function Analysis({ entry }: { entry: FeedEntry }) {
  const a = entry.analysis;
  if (!a) return null;
  const hasMore = a.facts.length > 0 || !!entry.comment;
  const tone = TAG_TONE[a.tags[0]] ?? 'text-ats-muted';
  const title = (
    <span className="flex items-center gap-2">
      <MascotAvatar size={18} />
      <span className={`min-w-0 text-[11px] font-semibold ${tone}`}>{a.headline}</span>
      {hasMore && (
        <ChevronDown
          aria-label="Voir l'analyse"
          className="h-3.5 w-3.5 shrink-0 text-ats-gray transition-transform group-open:rotate-180"
        />
      )}
    </span>
  );
  // Aligné sous le titre de la séance : 20 px de marge + 40 px d'icône + 16 px d'écart.
  const pad = 'pb-4 pl-[4.75rem] pr-5 -mt-2';
  if (!hasMore) return <div className={pad}>{title}</div>;
  return (
    <details className={`group ${pad}`}>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      <div className="mt-2 space-y-2 rounded-xl bg-ats-card2/60 p-3 text-xs leading-relaxed text-ats-muted">
        {entry.comment && <p className="text-ats-text/90">{entry.comment}</p>}
        {a.facts.length > 0 && (
          <ul className="space-y-1">
            {a.facts.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-ats-green-fg">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
        {!entry.comment && (
          <p className="text-[10px] text-ats-gray">
            Le commentaire de Perlo arrive quelques minutes après la synchro.
          </p>
        )}
      </div>
    </details>
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
