'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, LineChart, ShieldCheck } from 'lucide-react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { LogoMark } from '@/components/Logo';
import Spinner from '@/components/Spinner';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else if (data.session) {
        router.push('/dashboard');
        router.refresh();
      } else setMessage('Compte créé. Vérifie ta boîte mail pour confirmer.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else {
        router.push('/dashboard');
        router.refresh();
      }
    }
    setLoading(false);
  }

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Panneau de marque — proposition de valeur clinique */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ats-bg2 p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, #2E8B57 0, transparent 40%), radial-gradient(circle at 80% 70%, #FF4500 0, transparent 40%)',
          }}
        />
        <div className="relative flex items-center gap-2">
          <LogoMark size={30} />
          <span className="text-lg font-semibold tracking-tight text-ats-text">Trena</span>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-3xl font-bold leading-tight text-ats-text">
            Votre physiologie change chaque nuit. Votre plan aussi.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ats-muted">
            Moteur d&apos;endurance adaptatif fondé sur le modèle de Banister. Trena
            synchronise vos données Garmin (HRV, sommeil, charge TRIMP) et recalcule
            votre séance chaque matin pour maintenir votre trajectoire physiologique.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-ats-muted">
            <li className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-ats-green" /> Ajustement quotidien selon
              votre z-score HRV
            </li>
            <li className="flex items-center gap-3">
              <LineChart className="h-4 w-4 text-ats-green" /> Probabilité de réussite
              projetée jusqu&apos;au jour J
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-ats-green" /> Prévention du
              surentraînement (HRV + indice de Foster)
            </li>
          </ul>
        </div>

        <p className="relative metric text-[11px] text-ats-gray">
          Un tableur ne sait pas que vous avez accumulé du stress cette nuit. Trena, si.
        </p>
      </section>

      {/* Panneau d'authentification */}
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <LogoMark size={28} />
            <span className="text-lg font-semibold tracking-tight text-ats-text">Trena</span>
          </div>

          <h2 className="text-2xl font-bold text-ats-text">
            {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p className="mt-1 text-sm text-ats-muted">
            {mode === 'signin'
              ? 'Accédez à votre cockpit d’entraînement.'
              : 'Rejoignez la bêta ouverte aux athlètes analytiques.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-ats-bg2 px-4 py-3 text-sm text-ats-text outline-none transition-colors placeholder:text-ats-gray focus:border-ats-green/50"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Mot de passe (8 caractères min.)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-ats-bg2 px-4 py-3 text-sm text-ats-text outline-none transition-colors placeholder:text-ats-gray focus:border-ats-green/50"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ats-green py-3 text-sm font-semibold text-ats-bg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading && <Spinner className="h-4 w-4" />}
              {mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
            </button>
          </form>

          {message && (
            <p className="mt-4 rounded-lg border border-ats-orange/20 bg-ats-orange/5 px-3 py-2 text-sm text-ats-orange">
              {message}
            </p>
          )}

          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="mt-6 text-sm text-ats-muted underline-offset-4 transition-colors hover:text-ats-text hover:underline"
          >
            {mode === 'signin'
              ? "Pas encore de compte ? Créer un compte"
              : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </section>
    </main>
  );
}
