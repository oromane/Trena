/**
 * Sommaire latéral, visible uniquement sur écran large.
 *
 * Sur un écran de 1920 px, le guide laissait plus de 800 px inutilisés de part
 * et d'autre du texte. Élargir la colonne de lecture aurait été contre-productif
 * — au-delà d'environ 75 caractères par ligne, l'œil peine à retrouver le début
 * de la ligne suivante. La marge sert donc à la navigation : les chapitres
 * restent visibles en permanence, sans remonter en haut de page.
 */
import Link from 'next/link';
import { SECTIONS, SOURCES_PAGE } from '@/components/guide/sections';

export default function GuideToc({ current }: { current?: string }) {
  return (
    <aside className="hidden xl:block">
      <nav
        aria-label="Chapitres du guide"
        className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto pb-8"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-ats-gray">
          Chapitres
        </p>
        <ol className="mt-3 space-y-0.5">
          {SECTIONS.map((s, i) => {
            const active = s.slug === current;
            return (
              <li key={s.slug}>
                <Link
                  href={s.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex gap-2.5 rounded-lg py-1.5 pl-2.5 pr-2 text-[13px] leading-snug transition-colors ${
                    active
                      ? 'bg-ats-green/10 font-semibold text-ats-green'
                      : 'text-ats-muted hover:bg-ats-card2 hover:text-ats-text'
                  }`}
                >
                  <span
                    className={`metric shrink-0 text-[10px] ${
                      active ? 'text-ats-green' : 'text-ats-gray'
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">{s.label}</span>
                </Link>
              </li>
            );
          })}
        </ol>

        <Link
          href={SOURCES_PAGE.href}
          aria-current={current === 'sources' ? 'page' : undefined}
          className={`mt-3 flex items-center gap-2.5 rounded-lg border-t border-white/5 py-2.5 pl-2.5 pr-2 text-[13px] transition-colors ${
            current === 'sources'
              ? 'font-semibold text-ats-blue'
              : 'text-ats-gray hover:text-ats-text'
          }`}
        >
          {SOURCES_PAGE.label}
        </Link>
      </nav>
    </aside>
  );
}
