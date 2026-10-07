/**
 * État physiologique — chaque métrique répond à « où j'en suis vs ma norme ? »
 */
import { Activity, HeartPulse, Moon, Zap } from 'lucide-react';
import type { DashboardOverview, MetricBlock } from '@/lib/engine';
import InfoTooltip from '@/components/InfoTooltip';
import AskButton from '@/components/advisor/AskButton';

type Def = {
  key: keyof DashboardOverview['physio'];
  label: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  higherIsBetter: boolean;
  explain: string;
  impact: string;
  question: string;
  calc: string;
  interpret: (value: number | null, block: MetricBlock) => string;
  format?: (v: number) => string;
};

const DEFS: Def[] = [
  {
    key: 'hrv',
    question: "Que dit mon HRV d'aujourd'hui sur ma récupération ?",
    label: 'HRV',
    unit: 'ms',
    icon: Activity,
    higherIsBetter: true,
    explain: 'Variabilité cardiaque au réveil : ton signal de récupération n°1.',
    impact: 'Pilote la décision quotidienne : intensité maintenue ou réduite.',
    calc: 'Variabilité des intervalles entre battements (rMSSD, en ms), mesurée la nuit par la montre. Comparée à ta ligne de base sur 28 jours via un z-score.',
    interpret: (v, b) => {
      if (v == null || b.baseline == null) return 'Établis ta norme sur ~28 jours pour une interprétation fiable.';
      if (v >= b.baseline) return 'Au niveau ou au-dessus de ta norme : bonne récupération.';
      if (v >= b.baseline * 0.92) return 'Légèrement sous ta norme : vigilance.';
      return 'Nettement sous ta norme : fatigue ou stress accumulé.';
    },
  },
  {
    key: 'sleep',
    question: "Mon sommeil récent est-il suffisant pour m'entraîner ?",
    label: 'Sommeil',
    unit: 'h',
    icon: Moon,
    higherIsBetter: true,
    explain: 'Durée de sommeil vs ta moyenne 28 jours.',
    impact: 'Un déficit cumulé à un HRV bas déclenche la bascule basse intensité.',
    calc: 'Durée totale de sommeil détectée par la montre (cycles profond, léger, paradoxal), en minutes puis convertie en heures.',
    interpret: (v) => {
      if (v == null) return 'Aucune donnée de sommeil.';
      const h = v / 60;
      if (h < 6) return `${h.toFixed(1)} h : dette de sommeil (< 6 h).`;
      if (h < 7) return `${h.toFixed(1)} h : court (6–7 h).`;
      if (h <= 9) return `${h.toFixed(1)} h : optimal (7–9 h).`;
      return `${h.toFixed(1)} h : long (> 9 h).`;
    },
    format: (v) => (v / 60).toFixed(1),
  },
  {
    key: 'resting_hr',
    question: "Ma fréquence cardiaque de repos est-elle normale aujourd'hui ?",
    label: 'FC repos',
    unit: 'bpm',
    icon: HeartPulse,
    higherIsBetter: false,
    explain: 'Fréquence cardiaque au repos : monte avec fatigue ou maladie.',
    impact: 'Tendance haussière = signal précoce de surcharge.',
    calc: 'Fréquence cardiaque la plus basse mesurée sur 24 h (repos/sommeil), en battements par minute.',
    interpret: (v, b) => {
      if (v == null || b.baseline == null) return 'Compare à ta moyenne 28 jours une fois établie.';
      if (v <= b.baseline) return 'Au niveau ou sous ta norme : bon signe.';
      if (v <= b.baseline + 3) return 'Légèrement élevée vs ta norme.';
      return 'Élevée vs ta norme : fatigue ou début de maladie possible.';
    },
  },
  {
    key: 'stress',
    question: "Comment interpréter mon score de stress du jour ?",
    label: 'Stress',
    unit: '',
    icon: Zap,
    higherIsBetter: false,
    explain: 'Score de stress physiologique de ta montre.',
    impact: 'Stress chronique = récupération ralentie entre les séances.',
    calc: 'Score Garmin de 0 à 100 dérivé de la variabilité cardiaque au repos, moyenné sur la journée.',
    interpret: (v) => {
      if (v == null) return 'Aucune donnée de stress.';
      if (v <= 25) return `${Math.round(v)}/100 : repos (0–25).`;
      if (v <= 50) return `${Math.round(v)}/100 : bas (26–50), bonne disponibilité.`;
      if (v <= 75) return `${Math.round(v)}/100 : moyen (51–75), récupération partielle.`;
      return `${Math.round(v)}/100 : élevé (76–100), charge de stress importante.`;
    },
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

export default function PhysioGrid({ physio }: { physio: DashboardOverview['physio'] }) {
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
                <InfoTooltip title={d.label}>
                  <span className="block">{d.calc}</span>
                  <span className="mt-1.5 block font-medium text-ats-text/90">
                    {d.interpret(value ?? null, block)}
                  </span>
                </InfoTooltip>
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
            <AskButton question={d.question} className="mt-3" />
          </div>
        );
      })}
    </div>
  );
}
