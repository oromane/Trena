import {
  Download,
  HeartPulse,
  KeyRound,
  Mail,
  RefreshCw,
  TrendingUp,
  User,
  Watch,
} from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import GarminLink from '@/components/GarminLink';
import TrendsChart from '@/components/TrendsChart';
import SubmitButton from '@/components/SubmitButton';
import SyncStatusPoller from '@/components/SyncStatusPoller';
import {
  importGarminActivities,
  saveDailyMetrics,
  syncGarmin,
  unlinkGarmin,
  updateEmail,
  updateHeartProfile,
  updatePassword,
  updateProfile,
} from '@/app/actions';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getGarminStatus, getProfile, getRecentMetrics } from '@/lib/engine';

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  profile_saved: { text: 'Profil mis à jour.', ok: true },
  profile_invalid: {
    text: 'Valeurs refusées : vérifie les plages (FC max 100-230, FC repos 25-120 et inférieure à la FC max).',
    ok: false,
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

const GARMIN_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  linked: { text: 'Compte Garmin lié : lance une première synchronisation.', ok: true },
  unlinked: { text: 'Compte Garmin délié.', ok: true },
  link_error: {
    text: 'Login Garmin refusé : vérifie email / mot de passe (et le code MFA si activé).',
    ok: false,
  },
  sync_error: { text: 'Échec de synchronisation : réessaie dans une minute.', ok: false },
  syncing: { text: 'Synchronisation lancée — récupération des données en cours…', ok: true },
};

