'use client';

/**
 * Infobulle explicative « i » : définition, mode de calcul et interprétation
 * d'une métrique. Ouverture au survol (desktop) et au clic (mobile).
 */
import { Info } from 'lucide-react';
import { useState } from 'react';

export default function InfoTooltip({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={title ? `Explication : ${title}` : 'Explication'}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-ats-gray transition-colors hover:text-ats-text"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-6 z-40 w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-ats-card2 p-3 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-ats-muted shadow-xl"
        >
          {title && (
            <span className="mb-1 block font-semibold text-ats-text">{title}</span>
          )}
          {children}
        </span>
      )}
    </span>
  );
}
