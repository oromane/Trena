/**
 * Dashboard — données Garmin.
 *
 * Le site ne planifie ni n'enregistre de séance. Tout ce qui s'affiche ici
 * provient de la synchronisation de la montre : métriques physiologiques
 * quotidiennes et activités importées, agrégées toutes disciplines.
 */
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import HomeHero from '@/components/home/HomeHero';
import TotalsPanel from '@/components/home/TotalsPanel';
import DisciplineTiles from '@/components/home/DisciplineTiles';
import ActivityFeed from '@/components/home/ActivityFeed';
import PhysioGrid from '@/components/dashboard/PhysioGrid';
import { createSupabaseServer } from '@/lib/supabase/server';
import { ensureProfile } from '@/app/actions';
import { getAdvisorDaily, getDashboardOverview, getGarminStatus, getSocialFeed } from '@/lib/engine';
import { FriendsCard } from '@/components/social/FriendFeed';
import DailyCard from '@/components/advisor/DailyCard';

function freshnessLabel(dateStr: string, today: string): string {
  const diff = Math.round(
    (new Date(today).getTime() - new Date(dateStr).getTime()) / 86400000
  );
  if (diff <= 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  return `il y a ${diff} jours`;
}

export default async function DashboardPage() {
  await ensureProfile();
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [overview, { data: profile }, garmin, daily, friends] = await Promise.all([
    getDashboardOverview(user!.id),
    supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle(),
    getGarminStatus(user!.id),
    getAdvisorDaily(user!.id),
    getSocialFeed(user!.id),
  ]);

  const rawName = user?.email?.split('@')[0] ?? 'athlète';
  const fallback = rawName.charAt(0).toUpperCase() + rawName.slice(1).split('.')[0];
  const name = profile?.full_name?.split(' ')[0] || fallback;

  if (!overview) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-6xl px-6 py-16 2xl:max-w-[88rem]">
          <h1 className="text-2xl font-bold">Bonjour {name}</h1>
          <div className="card mt-6 p-6 text-sm text-ats-muted">
            Le moteur est momentanément injoignable. Recharge la page dans
            quelques secondes : tes données sont intactes.
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="pb-4">
        <HomeHero name={name} data={overview} garminLinked={garmin.linked} />

        <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6 2xl:max-w-[88rem]">
          {daily && <DailyCard daily={daily} />}

          {/* ------------------------------------------ état physiologique */}
          <section>
            <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
              État physiologique
            </h2>
            {overview.last_metric_date && (
              <p className="-mt-1 mb-3 text-[11px] text-ats-gray">
                Dernières données :{' '}
                {freshnessLabel(overview.last_metric_date, overview.date)}
                {overview.physio.hrv?.today == null && (
                  <>
                    {' · '}
                    <Link href="/profile" className="text-ats-green hover:underline">
                      synchroniser Garmin
                    </Link>
                  </>
                )}
              </p>
            )}
            <PhysioGrid physio={overview.physio} />
          </section>

          <TotalsPanel data={overview} />

          <DisciplineTiles data={overview} />

          <ActivityFeed data={overview} />

          <FriendsCard friends={friends} today={overview.date} />

          {/* ------------------------------------------ passerelle guide */}
          <section>
            <Link
              href="/guide"
              className="card group flex items-center justify-between gap-4 p-5 transition-colors hover:bg-ats-card2"
            >
              <div>
                <p className="flex items-center gap-2 font-semibold text-ats-text">
                  <BookOpen className="h-4 w-4 text-ats-green" />
                  Comprendre ton entraînement
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ats-muted">
                  Le guide : répétitions, séries, repos, zones d&apos;endurance,
                  nutrition et cycle menstruel — chaque affirmation sourcée.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-ats-gray transition-transform group-hover:translate-x-0.5 group-hover:text-ats-green" />
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