function garminMessage(flag?: string) {
  if (!flag) return undefined;
  if (flag.startsWith('synced_')) {
    const [days, acts] = flag.slice('synced_'.length).split('_');
    const actsTxt = acts && Number(acts) > 0 ? ` et ${acts} activité(s)` : '';
    return {
      text: `Synchronisation terminée : ${days} jour(s) de données${actsTxt} importés.`,
      ok: true,
    };
  }
  if (flag.startsWith('imported_')) {
    const n = flag.slice('imported_'.length);
    return { text: `${n} activité(s) importée(s) avec leur TRIMP réel.`, ok: true };
  }
  return GARMIN_MESSAGES[flag];
}

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
  searchParams: Promise<{ status?: string; garmin?: string }>;
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const [profile, metrics, garmin] = await Promise.all([
    getProfile(user!.id),
    getRecentMetrics(user!.id, 14),
    getGarminStatus(user!.id),
  ]);

  const { status, garmin: garminFlag } = await searchParams;
  const msg = status ? MESSAGES[status] : undefined;
  const gMsg = garminMessage(garminFlag);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl xl:max-w-5xl px-6 py-10">
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

        {/* ------------------------------------------ métriques physiologiques */}
        <section className="mt-8">
          <h2 className="text-lg font-bold">Métriques physiologiques</h2>
          <p className="mt-1 text-sm text-ats-muted">
            Alimente le moteur de décision : HRV, sommeil, FC repos, automatiquement
            via Garmin ou à la main.
          </p>

          {gMsg && (
            <p
              className={`mt-4 rounded-xl border px-4 py-2.5 text-sm ${
                gMsg.ok
                  ? 'border-ats-green/20 bg-ats-green/5 text-ats-green'
                  : 'border-ats-red/20 bg-ats-red/5 text-ats-red'
              }`}
            >
              {gMsg.text}
            </p>
          )}

          <SyncStatusPoller status={garmin.last_sync?.status} />

          {garmin.last_sync && (
            <div
              className={`mt-4 rounded-xl border px-4 py-2.5 text-sm ${
                garmin.last_sync.status === 'running'
                  ? 'border-ats-green/20 bg-ats-green/5 text-ats-muted'
                  : garmin.last_sync.status === 'error'
                    ? 'border-ats-red/20 bg-ats-red/5 text-ats-red'
                    : garmin.last_sync.status === 'partial'
                      ? 'border-ats-orange/20 bg-ats-orange/5 text-ats-orange'
                      : 'border-ats-green/20 bg-ats-green/5 text-ats-green'
              }`}
            >
              {garmin.last_sync.status === 'running' ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Synchronisation en cours… (mise à jour automatique)
                </span>
              ) : (
                <>
                  Dernière synchro :{' '}
                  {garmin.last_sync.status === 'success'
                    ? 'réussie'
                    : garmin.last_sync.status === 'partial'
                      ? 'partielle (certaines données manquent)'
                      : 'échec'}{' '}
                  · {new Date(garmin.last_sync.created_at).toLocaleString('fr-FR')}
                  {garmin.last_sync.error && (
                    <span className="mt-1 block text-[11px] opacity-80">
                      Détail : {garmin.last_sync.error}
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {/* Garmin */}
          <section className="card mt-4 p-6">
            <div className="flex items-center gap-2 text-ats-muted">
              <Watch className="h-4 w-4" />
              <span className="text-[11px] font-medium uppercase tracking-[0.2em]">
                Garmin Connect
              </span>
            </div>

            {garmin.linked ? (
              <div className="mt-4">
                <p className="text-sm">
                  <span className="font-medium text-ats-green">✓ Compte lié</span>
                  <span className="text-ats-muted">
                    {' '}
                    : la sync tourne automatiquement chaque matin avant l&apos;ajustement
                    de séance.
                  </span>
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <form action={syncGarmin}>
                    <SubmitButton className="inline-flex items-center gap-2 rounded-xl bg-ats-green px-4 py-2 text-sm font-semibold text-ats-bg transition-transform hover:scale-[1.02] disabled:opacity-60">
                      <RefreshCw className="h-4 w-4" />
                      Synchroniser 14 jours
                    </SubmitButton>
                  </form>
                  <form action={importGarminActivities}>
                    <SubmitButton className="inline-flex items-center gap-2 rounded-xl bg-ats-card2 px-4 py-2 text-sm font-semibold transition-colors hover:bg-ats-gray/40 disabled:opacity-60">
                      <Download className="h-4 w-4" />
                      Importer 30 jours d&apos;activités
                    </SubmitButton>
                  </form>
                  <form action={unlinkGarmin}>
                    <button className="text-xs text-ats-gray hover:text-ats-muted">
                      Délier le compte
                    </button>
                  </form>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-ats-gray">
                  La synchronisation récupère métriques quotidiennes, bien-être étendu
                  (poids, pas, VO2max, Body Battery...) et activités réalisées : chaque
                  course importée reçoit son TRIMP réel et passe la séance en « Réalisée ».
                </p>
              </div>
            ) : (
              <GarminLink />
            )}
          </section>

          {/* Tendances */}
          <section className="card mt-4 p-6">
            <div className="flex items-center gap-2 text-ats-muted">
              <TrendingUp className="h-4 w-4" />
              <span className="text-[11px] font-medium uppercase tracking-[0.2em]">
                Tendances (90 jours)
              </span>
            </div>
            <div className="mt-4">
              <TrendsChart />
            </div>
          </section>

          {/* Saisie manuelle */}
          <section className="card mt-4 p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ats-muted">
              Saisie manuelle
            </p>
            <form action={saveDailyMetrics} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input name="recorded_date" type="date" defaultValue={today} required className={INPUT_CLS} />
              <input name="hrv_ms" type="number" step="0.1" min="0" placeholder="HRV (ms)" className={INPUT_CLS} />
              <input name="sleep_minutes" type="number" min="0" placeholder="Sommeil (minutes)" className={INPUT_CLS} />
              <input name="resting_heart_rate" type="number" min="0" placeholder="FC repos (bpm)" className={INPUT_CLS} />
              <button className="rounded-xl bg-ats-card2 py-2 text-sm font-semibold text-ats-text transition-colors hover:bg-ats-gray/40 sm:col-span-2">
                Enregistrer
              </button>
            </form>
          </section>

          {/* Historique — défile horizontalement sur mobile, avec un dégradé
              sur le bord droit pour signaler la suite du tableau. */}
          <div className="relative mt-4">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-ats-card to-transparent sm:hidden"
            />
            <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-ats-muted">
                  <th className="py-2 font-medium">Date</th>
                  <th className="font-medium">HRV (ms)</th>
                  <th className="font-medium">Sommeil</th>
                  <th className="font-medium">FC repos</th>
                </tr>
              </thead>
              <tbody className="metric">
                {(metrics ?? []).map((m) => (
                  <tr key={m.recorded_date} className="border-b border-white/5">
                    <td className="py-2">{m.recorded_date}</td>
                    <td>{m.hrv_ms ?? '—'}</td>
                    <td>
                      {m.sleep_minutes
                        ? `${Math.floor(m.sleep_minutes / 60)}h${String(m.sleep_minutes % 60).padStart(2, '0')}`
                        : '—'}
                    </td>
                    <td>{m.resting_heart_rate ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </section>

        {/* ------------------------------------------ email */}
        <section className="card mt-8 p-6">
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
