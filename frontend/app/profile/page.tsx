import { Download, HeartPulse, KeyRound, Mail, User } from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import {
  updateEmail,
  updateHeartProfile,
  updatePassword,
  updateProfile,
} from '@/app/actions';
import { createSupabaseServer } from '@/lib/supabase/server';

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  profile_saved: { text: 'Profil mis à jour.', ok: true },
  profile_saved_plan: {
    text: 'Profil mis à jour : le plan a été régénéré avec ton nombre de séances/semaine.',
    ok: true,
  },
  profile_saved_noplan: {
    text: 'Profil mis à jour. Le plan sera appliqué dès qu’un objectif actif existe (ou régénère-le depuis le cockpit).',
    ok: true,
  },
  email_pending: {
    text: 'Vérifie ta boîte mail : un lien de confirmation a été envoyé à la nouvelle adresse.',
    ok: true,
  },
  email_error: { text: "Impossible de changer l'email : réessaie.", ok: false },
  password_saved: { text: 'Mot de passe mis à jour.', ok: true },
  password_short: { text: 'Mot de passe trop court (8 caractères minimum).', ok: false },
  password_error: { text: 'Impossible de changer le mot de passe : réessaie.', ok: false },
};

const INPUT_CLS =
  'w-full rounded-lg border border-white/10 bg-ats-bg2 px-3 py-2 text-sm outline-none placeholder:text-ats-gray focus:border-ats-green/50';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-ats-muted">
      {children}
    </span>
  );
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, sessions_per_week, hr_max, hr_rest, sex')
    .eq('id', user!.id)
    .maybeSingle();

  const { status } = await searchParams;
  const msg = status ? MESSAGES[status] : undefined;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="mt-2 text-sm text-ats-muted">
          Ton identité, tes préférences d&apos;entraînement et tes données.
        </p>

        {msg && (
          <p
            className={`mt-5 rounded-xl border px-4 py-2.5 text-sm ${
              msg.ok
                ? 'border-ats-green/20 bg-ats-green/5 text-ats-green'
                : 'border-ats-red/20 bg-ats-red/5 text-ats-red'
            }`}
          >
            {msg.text}
          </p>
        )}

        {/* ------------------------------------------ identité + préférences */}
        <section className="card mt-6 p-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-ats-muted" />
            <Label>Identité &amp; entraînement</Label>
          </div>
          <form action={updateProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-ats-muted sm:col-span-2">
              Nom affiché
              <input
                name="full_name"
                defaultValue={profile?.full_name ?? ''}
                placeholder="Ex : Romane Rossignol"
                className={`${INPUT_CLS} mt-1.5`}
              />
            </label>
            <label className="text-xs text-ats-muted">
              Entraînements par semaine
              <select
                name="sessions_per_week"
                defaultValue={profile?.sessions_per_week ?? ''}
                className={`${INPUT_CLS} mt-1.5`}
              >
                <option value="">Auto (selon disponibilités)</option>
                {[2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n} séances
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button className="rounded-xl bg-ats-green px-5 py-2 text-sm font-semibold text-ats-bg transition-transform hover:scale-[1.02]">
                Enregistrer
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-ats-gray sm:col-span-2">
              Le nombre de séances s&apos;applique à la prochaine (re)génération du
              plan : Trena garde les jours où tu as le plus de disponibilité.
            </p>
          </form>
        </section>

        {/* ------------------------------------------ paramètres cardiaques */}
        <section className="card mt-4 p-6">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-ats-muted" />
            <Label>Paramètres cardiaques</Label>
          </div>
          <form action={updateHeartProfile} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs text-ats-muted">
              FC max (bpm)
              <input name="hr_max" type="number" min={120} max={230}
                     defaultValue={profile?.hr_max ?? ''}
                     placeholder="190"
                     className={`${INPUT_CLS} mt-1.5 w-28`} />
            </label>
            <label className="text-xs text-ats-muted">
              FC repos (bpm)
              <input name="hr_rest" type="number" min={30} max={100}
                     defaultValue={profile?.hr_rest ?? ''}
                     placeholder="auto (mesures)"
                     className={`${INPUT_CLS} mt-1.5 w-32`} />
            </label>
            <label className="text-xs text-ats-muted">
              Sexe (formule TRIMP)
              <select name="sex" defaultValue={profile?.sex ?? ''}
                      className={`${INPUT_CLS} mt-1.5 w-32`}>
                <option value="">Non précisé</option>
                <option value="F">Femme</option>
                <option value="M">Homme</option>
              </select>
            </label>
            <button className="rounded-xl bg-ats-card2 px-4 py-2 text-sm font-semibold transition-colors hover:bg-ats-gray/40">
              Enregistrer
            </button>
            <p className="w-full text-[11px] leading-relaxed text-ats-gray">
              Utilisés pour calculer le TRIMP réel de tes activités importées.
              FC repos vide : Trena utilise la moyenne de tes mesures Garmin.
            </p>
          </form>
        </section>

        {/* ------------------------------------------ email */}
        <section className="card mt-4 p-6">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-ats-muted" />
            <Label>Adresse email</Label>
          </div>
          <form action={updateEmail} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="grow text-xs text-ats-muted">
              Email actuel : <span className="metric text-ats-text">{user?.email}</span>
              <input
                name="email"
                type="email"
                required
                placeholder="Nouvelle adresse email"
                className={`${INPUT_CLS} mt-1.5`}
              />
            </label>
            <button className="rounded-xl bg-ats-card2 px-4 py-2 text-sm font-semibold transition-colors hover:bg-ats-gray/40">
              Changer l&apos;email
            </button>
            <p className="w-full text-[11px] text-ats-gray">
              Un lien de confirmation sera envoyé à la nouvelle adresse.
            </p>
          </form>
        </section>

        {/* ------------------------------------------ mot de passe */}
        <section className="card mt-4 p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-ats-muted" />
            <Label>Mot de passe</Label>
          </div>
          <form action={updatePassword} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="grow text-xs text-ats-muted">
              Nouveau mot de passe (8 caractères min.)
              <input
                name="password"
                type="password"
                minLength={8}
                required
                placeholder="••••••••"
                className={`${INPUT_CLS} mt-1.5`}
              />
            </label>
            <button className="rounded-xl bg-ats-card2 px-4 py-2 text-sm font-semibold transition-colors hover:bg-ats-gray/40">
              Changer le mot de passe
            </button>
          </form>
        </section>

        {/* ------------------------------------------ export */}
        <section className="card mt-4 p-6">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-ats-muted" />
            <Label>Mes données</Label>
          </div>
          <p className="mt-3 text-sm text-ats-muted">
            Exporte l&apos;intégralité de tes données Trena (profil, objectifs,
            métriques physiologiques, séances) au format JSON.
          </p>
          <a
            href="/api/export"
            download
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ats-green px-5 py-2 text-sm font-semibold text-ats-bg transition-transform hover:scale-[1.02]"
          >
            <Download className="h-4 w-4" />
            Exporter mes données
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
