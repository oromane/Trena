'use client';

/**
 * Constructeur de semaine type.
 *
 * Applique les règles issues de la revue : ≥2 séances de force par semaine
 * (ACSM 2026), distribution polarisée de l'endurance (~75-80 % facile, Seiler
 * & Kjerland 2006), et séparation des séances de force et d'endurance intense
 * pour limiter l'effet d'interférence (Wilson et al. 2012).
 */
import { useState } from 'react';
import { Check, Info, TriangleAlert } from 'lucide-react';

type Code = 'FH' | 'FC' | 'EF' | 'EI' | 'EL';

const KINDS: Record<
  Code,
  { label: string; detail: string; cls: string; family: 'force' | 'endurance' }
> = {
  FH: {
    label: 'Force — hypertrophie',
    detail: 'Full-body, 2–3 reps en réserve, repos 60–90 s',
    cls: 'border-ats-green/30 bg-ats-green/10 text-ats-green-fg',
    family: 'force',
  },
  FC: {
    label: 'Force — lourd et court',
    detail: '2–3 séries à ≥80 % 1RM, repos 2–3 min, 30 min chrono',
    cls: 'border-ats-violet/30 bg-ats-violet/10 text-ats-violet-fg',
    family: 'force',
  },
  EF: {
    label: 'Endurance facile',
    detail: 'Zone 1 — tu dois pouvoir tenir une conversation',
    cls: 'border-ats-blue/30 bg-ats-blue/10 text-ats-blue-fg',
    family: 'endurance',
  },
  EI: {
    label: 'Endurance intense',
    detail: 'Fractionné ou seuil — Zone 3',
    cls: 'border-ats-orange/30 bg-ats-orange/10 text-ats-orange-fg',
    family: 'endurance',
  },
  EL: {
    label: 'Sortie longue',
    detail: 'Zone 1, durée étendue — oxydation des lipides',
    cls: 'border-ats-blue/30 bg-ats-blue/10 text-ats-blue-fg',
    family: 'endurance',
  },
};

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

type Priority = 'muscle' | 'equilibre' | 'endurance';

/** [Lun, Mar, Mer, Jeu, Ven, Sam, Dim] — null = repos complet. */
const PLANS: Record<number, Record<Priority, (Code | null)[]>> = {
  3: {
    muscle: ['FH', null, 'FH', null, null, 'EF', null],
    equilibre: ['FH', null, 'EF', null, 'FH', null, null],
    endurance: ['FC', null, 'EI', null, null, 'EL', null],
  },
  4: {
    muscle: ['FH', 'EF', null, 'FH', null, 'FH', null],
    equilibre: ['FH', null, 'EI', null, 'FH', null, 'EF'],
    endurance: ['FC', null, 'EI', null, 'FC', null, 'EL'],
  },
  5: {
    muscle: ['FH', 'EF', 'FH', null, 'FH', 'EF', null],
    equilibre: ['FH', 'EF', null, 'FH', 'EI', null, 'EL'],
    endurance: ['FC', 'EF', 'EI', null, 'FC', null, 'EL'],
  },
  6: {
    muscle: ['FH', 'EF', 'FH', 'EF', 'FH', 'FH', null],
    equilibre: ['FH', 'EF', 'FH', 'EI', null, 'FH', 'EL'],
    endurance: ['FC', 'EF', 'EI', 'EF', 'FC', null, 'EL'],
  },
};

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'muscle', label: 'Prendre du muscle' },
  { key: 'equilibre', label: 'Les deux à parts égales' },
  { key: 'endurance', label: 'Progresser en endurance' },
];

const SPORTS = [
  {
    key: 'course',
    label: 'Course à pied',
    note: "La course est le sport d'endurance qui interfère le plus avec les gains de force et de volume musculaire, à cause de la composante excentrique des impacts. Sépare bien les séances et surveille le volume.",
    tone: 'warn' as const,
  },
  {
    key: 'velo',
    label: 'Vélo',
    note: "Le vélo n'entraîne pas de baisse significative de force ou d'hypertrophie dans la méta-analyse de référence. C'est le meilleur choix quand tu veux protéger tes gains en salle.",
    tone: 'ok' as const,
  },
  {
    key: 'natation',
    label: 'Natation',
    note: 'Impact articulaire quasi nul et sollicitation différente du haut du corps. Excellente option de récupération active et de variété.',
    tone: 'ok' as const,
  },
];

