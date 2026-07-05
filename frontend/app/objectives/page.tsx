import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { createObjective } from '@/app/actions';
import { createSupabaseServer } from '@/lib/supabase/server';
import { fmtDuration } from '@/lib/format';

const SPORT_LABELS: Record<string, string> = {
  road_running: 'Course sur route',
  trail: 'Trail',
  triathlon: 'Triathlon',
  trek: 'Trek',
};

const INPUT_CLS =
  'rounded-lg border border-white/10 bg-ats-bg2 px-3 py-2 text-sm outline-none placeholder:text-ats-gray focus:border-ats-green/50';

export default async function ObjectivesPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: objectives } = await supabase
    .from('objectives')
    .select('*')
    .eq('user_id', user!.id)
    .order('target_date', { ascending: true });

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold">Objectifs</h1>
        <p className="mt-2 text-sm text-ats-muted">
          L&apos;objectif actif pilote la génération du plan et la probabilité de
          réussite du cockpit.
        </p>

        <form
          action={createObjective}
          className="card mt-8 grid gap-3 p-6 sm:grid-cols-2"
        >
          <input
            name="title"
            required
            placeholder="Titre (ex : Marathon de Paris)"
            className={`${INPUT_CLS} sm:col-span-2`}
          />
          <input name="target_date" type="date" required className={INPUT_CLS} />
          <select name="sport_type" required className={INPUT_CLS}>
            <option value="road_running">Course sur route</option>
            <option value="trail">Trail</option>
            <option value="triathlon">Triathlon</option>
            <option value="trek">Trek</option>
          </select>
          <input
            name="target_time_minutes"
            type="number"
            min="1"
            placeholder="Temps cible (minutes, optionnel)"
            className={`${INPUT_CLS} sm:col-span-2`}
          />
          <button className="rounded-xl bg-ats-green py-2 text-sm font-semibold text-ats-bg transition-transform hover:scale-[1.01] sm:col-span-2">
            Créer l&apos;objectif
          </button>
        </form>

        <ul className="mt-8 space-y-3">
          {(objectives ?? []).map((o) => (
            <li
              key={o.id}
              className="card flex items-center justify-between px-5 py-4 text-sm"
            >
              <div>
                <p className="font-semibold">{o.title}</p>
                <p className="mt-0.5 text-ats-muted">
                  {SPORT_LABELS[o.sport_type] ?? o.sport_type} ·{' '}
                  {new Date(o.target_date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {o.target_time_seconds
                    ? ` · cible ${fmtDuration(Math.round(o.target_time_seconds / 60))}`
                    : ''}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  o.is_active
                    ? 'bg-ats-green/10 text-ats-green'
                    : 'bg-ats-card2 text-ats-muted'
                }`}
              >
                {o.is_active ? 'Actif' : 'Inactif'}
              </span>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}
