'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';

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
        // Confirmation email désactivée : session immédiate
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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">Adaptive Training System</h1>
      <p className="mt-1 text-sm text-slate-400">
        {mode === 'signin' ? 'Connexion' : 'Création de compte'}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Mot de passe (8 caractères min.)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-600 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? '…' : mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-amber-400">{message}</p>}

      <button
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="mt-6 text-sm text-slate-400 underline-offset-4 hover:underline"
      >
        {mode === 'signin' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
      </button>
    </main>
  );
}
