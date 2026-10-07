/**
 * Bandeau d'accueil — l'état physiologique du jour.
 *
 * Le site ne planifie plus de séance : il n'y a donc ni objectif ni séance à
 * venir à afficher. Ce bandeau répond à une seule question — « dans quel état
 * suis-je aujourd'hui, d'après ma montre ? ».
 */
import Link from 'next/link';
import { Flame, Watch } from 'lucide-react';
import type { DashboardOverview } from '@/lib/engine';
import AskButton from '@/components/advisor/AskButton';

// `color` : halo et pastille (décor). `text` : libellé, en variante lisible.
const STATE: Record<string, { label: string; sub: string; color: string; text: string }> = {
  NORMAL: { label: 'Excellent', sub: 'Récupération au rendez-vous', color: '#2E8B57', text: 'text-ats-green-fg' },
  CAUTION: { label: 'Vigilance', sub: 'Récupération incomplète', color: '#FF4500', text: 'text-ats-orange-fg' },
  REDUCE: { label: 'Récupération', sub: 'Fatigue marquée', color: '#DC4437', text: 'text-ats-red-fg' },
};

export default function HomeHero({
  name,
  data,
  garminLinked,
}: {
  name: string;
  data: DashboardOverview;
  garminLinked: boolean;
}) {
  const state = STATE[data.readiness.level] ?? STATE.NORMAL;

  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-[0.08]"
        style={{
          background: `radial-gradient(closest-side, ${state.color}, transparent)`,
        }}
      />
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 md:pt-12 2xl:max-w-[88rem]">
        <p className="text-sm capitalize text-ats-muted">
          {new Date(data.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">
          Bonjour {name}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/5 bg-ats-card px-4 py-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: state.color, boxShadow: `0 0 12px ${state.color}` }}
            />
            <span className="text-sm">
              <span className={`font-semibold ${state.text}`}>
                {state.label}
              </span>
              <span className="text-ats-muted"> · {state.sub}</span>
            </span>
          </span>

          {data.streak_weeks > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ats-orange/25 bg-ats-orange/10 px-3.5 py-2 text-xs font-medium text-ats-orange-fg">
              <Flame className="h-3.5 w-3.5" />
              {data.streak_weeks} semaine{data.streak_weeks > 1 ? 's' : ''} d&apos;affilée
            </span>
          )}

          {!garminLinked && (
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 rounded-full border border-ats-green/30 bg-ats-green/10 px-3.5 py-2 text-xs font-medium text-ats-green-fg transition-colors hover:bg-ats-green/20"
            >
              <Watch className="h-3.5 w-3.5" />
              Lier ma montre
            </Link>
          )}
        </div>

        <p className="mt-3 max-w-xl text-xs leading-relaxed text-ats-muted">
          {data.readiness.detail}
        </p>
        <AskButton
          question="Explique-moi mon état de récupération du jour et ce que je peux faire aujourd'hui."
          label="Pourquoi ?"
          className="mt-2"
        />
      </div>
    </section>
  );
}
