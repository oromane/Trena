'use client';

/**
 * Frontière d'erreur du dashboard : évite la page blanche « Application error »
 * si une action serveur ou un rendu lève une exception. Permet de réessayer
 * sans perdre la session.
 */
import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-xl font-bold text-ats-text">Une erreur est survenue</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-ats-muted">
        Le tableau de bord n&apos;a pas pu se charger. Tes données sont intactes —
        réessaie ou recharge la page.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-ats-green px-5 py-2.5 text-sm font-semibold text-ats-bg transition-transform hover:scale-[1.02]"
        >
          Réessayer
        </button>
        <a
          href="/dashboard"
          className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-ats-text/90 hover:bg-white/5"
        >
          Recharger
        </a>
      </div>
      {error.digest && (
        <p className="metric mt-4 text-[11px] text-ats-gray">réf. {error.digest}</p>
      )}
    </div>
  );
}
