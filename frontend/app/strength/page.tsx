/**
 * Musculation — hub documentaire.
 *
 * Le module ne planifie ni n'enregistre de séance : il donne accès au
 * catalogue d'exercices en consultation et aux chapitres du guide qui
 * expliquent comment s'en servir.
 */
import Link from 'next/link';
import { ArrowRight, BookOpen, Dumbbell, ListChecks, Shuffle } from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const CHAPITRES = [
  {
    href: '/guide/musculation',
    icon: Dumbbell,
    title: 'La musculation, expliquée',
    desc: "Pourquoi tel nombre de répétitions, de séries, tel temps de repos. Ce qui fait vraiment grossir un muscle — et ce qui n'y change rien.",
  },
  {
    href: '/guide/programmes',
    icon: ListChecks,
    title: 'Choisir son programme',
    desc: 'Prise de masse, sèche, force, endurance musculaire : ce que chaque objectif change concrètement dans la séance.',
  },
  {
    href: '/guide/combiner',
    icon: Shuffle,
    title: 'Muscler et courir en même temps',
    desc: "L'effet d'interférence : ce que le cardio coûte vraiment aux gains musculaires, et comment l'annuler presque entièrement.",
  },
];

export const metadata = { title: 'Musculation — Trena' };

export default function StrengthPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-12 2xl:max-w-[88rem]">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Musculation</h1>
          <p className="mt-1 max-w-2xl text-ats-muted">
            Le catalogue d&apos;exercices et les repères pour comprendre comment
            construire une séance.
          </p>
        </div>

        <section>
          <Link
            href="/strength/exercises"
            className="card group flex items-center gap-5 p-6 transition-colors hover:bg-ats-card2"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-ats-green/20 bg-ats-green/10">
              <Dumbbell className="h-6 w-6 text-ats-green" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-ats-text">
                Catalogue d&apos;exercices
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ats-muted">
                Plus de 1200 mouvements avec photo, muscles sollicités,
                matériel nécessaire et repères d&apos;exécution.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-ats-gray transition-transform group-hover:translate-x-0.5 group-hover:text-ats-green" />
          </Link>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
            <BookOpen className="h-3.5 w-3.5" />
            Comprendre
          </h2>
          <div className="grid gap-3 lg:grid-cols-3">
            {CHAPITRES.map(({ href, icon: Icon, title, desc }) => (
              <Link
                key={href}
                href={href}
                className="card group p-5 transition-colors hover:bg-ats-card2"
              >
                <Icon className="h-5 w-5 text-ats-green" />
                <p className="mt-3 font-semibold text-ats-text">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ats-muted">
                  {desc}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-ats-green">
                  Lire
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
