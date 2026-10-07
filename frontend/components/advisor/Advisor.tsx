'use client';

/**
 * Conseiller IA : bouton flottant + panneau de questions-réponses.
 *
 * Le modèle tourne en local sur le VPS (Ollama, CPU) : la réponse arrive en
 * streaming, mot à mot, pour ne pas laisser l'écran figé 20 à 40 s.
 * Chaque question est indépendante : le moteur reconstruit le contexte
 * (métriques du jour, norme 28 j, readiness) à chaque appel.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Square, X } from 'lucide-react';
import Mascot, { MascotAvatar } from '@/components/brand/Mascot';
import RichText from './RichText';
import { ADVISOR_EVENT } from './ask';

type Mode = 'llm' | 'definition' | 'daily' | 'summary' | 'glossary' | 'safety';
type Source = { key: string; term: string };
type Message =
  | { role: 'user'; text: string }
  | {
      role: 'assistant';
      id: number;
      text: string;
      mode?: Mode;
      sources?: Source[];
      pending: boolean;
      error?: string;
    };

const SUGGESTIONS = [
  "C'est quoi le HRV ?",
  'Comment je récupère ce matin ?',
  "Que veut dire l'ACWR ?",
  'Pourquoi alterner jours durs et faciles ?',
];

// Provenance de la réponse : l'utilisateur sait si c'est instantané ou rédigé
// par l'IA locale (lente sur le CPU du VPS).
const MODE_LABEL: Record<Mode, { text: string; tone: string } | null> = {
  llm: null,
  definition: { text: 'Définition · réponse instantanée', tone: 'text-ats-gray' },
  daily: { text: 'Analyse du jour · rédigée ce matin', tone: 'text-ats-gray' },
  summary: { text: 'Synthèse du jour · calculée par Trena', tone: 'text-ats-gray' },
  glossary: { text: 'Définition de référence (IA indisponible)', tone: 'text-ats-orange-fg' },
  safety: { text: 'Message de sécurité', tone: 'text-ats-orange-fg' },
};


export default function Advisor() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const nextId = useRef(0);

  // Ciblage par id : une réponse annulée ne doit jamais modifier la suivante.
  const patch = (id: number, fn: (m: Extract<Message, { role: 'assistant' }>) => Message) =>
    setMessages((ms) => ms.map((m) => (m.role === 'assistant' && m.id === id ? fn(m) : m)));

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (question.length < 2) return;
      stop();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const id = ++nextId.current;
      const patchLast = (fn: Parameters<typeof patch>[1]) => patch(id, fn);
      setOpen(true);
      setInput('');
      setBusy(true);
      setMessages((ms) => [
        ...ms,
        { role: 'user', text: question },
        { role: 'assistant', id, text: '', pending: true },
      ]);

      try {
        const res = await fetch('/api/advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? 'Conseiller indisponible.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            const ev = JSON.parse(line);
            if (ev.type === 'meta') {
              patchLast((m) => ({ ...m, mode: ev.mode, sources: ev.sources }));
            } else if (ev.type === 'reset') {
              // Raisonnement du modèle diffusé par erreur : on l'efface.
              patchLast((m) => ({ ...m, text: '' }));
            } else if (ev.type === 'delta') {
              patchLast((m) => ({ ...m, text: m.text ? m.text + ev.text : ev.text.trimStart() }));
            } else if (ev.type === 'error') {
              patchLast((m) => ({ ...m, error: ev.message }));
            }
          }
        }
        patchLast((m) => ({ ...m, pending: false }));
      } catch (e) {
        const aborted = e instanceof DOMException && e.name === 'AbortError';
        patchLast((m) => ({
          ...m,
          pending: false,
          error: aborted ? (m.text ? undefined : 'Question annulée.') : (e as Error).message,
        }));
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        setBusy(false);
      }
    },
    [stop]
  );

  // Questions pré-remplies venant des boutons « Demander »
  useEffect(() => {
    const onAsk = (e: Event) => ask((e as CustomEvent<string>).detail);
    window.addEventListener(ADVISOR_EVENT, onAsk);
    return () => window.removeEventListener(ADVISOR_EVENT, onAsk);
  }, [ask]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => stop, [stop]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le conseiller Perlo"
          title="Une question ? Demande à Perlo"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 rounded-full shadow-lg ring-2 ring-ats-green ring-offset-2 ring-offset-ats-bg transition-transform hover:scale-105 md:bottom-6 md:right-6"
        >
          <MascotAvatar size={52} />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Conseiller Trena"
          className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[85vh] flex-col rounded-t-2xl border border-white/10 bg-ats-card shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:max-h-[70vh] md:w-[26rem] md:rounded-2xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <header className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <MascotAvatar size={30} mood={busy ? 'thinking' : 'idle'} />
            <span className="leading-tight">
              <span className="block text-sm font-semibold">Perlo</span>
              <span className="block text-[10px] uppercase tracking-wider text-ats-gray">
                Conseiller · IA locale
              </span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="ml-auto text-ats-gray transition-colors hover:text-ats-text"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-end gap-3">
                  <Mascot mood="wave" size={64} className="shrink-0" />
                  <p className="pb-2 text-xs leading-relaxed text-ats-muted">
                    <span className="block font-semibold text-ats-text">Salut, moi c&apos;est Perlo !</span>
                    Pose-moi une question sur tes métriques, ta récupération ou
                    Trena. Je m&apos;appuie sur tes données du jour.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-ats-muted transition-colors hover:border-ats-green/40 hover:text-ats-text"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-ats-green/15 px-3.5 py-2 text-ats-text">
                  {m.text}
                </div>
              ) : (
                <div key={i} className="flex items-end gap-2">
                <MascotAvatar
                  size={26}
                  mood={m.pending && !m.text ? 'thinking' : 'idle'}
                  className="mb-0.5"
                />
                <div className="max-w-[88%] space-y-1.5 rounded-2xl rounded-bl-md bg-ats-card2 px-3.5 py-2.5 leading-relaxed text-ats-muted">
                  {m.mode && MODE_LABEL[m.mode] && (
                    <p className={`text-[10px] font-medium uppercase tracking-wider ${MODE_LABEL[m.mode]!.tone}`}>
                      {MODE_LABEL[m.mode]!.text}
                    </p>
                  )}
                  {m.text && <RichText text={m.text} />}
                  {m.pending && !m.text && (
                    <p className="text-xs text-ats-gray">
                      {m.mode === 'llm'
                        ? "Question libre : l'IA locale rédige ta réponse, compte 1 à 2 minutes."
                        : 'Perlo analyse tes données…'}
                    </p>
                  )}
                  {m.error && <p className="text-xs text-ats-red-fg">{m.error}</p>}
                  {!m.pending && m.sources && m.sources.length > 0 && (
                    <p className="pt-1 text-[10px] text-ats-gray">
                      Réf. : {m.sources.map((s) => s.term).join(' · ')}
                    </p>
                  )}
                </div>
                </div>
              )
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="border-t border-white/5 p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                rows={1}
                maxLength={500}
                placeholder="Ta question…"
                className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-white/10 bg-ats-bg px-3 py-2 text-sm text-ats-text placeholder:text-ats-gray focus:border-ats-green/50 focus:outline-none"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={stop}
                  aria-label="Arrêter"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-ats-muted hover:text-ats-text"
                >
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  aria-label="Envoyer"
                  disabled={input.trim().length < 2}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-ats-green text-white transition-opacity disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-2 text-[10px] leading-snug text-ats-gray">
              Réponses générées par une IA à partir de tes données. Ce n&apos;est
              pas un avis médical.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
