/**
 * Mode course (J-7 → J-0) : compte à rebours, allure objectif,
 * checklist d'affûtage et rappels nutrition / sommeil / hydratation.
 * Affiché uniquement dans la dernière semaine avant l'objectif.
 */
import { CalendarClock, CheckCircle2, Circle, Flag } from 'lucide-react';
import type { RaceWeek } from '@/lib/engine';

export default function RaceWeekCard({ race }: { race: RaceWeek }) {
  const dr = race.days_remaining;
  const countdown = dr === 0 ? "C'est aujourd'hui" : dr === 1 ? 'Demain, jour J' : `J-${dr}`;

  return (
    <div className="card relative overflow-hidden p-6">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-ats-green to-transparent" />
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-ats-muted">
          <Flag className="h-3.5 w-3.5" /> Mode course
        </span>
        <span className="rounded-full bg-ats-green/10 px-3 py-1 text-xs font-semibold text-ats-green">
          {countdown}
        </span>
      </div>

      <h3 className="mt-3 text-xl font-bold text-ats-text">{race.title}</h3>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ats-muted">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4" />
          {new Date(race.target_date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </span>
        {race.race_pace && (
          <span>
            Allure objectif :{' '}
            <span className="metric font-semibold text-ats-green">{race.race_pace.pace}</span>
          </span>
        )}
      </div>

      <ol className="mt-4 space-y-1.5">
        {race.checklist.map((item) => (
          <li key={item.days_before} className="flex items-start gap-2.5 text-[13px]">
            {item.done_window ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ats-green" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ats-muted" />
            )}
            <span className={item.done_window ? 'text-ats-muted line-through' : 'text-ats-text/90'}>
              <span className="metric mr-1.5 text-[11px] font-semibold text-ats-muted">
                J-{item.days_before}
              </span>
              {item.label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-2 border-t border-white/5 pt-3 text-[12px] text-ats-muted sm:grid-cols-3">
        <p>
          <span className="font-semibold text-ats-text/80">Nutrition — </span>
          {race.reminders.nutrition}
        </p>
        <p>
          <span className="font-semibold text-ats-text/80">Sommeil — </span>
          {race.reminders.sommeil}
        </p>
        <p>
          <span className="font-semibold text-ats-text/80">Hydratation — </span>
          {race.reminders.hydratation}
        </p>
      </div>
    </div>
  );
}
