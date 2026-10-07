/**
 * Amis : code ami, demandes, liste, réglages de partage et activité partagée.
 * Tout passe par le moteur (/social/*) ; l'identité vient de la session.
 */
import { RefreshCw, ShieldCheck, Users } from 'lucide-react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import SubmitButton from '@/components/SubmitButton';
import AddFriendForm from '@/components/social/AddFriendForm';
import CopyCode from '@/components/social/CopyCode';
import { FriendBlock } from '@/components/social/FriendFeed';
import {
  regenerateFriendCode,
  removeFriend,
  respondFriend,
  saveSharePrefs,
} from '@/app/social-actions';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getSocialFeed, getSocialMe } from '@/lib/engine';

const btn =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50';

function Hidden({ id }: { id: string }) {
  return <input type="hidden" name="friendship_id" value={id} />;
}

export default async function FriendsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [me, feed] = await Promise.all([getSocialMe(user!.id), getSocialFeed(user!.id)]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="h-6 w-6 text-ats-green-fg" /> Amis
          </h1>
          <p className="mt-1 text-sm text-ats-muted">
            Suivez vos séances mutuelles. Tu choisis ce que tu partages, et rien
            n&apos;est visible avant que l&apos;invitation soit acceptée.
          </p>
        </header>

        {!me ? (
          <div className="card p-6 text-sm text-ats-muted">
            Le service est momentanément indisponible. Si c&apos;est la première
            utilisation, la migration 015 doit être appliquée dans Supabase.
          </div>
        ) : (
          <>
            <section className="card grid gap-6 p-5 sm:grid-cols-2">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Ton code ami</h2>
                <CopyCode code={me.friend_code} />
                <p className="text-[11px] leading-relaxed text-ats-gray">
                  Donne-le à la personne que tu veux ajouter. Il ne permet que de
                  t&apos;envoyer une demande, que tu restes libre d&apos;accepter.
                </p>
                <form action={regenerateFriendCode}>
                  <SubmitButton className={`${btn} border border-white/10 text-ats-muted hover:text-ats-text`}>
                    <RefreshCw className="h-3.5 w-3.5" /> Nouveau code
                  </SubmitButton>
                </form>
              </div>
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Ajouter un ami</h2>
                <AddFriendForm />
              </div>
            </section>

            {me.incoming.length > 0 && (
              <section className="card divide-y divide-white/5">
                <h2 className="px-5 py-3 text-sm font-semibold">Demandes reçues</h2>
                {me.incoming.map((f) => (
                  <div key={f.friendship_id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex-1 text-sm">{f.name}</span>
                    <form action={respondFriend}>
                      <Hidden id={f.friendship_id} />
                      <input type="hidden" name="accept" value="true" />
                      <SubmitButton className={`${btn} bg-ats-green text-white`}>Accepter</SubmitButton>
                    </form>
                    <form action={respondFriend}>
                      <Hidden id={f.friendship_id} />
                      <input type="hidden" name="accept" value="false" />
                      <SubmitButton className={`${btn} border border-white/10 text-ats-muted`}>Refuser</SubmitButton>
                    </form>
                  </div>
                ))}
              </section>
            )}

            {(me.friends.length > 0 || me.outgoing.length > 0) && (
              <section className="card divide-y divide-white/5">
                <h2 className="px-5 py-3 text-sm font-semibold">Tes amis</h2>
                {me.friends.map((f) => (
                  <div key={f.friendship_id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex-1 text-sm">{f.name}</span>
                    <form action={removeFriend}>
                      <Hidden id={f.friendship_id} />
                      <SubmitButton className={`${btn} text-ats-gray hover:text-ats-red-fg`}>Retirer</SubmitButton>
                    </form>
                  </div>
                ))}
                {me.outgoing.map((f) => (
                  <div key={f.friendship_id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex-1 text-sm text-ats-muted">
                      {f.name} <span className="text-[11px] text-ats-gray">· en attente</span>
                    </span>
                    <form action={removeFriend}>
                      <Hidden id={f.friendship_id} />
                      <SubmitButton className={`${btn} text-ats-gray hover:text-ats-text`}>Annuler</SubmitButton>
                    </form>
                  </div>
                ))}
              </section>
            )}

            <section className="card space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-ats-green-fg" /> Ce que tu partages
              </h2>
              <form action={saveSharePrefs} className="space-y-3">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="share_activities"
                    defaultChecked={me.prefs.share_activities}
                    className="mt-1 h-4 w-4 accent-[#2E8B57]"
                  />
                  <span>
                    Mes séances et mon volume
                    <span className="block text-[11px] text-ats-gray">
                      Titre, discipline, durée, distance et analyse. Jamais ta FC ni ta charge.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="share_physio"
                    defaultChecked={me.prefs.share_physio}
                    className="mt-1 h-4 w-4 accent-[#2E8B57]"
                  />
                  <span>
                    Ma forme du jour
                    <span className="block text-[11px] text-ats-gray">
                      Seulement le niveau (En forme, Vigilance, Récupération). Jamais ton HRV ni ton sommeil.
                    </span>
                  </span>
                </label>
                <SubmitButton className={`${btn} bg-ats-green text-white`}>Enregistrer</SubmitButton>
              </form>
            </section>

            {feed.length > 0 && (
              <section>
                <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
                  Activité de tes amis
                </h2>
                <div className="card divide-y divide-white/5 overflow-hidden">
                  {feed.map((f) => (
                    <FriendBlock key={f.friendship_id} friend={f} today={today} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
