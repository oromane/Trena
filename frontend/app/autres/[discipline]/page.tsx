import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Info, Watch } from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import VeloContent from '@/components/disciplines/content/VeloContent';
import NatationContent from '@/components/disciplines/content/NatationContent';
import TriathlonContent from '@/components/disciplines/content/TriathlonContent';
import Bibliography from '@/components/guide/Bibliography';
import { createSupabaseServer } from '@/lib/supabase/server';
import {
  getDisciplineSessions,
  getDisciplineStats,
  SLUG_TO_DISCIPLINE,
} from '@/lib/disciplines';
import { fmtDistance, fmtDuration, relativeDay } from '@/components/home/shared';

/** Libellés locaux : plus besoin d'interroger le moteur pour les afficher. */
const LABELS: Record<string, string> = {
  velo: 'Vélo',
  natation: 'Natation',
  triathlon: 'Triathlon',
};

/**
 * La kiné n'a pas de valeur dans l'enum `discipline` en base. Elle reste
 * annoncée, mais sans page de suivi.
 */
const COMING_SOON: Record<string, { label: string; why: string }> = {
  kine: {
    label: 'Kiné',
    why: "Le suivi de rééducation demande un modèle de données différent — zone traitée, niveau de douleur, adhérence aux exercices prescrits — et une valeur de discipline qui n'existe pas encore en base. Une migration SQL est nécessaire avant d'ouvrir ce module.",
  },
};

/** Contenu pédagogique propre à chaque discipline. */
const CONTENT: Record<string, () => React.ReactNode> = {
  velo: VeloContent,
  natation: NatationContent,
  triathlon: TriathlonContent,
};

/**
 * Références mobilisées par chaque page, pour la bibliographie de fin.
 * Doit rester aligné sur les <Cite> et <CiteGroup> du contenu correspondant.
 */
const CONTENT_REFS: Record<string, string[]> = {
  velo: ['wilson2012', 'seiler2006', 'acsm2026'],
  natation: ['wilson2012', 'ioc2023'],
  triathlon: ['wilson2012', 'seiler2006', 'ioc2023', 'acsm2026'],
};

export function generateStaticParams() {
  return [...Object.keys(SLUG_TO_DISCIPLINE), ...Object.keys(COMING_SOON)].map(
    (discipline) => ({ discipline })
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card-2 p-4">
      <p className="metric text-xl font-semibold text-ats-text">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-ats-muted">{label}</p>
    </div>
  );
}

export default async function DisciplinePage({
  params,
}: {
  params: Promise<{ discipline: string }>;
}) {
  const { discipline: slug } = await params;

  const pending = COMING_SOON[slug];
  if (pending) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <Link
            href="/autres"
            className="inline-flex items-center gap-1.5 text-xs text-ats-muted hover:text-ats-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Autres disciplines
          </Link>
          <h1 className="mt-4 text-3xl font-bold">{pending.label}</h1>
          <div className="card mt-6 flex gap-3 p-5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-ats-blue-fg" />
            <div>
              <p className="font-semibold text-ats-text">Pas encore disponible</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ats-muted">
                {pending.why}
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const code = SLUG_TO_DISCIPLINE[slug];
  if (!code) notFound();

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [sessions, stats] = await Promise.all([
    getDisciplineSessions(code, user.id),
    getDisciplineStats(code, user.id),
  ]);

  const label = LABELS[slug] ?? slug;
  const today = new Date().toISOString().slice(0, 10);
  const Content = CONTENT[slug];
  const refIds = CONTENT_REFS[slug] ?? [];
  const hasData = (stats?.all_time.sessions ?? 0) > 0;

  return (
    <>
      <Nav />
      {/*
        Lecture à gauche, données Garmin de la discipline à droite. Les
        activités ne sont plus saisies à la main : elles proviennent
        exclusivement de la synchronisation de la montre.
      */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 xl:max-w-6xl 2xl:max-w-[75rem]">
        <div>
          <Link
            href="/autres"
            className="inline-flex items-center gap-1.5 text-xs text-ats-muted hover:text-ats-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Autres disciplines
          </Link>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{label}</h1>
        </div>

        <div className="mt-8 flex flex-col gap-12 xl:grid xl:grid-cols-[minmax(0,1fr)_24rem]">
          {/* -------------------------------------- colonne de lecture */}
          <div className="order-2 max-w-3xl space-y-14 xl:order-1">
            {Content && (
              <>
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
                    <BookOpen className="h-3.5 w-3.5" />
                    Comprendre {label.toLowerCase()}
                  </p>
                </div>
                <Content />
                <div className="border-t border-white/5 pt-10">
                  <Bibliography ids={refIds} title="Sources de cette page" />
                </div>
              </>
            )}
          </div>

          {/* -------------------------------------- colonne données Garmin */}
          <div className="order-1 mb-14 space-y-8 xl:sticky xl:top-24 xl:order-2 xl:mb-0 xl:self-start">
            {stats && hasData ? (
              <>
                <section>
                  <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
                    Ce mois-ci
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
                    <Stat value={String(stats.month.sessions)} label="séances" />
                    <Stat
                      value={fmtDuration(stats.month.minutes)}
                      label="temps total"
                    />
                    <Stat
                      value={fmtDistance(stats.month.distance_m)}
                      label="distance"
                    />
                    <Stat
                      value={
                        stats.longest_distance_m
                          ? fmtDistance(stats.longest_distance_m)
                          : '—'
                      }
                      label="plus longue sortie"
                    />
                  </div>
                </section>

                <section>
                  <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
                    Activités récentes
                  </h2>
                  <div className="xl:max-h-[26rem] xl:overflow-y-auto">
                    <ul className="card divide-y divide-white/5 overflow-hidden">
                      {sessions.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-start gap-4 px-5 py-4"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-ats-text">
                              {s.title || s.session_type_label}
                            </p>
                            <p className="mt-0.5 text-[11px] text-ats-gray">
                              {relativeDay(s.date, today)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="metric text-sm font-semibold text-ats-text">
                              {fmtDuration(s.duration_minutes)}
                            </p>
                            <p className="metric text-[11px] text-ats-muted">
                              {s.distance_m ? fmtDistance(s.distance_m) : ''}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              </>
            ) : (
              <section className="card p-6">
                <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ats-blue-fg">
                  <Watch className="h-3.5 w-3.5" />
                  Aucune activité
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ats-muted">
                  Les activités de cette discipline apparaîtront ici après la
                  synchronisation de ta montre. Rien ne se saisit à la main.
                </p>
                <Link
                  href="/profile"
                  className="mt-4 inline-flex items-center rounded-xl border border-ats-green/30 bg-ats-green/10 px-4 py-2 text-sm font-semibold text-ats-green-fg transition-colors hover:bg-ats-green/20"
                >
                  Synchroniser Garmin
                </Link>
              </section>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
