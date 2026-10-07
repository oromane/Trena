'use client';

/**
 * Appel de note bibliographique.
 *
 * Survol au clavier/souris sur desktop, clic sur mobile. La bulle contient de
 * quoi évaluer la source, pas seulement la retrouver : type d'étude, effectif,
 * résultat chiffré, limites, et statut de vérification du DOI.
 */
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, ShieldCheck, ShieldQuestion, X } from 'lucide-react';
import {
  getReference,
  referenceUrl,
  REFERENCE_INDEX,
  STRENGTH_LABELS,
  STUDY_TYPE_LABELS,
  VERIFICATION_LABELS,
  type EvidenceStrength,
  type Reference,
} from '@/components/guide/references';

const STRENGTH_CLS: Record<EvidenceStrength, string> = {
  high: 'border-ats-green/30 bg-ats-green/10 text-ats-green',
  moderate: 'border-ats-blue/30 bg-ats-blue/10 text-ats-blue',
  low: 'border-ats-orange/30 bg-ats-orange/10 text-ats-orange',
};

/**
 * Toute la fiche est construite en <span> passés en `block`.
 *
 * Ce n'est pas un caprice : `Cite` s'emploie au fil du texte, donc à
 * l'intérieur de <p>. Or un <p> ne peut contenir que du contenu phrasé —
 * y glisser un <div> ou un <p> imbriqué produit un HTML invalide que le
 * navigateur réécrit, ce qui casse l'hydratation React.
 */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ats-gray">
        {label}
      </span>
      <span className="mt-0.5 block text-[12px] leading-relaxed text-ats-muted">
        {value}
      </span>
    </span>
  );
}

export function ReferenceCard({
  r,
  onClose,
}: {
  r: Reference;
  onClose?: () => void;
}) {
  const url = referenceUrl(r);
  const isVerified = r.verified !== 'unverified';

  return (
    <span className="block space-y-3">
      <span className="flex items-start justify-between gap-3">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${STRENGTH_CLS[r.strength]}`}
          >
            {STRENGTH_LABELS[r.strength]}
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-ats-muted">
            {STUDY_TYPE_LABELS[r.type]}
          </span>
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-m-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ats-gray hover:text-ats-text"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </span>

      <span className="block">
        <span className="block text-[13px] font-semibold leading-snug text-ats-text">
          {r.title}
        </span>
        <span className="mt-1 block text-[11px] leading-relaxed text-ats-muted">
          {r.authors} · {r.year}
        </span>
        <span className="block text-[11px] italic leading-relaxed text-ats-gray">
          {r.journal} {r.locator}
        </span>
      </span>

      {r.sample && <Field label="Effectif" value={r.sample} />}
      {r.keyResult && <Field label="Résultat clé" value={r.keyResult} />}
      {r.limitations && <Field label="Limites" value={r.limitations} />}
      {r.erratum && (
        <span className="block rounded-lg border border-ats-orange/25 bg-ats-orange/[0.07] p-2.5">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ats-orange">
            Correction publiée
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-ats-muted">
            {r.erratum}
          </span>
        </span>
      )}

      <span className="block space-y-2 border-t border-white/10 pt-2.5">
        <span
          className={`flex items-start gap-1.5 text-[10px] leading-relaxed ${
            isVerified ? 'text-ats-green' : 'text-ats-orange'
          }`}
        >
          {isVerified ? (
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
        </span>

        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ats-green hover:underline"
          >
            {r.doi ? `DOI ${r.doi}` : `PubMed ${r.pmid}`}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="block text-[10px] text-ats-gray">
            Aucun identifiant pérenne disponible pour cette référence.
          </span>
        )}
      </span>
    </span>
  );
}

export default function Cite({ id }: { id: string }) {
  const r = getReference(id);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Une citation vers un identifiant inconnu doit se voir en développement
  // plutôt que de disparaître silencieusement du texte.
  if (!r) {
    return (
      <sup className="ml-0.5 font-mono text-[10px] text-ats-red">[?{id}]</sup>
    );
  }

  const n = REFERENCE_INDEX[id];

  return (
    <span ref={wrapRef} className="group relative inline-block align-baseline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Source ${n} : ${r.title}`}
        className="ml-0.5 cursor-help rounded-sm px-1.5 py-0.5 align-super font-mono text-[10px] font-semibold text-ats-green transition-colors hover:bg-ats-green/15 focus:outline-none focus-visible:ring-1 focus-visible:ring-ats-green"
      >
        [{n}]
      </button>

      {/*
        Sur mobile la bulle devient une feuille ancrée en bas de l'écran :
        ancrée au repère, elle sortait à droite dès que la citation tombait en
        fin de ligne (une bulle de 352 px partant de x=300 sur un écran de
        375 px débordait de 277 px). En pleine largeur, le problème disparaît
        et la fiche, dense, se lit bien mieux au pouce.
        À partir de `sm`, on retrouve la bulle ancrée classique.
      */}
      <span
        role="tooltip"
        className={`fixed inset-x-3 bottom-3 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-white/15 bg-ats-card p-4 text-left shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-1.5 sm:max-h-none sm:w-[22rem] sm:overflow-visible ${
          open ? 'block' : 'hidden sm:group-hover:block sm:group-focus-within:block'
        }`}
      >
        <ReferenceCard r={r} onClose={open ? () => setOpen(false) : undefined} />
      </span>
    </span>
  );
}
