import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Hero from '@/components/dashboard/Hero';
import PhysioGrid from '@/components/dashboard/PhysioGrid';
import SessionCard from '@/components/dashboard/SessionCard';
import ObjectiveCard from '@/components/dashboard/ObjectiveCard';
import ProbabilityCard from '@/components/dashboard/ProbabilityCard';
import TrajectoryChart from '@/components/dashboard/TrajectoryChart';
import CalendarView from '@/components/dashboard/CalendarView';
import LoadChart from '@/components/dashboard/LoadChart';
import HistoryTimeline from '@/components/dashboard/HistoryTimeline';
import InsightsCard from '@/components/dashboard/InsightsCard';
import RaceWeekCard from '@/components/dashboard/RaceWeekCard';
import InfoTooltip from '@/components/InfoTooltip';
import { createSupabaseServer } from '@/lib/supabase/server';
import { ensureProfile } from '@/app/actions';
import {
  getCalendarStatus,
  getDashboardSummary,
  getWorkoutTemplates,
} from '@/lib/engine';

const CALENDAR_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  linked: { text: 'Google Calendar lié avec succès.', ok: true },
  denied: { text: 'Autorisation refusée côté Google.', ok: false },
  state_error: { text: 'Session OAuth expirée : réessaie.', ok: false },
  exchange_error: { text: "Échec de l'échange de tokens : réessaie.", ok: false },
  config_error: { text: 'Google OAuth non configuré côté serveur.', ok: false },
  publish_error: {
    text: "Échec de la publication : vérifie que l'API Google Calendar est activée.",
    ok: false,
  },
  purge_error: { text: 'Échec du nettoyage du calendrier : réessaie.', ok: false },
};

function calendarMessage(flag?: string) {
  if (!flag) return undefined;
  if (flag.startsWith('published_')) {
    const n = flag.slice('published_'.length);
    return { text: `${n} séance(s) publiée(s) dans ton calendrier.`, ok: true };
  }
  if (flag.startsWith('purged_')) {
    const n = flag.slice('purged_'.length);
    return {
      text: `Calendrier nettoyé : ${n} événement(s) Trena supprimé(s). Tu peux republier le plan proprement.`,
      ok: true,
    };
  }
  return CALENDAR_MESSAGES[flag];
}

function SectionLabel({
  children,
  info,
}: {
  children: React.ReactNode;
  info?: React.ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
      {children}
      {info}
    </h2>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string }>;
}) {
  await ensureProfile();
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { calendar: calendarFlag } = await searchParams;
  const calendarMsg = calendarMessage(calendarFlag);

  const [summary, calStatus, { data: profile }] = await Promise.all([
    getDashboardSummary(user!.id),
    getCalendarStatus(user!.id),
    supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle(),
  ]);
  const templates = await getWorkoutTemplates();

  const rawName = user?.email?.split('@')[0] ?? 'athlète';
  const fallback = rawName.charAt(0).toUpperCase() + rawName.slice(1).split('.')[0];
  const name = profile?.full_name?.split(' ')[0] || fallback;

  if (!summary) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-6xl px-6 py-16">
          <h1 className="text-2xl font-bold">Bonjour {name}</h1>
          <div className="card mt-6 p-6 text-sm text-ats-muted">
            Le moteur de performance est momentanément injoignable. Recharge la page
            dans quelques secondes : tes données sont intactes.
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
        {calendarMsg && (
          <div className="mx-auto max-w-6xl px-6 pt-4">
            <p
              className={`rounded-xl border px-4 py-2.5 text-sm ${
                calendarMsg.ok
                  ? 'border-ats-green/20 bg-ats-green/5 text-ats-green'
                  : 'border-ats-red/20 bg-ats-red/5 text-ats-red'
              }`}
            >
              {calendarMsg.text}
            </p>
          </div>
        )}

        {/* HERO */}
        <Hero
          name={name}
          objectiveTitle={summary.objective?.title ?? null}
          daysRemaining={summary.objective?.days_remaining ?? null}
          probability={summary.probability.value}
          readiness={summary.readiness.level}
          readinessDetail={summary.readiness.detail}
        />

        <div className="mx-auto max-w-6xl space-y-12 px-6">
          {/* MODE COURSE (J-7 → J-0) */}
          {summary.race_week && (
            <section>
              <SectionLabel>Semaine de course</SectionLabel>
              <RaceWeekCard race={summary.race_week} />
            </section>
          )}

          {/* ÉTAT PHYSIOLOGIQUE */}
          <section>
            <SectionLabel>État physiologique</SectionLabel>
            <PhysioGrid physio={summary.physio} />
          </section>

          {/* DÉCISION DU JOUR */}
          <section className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SectionLabel>Séance recommandée</SectionLabel>
              <SessionCard
                session={summary.today_session}
                workout={summary.workout}
                readiness={summary.readiness}
                gainPct={summary.probability.gain_if_completed_pct}
              />
            </div>
            <div className="lg:col-span-2">
              <SectionLabel>Objectif</SectionLabel>
              <ObjectiveCard
                objective={summary.objective}
                weeklyLoad={summary.weekly_load}
                today={summary.date}
              />
            </div>
          </section>

          {/* TRAJECTOIRE + PROBABILITÉ */}
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionLabel
                info={
                  <InfoTooltip title="Modèle de Banister">
                    Modèle Fitness-Fatigue : chaque séance ajoute de l&apos;aptitude
                    (décroissance lente, ~42 j) et de la fatigue (décroissance rapide,
                    ~7 j). La Forme = aptitude − fatigue, prédit ta capacité à
                    performer. Trena projette ces 3 courbes jusqu&apos;au jour J.
                  </InfoTooltip>
                }
              >
                Trajectoire · modèle de Banister
              </SectionLabel>
              <div className="card p-5">
                <TrajectoryChart
                  trajectory={summary.trajectory}
                  targetDate={summary.objective?.target_date ?? null}
                />
              </div>
            </div>
            <div>
              <SectionLabel
                info={
                  <InfoTooltip title="Probabilité de réussite">
                    Estimation déterministe de tes chances d&apos;atteindre ton chrono
                    cible : adhérence au plan (50 %) + fraîcheur Banister (30 %) +
                    disponibilité du jour (20 %).
                  </InfoTooltip>
                }
              >
                Probabilité
              </SectionLabel>
              <ProbabilityCard probability={summary.probability} />
            </div>
          </section>

          {/* CALENDRIER */}
          <section id="calendrier" className="scroll-mt-20">
            <SectionLabel>Calendrier</SectionLabel>
            <div className="card p-5">
              <CalendarView
                calendarLinked={calStatus.linked}
                templates={templates}
              />
            </div>
          </section>

          {/* CHARGE + ANALYSE */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div>
              <SectionLabel>Charge hebdomadaire</SectionLabel>
              <div className="card p-5">
                <LoadChart weeklyLoad={summary.weekly_load} />
              </div>
            </div>
            <div>
              <SectionLabel
                info={
                  <InfoTooltip title="Analyse">
                    Insights déterministes : chaque conclusion (tendance HRV,
                    monotonie de Foster, adhérence) est calculée directement à partir
                    de tes données, sans boîte noire ni modèle opaque.
                  </InfoTooltip>
                }
              >
                Analyse
              </SectionLabel>
              <InsightsCard insights={summary.insights} />
            </div>
          </section>

          {/* HISTORIQUE */}
          <section>
            <SectionLabel>Progression</SectionLabel>
            <HistoryTimeline history={summary.history} today={summary.date} />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