export default function WeekPlanner() {
  const [total, setTotal] = useState(4);
  const [priority, setPriority] = useState<Priority>('equilibre');
  const [sport, setSport] = useState('course');

  const week = PLANS[total][priority];
  const sportInfo = SPORTS.find((s) => s.key === sport)!;

  const codes = week.filter(Boolean) as Code[];
  const nForce = codes.filter((c) => KINDS[c].family === 'force').length;
  const nEndur = codes.filter((c) => KINDS[c].family === 'endurance').length;
  const nHard = codes.filter((c) => c === 'EI').length;
  const easyShare = nEndur > 0 ? Math.round(((nEndur - nHard) / nEndur) * 100) : 100;

  // Une séance de force suivie le lendemain d'un fractionné laisse peu de
  // récupération : on le signale sans le traiter comme une faute.
  const backToBack = week.some(
    (c, i) =>
      c === 'EI' && i > 0 && week[i - 1] !== null && KINDS[week[i - 1]!].family === 'force'
  );

  const checks = [
    {
      ok: nForce >= 2,
      text:
        nForce >= 2
          ? `${nForce} séances de force — chaque groupe musculaire est sollicité au moins 2 fois par semaine.`
          : `Une seule séance de force : tu maintiens ta masse musculaire, tu n'en gagnes pas. C'est le compromis assumé de cette configuration.`,
    },
    {
      ok: easyShare >= 70,
      text:
        nEndur === 0
          ? "Aucune séance d'endurance : le plan est purement orienté salle."
          : `${easyShare} % de l'endurance est en allure facile — conforme au principe polarisé (viser 75–80 %).`,
    },
    {
      ok: !backToBack,
      text: backToBack
        ? "Un fractionné tombe au lendemain d'une séance de force : c'est tenable, mais décale-le d'un jour si tu arrives fatiguée."
        : 'Force et fractionné sont toujours séparés par au moins un jour : interférence minimisée.',
    },
    {
      ok: week.filter((c) => c === null).length >= 1,
      text: `${week.filter((c) => c === null).length} jour(s) de repos complet — la progression se construit pendant la récupération.`,
    },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="space-y-4 border-b border-white/5 p-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray">
            Séances par semaine
          </p>
          <div className="mt-3 flex gap-2">
            {[3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTotal(n)}
                aria-pressed={n === total}
                className={`metric h-9 w-10 rounded-xl border text-sm font-semibold transition-colors ${
                  n === total
                    ? 'border-ats-green/40 bg-ats-green/15 text-ats-green-fg'
                    : 'border-white/10 text-ats-muted hover:border-white/20 hover:text-ats-text'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray">
            Priorité
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPriority(p.key)}
                aria-pressed={p.key === priority}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  p.key === priority
                    ? 'border-ats-green/40 bg-ats-green/15 text-ats-green-fg'
                    : 'border-white/10 text-ats-muted hover:border-white/20 hover:text-ats-text'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray">
            Sport d&apos;endurance
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SPORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSport(s.key)}
                aria-pressed={s.key === sport}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  s.key === sport
                    ? 'border-ats-blue/40 bg-ats-blue/15 text-ats-blue-fg'
                    : 'border-white/10 text-ats-muted hover:border-white/20 hover:text-ats-text'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Semaine */}
      <div className="grid grid-cols-2 gap-px bg-white/5 sm:grid-cols-4 lg:grid-cols-7">
        {week.map((code, i) => (
          <div key={DAYS[i]} className="min-h-[7rem] bg-ats-card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ats-gray">
              {DAYS[i]}
            </p>
            {code ? (
              <div
                className={`mt-2 rounded-lg border p-2 ${KINDS[code].cls}`}
              >
                <p className="text-[11px] font-semibold leading-tight">
                  {KINDS[code].label}
                </p>
                <p className="mt-1 text-[10px] leading-snug opacity-80">
                  {KINDS[code].detail}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-[11px] italic text-ats-gray">Repos</p>
            )}
          </div>
        ))}
      </div>

      {/* Vérifications */}
      <div className="space-y-2.5 border-t border-white/5 p-5">
        {checks.map((c, i) => (
          <p
            key={i}
            className={`flex gap-2.5 text-sm leading-relaxed ${
              c.ok ? 'text-ats-muted' : 'text-ats-orange-fg'
            }`}
          >
            {c.ok ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-ats-green-fg" />
            ) : (
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{c.text}</span>
          </p>
        ))}
      </div>

      <div
        className={`flex gap-3 border-t border-white/5 px-5 py-4 text-sm leading-relaxed ${
          sportInfo.tone === 'warn'
            ? 'bg-ats-orange/[0.07] text-ats-muted'
            : 'bg-ats-blue/[0.07] text-ats-muted'
        }`}
      >
        <Info
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            sportInfo.tone === 'warn' ? 'text-ats-orange-fg' : 'text-ats-blue-fg'
          }`}
        />
        <p>{sportInfo.note}</p>
      </div>
    </div>
  );
}
