'use client';

/**
 * Bibliographie complète, filtrable — l'outil d'audit du guide.
 * Permet de répondre à « sur quoi repose ce chapitre ? » et « quelles sont
 * les affirmations qui ne tiennent qu'à une preuve faible ? ».
 */
import { useMemo, useState } from 'react';
import { ExternalLink, ShieldCheck, ShieldQuestion } from 'lucide-react';
import {
  REFERENCES,
  REFERENCE_INDEX,
  referenceUrl,
  STRENGTH_LABELS,
  STUDY_TYPE_LABELS,
  STUDY_TYPE_RANK,
  VERIFICATION_LABELS,
  type EvidenceStrength,
  type Reference,
} from '@/components/guide/references';
import { SECTIONS } from '@/components/guide/sections';

const STRENGTH_CLS: Record<EvidenceStrength, string> = {
  high: 'border-ats-green/30 bg-ats-green/10 text-ats-green-fg',
  moderate: 'border-ats-blue/30 bg-ats-blue/10 text-ats-blue-fg',
  low: 'border-ats-orange/30 bg-ats-orange/10 text-ats-orange-fg',
};

type SortKey = 'number' | 'weight' | 'year';

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        on
          ? 'border-ats-green/40 bg-ats-green/15 text-ats-green-fg'
          : 'border-white/10 text-ats-muted hover:border-white/20 hover:text-ats-text'
      }`}
    >
      {children}
    </button>
  );
}

function Card({ r }: { r: Reference }) {
  const url = referenceUrl(r);
  const verified = r.verified !== 'unverified';

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="metric text-xs font-semibold text-ats-green-fg">
          [{REFERENCE_INDEX[r.id]}]
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${STRENGTH_CLS[r.strength]}`}
        >
          {STRENGTH_LABELS[r.strength]}
        </span>
        <span className="inline-flex items-center rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-ats-muted">
          {STUDY_TYPE_LABELS[r.type]}
        </span>
        {r.axes.map((a) => (
          <span key={a} className="text-[10px] capitalize text-ats-gray">
            {a}
          </span>
        ))}
      </div>

      <h3 className="mt-2.5 text-sm font-semibold leading-snug text-ats-text">
        {r.title}
      </h3>
      <p className="mt-1 text-[11px] leading-relaxed text-ats-muted">
        {r.authors} · {r.year} · <em>{r.journal}</em> {r.locator}
      </p>

      <dl className="mt-3 space-y-2">
        {r.sample && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ats-gray">
              Effectif
            </dt>
            <dd className="text-[12px] leading-relaxed text-ats-muted">
              {r.sample}
            </dd>
          </div>
        )}
        {r.keyResult && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ats-gray">
              Résultat clé
            </dt>
            <dd className="text-[12px] leading-relaxed text-ats-muted">
              {r.keyResult}
            </dd>
          </div>
        )}
        {r.limitations && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ats-gray">
              Limites
            </dt>
            <dd className="text-[12px] leading-relaxed text-ats-muted">
              {r.limitations}
            </dd>
          </div>
        )}
        {r.erratum && (
          <div className="rounded-lg border border-ats-orange/25 bg-ats-orange/[0.07] p-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ats-orange-fg">
              Correction publiée
            </dt>
            <dd className="mt-0.5 text-[11px] leading-relaxed text-ats-muted">
              {r.erratum}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2.5">
        <p
          className={`flex items-start gap-1.5 text-[10px] leading-relaxed ${
            verified ? 'text-ats-green-fg' : 'text-ats-orange-fg'
          }`}
        >
          {verified ? (
            <ShieldCheck className="mt-px h-3 w-3 shrink-0" />
          ) : (
            <ShieldQuestion className="mt-px h-3 w-3 shrink-0" />
          )}
          <span>
            {VERIFICATION_LABELS[r.verified]}
            {r.verificationNote && (
              <span className="block text-ats-muted">{r.verificationNote}</span>
            )}
          </span>
        </p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-ats-green-fg hover:underline"
          >
            {r.doi ? 'DOI' : 'PubMed'}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </li>
  );
}

export default function SourcesExplorer() {
  const [axis, setAxis] = useState<string | null>(null);
  const [strength, setStrength] = useState<EvidenceStrength | null>(null);
  const [onlyUnverified, setOnlyUnverified] = useState(false);
  const [sort, setSort] = useState<SortKey>('number');

  const list = useMemo(() => {
    let out = REFERENCES.filter(
      (r) =>
        (!axis || r.axes.includes(axis)) &&
        (!strength || r.strength === strength) &&
        (!onlyUnverified || r.verified === 'unverified')
    );
    out = [...out].sort((a, b) => {
      if (sort === 'year') return b.year - a.year;
      if (sort === 'weight')
        return STUDY_TYPE_RANK[a.type] - STUDY_TYPE_RANK[b.type];
      return REFERENCE_INDEX[a.id] - REFERENCE_INDEX[b.id];
    });
    return out;
  }, [axis, strength, onlyUnverified, sort]);

  const unverified = REFERENCES.filter((r) => r.verified === 'unverified').length;

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray">
            Chapitre
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Chip on={axis === null} onClick={() => setAxis(null)}>
              Tous
            </Chip>
            {SECTIONS.map((s) => (
              <Chip
                key={s.slug}
                on={axis === s.slug}
                onClick={() => setAxis(axis === s.slug ? null : s.slug)}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ats-gray">
            Niveau de preuve
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Chip on={strength === null} onClick={() => setStrength(null)}>
              Tous
            </Chip>
            {(['high', 'moderate', 'low'] as EvidenceStrength[]).map((s) => (
              <Chip
                key={s}
                on={strength === s}
                onClick={() => setStrength(strength === s ? null : s)}
              >
                {STRENGTH_LABELS[s]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
          <Chip
            on={onlyUnverified}
            onClick={() => setOnlyUnverified(!onlyUnverified)}
          >
            Non vérifiées en ligne ({unverified})
          </Chip>
          <span className="ml-auto text-[11px] text-ats-gray">Trier par</span>
          {(
            [
              ['number', 'Numéro'],
              ['weight', 'Poids probant'],
              ['year', 'Année'],
            ] as [SortKey, string][]
          ).map(([k, label]) => (
            <Chip key={k} on={sort === k} onClick={() => setSort(k)}>
              {label}
            </Chip>
          ))}
        </div>
      </div>

      <p className="text-sm text-ats-muted">
        <span className="metric font-semibold text-ats-text">{list.length}</span>{' '}
        référence{list.length > 1 ? 's' : ''} affichée
        {list.length > 1 ? 's' : ''} sur {REFERENCES.length}.
      </p>

      <ul className="grid gap-3 xl:grid-cols-2">
        {list.map((r) => (
          <Card key={r.id} r={r} />
        ))}
      </ul>

      {list.length === 0 && (
        <p className="card p-8 text-center text-sm text-ats-muted">
          Aucune référence ne correspond à ces filtres.
        </p>
      )}
    </div>
  );
}
