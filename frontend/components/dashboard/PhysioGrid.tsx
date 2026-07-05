/**
 * État physiologique — chaque métrique répond à « où j'en suis vs ma norme ? »
 */
import { Activity, HeartPulse, Moon, Zap } from 'lucide-react';
import type { DashboardSummary, MetricBlock } from '@/lib/engine';

type Def = {
  key: keyof DashboardSummary['physio'];
  label: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  higherIsBetter: boolean;
  explain: string;
  impact: string;
  format?: (v: number) => string;
};

const DEFS: Def[] = [
  {
    key: 'hrv',
    label: 'HRV',
    unit: 'ms',
    icon: Activity,
    higherIsBetter: true,
    explain: 'Variabilité cardiaque au réveil : ton signal de récupération n°1.',
    impact: 'Pilote la décision quotidienne : intensité maintenue ou réduite.',
  },
  {
    key: 'sleep',
    label: 'Sommeil',
    unit: 'h',
    icon: Moon,
    higherIsBetter: true,
    explain: 'Durée de sommeil vs ta moyenne 28 jours.',
    impact: 'Un déficit cumulé à un HRV bas déclenche la bascule basse intensité.',
    format: (v) => (v / 60).toFixed(1),
  },
  {
    key: 'resting_hr',
    label: 'FC repos',
    unit: 'bpm',
    icon: HeartPulse,
    higherIsBetter: false,
    explain: 'Fréquence cardiaque au repos : monte avec fatigue ou maladie.',
    impact: 'Tendance haussière = signal précoce de surcharge.',
  },
  {
    key: 'stress',
    label: 'Stress',
    unit: '',
    icon: Zap,
    higherIsBetter: false,
    explain: 'Score de stress physiologique de ta montre.',
    impact: 'Stress chronique = récupération ralentie entre les séances.',
  },
];

function Delta({ block, higherIsBetter }: { block: MetricBlock; higherIsBetter: boolean }) {
  if (block.delta_pct === null) return null;
  const good = higherIsBetter ? block.delta_pct >= 0 : block.delta_pct <= 0;
  const color = Math.abs(block.delta_pct) < 2 ? 'text-ats-muted' : good ? 'text-ats-green' : 'text-ats-red';
  return (
    <span className={`metric text-xs font-medium ${color}`}>
      {block.delta_pct > 0 ? '+' : ''}
      {block.delta_pct}%
    </span>
  );
}

export default function PhysioGrid({ physio }: { physio: DashboardSummary['physio'] }) {
  const available = DEFS.filter((d) => physio[d.key]?.today != null || physio[d.key]?.baseline != null);

  if (available.length === 0) {
    return (
      <div className="card p-6 text-sm text-ats-muted">
        Aucune donnée physiologique : saisis tes premières métriques (HRV, sommeil)
        pour activer l&apos;analyse quotidienne.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {available.map((d) => {
        const block = physio[d.key]!;
        const value = block.today ?? block.baseline;
        const Icon = d.icon;
        return (
          <div key={d.key} className="card group p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-ats-muted">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{d.label}</span>
              </div>
              <Delta block={block} higherIsBetter={d.higherIsBetter} />
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="metric text-3xl font-semibold">
                {value != null ? (d.format ? d.format(value) : Math.round(value)) : '—'}
              </span>
              <span className="text-xs text-ats-muted">{d.unit}</span>
              {block.today == null && (
                <span className="ml-1 text-[10px] text-ats-gray">moy. 28j</span>
              )}
            </div>
            {block.baseline != null && block.today != null && (
              <p className="metric mt-1 text-[11px] text-ats-gray">
                norme {d.format ? d.format(block.baseline) : Math.round(block.baseline)} {d.unit}
              </p>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-ats-muted">{d.explain}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ats-gray">{d.impact}</p>
          </div>
        );
      })}
    </div>
  );
}
