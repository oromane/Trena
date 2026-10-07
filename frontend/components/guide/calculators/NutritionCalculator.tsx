'use client';

/**
 * Besoins en protéines et glucides.
 * Protéines : ISSN Position Stand (Jäger et al., JISSN 2017;14:20) —
 *   1,4–2,0 g/kg/j, doses de 0,25 g/kg réparties toutes les 3–4 h.
 * Glucides : position conjointe Academy of Nutrition and Dietetics /
 *   Dietitians of Canada / ACSM (Thomas, Erdman & Burke, MSSE 2016).
 */
import { useState } from 'react';

const LOADS = [
  { key: 'light', label: 'Légère', desc: '1–2 séances / semaine', lo: 3, hi: 5 },
  { key: 'moderate', label: 'Modérée', desc: '3–4 séances / semaine', lo: 5, hi: 7 },
  { key: 'high', label: 'Élevée', desc: "5–6 séances, dont de l'endurance longue", lo: 6, hi: 10 },
  { key: 'veryhigh', label: 'Très élevée', desc: 'Préparation compétition, gros volume', lo: 8, hi: 12 },
] as const;

type LoadKey = (typeof LOADS)[number]['key'];

export default function NutritionCalculator() {
  const [kg, setKg] = useState(60);
  const [load, setLoad] = useState<LoadKey>('moderate');
  const current = LOADS.find((l) => l.key === load)!;

  const protLo = Math.round(kg * 1.4);
  const protHi = Math.round(kg * 2.0);
  const dose = Math.round(kg * 0.25);
  const carbLo = Math.round(kg * current.lo);
  const carbHi = Math.round(kg * current.hi);

  return (
    <div className="card overflow-hidden">
      <div className="space-y-4 border-b border-white/5 p-5">
        <div>
          <label
            htmlFor="nc-kg"
            className="block text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray"
          >
            Poids corporel
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <input
              id="nc-kg"
              type="range"
              min={40}
              max={110}
              step={1}
              value={kg}
              onChange={(e) => setKg(Number(e.target.value))}
              className="h-1.5 min-w-[12rem] flex-1 cursor-pointer appearance-none rounded-full bg-ats-card2 accent-ats-green"
            />
            <div className="flex items-baseline gap-1.5">
              <span className="metric text-2xl font-semibold text-ats-text">
                {kg}
              </span>
              <span className="text-xs text-ats-muted">kg</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray">
            Charge d&apos;entraînement de la semaine
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LOADS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setLoad(l.key)}
                aria-pressed={l.key === load}
                title={l.desc}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  l.key === load
                    ? 'border-ats-green/40 bg-ats-green/15 text-ats-green-fg'
                    : 'border-white/10 text-ats-muted hover:border-white/20 hover:text-ats-text'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ats-gray">{current.desc}</p>
        </div>
      </div>

      <div className="grid gap-px bg-white/5 sm:grid-cols-2">
        <div className="bg-ats-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ats-green-fg">
            Protéines
          </p>
          <p className="metric mt-2 text-3xl font-semibold text-ats-text">
            {protLo} – {protHi}
            <span className="ml-1.5 text-xs font-normal text-ats-muted">g / jour</span>
          </p>
          <p className="mt-1 text-[11px] text-ats-gray">1,4 – 2,0 g par kg</p>
          <div className="card-2 mt-4 p-3.5">
            <p className="text-xs text-ats-muted">
              Soit environ{' '}
              <span className="metric font-semibold text-ats-text">{dose} g</span>{' '}
              par prise, répartis toutes les 3 à 4 heures — donc à peu près 4
              prises dans la journée.
            </p>
          </div>
        </div>

        <div className="bg-ats-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ats-blue-fg">
            Glucides
          </p>
          <p className="metric mt-2 text-3xl font-semibold text-ats-text">
            {carbLo} – {carbHi}
            <span className="ml-1.5 text-xs font-normal text-ats-muted">g / jour</span>
          </p>
          <p className="mt-1 text-[11px] text-ats-gray">
            {current.lo} – {current.hi} g par kg, selon la charge
          </p>
          <div className="card-2 mt-4 p-3.5">
            <p className="text-xs text-ats-muted">
              Les glucides se modulent : on en met plus les jours durs, moins les
              jours calmes. Ce sont eux qui alimentent l&apos;intensité.
            </p>
          </div>
        </div>
      </div>

      <p className="border-t border-white/5 px-5 py-3 text-[11px] leading-relaxed text-ats-gray">
        Ordres de grandeur issus de positions officielles, à ajuster au ressenti,
        à la composition corporelle et aux préférences alimentaires. Pour un
        besoin individualisé — a fortiori en cas de régime particulier ou
        d&apos;antécédent de trouble alimentaire — consulte un·e diététicien·ne
        du sport.
      </p>
    </div>
  );
}
