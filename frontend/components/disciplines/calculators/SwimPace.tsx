'use client';

/**
 * Vitesse critique de nage (CSS) à partir d'un test 400 m / 200 m.
 *
 * CSS = (400 − 200) / (t400 − t200), en mètres par seconde. C'est l'équivalent
 * nautique du seuil : l'allure théoriquement soutenable longtemps. Méthode
 * répandue en natation, à considérer comme un repère d'entraînement et non
 * comme une mesure physiologique.
 */
import { useState } from 'react';

function toSeconds(min: number, sec: number): number {
  return min * 60 + sec;
}

function fmt(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

const PACES = [
  { label: 'Endurance', factor: 1.12, use: 'Le gros du volume, nage souple et longue' },
  { label: 'Aérobie soutenu', factor: 1.05, use: 'Séries longues, récupérations courtes' },
  { label: 'Seuil (CSS)', factor: 1.0, use: 'Allure de référence, séries de 100 à 400 m' },
  { label: 'VO2max', factor: 0.94, use: 'Séries courtes et rapides, récupération complète' },
];

function NumField({
  label,
  min,
  sec,
  onMin,
  onSec,
}: {
  label: string;
  min: number;
  sec: number;
  onMin: (v: number) => void;
  onSec: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={59}
          value={min}
          onChange={(e) => onMin(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
          aria-label={`${label} — minutes`}
          className="w-16 rounded-xl border border-white/10 bg-ats-bg2 px-2.5 py-2 text-center text-ats-text outline-none focus:border-ats-green/50"
        />
        <span className="text-ats-muted">:</span>
        <input
          type="number"
          min={0}
          max={59}
          value={sec}
          onChange={(e) => onSec(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
          aria-label={`${label} — secondes`}
          className="w-16 rounded-xl border border-white/10 bg-ats-bg2 px-2.5 py-2 text-center text-ats-text outline-none focus:border-ats-green/50"
        />
      </div>
    </div>
  );
}

export default function SwimPace() {
  const [m400, setM400] = useState(6);
  const [s400, setS400] = useState(40);
  const [m200, setM200] = useState(3);
  const [s200, setS200] = useState(10);

  const t400 = toSeconds(m400, s400);
  const t200 = toSeconds(m200, s200);
  const delta = t400 - t200;
  const valid = delta > 0;
  const css = valid ? 200 / delta : 0; // m/s
  const per100 = valid ? 100 / css : 0; // secondes au 100 m

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-4 border-b border-white/5 p-5 sm:grid-cols-2">
        <NumField label="Temps sur 400 m" min={m400} sec={s400} onMin={setM400} onSec={setS400} />
        <NumField label="Temps sur 200 m" min={m200} sec={s200} onMin={setM200} onSec={setS200} />
      </div>

      {!valid ? (
        <p className="px-5 py-4 text-sm text-ats-orange-fg">
          Le temps sur 400 m doit être supérieur à celui sur 200 m.
        </p>
      ) : (
        <>
          <div className="border-b border-white/5 px-5 py-4">
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm text-ats-muted">Allure critique</span>
              <span className="metric text-3xl font-semibold text-ats-blue-fg">
                {fmt(per100)}
              </span>
              <span className="text-xs text-ats-muted">/ 100 m</span>
              <span className="metric ml-2 text-xs text-ats-gray">
                ({css.toFixed(2)} m/s)
              </span>
            </p>
          </div>

          <div className="divide-y divide-white/5">
            {PACES.map((p) => (
              <div
                key={p.label}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5"
              >
                <div className="min-w-[11rem] flex-1">
                  <p className="text-sm font-semibold text-ats-text">{p.label}</p>
                  <p className="text-[11px] text-ats-muted">{p.use}</p>
                </div>
                <p className="metric text-sm font-semibold text-ats-text">
                  {fmt(per100 * p.factor)}
                  <span className="ml-1 text-[10px] font-normal text-ats-muted">
                    / 100 m
                  </span>
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="border-t border-white/5 px-5 py-3 text-[11px] leading-relaxed text-ats-gray">
        Les deux tests se font reposée, à effort maximal régulier, avec une
        récupération complète entre eux. Partir trop vite fausse le résultat.
        Repère d&apos;entraînement, pas une mesure physiologique.
      </p>
    </div>
  );
}
