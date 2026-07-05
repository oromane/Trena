'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, Mail, Lock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

const INPUT_CLS =
  'w-full rounded-lg border border-white/10 bg-ats-bg2 px-4 py-2.5 text-sm outline-none placeholder:text-ats-gray focus:border-ats-green/50 transition-colors';

type Step = 'credentials' | 'mfa' | 'loading' | 'success' | 'error';

export default function GarminLink() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(120);
  const mfaInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown pour le timer MFA
  useEffect(() => {
    if (step === 'mfa') {
      setCountdown(120);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setStep('error');
            setError('Délai expiré — recommence la connexion.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      // Focus le champ MFA
      setTimeout(() => mfaInputRef.current?.focus(), 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  const handleCredentials = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading');
    setError('');

    try {
      const res = await fetch('/api/garmin/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const detail = data.error ?? 'Identifiants refusés par Garmin.';
        // Essayer d'extraire le message utile du JSON imbriqué
        let msg = detail;
        try {
          const parsed = JSON.parse(detail);
          msg = parsed.detail ?? detail;
        } catch {
          // Le detail n'est pas du JSON, on garde tel quel
        }
        setError(msg);
        setStep('error');
        return;
      }

      if (data.needs_mfa) {
        setSessionId(data.session_id);
        setStep('mfa');
      } else if (data.linked) {
        setStep('success');
        setTimeout(() => router.refresh(), 1500);
      }
    } catch {
      setError('Impossible de joindre le serveur.');
      setStep('error');
    }
  }, [email, password, router]);

  const handleMfa = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading');

    try {
      const res = await fetch('/api/garmin/link/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, mfa_code: mfaCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        const detail = data.error ?? 'Code MFA refusé.';
        let msg = detail;
        try {
          const parsed = JSON.parse(detail);
          msg = parsed.detail ?? detail;
        } catch {
          // pas du JSON
        }
        setError(msg);
        setStep('error');
        return;
      }

      if (data.linked) {
        setStep('success');
        setTimeout(() => router.refresh(), 1500);
      }
    } catch {
      setError('Impossible de joindre le serveur.');
      setStep('error');
    }
  }, [sessionId, mfaCode, router]);

  const reset = () => {
    setStep('credentials');
    setError('');
    setMfaCode('');
    setSessionId('');
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // -------------------------------------------------- Loading
  if (step === 'loading') {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 py-6">
        <Loader2 className="h-6 w-6 animate-spin text-ats-green" />
        <p className="text-sm text-ats-muted">Connexion à Garmin en cours…</p>
      </div>
    );
  }

  // -------------------------------------------------- Success
  if (step === 'success') {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 py-6">
        <CheckCircle2 className="h-8 w-8 text-ats-green" />
        <p className="text-sm font-medium text-ats-green">
          Compte Garmin lié avec succès !
        </p>
        <p className="text-xs text-ats-muted">Rafraîchissement…</p>
      </div>
    );
  }

  // -------------------------------------------------- Error
  if (step === 'error') {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-ats-red/20 bg-ats-red/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ats-red" />
          <p className="text-sm text-ats-red">{error}</p>
        </div>
        <button
          onClick={reset}
          className="rounded-xl bg-ats-card2 px-4 py-2 text-sm font-semibold text-ats-text transition-colors hover:bg-ats-gray/40"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // -------------------------------------------------- MFA
  if (step === 'mfa') {
    return (
      <form onSubmit={handleMfa} className="mt-4 space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-ats-blue/20 bg-ats-blue/5 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ats-blue" />
          <div className="text-sm text-ats-blue">
            <p className="font-medium">Vérification en 2 étapes</p>
            <p className="mt-1 text-ats-muted">
              Garmin t&apos;a envoyé un code de vérification par email. Saisis-le ci-dessous.
            </p>
          </div>
        </div>

        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ats-gray" />
          <input
            ref={mfaInputRef}
            name="mfa_code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            placeholder="Code à 6 chiffres"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className={`${INPUT_CLS} pl-10 text-center text-lg tracking-[0.3em] font-mono`}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-ats-muted">
            Expire dans{' '}
            <span className={countdown <= 30 ? 'font-semibold text-ats-red' : 'font-medium'}>
              {formatTime(countdown)}
            </span>
          </span>
          <button
            type="submit"
            disabled={mfaCode.length < 6}
            className="rounded-xl bg-ats-green px-5 py-2.5 text-sm font-semibold text-ats-bg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
          >
            Valider le code
          </button>
        </div>
      </form>
    );
  }

  // -------------------------------------------------- Credentials (step 1)
  return (
    <form onSubmit={handleCredentials} className="mt-4 space-y-3">
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ats-gray" />
        <input
          name="email"
          type="email"
          required
          placeholder="Email Garmin Connect"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${INPUT_CLS} pl-10`}
        />
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ats-gray" />
        <input
          name="password"
          type="password"
          required
          placeholder="Mot de passe Garmin"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${INPUT_CLS} pl-10`}
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-xl bg-ats-green px-4 py-2.5 text-sm font-semibold text-ats-bg transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Se connecter à Garmin
      </button>
      <p className="text-[11px] leading-relaxed text-ats-gray">
        Ton mot de passe sert uniquement au login initial — il n&apos;est jamais
        stocké. Seul un jeton de session chiffré (AES) est conservé, révocable
        ici à tout moment.
      </p>
    </form>
  );
}
