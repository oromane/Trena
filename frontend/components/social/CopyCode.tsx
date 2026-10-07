'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Code ami lisible + copie en un clic (avec repli silencieux). */
export default function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const pretty = `${code.slice(0, 4)} ${code.slice(4)}`;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Presse-papiers indisponible (http, iframe) : le code reste lisible.
        }
      }}
      className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-ats-bg2 px-4 py-2.5 transition-colors hover:border-ats-green/40"
      aria-label={`Copier le code ami ${code}`}
    >
      <span className="metric text-xl font-semibold tracking-[0.2em] text-ats-text">{pretty}</span>
      {copied ? (
        <Check className="h-4 w-4 text-ats-green-fg" />
      ) : (
        <Copy className="h-4 w-4 text-ats-gray" />
      )}
    </button>
  );
}
