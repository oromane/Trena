/**
 * Primitives typographiques et pédagogiques du Guide.
 *
 * Principe éditorial : chaque affirmation forte porte son niveau de preuve.
 * On ne présente jamais un consensus et une hypothèse avec le même poids visuel.
 */
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ShoppingBag,
} from 'lucide-react';

/* ------------------------------------------------------------------ Section */

export function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      {eyebrow && (
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-ats-text sm:text-3xl">
        {title}
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function SubTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="pt-2 text-lg font-semibold text-ats-text">{children}</h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed text-ats-muted">{children}</p>;
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-ats-text">{children}</strong>;
}

export function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="space-y-2.5 pl-1">
      {children}
    </ul>
  );
}

export function Li({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 leading-relaxed text-ats-muted">
      <span
        aria-hidden
        className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-ats-green"
      />
      <span>{children}</span>
    </li>
  );
}

/* ----------------------------------------------------------------- Callouts */

type Tone = 'key' | 'warn' | 'myth' | 'info' | 'tip';

const TONES: Record<
  Tone,
  { border: string; bg: string; text: string; Icon: typeof CheckCircle2; label: string }
> = {
  key: {
    border: 'border-ats-green/25',
    bg: 'bg-ats-green/[0.07]',
    text: 'text-ats-green-fg',
    Icon: CheckCircle2,
    label: 'À retenir',
  },
  warn: {
    border: 'border-ats-red/25',
    bg: 'bg-ats-red/[0.07]',
    text: 'text-ats-red-fg',
    Icon: AlertTriangle,
    label: 'Attention',
  },
  myth: {
    border: 'border-ats-orange/25',
    bg: 'bg-ats-orange/[0.07]',
    text: 'text-ats-orange-fg',
    Icon: ShoppingBag,
    label: 'Idée reçue',
  },
  info: {
    border: 'border-ats-blue/25',
    bg: 'bg-ats-blue/[0.07]',
    text: 'text-ats-blue-fg',
    Icon: HelpCircle,
    label: 'Nuance',
  },
  tip: {
    border: 'border-ats-violet/25',
    bg: 'bg-ats-violet/[0.07]',
    text: 'text-ats-violet-fg',
    Icon: Lightbulb,
    label: 'En pratique',
  },
};

export function Callout({
  tone = 'key',
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div className={`rounded-2xl border ${t.border} ${t.bg} p-5`}>
      <div className={`flex items-center gap-2 ${t.text}`}>
        <t.Icon className="h-4 w-4 shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
          {title ?? t.label}
        </span>
      </div>
      <div className="mt-2.5 space-y-2 text-sm leading-relaxed text-ats-muted">
        {children}
      </div>
    </div>
  );
}

/* ----------------------------------------------------- Niveau de preuve */

type Level = 'prouve' | 'plausible' | 'marketing';

const LEVELS: Record<Level, { label: string; cls: string; help: string }> = {
  prouve: {
    label: 'Prouvé',
    cls: 'border-ats-green/30 bg-ats-green/10 text-ats-green-fg',
    help: 'Consensus solide, plusieurs études convergentes de bonne qualité',
  },
  plausible: {
    label: 'Plausible',
    cls: 'border-ats-blue/30 bg-ats-blue/10 text-ats-blue-fg',
    help: 'Piste crédible mais preuves limitées, contradictoires ou de faible qualité',
  },
  marketing: {
    label: 'Marketing',
    cls: 'border-ats-orange/30 bg-ats-orange/10 text-ats-orange-fg',
    help: 'Affirmation répandue dans le commerce mais non soutenue par les données',
  },
};

export function EvidenceBadge({ level }: { level: Level }) {
  const l = LEVELS[level];
  return (
    <span
      title={l.help}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${l.cls}`}
    >
      {l.label}
    </span>
  );
}

/** Légende des trois niveaux, à placer une fois par page qui les utilise. */
export function EvidenceLegend() {
  return (
    <div className="card-2 flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-[11px] text-ats-muted">
      {(Object.keys(LEVELS) as Level[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-2">
          <EvidenceBadge level={k} />
          <span className="max-w-[22rem]">{LEVELS[k].help}</span>
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ Chiffre clé */

export function KeyNumber({
  value,
  unit,
  label,
  tone = 'green',
}: {
  value: string;
  unit?: string;
  label: string;
  tone?: 'green' | 'blue' | 'orange' | 'violet';
}) {
  const color = {
    green: 'text-ats-green-fg',
    blue: 'text-ats-blue-fg',
    orange: 'text-ats-orange-fg',
    violet: 'text-ats-violet-fg',
  }[tone];
  return (
    <div className="card-2 p-4">
      <p className={`metric text-2xl font-semibold ${color}`}>
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-ats-muted">{unit}</span>
        )}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-ats-muted">{label}</p>
    </div>
  );
}

export function KeyNumberGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
  );
}

/* ---------------------------------------------------------------- Source */

export function Source({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 text-[11px] leading-relaxed text-ats-gray">
      <BookOpen className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/* ----------------------------------------------------------------- Table */

export function DataTable({
  head,
  rows,
  caption,
}: {
  head: string[];
  rows: ReactNode[][];
  caption?: string;
}) {
  return (
    <figure className="card relative overflow-hidden">
      {/*
        Le tableau garde une largeur minimale de 34rem et défile
        horizontalement sur mobile. Un dégradé sur le bord droit signale que
        du contenu se prolonge — sans lui, la colonne coupée passe pour un
        défaut d'affichage.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-ats-card to-transparent sm:hidden"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-ats-card2/60">
              {head.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-ats-gray"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className="border-b border-white/5 last:border-0 hover:bg-ats-card2/40"
              >
                {r.map((c, j) => (
                  <td
                    key={j}
                    className={`px-4 py-3 align-top ${
                      j === 0 ? 'font-medium text-ats-text' : 'text-ats-muted'
                    }`}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <figcaption className="border-t border-white/5 px-4 py-2.5 text-[11px] text-ats-gray">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
