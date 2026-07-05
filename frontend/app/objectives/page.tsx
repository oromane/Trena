import Nav from '@/components/Nav';
import { createObjective } from '@/app/actions';
import { createSupabaseServer } from '@/lib/supabase/server';

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

        <form
          action={createObjective}
          className="mt-8 grid gap-3 rounded-lg border border-slate-800 p-5 sm:grid-cols-2"
        >
          <input
            name="title"
            required
            placeholder="Titre (ex: Marathon de Paris)"
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="target_date"
            type="date"
            required
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          />
          <select
            name="sport_type"
            required
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
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
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm sm:col-span-2"
          />
          <button className="rounded-md bg-emerald-600 py-2 text-sm font-semibold hover:bg-emerald-500 sm:col-span-2">
            Créer l&apos;objectif
          </button>
        </form>

        <ul className="mt-8 space-y-3">
          {(objectives ?? []).map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-semibold">{o.title}</p>
                <p className="text-slate-400">
                  {o.sport_type} — {o.target_date}
                  {o.target_time_seconds
                    ? ` — cible ${Math.round(o.target_time_seconds / 60)} min`
                    : ''}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  o.is_active ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {o.is_active ? 'Actif' : 'Inactif'}
              </span>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
