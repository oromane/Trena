'use client';

/**
 * Le tableau central du guide : on choisit un objectif, on obtient la
 * prescription (charge, répétitions, séries, repos) ET la raison physiologique.
 *
 * Chiffres issus de la Position Stand ACSM 2026 (Currier et al., MSSE
 * 2026;58(4):851-872) et, pour l'endurance musculaire, des plages NSCA
 * classiques (Haff & Triplett).
 */
import { useState } from 'react';

type GoalKey = 'hypertrophie' | 'force' | 'endurance' | 'puissance';

type Goal = {
  key: GoalKey;
  label: string;
  tagline: string;
  charge: string;
  reps: string;
  series: string;
  repos: string;
  effort: string;
  why: string;
  detail: string[];
  tone: 'green' | 'blue' | 'orange' | 'violet';
};

const GOALS: Goal[] = [
  {
    key: 'hypertrophie',
    label: 'Prendre du muscle',
    tagline: 'Hypertrophie — augmenter la taille du muscle',
    charge: '30 à 100 % 1RM',
    reps: '6 à 20+',
    series: '≥ 10 / semaine et par groupe musculaire',
    repos: '60 à 90 s',
    effort: '2 à 3 répétitions en réserve',
    why: "C'est le résultat le plus contre-intuitif de la recherche récente : pour faire grossir un muscle, la charge compte beaucoup moins qu'on ne le croit. Une série légère menée près de l'échec produit autant qu'une série lourde. Ce qui compte, c'est le nombre total de séries difficiles accumulées sur la semaine.",
    detail: [
      "Toute la plage 30–100 % du maximum fonctionne, à condition d'arrêter la série à 2–3 répétitions de l'échec.",
      "Le volume est le vrai moteur : viser au moins 10 séries par groupe musculaire et par semaine.",
      "Au-delà de 90 s de repos, aucun bénéfice supplémentaire mesuré pour l'hypertrophie — inutile de traîner.",
      "Insister sur la phase de descente (excentrique) est identifié comme un facteur favorable.",
    ],
    tone: 'green',
  },
  {
    key: 'force',
    label: 'Devenir plus forte',
    tagline: 'Force maximale — soulever plus lourd',
    charge: '≥ 80 % 1RM',
    reps: '3 à 6',
    series: '2 à 3 par exercice',
    repos: '2 à 3 min',
    effort: '1 à 3 répétitions en réserve',
    why: "La force est d'abord une compétence du système nerveux : apprendre à recruter beaucoup de fibres d'un coup. Ça ne s'apprend qu'avec des charges lourdes, et ça demande d'être fraîche à chaque série — d'où les repos longs, qui ne sont pas du temps perdu mais une condition de la qualité.",
    detail: [
      "Contrairement à l'hypertrophie, la charge est ici non négociable : il faut du lourd.",
      "Placer les exercices clés en début de séance, quand le système nerveux est reposé.",
      "Les repos courts sabotent l'objectif : 2–3 min minimum pour retrouver sa capacité.",
      "La progression en force plafonne plus vite que celle du volume musculaire.",
    ],
    tone: 'blue',
  },
  {
    key: 'endurance',
    label: 'Tenir plus longtemps',
    tagline: 'Endurance musculaire — résister à la fatigue locale',
    charge: '< 60 % 1RM',
    reps: '15 à 30+',
    series: '2 à 3 par exercice',
    repos: '30 à 60 s',
    effort: 'proche de l’échec',
    why: "Ici on entraîne la capacité du muscle à répéter un effort sans se fatiguer : adaptations métaboliques locales, tolérance à l'acidité. Les repos courts sont volontaires — c'est justement l'incapacité à récupérer complètement qui constitue le stimulus.",
    detail: [
      'Utile pour les sports portés longtemps : trail, triathlon, randonnée en montagne.',
      "Attention : ce n'est pas la façon la plus efficace de prendre du muscle ni de la force.",
      'Le format « circuit » (enchaîner les exercices sans pause) relève de cette catégorie.',
      "Plage issue des recommandations NSCA classiques, pédagogiquement utile mais nuancée par l'ACSM 2026.",
    ],
    tone: 'orange',
  },
  {
    key: 'puissance',
    label: 'Être plus explosive',
    tagline: 'Puissance — produire de la force vite',
    charge: '30 à 70 % 1RM',
    reps: '3 à 5 (≤ ~24 reps / séance)',
    series: '3 à 5 par exercice',
    repos: '2 à 3 min',
    effort: 'loin de l’échec',
    why: "La puissance, c'est de la force appliquée vite. Le geste doit être exécuté à vitesse maximale — donc dès que la fatigue ralentit le mouvement, la série ne sert plus l'objectif. C'est le seul cas où il faut délibérément s'arrêter très loin de l'échec.",
    detail: [
      "L'intention de bouger vite compte plus que la charge elle-même.",
      'Volume faible et repos longs : la qualité prime totalement sur la quantité.',
      "Dès que la vitesse chute nettement, la série est terminée, même s'il reste des répétitions possibles.",
      'Utile pour la course (économie, foulée) et la prévention des blessures.',
    ],
    tone: 'violet',
  },
];

