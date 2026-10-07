/**
 * Tuiles par discipline — hub de navigation vers chaque module, avec la
 * statistique clé du mois. Les disciplines sans activité restent affichées
 * en sourdine pour rester découvrables.
 */
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { DashboardOverview, DisciplineAccent } from '@/lib/engine';
import {
  ACCENT,
  DISCIPLINE_HREF,
  disciplineIcon,
  fmtDistance,
  fmtDuration,
  fmtTonnage,
} from '@/components/home/shared';

/** Disciplines toujours proposées, même sans séance ce mois-ci. */
const BASE: {
  discipline: string;
  label: string;
  icon: string;
  accent: DisciplineAccent;
}[] = [
  { discipline: 'RUN', label: 'Course à pied', icon: 'run', accent: 'green' },
  { discipline: 'STRENGTH', label: 'Musculation', icon: 'strength', accent: 'violet' },
  { discipline: 'BIKE', label: 'Vélo', icon: 'bike', accent: 'blue' },
  { discipline: 'SWIM', label: 'Natation', icon: 'swim', accent: 'blue' },
];

export default function DisciplineTiles({ data }: { data: DashboardOverview }) {
  const stats = new Map(data.by_discipline.map((d) => [d.discipline, d]));
  const extras = data.by_discipline.filter(
    (d) => !BASE.some((b) => b.discipline === d.discipline)
  );
  const tiles = [
    ...BASE.map((b) => ({ ...b, stat: stats.get(b.discipline) })),
    ...extras.map((e) => ({
      discipline: e.discipline,
      label: e.label,
      icon: e.icon,
      accent: e.accent,
      stat: e,
    })),
  ];

  return (
    <section>
      <h2 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
        Tes disciplines
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const Icon = disciplineIcon(t.icon);
          const a = ACCENT[t.accent];
          const s = t.stat;
          const active = !!s && s.sessions > 0;

          // Statistique la plus parlante selon le sport.
          const headline = !active
            ? '—'
            : t.discipline === 'STRENGTH'
              ? fmtTonnage(s!.tonnage_kg)
              : s!.distance_m > 0
                ? fmtDistance(s!.distance_m)
                : fmtDuration(s!.minutes);

          // La course n'a pas de page dédiée : sa tuile reste informative.
          const href = DISCIPLINE_HREF[t.discipline];

          const body = (
            <>
              <div className="flex items-start justify-between">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border ${a.border} ${a.bg}`}
                >
                  <Icon className={`h-4.5 w-4.5 ${a.text}`} />
                </span>
                {href && (
                  <ArrowUpRight className="h-3.5 w-3.5 text-ats-gray transition-colors group-hover:text-ats-text" />
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-ats-text">{t.label}</p>
              <p className={`metric mt-1 text-lg font-semibold ${a.text}`}>
                {headline}
              </p>
              <p className="mt-0.5 text-[11px] text-ats-gray">
                {active
                  ? `${s!.sessions} activité${s!.sessions > 1 ? 's' : ''} ce mois-ci`
                  : 'Aucune activité ce mois-ci'}
              </p>
            </>
          );

          const cls = `card p-4 ${active ? '' : 'opacity-60'}`;
          return href ? (
            <Link
              key={t.discipline}
              href={href}
              className={`${cls} group transition-colors hover:bg-ats-card2 hover:opacity-100`}
            >
              {body}
            </Link>
          ) : (
            <div key={t.discipline} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
