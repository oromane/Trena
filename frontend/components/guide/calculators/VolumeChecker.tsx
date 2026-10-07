'use client';

/**
 * Compteur de séries hebdomadaires par groupe musculaire.
 * Cible : ≥10 séries / groupe / semaine pour l'hypertrophie (ACSM 2026).
 */
import { useState } from 'react';
import { Check, Minus, Plus, TriangleAlert } from 'lucide-react';

const GROUPS = [
  'Pectoraux',
  'Dos',
  'Épaules',
  'Bras',
  'Jambes',
  'Fessiers',
  'Gainage',
];

const TARGET = 10;

export default function VolumeChecker() {
  const [sets, setSets] = useState<Record<string, number>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g, 6]))
  );

  const bump = (g: string, d: number) =>
    setSets((s) => ({ ...s, [g]: Math.max(0, Math.min(30, s[g] + d)) }));

  const total = Object.values(sets).reduce((a, b) => a + b, 0);
  const ok = GROUPS.filter((g) => sets[g] >= TARGET).length;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray">
            Séries par semaine et par groupe
          </p>
          <p className="mt-1 text-sm text-ats-muted">
            Compte tes séries difficiles sur l&apos;ensemble de la semaine, toutes
            séances confondues.
          </p>
        </div>
        <div className="text-right">
          <p className="metric text-2xl font-semibold text-ats-text">
            {ok}
            <span className="text-sm font-normal text-ats-muted">
              /{GROUPS.length}
            </span>
          </p>
          <p className="text-[11px] text-ats-gray">groupes à la cible</p>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {GROUPS.map((g) => {
          const v = sets[g];
          const reached = v >= TARGET;
          return (
            <div key={g} className="flex items-center gap-4 px-5 py-3">
              <span className="w-24 shrink-0 text-sm font-medium text-ats-text">
                {g}
              </span>

              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ats-card2">
                <div
                  className={`h-full rounded-full transition-all ${
                    reached ? 'bg-ats-green' : 'bg-ats-orange'
                  }`}
                  style={{ width: `${Math.min(100, (v / TARGET) * 100)}%` }}
                />
              </div>

              <span
                className={`metric w-8 text-right text-sm font-semibold ${
                  reached ? 'text-ats-green-fg' : 'text-ats-orange-fg'
                }`}
              >
                {v}
              </span>

              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => bump(g, -1)}
                  aria-label={`Retirer une série — ${g}`}
                  className="rounded-lg border border-white/10 p-1.5 text-ats-muted transition-colors hover:bg-ats-card2 hover:text-ats-text"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => bump(g, 1)}
                  aria-label={`Ajouter une série — ${g}`}
                  className="rounded-lg border border-white/10 p-1.5 text-ats-muted transition-colors hover:bg-ats-card2 hover:text-ats-text"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`flex items-start gap-3 border-t border-white/5 px-5 py-4 text-sm ${
          ok === GROUPS.length
            ? 'bg-ats-green/[0.07] text-ats-green-fg'
            : 'bg-ats-orange/[0.07] text-ats-orange-fg'
        }`}
      >
        {ok === GROUPS.length ? (
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <p className="leading-relaxed">
          {ok === GROUPS.length ? (
            <>
              Tous les groupes atteignent 10 séries hebdomadaires — volume
              suffisant pour l&apos;hypertrophie.{' '}
              <span className="text-ats-muted">
                Total : {total} séries sur la semaine.
              </span>
            </>
          ) : (
            <>
              {GROUPS.length - ok} groupe(s) sous la barre des 10 séries. Plutôt
              que d&apos;ajouter une séance entière, commence par ajouter 1 à 2
              séries aux groupes en retard dans les séances existantes.{' '}
              <span className="text-ats-muted">
                Total actuel : {total} séries.
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
