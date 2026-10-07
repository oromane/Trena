/**
 * Bibliographie de fin de chapitre : toutes les sources mobilisées, avec
 * leur numéro global, leur nature et leur lien pérenne.
 */
import { ExternalLink, ShieldQuestion } from 'lucide-react';
import {
  getReference,
  referencesForAxis,
  referenceUrl,
  REFERENCE_INDEX,
  STRENGTH_LABELS,
  STUDY_TYPE_LABELS,
  type EvidenceStrength,
  type Reference,
} from '@/components/guide/references';

const STRENGTH_CLS: Record<EvidenceStrength, string> = {
  high: 'text-ats-green',
  moderate: 'text-ats-blue',
  low: 'text-ats-orange',
};

/**
 * Sélection par chapitre du guide (`slug`) ou par liste explicite (`ids`),
 * pour les pages hors guide qui mobilisent quelques références ciblées.
 */
export default function Bibliography({
  slug,
  ids,
  title = 'Sources de ce chapitre',
}: {
  slug?: string;
  ids?: string[];
  title?: string;
}) {
  const refs: Reference[] = ids
    ? (ids.map(getReference).filter(Boolean) as Reference[])
    : slug
      ? referencesForAxis(slug)
      : [];
  if (refs.length === 0) return null;

  return (
    <section className="scroll-mt-24" id="sources">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
        {title}
      </h2>
      <ol className="mt-4 space-y-3">
        {refs.map((r) => {
          const url = referenceUrl(r);
          return (
            <li key={r.id} className="card p-4">
              <div className="flex gap-3">
                <span className="metric shrink-0 text-xs font-semibold text-ats-green">
                  [{REFERENCE_INDEX[r.id]}]
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-ats-text">
                    {r.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ats-muted">
                    {r.authors} · {r.year} · <em>{r.journal}</em> {r.locator}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                    <span className={`font-semibold ${STRENGTH_CLS[r.strength]}`}>
                      {STRENGTH_LABELS[r.strength]}
                    </span>
                    <span className="text-ats-gray">
                      {STUDY_TYPE_LABELS[r.type]}
                    </span>
                    {r.sample && <span className="text-ats-gray">{r.sample}</span>}
                    {r.verified === 'unverified' && (
                      <span className="inline-flex items-center gap-1 text-ats-orange">
                        <ShieldQuestion className="h-3 w-3" />
                        non vérifiée en ligne
                      </span>
                    )}
                  </p>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-ats-green hover:underline"
                    >
                      {r.doi ? `DOI ${r.doi}` : `PubMed ${r.pmid}`}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
