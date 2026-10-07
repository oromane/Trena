'use client';

/**
 * Répartition hebdomadaire entre les trois disciplines du triathlon.
 *
 * Les proportions suivent une logique de temps de course et de contrainte
 * mécanique : le vélo occupe la plus grosse part du chrono en compétition et
 * coûte peu en récupération, la course coûte cher et se dose, la natation est
 * la plus technique et la moins traumatisante.
 */
import { useState } from 'react';

type Format = 'sprint' | 'olympique' | 'half';

const FORMATS: {
  key: Format;
  label: string;
  detail: string;
  swim: number;
  bike: number;
  run: number;
}[] = [
  {
    key: 'sprint',
    label: 'Sprint',
    detail: '750 m · 20 km · 5 km',
    swim: 0.25,
    bike: 0.45,
    run: 0.3,
  },
  {
    key: 'olympique',
    label: 'Olympique',
    detail: '1,5 km · 40 km · 10 km',
    swim: 0.22,
    bike: 0.48,
    run: 0.3,
  },
  {
    key: 'half',
    label: 'Half / 70.3',
    detail: '1,9 km · 90 km · 21 km',
    swim: 0.18,
    bike: 0.55,
    run: 0.27,
  },
];

const DISCIPLINES = [
  { key: 'swim' as const, label: 'Natation', cls: 'bg-ats-blue', text: 'text-ats-blue-fg' },
  { key: 'bike' as const, label: 'Vélo', cls: 'bg-ats-green', text: 'text-ats-green-fg' },
  { key: 'run' as const, label: 'Course', cls: 'bg-ats-orange', text: 'text-ats-orange-fg' },
];

function fmtHours(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  if (hh === 0) return `${mm} min`;
  return mm === 0 ? `${hh} h` : `${hh} h ${String(mm).padStart(2, '0')}`;
}

export default function TriSplit() {
  const [hours, setHours] = useState(6);
  const [format, setFormat] = useState<Format>('olympique');
  const f = FORMATS.find((x) => x.key === format)!;

  return (
    <div className="card overflow-hidden">
      <div className="space-y-4 border-b border-white/5 p-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray">
            Format visé
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FORMATS.map((x) => (
              <button
                key={x.key}
                type="button"
                onClick={() => setFormat(x.key)}
                aria-pressed={x.key === format}
                title={x.detail}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  x.key === format
                    ? 'border-ats-green/40 bg-ats-green/15 text-ats-green-fg'
                    : 'border-white/10 text-ats-muted hover:border-white/20 hover:text-ats-text'
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ats-gray">{f.detail}</p>
        </div>

        <div>
          <label
            htmlFor="tri-hours"
            className="block text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray"
          >
            Temps disponible par semaine
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <input
              id="tri-hours"
              type="range"
              min={3}
              max={15}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="h-1.5 min-w-[12rem] flex-1 cursor-pointer appearance-none rounded-full bg-ats-card2 accent-ats-green"
            />
            <span className="metric text-2xl font-semibold text-ats-text">
              {fmtHours(hours)}
            </span>
          </div>
        </div>
      </div>

      {/* Barre de répartition */}
      <div className="px-5 pt-5">
        <div className="flex h-2 overflow-hidden rounded-full">
          {DISCIPLINES.map((d) => (
            <div
              key={d.key}
              className={d.cls}
              style={{ width: `${f[d.key] * 100}%` }}
              title={`${d.label} ${Math.round(f[d.key] * 100)} %`}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-px bg-white/5 p-5 sm:grid-cols-3 sm:gap-3 sm:bg-transparent">
        {DISCIPLINES.map((d) => (
          <div key={d.key} className="card-2 p-4">
            <p className={`text-sm font-semibold ${d.text}`}>{d.label}</p>
            <p className="metric mt-1 text-xl font-semibold text-ats-text">
              {fmtHours(hours * f[d.key])}
            </p>
            <p className="mt-0.5 text-[11px] text-ats-gray">
              {Math.round(f[d.key] * 100)} % du volume
            </p>
          </div>
        ))}
      </div>

      <p className="border-t border-white/5 px-5 py-3 text-[11px] leading-relaxed text-ats-gray">
        Répartition indicative, calée sur le poids de chaque discipline dans le
        chrono de course. À ajuster selon ton point faible : si la natation te
        coûte beaucoup de temps le jour J, elle mérite plus que sa part
        théorique. Et ces heures excluent la musculation, à traiter en plus.
      </p>
    </div>
  );
}
