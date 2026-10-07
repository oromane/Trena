'use client';

/**
 * Section repliée sur mobile, toujours ouverte sur desktop (P3-11).
 *
 * Pur CSS côté rendu : le contenu est `hidden md:block` tant qu'il n'est pas
 * ouvert. Aucun calcul de point de rupture en JS, donc aucun décalage
 * d'hydratation ni flash au chargement.
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function MobileCollapse({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="card flex w-full items-center gap-3 px-4 py-3 text-left md:hidden"
      >
        <span className="flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
            {title}
          </span>
          {summary && <span className="mt-0.5 block text-sm text-ats-text">{summary}</span>}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ats-gray transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={open ? 'mt-4 space-y-12 md:mt-0' : 'hidden space-y-12 md:block'}>{children}</div>
    </div>
  );
}
