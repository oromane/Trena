import Link from 'next/link';
import {
  Apple,
  ArrowRight,
  BedDouble,
  Clock,
  Dumbbell,
  Footprints,
  ListChecks,
  Moon,
  ShieldAlert,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { SECTIONS } from '@/components/guide/sections';

const ICONS: Record<string, typeof Dumbbell> = {
  Dumbbell,
  ListChecks,
  Footprints,
  Shuffle,
  Apple,
  Moon,
  BedDouble,
  ShieldAlert,
};

const ANSWERS = [
  {
    q: 'Est-ce que courir va me faire perdre le muscle gagné en salle ?',
    href: '/guide/combiner',
    a: 'Non — un peu moins vite, pas moins tout court.',
  },
  {
    q: 'Combien de répétitions pour prendre du muscle ?',
    href: '/guide/programmes',
    a: "Bien plus large qu'on ne le dit : de 6 à 20 et plus.",
  },
  {
    q: 'Dois-je adapter mon entraînement à mon cycle ?',
    href: '/guide/cycle',
    a: "Aucune preuve de bénéfice. Ton ressenti compte, pas le calendrier.",
  },
  {
    q: 'Combien de temps me reposer entre deux séries ?',
    href: '/guide/musculation',
    a: '60–90 s pour le muscle, 2–3 min pour la force.',
  },
];

export default function GuideHome() {
  const totalMin = SECTIONS.reduce((a, s) => a + s.minutes, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-6 xl:max-w-[76rem]">
      {/* Hero */}
      <header>
        <p className="inline-flex items-center gap-2 rounded-full border border-ats-green/25 bg-ats-green/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-ats-green-fg">
          <Sparkles className="h-3 w-3" />
          Fondé sur la littérature scientifique
        </p>
        <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-ats-text sm:text-5xl">
          Comprendre ton entraînement
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ats-muted">
          Pourquoi tel nombre de répétitions, pourquoi ce temps de repos,
          pourquoi 80 % de l&apos;endurance doit être facile, et comment prendre
          du muscle sans sacrifier le cardio. Chaque affirmation renvoie à sa
          source — et quand la science ne sait pas, c&apos;est écrit.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ats-gray">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {SECTIONS.length} chapitres · environ {totalMin} min de lecture
          </span>
          <span>6 outils interactifs</span>
        </div>
      </header>

      {/* Réponses rapides */}
      <section className="mt-14">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
          Réponses rapides
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ANSWERS.map((x) => (
            <Link
              key={x.q}
              href={x.href}
              className="card group p-4 transition-colors hover:bg-ats-card2"
            >
              <p className="text-sm font-semibold text-ats-text">{x.q}</p>
              <p className="mt-1.5 text-sm text-ats-muted">{x.a}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-ats-green-fg">
                Lire le détail
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Sommaire */}
      <section className="mt-14">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
          Les chapitres
        </h2>
        <p className="mt-2 text-sm text-ats-muted">
          Ils se lisent dans l&apos;ordre, mais chacun se tient tout seul.
        </p>
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {SECTIONS.map((s, i) => {
            const Icon = ICONS[s.icon] ?? Dumbbell;
            return (
              <Link
                key={s.slug}
                href={s.href}
                className="card group flex items-start gap-4 p-5 transition-colors hover:bg-ats-card2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ats-green/20 bg-ats-green/10">
                  <Icon className="h-5 w-5 text-ats-green-fg" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="metric text-[11px] text-ats-gray">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-semibold text-ats-text">{s.title}</h3>
                    <span className="text-[11px] text-ats-gray">
                      {s.minutes} min
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ats-muted">
                    {s.summary}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ats-gray transition-transform group-hover:translate-x-0.5 group-hover:text-ats-green-fg" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Principe éditorial */}
      <section className="mt-14">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-ats-text">
            Comment ce guide est écrit
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-ats-muted">
            <p>
              Le milieu du fitness regorge d&apos;affirmations confiantes qui ne
              reposent sur rien. Ce guide fait l&apos;inverse : il distingue
              explicitement ce qui fait consensus, ce qui reste débattu, et ce
              qui relève du marketing.
            </p>
            <p>
              Les sources sont des positions officielles et des méta-analyses
              (ACSM, ISSN, CIO), citées avec leurs auteurs, année, revue et
              DOI. Quand les preuves sont faibles ou contradictoires, c&apos;est
              indiqué plutôt que masqué — y compris lorsque cela contredit des
              conseils très répandus.
            </p>
            <p className="text-ats-gray">
              Contenu pédagogique, pas avis médical. Voir l&apos;avertissement en
              bas de page.
            </p>
          </div>
          <Link
            href="/guide/musculation"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-ats-green/30 bg-ats-green/10 px-4 py-2.5 text-sm font-semibold text-ats-green-fg transition-colors hover:bg-ats-green/20"
          >
            Commencer par la musculation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
