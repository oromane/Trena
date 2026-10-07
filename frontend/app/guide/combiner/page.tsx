import GuidePage from '@/components/guide/GuidePage';
import CiteGroup from '@/components/guide/CiteGroup';
import Cite from '@/components/guide/Cite';
import WeekPlanner from '@/components/guide/calculators/WeekPlanner';
import {
  Callout,
  DataTable,
  KeyNumber,
  KeyNumberGrid,
  Li,
  P,
  Section,
  Strong,
  SubTitle,
  Ul,
} from '@/components/guide/ui';

export const metadata = {
  title: 'Muscler et courir en même temps | Guide Trena',
};

export default function CombinerPage() {
  return (
    <GuidePage
      slug="combiner"
      intro={
        <>
          C&apos;est la question la plus fréquente et la plus mal traitée :
          est-ce que courir annule le travail fait en salle ? La réponse honnête
          est « un peu, dans certaines conditions » — et ces conditions se
          contrôlent presque entièrement.
        </>
      }
    >
      <Section eyebrow="Le phénomène" title="L'effet d'interférence, mesuré">
        <P>
          Le constat date de 1980 : des personnes entraînant force et endurance
          simultanément progressaient moins en force que celles ne faisant que de
          la force. On appelle cela l&apos;<em>effet d&apos;interférence</em>. La
          méta-analyse de référence permet aujourd&apos;hui d&apos;en mesurer
          l&apos;ampleur réelle.
        </P>

        <DataTable
          head={['Adaptation', 'Force seule', 'Force + endurance', 'Endurance seule']}
          rows={[
            ['Hypertrophie', '1,23', '0,85', '0,27'],
            ['Puissance', '0,91', '0,55', '—'],
          ]}
          caption="Tailles d'effet (Wilson et al. 2012). Une taille d'effet plus élevée signifie une progression plus marquée."
        />

        <P>
          Ce qu&apos;il faut lire dans ce tableau : l&apos;entraînement combiné
          produit{' '}
          <Strong>
            toujours nettement plus d&apos;hypertrophie que l&apos;endurance
            seule
          </Strong>{' '}
          (0,85 contre 0,27). Il en produit un peu moins que la force seule
          (0,85 contre 1,23). L&apos;interférence est donc réelle mais modeste —
          elle ne détruit rien, elle ralentit légèrement.
          <Cite id="wilson2012" />
        </P>

        <Callout tone="key" title="À retenir avant tout">
          <p>
            Si l&apos;objectif est la forme générale, la santé et une silhouette
            plus tonique — et non un record de force maximale — l&apos;effet
            d&apos;interférence est un enjeu mineur. Il ne justifie en aucun cas
            de renoncer à la course, au vélo ou à la natation.
          </p>
        </Callout>
        <CiteGroup ids={['wilson2012']} />
      </Section>

      <Section eyebrow="Le détail qui change tout" title="Courir interfère, pédaler non">
        <P>
          Le résultat le plus exploitable de cette méta-analyse est que
          l&apos;interférence dépend fortement du sport. La course à pied
          entraîne des baisses significatives de force et d&apos;hypertrophie.{' '}
          <Strong>Le vélo, non.
          <Cite id="wilson2012" /></Strong>
        </P>
        <P>
          L&apos;explication tient à la composante excentrique : à chaque foulée,
          les muscles freinent l&apos;impact au sol, ce qui provoque des
          micro-dommages et une fatigue résiduelle qui empiètent sur la
          récupération de la séance de force. Le pédalage, lui, est presque
          purement concentrique — le muscle pousse, il ne freine pas.
        </P>

        <KeyNumberGrid>
          <KeyNumber value="Course" label="Interférence la plus marquée — impacts et freinage excentrique" tone="orange" />
          <KeyNumber value="Vélo" label="Pas de décrément significatif de force ou d'hypertrophie" tone="green" />
          <KeyNumber value="Natation" label="Impact articulaire quasi nul, sollicitation différente" tone="blue" />
          <KeyNumber value="↑ volume" label="L'interférence croît avec le volume et la fréquence d'endurance" tone="violet" />
        </KeyNumberGrid>

        <Callout tone="tip" title="Application directe">
          <p>
            Pendant une phase où tu veux vraiment progresser en salle, remplace
            une partie de la course par du vélo ou de la natation. Le bénéfice
            cardiovasculaire est comparable, le coût sur tes gains musculaires
            est bien plus faible.
          </p>
        </Callout>
        <CiteGroup ids={['wilson2012']} />
      </Section>

      <Section eyebrow="Les règles" title="Quatre règles qui annulent presque l'interférence">
        <div className="space-y-4">
          {[
            {
              n: 1,
              t: 'Sépare les séances',
              d: "L'interférence est maximale quand force et endurance intense s'enchaînent immédiatement. Idéalement, place-les des jours différents ; à défaut, plusieurs heures d'écart suffisent déjà à réduire fortement le conflit.",
            },
            {
              n: 2,
              t: "Si tu dois combiner, commence par ce qui compte le plus",
              d: "Séance combinée inévitable ? Fais en premier la discipline prioritaire, quand tu es fraîche. Si tu veux progresser en force, la force passe avant le cardio. L'ordre inverse dégrade la qualité des charges.",
            },
            {
              n: 3,
              t: 'Choisis le bon sport porteur',
              d: "Vélo et natation préservent la force. La course reste évidemment indispensable si ton objectif est de courir — mais alors accepte une progression musculaire un peu plus lente, ce qui est un arbitrage, pas un échec.",
            },
            {
              n: 4,
              t: "Modère le volume d'endurance intense",
              d: "L'interférence croît avec la fréquence et la durée des séances dures. Une à deux séances intenses par semaine suffisent largement ; le reste du volume doit être facile.",
            },
          ].map((r) => (
            <div key={r.n} className="card flex gap-4 p-5">
              <span className="metric flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ats-green/30 bg-ats-green/10 text-sm font-semibold text-ats-green">
                {r.n}
              </span>
              <div>
                <h3 className="font-semibold text-ats-text">{r.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ats-muted">
                  {r.d}
                </p>
              </div>
            </div>
          ))}
        </div>
        <CiteGroup ids={['wilson2012', 'acsm2026']} />
      </Section>

      <Section eyebrow="L'outil" title="Construis ta semaine">
        <P>
          Choisis ton nombre de séances, ta priorité et ton sport d&apos;endurance :
          le planificateur propose une répartition et vérifie qu&apos;elle
          respecte les principes ci-dessus.
        </P>
        <WeekPlanner />
        <P>
          Ces semaines types sont des points de départ, pas des obligations. La
          meilleure répartition est celle que tu peux tenir plusieurs mois
          d&apos;affilée avec ton travail, ton sommeil et ta vie sociale.
        </P>
        <CiteGroup ids={['acsm2026', 'seiler2006']} />
      </Section>

      <Section eyebrow="Cas concret" title="Prendre du muscle tout en courant">
        <P>
          C&apos;est le scénario le plus courant, et il est parfaitement
          réalisable. Voici la configuration qui coche toutes les cases.
        </P>
        <Ul>
          <Li>
            <Strong>Deux à trois séances de force full-body</Strong>, charges
            progressives, 2–3 répétitions en réserve, au moins dix séries par
            groupe musculaire sur la semaine.
          </Li>
          <Li>
            <Strong>Deux à trois séances de course</Strong>, dont une seule
            intense au maximum — le reste en endurance fondamentale, vraiment
            facile.
          </Li>
          <Li>
            <Strong>Aucun jour</Strong> avec une séance de jambes lourde suivie
            d&apos;un fractionné le lendemain.
          </Li>
          <Li>
            <Strong>Un apport calorique suffisant.</Strong> C&apos;est le point le
            plus souvent négligé : additionner musculation et course augmente
            fortement la dépense. Sans manger davantage, on ne prend pas de
            muscle — quelle que soit la qualité du programme.
          </Li>
          <Li>
            <Strong>1,4 à 2,0 g de protéines par kilo et par jour</Strong>,
            réparties sur la journée.
          </Li>
        </Ul>

        <Callout tone="warn" title="Le vrai risque n'est pas l'interférence">
          <p>
            Chez une femme qui cumule salle et cardio, le problème le plus
            fréquent n&apos;est pas l&apos;effet d&apos;interférence : c&apos;est
            le <strong className="font-semibold text-ats-text">déficit
            énergétique</strong>. Manger comme avant tout en dépensant beaucoup
            plus bloque la progression, perturbe le cycle menstruel et fragilise
            l&apos;os. Ce point est développé dans les chapitres Nutrition et
            Sécurité.
          </p>
        </Callout>
        <CiteGroup ids={['acsm2026', 'issn2017', 'ioc2023']} />
      </Section>

      <Section eyebrow="Triathlon" title="Les enchaînements vélo-course">
        <P>
          Passer du vélo à la course provoque une sensation caractéristique de
          jambes lourdes. Ce n&apos;est pas un manque d&apos;entraînement, c&apos;est
          de la physiologie.
        </P>
        <Ul>
          <Li>
            Le flux sanguin doit se redistribuer des muscles du pédalage vers
            ceux de la course.
          </Li>
          <Li>
            Les patrons de recrutement diffèrent : le cyclisme travaille autour
            de 75 à 110° de flexion de hanche, la course autour de 10 à 50°.
          </Li>
          <Li>
            L&apos;économie de course est dégradée pendant les 2 à 10 premières
            minutes.
          </Li>
        </Ul>
        <SubTitle>Ce qu&apos;il faut en faire</SubTitle>
        <P>
          La séance dite « brick » (vélo puis course immédiatement) entraîne
          précisément cette transition et améliore la coordination et
          l&apos;économie de course en début de portion pédestre. Pour une
          pratique loisir, un brick modéré toutes les une à trois semaines
          suffit. Inutile d&apos;en faire des séances épuisantes : l&apos;objectif
          est d&apos;habituer le corps, pas de le casser.
        </P>
      </Section>
    </GuidePage>
  );
}
