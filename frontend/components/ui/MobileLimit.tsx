'use client';

/**
 * Liste limitée à `limit` éléments sur mobile, complète sur desktop (P3-11).
 * Les éléments sont rendus côté serveur et seulement masqués en CSS.
 */
import { Children, useState } from 'react';

export default function MobileLimit({
  limit,
  children,
  noun = 'éléments',
}: {
  limit: number;
  children: React.ReactNode;
  /** Nom pluriel affiché dans le bouton. Une chaîne et non une fonction :
   *  un composant serveur ne peut pas passer de fonction à un composant client. */
  noun?: string;
}) {
  const [all, setAll] = useState(false);
  const items = Children.toArray(children);
  const hidden = items.length - limit;
  return (
    <>
      {items.map((child, i) => (
        <div key={i} className={!all && i >= limit ? 'hidden md:block' : undefined}>
          {child}
        </div>
      ))}
      {hidden > 0 && !all && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="w-full px-5 py-3 text-center text-xs font-medium text-ats-muted transition-colors hover:text-ats-text md:hidden"
        >
          Afficher {hidden} {noun} de plus
        </button>
      )}
    </>
  );
}