const TONE_CLS = {
  green: {
    active: 'border-ats-green/40 bg-ats-green/15 text-ats-green-fg',
    accent: 'text-ats-green-fg',
    ring: 'border-ats-green/25 bg-ats-green/[0.06]',
  },
  blue: {
    active: 'border-ats-blue/40 bg-ats-blue/15 text-ats-blue-fg',
    accent: 'text-ats-blue-fg',
    ring: 'border-ats-blue/25 bg-ats-blue/[0.06]',
  },
  orange: {
    active: 'border-ats-orange/40 bg-ats-orange/15 text-ats-orange-fg',
    accent: 'text-ats-orange-fg',
    ring: 'border-ats-orange/25 bg-ats-orange/[0.06]',
  },
  violet: {
    active: 'border-ats-violet/40 bg-ats-violet/15 text-ats-violet-fg',
    accent: 'text-ats-violet-fg',
    ring: 'border-ats-violet/25 bg-ats-violet/[0.06]',
  },
} as const;

function Field({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="card-2 p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ats-gray">
        {label}
      </p>
      <p className={`metric mt-1.5 text-base font-semibold leading-snug ${accent}`}>
        {value}
      </p>
    </div>
  );
}

export default function PrescriptionTable() {
  const [active, setActive] = useState<GoalKey>('hypertrophie');
  const goal = GOALS.find((g) => g.key === active)!;
  const cls = TONE_CLS[goal.tone];

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-white/5 p-4">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray">
          Ton objectif
        </p>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => {
            const on = g.key === active;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setActive(g.key)}
                aria-pressed={on}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  on
                    ? TONE_CLS[g.tone].active
                    : 'border-white/10 text-ats-muted hover:border-white/20 hover:text-ats-text'
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-5 p-5">
        <p className={`text-sm font-semibold ${cls.accent}`}>{goal.tagline}</p>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Field label="Charge" value={goal.charge} accent={cls.accent} />
          <Field label="Répétitions" value={goal.reps} accent={cls.accent} />
          <Field label="Séries" value={goal.series} accent={cls.accent} />
          <Field label="Repos" value={goal.repos} accent={cls.accent} />
          <Field label="Effort" value={goal.effort} accent={cls.accent} />
        </div>

        <div className={`rounded-2xl border p-5 ${cls.ring}`}>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${cls.accent}`}
          >
            Pourquoi ces chiffres
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ats-muted">{goal.why}</p>
        </div>

        <ul className="space-y-2.5">
          {goal.detail.map((d) => (
            <li key={d} className="flex gap-3 text-sm leading-relaxed text-ats-muted">
              <span
                aria-hidden
                className={`mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full ${
                  goal.tone === 'green'
                    ? 'bg-ats-green'
                    : goal.tone === 'blue'
                      ? 'bg-ats-blue'
                      : goal.tone === 'orange'
                        ? 'bg-ats-orange'
                        : 'bg-ats-violet'
                }`}
              />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
