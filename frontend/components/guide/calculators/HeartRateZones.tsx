'use client';

/**
 * Zones cardiaques — modèle à 3 zones (Seiler), bornes calculées en fréquence
 * cardiaque de réserve (Karvonen) à partir d'une FCmax estimée par Tanaka.
 *
 * Tanaka H, Monahan KD, Seals DR. J Am Coll Cardiol 2001 : FCmax = 208 − 0,7 × âge,
 * écart-type ≈ ±10 bpm. L'incertitude est affichée volontairement : c'est le
 * point pédagogique central de cet outil.
 */
import { useState } from 'react';

const ZONES = [
  {
    n: 1,
    label: 'Zone 1 — facile',
    lo: 0.5,
    hi: 0.75,
    part: '≈ 75 % du volume',
    use: "Endurance fondamentale. Tu peux parler en phrases complètes. C'est là que se construit la base aérobie.",
    cls: 'text-ats-green-fg',
    bar: 'bg-ats-green',
  },
  {
    n: 2,
    label: 'Zone 2 — intermédiaire',
    lo: 0.75,
    hi: 0.85,
    part: '≈ 8 % du volume',
    use: "La « zone grise » : trop dur pour récupérer, trop facile pour vraiment progresser. À utiliser peu.",
    cls: 'text-ats-violet-fg',
    bar: 'bg-ats-violet',
  },
  {
    n: 3,
    label: 'Zone 3 — dur',
    lo: 0.85,
    hi: 1,
    part: '≈ 17 % du volume',
    use: 'Seuil et fractionné. Développe la VO2max et la tolérance à haute intensité.',
    cls: 'text-ats-orange-fg',
    bar: 'bg-ats-orange',
  },
];

export default function HeartRateZones() {
  const [age, setAge] = useState(28);
  const [rest, setRest] = useState(58);

  const hrMax = Math.round(208 - 0.7 * age);
  const reserve = hrMax - rest;
  const bpm = (frac: number) => Math.round(rest + reserve * frac);

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-4 border-b border-white/5 p-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="hz-age"
            className="block text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray"
          >
            Âge
          </label>
          <input
            id="hz-age"
            type="number"
            min={14}
            max={90}
            value={age}
            onChange={(e) => setAge(Math.max(14, Math.min(90, Number(e.target.value) || 0)))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-ats-bg2 px-3 py-2 text-ats-text outline-none focus:border-ats-green/50"
          />
        </div>
        <div>
          <label
            htmlFor="hz-rest"
            className="block text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray"
          >
            FC au repos (au réveil, allongée)
          </label>
          <input
            id="hz-rest"
            type="number"
            min={30}
            max={110}
            value={rest}
            onChange={(e) => setRest(Math.max(30, Math.min(110, Number(e.target.value) || 0)))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-ats-bg2 px-3 py-2 text-ats-text outline-none focus:border-ats-green/50"
          />
        </div>
      </div>

      <div className="border-b border-white/5 bg-ats-orange/[0.06] px-5 py-4">
        <p className="text-sm text-ats-muted">
          FCmax estimée{' '}
          <span className="metric text-lg font-semibold text-ats-text">
            {hrMax}
          </span>{' '}
          bpm — mais la vraie valeur se situe très probablement entre{' '}
          <span className="metric font-semibold text-ats-orange-fg">
            {hrMax - 10}
          </span>{' '}
          et{' '}
          <span className="metric font-semibold text-ats-orange-fg">
            {hrMax + 10}
          </span>{' '}
          bpm.
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ats-gray">
          Toute formule d&apos;âge porte un écart-type d&apos;environ ±10 bpm.
          Deux femmes de {age} ans peuvent avoir 20 bpm d&apos;écart de FCmax
          sans que rien ne soit anormal. Ces zones sont un point de départ, pas
          une vérité : ajuste-les à ton ressenti et au test de la parole.
        </p>
      </div>

      <div className="divide-y divide-white/5">
        {ZONES.map((z) => (
          <div key={z.n} className="px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className={`text-sm font-semibold ${z.cls}`}>{z.label}</p>
              <p className="metric text-sm font-semibold text-ats-text">
                {bpm(z.lo)} – {bpm(z.hi)}
                <span className="ml-1 text-[10px] font-normal text-ats-muted">
                  bpm
                </span>
              </p>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-ats-card2">
              <div
                className={`h-full rounded-full ${z.bar}`}
                style={{
                  marginLeft: `${z.lo * 100}%`,
                  width: `${(z.hi - z.lo) * 100}%`,
                }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ats-muted">
              {z.use}
            </p>
            <p className="mt-1 text-[11px] font-medium text-ats-gray">{z.part}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
