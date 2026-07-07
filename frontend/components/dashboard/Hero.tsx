'use client';

/**
 * HERO — la décision du jour en un regard :
 * salutation, objectif + J-x, anneau de probabilité animé, état global.
 */
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

const RING = { size: 210, stroke: 11, r: 92 };

const STATE: Record<string, { label: string; sub: string; color: string }> = {
  NORMAL: { label: 'Excellent', sub: 'Prêt à performer', color: '#00E676' },
  CAUTION: { label: 'Vigilance', sub: 'Intensité plafonnée', color: '#F59E0B' },
  REDUCE: { label: 'Récupération', sub: 'Protège ton objectif', color: '#EF4444' },
};

/** Ligne ECG animée : le pouls de Trena. */
function PulseLine({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 640 40"
      preserveAspectRatio="none"
      className="h-8 w-full opacity-60"
      aria-hidden
    >
      <path
        className="ecg-path"
        d="M0 20 H180 L200 20 L210 6 L222 34 L232 12 L240 20 H330 L350 20 L360 8 L372 32 L382 14 L390 20 H520 L540 20 L550 4 L562 36 L572 10 L580 20 H640"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Hero({
  name,
  objectiveTitle,
  daysRemaining,
  probability,
  readiness,
  readinessDetail,
}: {
  name: string;
  objectiveTitle: string | null;
  daysRemaining: number | null;
  probability: number; // 0..1
  readiness: 'NORMAL' | 'CAUTION' | 'REDUCE';
  readinessDetail: string;
}) {
  const pct = Math.round(probability * 100);
  const circumference = 2 * Math.PI * RING.r;
  const progress = useMotionValue(0);
  const dashOffset = useTransform(progress, (v) => circumference * (1 - v));
  const [display, setDisplay] = useState(0);
  const state = STATE[readiness] ?? STATE.NORMAL;

  useEffect(() => {
    const controls = animate(progress, probability, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v * 100)),
    });
    return controls.stop;
  }, [probability, progress]);

  return (
    <section className="relative overflow-hidden">
      {/* halo discret derrière l'anneau */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-[0.07]"
        style={{ background: `radial-gradient(closest-side, ${state.color}, transparent)` }}
      />
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 pb-10 pt-8 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-10 md:pb-12 md:pt-14">
        <div className="max-w-xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-ats-muted"
          >
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-2 text-4xl font-bold tracking-tight md:text-5xl"
          >
            Bonjour {name}
          </motion.h1>

          {objectiveTitle ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1"
            >
              <span className="text-lg text-ats-text/90">{objectiveTitle}</span>
              {daysRemaining !== null && (
                <span className="metric text-sm font-medium text-ats-blue">
                  J-{daysRemaining}
                </span>
              )}
            </motion.div>
          ) : (
            <p className="mt-5 text-ats-muted">
              Aucun objectif actif : définis-en un pour activer le cockpit.
            </p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/5 bg-ats-card px-4 py-2"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: state.color, boxShadow: `0 0 12px ${state.color}` }}
            />
            <div className="text-sm">
              <span className="font-semibold" style={{ color: state.color }}>
                {state.label}
              </span>
              <span className="text-ats-muted"> · {state.sub}</span>
            </div>
          </motion.div>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-ats-muted">
            {readinessDetail}
          </p>
        </div>

        {/* Anneau de probabilité */}
        <div className="relative mx-auto shrink-0 md:mx-0" style={{ width: RING.size, height: RING.size }}>
          <svg width={RING.size} height={RING.size} className="-rotate-90">
            <circle
              cx={RING.size / 2}
              cy={RING.size / 2}
              r={RING.r}
              fill="none"
              stroke="#1A2238"
              strokeWidth={RING.stroke}
            />
            <motion.circle
              cx={RING.size / 2}
              cy={RING.size / 2}
              r={RING.r}
              fill="none"
              stroke={pct >= 70 ? '#00E676' : pct >= 50 ? '#F59E0B' : '#EF4444'}
              strokeWidth={RING.stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: dashOffset }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="metric text-5xl font-semibold">{display}%</span>
            <span className="mt-1 text-[11px] uppercase tracking-[0.2em] text-ats-muted">
              Probabilité
            </span>
          </div>
        </div>
      </div>

      {/* Le pouls de Trena */}
      <div className="mx-auto max-w-6xl px-6 pb-2">
        <PulseLine color={state.color} />
      </div>
    </section>
  );
}
