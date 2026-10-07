'use client';

/**
 * Zones de puissance à partir d'un test de 20 minutes.
 *
 * FTP ≈ 95 % de la puissance moyenne tenue 20 min, et zones exprimées en
 * pourcentage de FTP : ce sont des conventions d'entraînement largement
 * adoptées (modèle de Coggan), pas des seuils physiologiques mesurés en
 * laboratoire. Le composant le dit explicitement plutôt que de laisser croire
 * à une précision qu'il n'a pas.
 */
import { useState } from 'react';

const ZONES = [
  { n: 1, label: 'Récupération active', lo: 0, hi: 0.55, cls: 'text-ats-blue', bar: 'bg-ats-blue' },
  { n: 2, label: 'Endurance', lo: 0.56, hi: 0.75, cls: 'text-ats-green', bar: 'bg-ats-green' },
  { n: 3, label: 'Tempo', lo: 0.76, hi: 0.9, cls: 'text-ats-green', bar: 'bg-ats-greendark' },
  { n: 4, label: 'Seuil', lo: 0.91, hi: 1.05, cls: 'text-ats-violet', bar: 'bg-ats-violet' },
  { n: 5, label: 'VO2max', lo: 1.06, hi: 1.2, cls: 'text-ats-orange', bar: 'bg-ats-orange' },
  { n: 6, label: 'Capacité anaérobie', lo: 1.21, hi: 1.5, cls: 'text-ats-red', bar: 'bg-ats-red' },
];

export default function FtpZones() {
  const [p20, setP20] = useState(200);
  const ftp = Math.round(p20 * 0.95);

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-white/5 p-5">
        <label
          htmlFor="p20"
          className="block text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray"
        >
          Puissance moyenne tenue sur 20 minutes
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <input
            id="p20"
            type="range"
            min={80}
            max={400}
            step={5}
            value={p20}
            onChange={(e) => setP20(Number(e.target.value))}
            className="h-1.5 min-w-[12rem] flex-1 cursor-pointer appearance-none rounded-full bg-ats-card2 accent-ats-green"
          />
          <div className="flex items-baseline gap-1.5">
            <span className="metric text-2xl font-semibold text-ats-text">{p20}</span>
            <span className="text-xs text-ats-muted">W</span>
          </div>
        </div>
        <p className="mt-4 flex items-baseline gap-2">
          <span className="text-sm text-ats-muted">FTP estimée</span>
          <span className="metric text-3xl font-semibold text-ats-green">{ftp}</span>
          <span className="text-xs text-ats-muted">W</span>
        </p>
      </div>

      <div className="divide-y divide-white/5">
        {ZONES.map((z) => (
          <div key={z.n} className="px-5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <p className={`text-sm font-semibold ${z.cls}`}>
                Z{z.n} — {z.label}
              </p>
              <p className="metric text-sm font-semibold text-ats-text">
                {Math.round(ftp * z.lo)} – {Math.round(ftp * z.hi)}
                <span className="ml-1 text-[10px] font-normal text-ats-muted">W</span>
              </p>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ats-card2">
              <div
                className={`h-full rounded-full ${z.bar}`}
                style={{
                  marginLeft: `${Math.min(100, z.lo * 66)}%`,
                  width: `${Math.min(100 - z.lo * 66, (z.hi - z.lo) * 66)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="border-t border-white/5 px-5 py-3 text-[11px] leading-relaxed text-ats-gray">
        Convention d&apos;entraînement, pas une mesure de laboratoire. Le
        coefficient de 95 % et les bornes de zones sont des repères largement
        utilisés, mais ta FTP réelle dépend de ton pacing sur le test et de ta
        fraîcheur ce jour-là. Sans capteur de puissance, raisonne en sensations
        et au test de la parole.
      </p>
    </div>
  );
}
