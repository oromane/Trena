/**
 * Gabarit d'une page de section : en-tête, contenu, navigation prev/next.
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { neighbours, sectionIndex, SECTIONS } from '@/components/guide/sections';
import Bibliography from '@/components/guide/Bibliography';
import GuideToc from '@/components/guide/GuideToc';

export default function GuidePage({
  slug,
  intro,
  children,
}: {
  slug: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  const i = sectionIndex(slug);
  const section = SECTIONS[i];
  const { prev, next } = neighbours(slug);

  return (
    /*
      Sur écran large, le sommaire occupe la marge gauche et la colonne de
      lecture conserve sa largeur : c'est la lisibilité qui prime, pas le
      remplissage de l'écran.
    */
    <div className="mx-auto max-w-4xl px-4 sm:px-6 xl:grid xl:max-w-[76rem] xl:grid-cols-[13rem_minmax(0,1fr)] xl:gap-12">
      <GuideToc current={slug} />
      <article className="min-w-0 pb-20 pt-10">
      <header className="border-b border-white/5 pb-8">
        <p className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
          <span>
            Chapitre {i + 1} / {SECTIONS.length}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {section.minutes} min
          </span>
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ats-text sm:text-4xl">
          {section.title}
        </h1>
        <div className="mt-4 text-lg leading-relaxed text-ats-muted">{intro}</div>
      </header>

      <div className="mt-12 space-y-14">{children}</div>

      <div className="mt-16 border-t border-white/5 pt-10">
        <Bibliography slug={slug} />
      </div>

      <nav className="mt-16 grid gap-3 border-t border-white/5 pt-8 sm:grid-cols-2">
        {prev ? (
          <Link
            href={prev.href}
            className="card group p-4 transition-colors hover:bg-ats-card2"
          >
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-ats-gray">
              <ArrowLeft className="h-3 w-3" />
              Précédent
            </span>
            <span className="mt-1 block font-semibold text-ats-text">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={next.href}
            className="card group p-4 text-right transition-colors hover:bg-ats-card2"
          >
            <span className="flex items-center justify-end gap-1.5 text-[11px] uppercase tracking-[0.18em] text-ats-gray">
              Suivant
              <ArrowRight className="h-3 w-3" />
            </span>
            <span className="mt-1 block font-semibold text-ats-text">
              {next.title}
            </span>
          </Link>
        )}
        </nav>
      </article>
    </div>
  );
}
