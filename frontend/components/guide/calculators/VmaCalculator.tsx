'use client';

/**
 * VMA par test demi-Cooper : distance parcourue en 6 min ÷ 100 = VMA (km/h).
 * En déduit les allures d'entraînement (% VMA → km/h → min/km).
 */
import { useState } from 'react';

function paceFromSpeed(kmh: number): string {
  if (!isFinite(kmh) || kmh <= 0) return '—';
  const totalSec = 3600 / kmh;
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

const PACES = [
  {
    label: 'Récupération',
    lo: 0.6,
    hi: 0.7,
    use: 'Footing de décrassage, très facile',
    tone: 'text-ats-blue',
  },
  {
    label: 'Endurance fondamentale',
    lo: 0.7,
    hi: 0.8,
    use: "Le gros du volume — tu dois pouvoir tenir une conversation",
    tone: 'text-ats-green',
  },
  {
    label: 'Seuil',
    lo: 0.85,
    hi: 0.9,
    use: 'Effort soutenu mais contrôlé, phrases courtes',
    tone: 'text-ats-violet',
  },
  {
    label: 'Intervalles VMA',
    lo: 0.95,
    hi: 1.05,
    use: 'Fractionné court, respiration maximale',
    tone: 'text-ats-orange',
  },
];

export default function VmaCalculator() {
  const [metres, setMetres] = useState(1300);
  const vma = metres / 100;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-white/5 p-5">
        <label
          htmlFor="cooper"
          className="block text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray"
        >
          Test demi-Cooper — distance courue en 6 minutes
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <input
            id="cooper"
            type="range"
            min={800}
            max={2200}
            step={10}
            value={metres}
            onChange={(e) => setMetres(Number(e.target.value))}
            className="h-1.5 min-w-[14rem] flex-1 cursor-pointer appearance-none rounded-full bg-ats-card2 accent-ats-green"
          />
          <div className="flex items-baseline gap-1.5">
            <span className="metric text-2xl font-semibold text-ats-text">
              {metres}
            </span>
            <span className="text-xs text-ats-muted">m</span>
          </div>
        </div>
        <p className="mt-4 flex items-baseline gap-2">
          <span className="text-sm text-ats-muted">VMA estimée</span>
          <span className="metric text-3xl font-semibold text-ats-green">
            {vma.toFixed(1)}
          </span>
          <span className="text-xs text-ats-muted">km/h</span>
          <span className="metric ml-2 text-xs text-ats-gray">
            ({paceFromSpeed(vma)} /km)
          </span>
        </p>
      </div>

      <div className="divide-y divide-white/5">
        {PACES.map((p) => {
          const fast = vma * p.hi;
          const slow = vma * p.lo;
          return (
            <div
              key={p.label}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5"
            >
              <div className="min-w-[12rem] flex-1">
                <p className={`text-sm font-semibold ${p.tone}`}>{p.label}</p>
                <p className="text-[11px] text-ats-muted">{p.use}</p>
              </div>
              <div className="text-right">
                <p className="metric text-sm font-semibold text-ats-text">
                  {paceFromSpeed(fast)} – {paceFromSpeed(slow)}
                  <span className="ml-1 text-[10px] font-normal text-ats-muted">
                    /km
                  </span>
                </p>
                <p className="metric text-[11px] text-ats-gray">
                  {slow.toFixed(1)} – {fast.toFixed(1)} km/h ·{' '}
                  {Math.round(p.lo * 100)}–{Math.round(p.hi * 100)} % VMA
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="border-t border-white/5 px-5 py-3 text-[11px] leading-relaxed text-ats-gray">
        Le demi-Cooper suppose une allure régulière : partir trop vite fausse le
        résultat vers le bas. Le test VAMEVAL (paliers progressifs de +0,5 km/h
        par minute) est plus précis si tu as accès à une piste balisée.
      </p>
    </div>
  );
}
