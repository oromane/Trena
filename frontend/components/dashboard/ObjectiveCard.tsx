/**
 * Objectif — course, temps cible, progression du plan, volume restant.
 */
import { Target } from 'lucide-react';
import type { DashboardSummary } from '@/lib/engine';
import { generatePlan } from '@/app/actions';

function fmtTime(seconds: number | null): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

export default function ObjectiveCard({
  objective,
  weeklyLoad,
  today,
}: {
  objective: DashboardSummary['objective'];
  weeklyLoad: DashboardSummary['weekly_load'];
  today: string;
}) {
  if (!objective) {
    return (
      <div className="card flex h-full flex-col items-start justify-center gap-3 p-6">
        <p className="text-sm text-ats-muted">
          Aucun objectif actif. Le cockpit s&apos;allume quand tu vises quelque chose.
        </p>
        <a
          href="/objectives"
          className="rounded-lg bg-ats-card2 px-4 py-2 text-xs font-medium text-ats-text hover:bg-ats-gray/40"
        >
          Définir un objectif
        </a>
      </div>
    );
  }

  const remainingTrimp = weeklyLoad
    .filter((w) => w.week_start > today)
    .reduce((acc, w) => acc + w.planned_trimp, 0);
  const remainingMinutes = weeklyLoad
    .filter((w) => w.week_start > today)
    .reduce((acc, w) => acc + w.planned_minutes, 0);

  const total = weeklyLoad.reduce((a, w) => a + w.planned_trimp, 0);
  const done = weeklyLoad.reduce((a, w) => a + w.actual_trimp, 0);
  const progress = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div className="card flex h-full flex-col p-6">
      <div className="flex items-center gap-2 text-ats-muted">
        <Target className="h-4 w-4" />
        <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Objectif</span>
      </div>

      <h3 className="mt-3 text-xl font-bold">{objective.title}</h3>
      <p className="mt-1 text-xs text-ats-muted">
        {new Date(objective.target_date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] text-ats-muted">Temps cible</p>
          <p className="metric mt-0.5 text-xl font-semibold text-ats-blue">
            {fmtTime(objective.target_time_seconds)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-ats-muted">Jours restants</p>
          <p className="metric mt-0.5 text-xl font-semibold">{objective.days_remaining}</p>
        </div>
        <div>
          <p className="text-[11px] text-ats-muted">Charge restante</p>
          <p className="metric mt-0.5 text-xl font-semibold text-ats-orange">
            {remainingTrimp}
            <span className="ml-1 text-[10px] font-normal text-ats-muted">TRIMP</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] text-ats-muted">Volume restant</p>
          <p className="metric mt-0.5 text-xl font-semibold">
            {Math.round(remainingMinutes / 60)}
            <span className="ml-1 text-[10px] font-normal text-ats-muted">h</span>
          </p>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <div className="flex items-center justify-between text-[11px] text-ats-muted">
          <span>Progression du plan</span>
          <span className="metric font-medium text-ats-text">{progress}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ats-card2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ats-greendark to-ats-green"
            style={{ width: `${progress}%` }}
          />
        </div>
        <form action={generatePlan} className="mt-4">
          <button className="text-[11px] text-ats-gray underline-offset-4 transition-colors hover:text-ats-muted hover:underline">
            Régénérer le plan depuis aujourd&apos;hui
          </button>
        </form>
      </div>
    </div>
  );
}
