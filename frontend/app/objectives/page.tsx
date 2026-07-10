import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import {
  createObjective,
  deleteObjective,
  setObjectiveActive,
  updateObjective,
} from '@/app/actions';
import SubmitButton from '@/components/SubmitButton';
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
            className={INPUT_CLS}
          />
          <input
            name="distance_km"
            type="number"
            min="0.5"
            step="0.1"
            placeholder="Distance (km, ex : 42.2 — optionnel)"
            className={INPUT_CLS}
          />
          <button className="rounded-xl bg-ats-green py-2 text-sm font-semibold text-ats-bg transition-transform hover:scale-[1.01] sm:col-span-2">
            Créer l&apos;objectif
          </button>
        </form>

        <ul className="mt-8 space-y-3">
          {(objectives ?? []).map((o) => (
            <li key={o.id} className="card px-5 py-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{o.title}</p>
                  <p className="mt-0.5 text-ats-muted">
                    {SPORT_LABELS[o.sport_type] ?? o.sport_type} ·{' '}
                    {new Date(o.target_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {o.distance_m ? ` · ${(o.distance_m / 1000).toFixed(1)} km` : ''}
                    {o.target_time_seconds
                      ? ` · cible ${fmtDuration(Math.round(o.target_time_seconds / 60))}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      o.is_active
                        ? 'bg-ats-green/10 text-ats-green'
                        : 'bg-ats-card2 text-ats-muted'
                    }`}
                  >
                    {o.is_active ? 'Actif' : 'Inactif'}
                  </span>
                  <form action={setObjectiveActive}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="active" value={o.is_active ? 'false' : 'true'} />
                    <SubmitButton className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-ats-muted hover:bg-white/5 disabled:opacity-60">
                      {o.is_active ? 'Désactiver' : 'Activer'}
                    </SubmitButton>
                  </form>
                </div>
              </div>

              <details className="mt-3 border-t border-white/5 pt-3">
                <summary className="cursor-pointer text-xs text-ats-muted hover:text-ats-text">
                  Modifier / personnaliser
                </summary>
                <form action={updateObjective} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={o.id} />
                  <input name="title" required defaultValue={o.title}
                         className={`${INPUT_CLS} sm:col-span-2`} />
                  <input name="target_date" type="date" required defaultValue={o.target_date}
                         className={INPUT_CLS} />
                  <select name="sport_type" required defaultValue={o.sport_type} className={INPUT_CLS}>
                    <option value="road_running">Course sur route</option>
                    <option value="trail">Trail</option>
                    <option value="triathlon">Triathlon</option>
                    <option value="trek">Trek</option>
                  </select>
                  <input name="target_time_minutes" type="number" min="1"
                         placeholder="Temps cible (min)"
                         defaultValue={o.target_time_seconds ? Math.round(o.target_time_seconds / 60) : ''}
                         className={INPUT_CLS} />
                  <input name="distance_km" type="number" min="0.5" step="0.1"
                         placeholder="Distance (km)"
                         defaultValue={o.distance_m ? o.distance_m / 1000 : ''}
                         className={INPUT_CLS} />
                  <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                    <SubmitButton className="inline-flex items-center gap-1.5 rounded-xl bg-ats-green px-4 py-2 text-sm font-semibold text-ats-bg transition-transform hover:scale-[1.01] disabled:opacity-60">
                      Enregistrer
                    </SubmitButton>
                    <span className="text-[11px] text-ats-gray">
                      Après modification, régénère le plan depuis le cockpit.
                    </span>
                  </div>
                </form>
                <form action={deleteObjective} className="mt-3">
                  <input type="hidden" name="id" value={o.id} />
                  <SubmitButton className="inline-flex items-center gap-1.5 rounded-lg bg-ats-red/10 px-3 py-1.5 text-xs font-semibold text-ats-red hover:bg-ats-red/20 disabled:opacity-60">
                    Supprimer l&apos;objectif
                  </SubmitButton>
                  <span className="ml-2 text-[11px] text-ats-gray">
                    Supprime aussi les séances rattachées.
                  </span>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}
