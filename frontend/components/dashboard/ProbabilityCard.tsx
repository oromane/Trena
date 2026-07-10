/**
 * Probabilité — décomposition transparente : pourquoi ce chiffre, ce qui le fait bouger.
 */
import { TrendingUp } from 'lucide-react';
import type { DashboardSummary } from '@/lib/engine';

const COMPONENTS = [
  {
    key: 'adherence' as const,
    label: 'Adhérence au plan',
    weight: '50%',
    color: '#2E8B57',
    toRatio: (p: DashboardSummary['probability']) => p.adherence,
  },
  {
    key: 'form_score' as const,
    label: 'Fraîcheur (Banister)',
    weight: '30%',
    color: '#4F86A8',
    toRatio: (p: DashboardSummary['probability']) => (p.form_score + 1) / 2,
  },
  {
    key: 'readiness_factor' as const,
    label: 'Disponibilité du jour',
    weight: '20%',
    color: '#7C6FA8',
    toRatio: (p: DashboardSummary['probability']) => (p.readiness_factor + 1) / 2,
  },
];

const ADVICE: Record<string, string> = {
  adherence: 'réalise les séances prévues — c’est le facteur n°1.',
  form_score: 'respecte les jours de repos pour faire remonter ta fraîcheur.',
  readiness_factor: 'soigne sommeil et récupération pour ta disponibilité.',
};

export default function ProbabilityCard({
  probability,
}: {
  probability: DashboardSummary['probability'];
}) {
  const lever = COMPONENTS
    .map((c) => {
      const ratio = Math.max(0, Math.min(1, c.toRatio(probability)));
      return { key: c.key, label: c.label, potential: (parseInt(c.weight) / 100) * (1 - ratio) };
    })
    .reduce((a, b) => (b.potential > a.potential ? b : a));

  return (
    <div className="card flex h-full flex-col p-6">
      <div className="flex items-center gap-2 text-ats-muted">
        <TrendingUp className="h-4 w-4" />
        <span className="text-[11px] font-medium uppercase tracking-[0.2em]">
          Probabilité de réussite
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="metric text-4xl font-semibold text-ats-green">
          {Math.round(probability.value * 100)}%
        </span>
        <span className="text-[11px] text-ats-gray">modèle déterministe v1</span>
      </div>

      <div className="mt-5 space-y-3">
        {COMPONENTS.map((c) => {
          const ratio = Math.max(0, Math.min(1, c.toRatio(probability)));
          return (
            <div key={c.key}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ats-muted">
                  {c.label} <span className="text-ats-gray">· poids {c.weight}</span>
                </span>
                <span className="metric text-ats-text">{Math.round(ratio * 100)}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-ats-card2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${ratio * 100}%`, background: c.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {lever.potential > 0.02 && (
        <div className="mt-4 rounded-lg border border-ats-green/20 bg-ats-green/5 px-3 py-2 text-[11px] leading-relaxed">
          <span className="font-semibold text-ats-green">Levier le plus fort — {lever.label} : </span>
          <span className="text-ats-muted">{ADVICE[lever.key]}</span>
        </div>
      )}

      <ul className="mt-4 space-y-1.5 border-t border-white/5 pt-4">
        {probability.explanation.map((e, i) => (
          <li key={i} className="text-[11px] leading-relaxed text-ats-muted">
            {e}
          </li>
        ))}
      </ul>
    </div>
  );
}
