import SourcesExplorer from '@/components/guide/SourcesExplorer';
import { REFERENCES } from '@/components/guide/references';

export const metadata = {
  title: 'Sources et méthode | Guide Trena',
  description:
    'Bibliographie complète du guide, avec type d’étude, effectif, résultat chiffré, limites méthodologiques et statut de vérification de chaque référence.',
};

export default function SourcesPage() {
  const verified = REFERENCES.filter((r) => r.verified !== 'unverified').length;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6 xl:max-w-[76rem]">
      <header className="border-b border-white/5 pb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
          Méthode
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ats-text sm:text-4xl">
          Sources et vérification
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ats-muted">
          Toutes les références mobilisées dans le guide, avec de quoi les
          évaluer et non seulement les retrouver : nature de l&apos;étude,
          effectif, résultat chiffré, limites méthodologiques.
        </p>
      </header>

      <section className="mt-10 space-y-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
          Comment lire une référence
        </h2>
        <div className="card space-y-3 p-5 text-sm leading-relaxed text-ats-muted">
          <p>
            <strong className="font-semibold text-ats-text">
              Le niveau de preuve
            </strong>{' '}
            ne dépend pas de ce que dit une étude, mais de sa capacité à le
            démontrer. Une position officielle synthétisant des dizaines de
            revues pèse plus lourd qu&apos;un essai isolé sur douze personnes —
            même si le second est plus spectaculaire.
          </p>
          <p>
            <strong className="font-semibold text-ats-text">
              Les limites comptent autant que le résultat.
            </strong>{' '}
            Un intervalle de confiance qui traverse zéro signifie que
            l&apos;absence d&apos;effet reste plausible. Un échantillon
            exclusivement masculin ne se transpose pas mécaniquement. Ces
            réserves sont indiquées pour chaque référence.
          </p>
          <p>
            <strong className="font-semibold text-ats-text">
              La vérification
            </strong>{' '}
            indique si le DOI a été résolu auprès de l&apos;éditeur. Sur les{' '}
            {REFERENCES.length} références du guide,{' '}
            <span className="metric font-semibold text-ats-green">
              {verified}
            </span>{' '}
            ont été confirmées ; les autres sont explicitement signalées comme
            non contrôlées, plutôt que présentées comme acquises.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.25em] text-ats-gray">
          Bibliographie
        </h2>
        <SourcesExplorer />
      </section>

      <section className="mt-12">
        <div className="rounded-2xl border border-ats-blue/20 bg-ats-blue/[0.06] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ats-blue">
            Ce que cette page ne garantit pas
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ats-muted">
            Vérifier qu&apos;un DOI pointe vers le bon article ne garantit pas
            que l&apos;article soit exact, ni que son résultat se généralise à
            ton cas. La science évolue : une position officielle de 2026 sera
            révisée. Cette bibliographie sert à rendre le raisonnement
            auditable, pas à le rendre définitif.
          </p>
        </div>
      </section>
    </div>
  );
}
