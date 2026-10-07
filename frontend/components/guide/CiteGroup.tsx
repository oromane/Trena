/**
 * Bandeau de sources en fin de section : rend visible, section par section,
 * sur quoi repose ce qui vient d'être affirmé.
 *
 * Chaque numéro ouvre la fiche complète de la référence (type d'étude,
 * effectif, résultat chiffré, limites, statut de vérification du DOI).
 */
import Cite from '@/components/guide/Cite';
import { getReference } from '@/components/guide/references';

export default function CiteGroup({ ids }: { ids: string[] }) {
  const known = ids.filter((id) => getReference(id));
  if (known.length === 0) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-1 border-t border-white/5 pt-3 text-[11px] text-ats-gray">
      <span className="uppercase tracking-[0.14em]">
        {known.length > 1 ? 'Sources' : 'Source'}
      </span>
      {known.map((id) => (
        <Cite key={id} id={id} />
      ))}
    </div>
  );
}
