import Link from 'next/link';
import Cite from '@/components/guide/Cite';
import CiteGroup from '@/components/guide/CiteGroup';
import SwimPace from '@/components/disciplines/calculators/SwimPace';
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

export default function NatationContent() {
  return (
    <>
      <Section
        eyebrow="La spécificité"
        title="Le seul sport où la technique prime sur la condition physique"
      >
        <P>
          L&apos;eau est environ 800 fois plus dense que l&apos;air. La
          résistance à l&apos;avancement y devient le facteur dominant, bien
          avant la puissance musculaire. Concrètement : une nageuse techniquement
          efficace mais peu entraînée ira plus vite, et plus longtemps,
          qu&apos;une athlète très en forme mais mal positionnée dans l&apos;eau.
        </P>
        <P>
          C&apos;est ce qui rend la natation frustrante au début, et ce qui la
          distingue radicalement de la course ou du vélo : y progresser passe
          d&apos;abord par <Strong>réduire les freins</Strong>, pas par pousser
          plus fort.
        </P>

        <KeyNumberGrid>
          <KeyNumber value="≈ 800×" label="densité de l'eau par rapport à l'air" tone="blue" />
          <KeyNumber value="Technique" label="premier levier de progression, avant la condition physique" />
          <KeyNumber value="≈ 0" label="impact articulaire — sport porté par l'eau" tone="violet" />
          <KeyNumber value="≈ 0" label="stimulus osseux : à compenser ailleurs" tone="orange" />
        </KeyNumberGrid>

        <Callout tone="tip" title="Conséquence pratique">
          <p>
            Enchaîner des longueurs sans intention technique consolide surtout
            les défauts existants. Mieux vaut trente minutes structurées, avec
            des éducatifs, qu&apos;une heure de nage continue à intensité moyenne.
          </p>
        </Callout>
      </Section>

      <Section eyebrow="Ce qu'elle apporte" title="Le complément le moins coûteux">
        <P>
          Portée par l&apos;eau, la natation ne produit ni impact ni phase de
          freinage excentrique. Elle permet donc d&apos;accumuler du volume
          aérobie sans grever la récupération des séances de force ou de course
          — le même raisonnement que pour le vélo.<Cite id="wilson2012" />
        </P>
        <Ul>
          <Li>
            <Strong>Récupération active</Strong> — idéale au lendemain
            d&apos;une séance de jambes lourde.
          </Li>
          <Li>
            <Strong>Continuité en cas de blessure</Strong> — souvent la seule
            option praticable lors d&apos;une gêne au genou ou à la cheville.
          </Li>
          <Li>
            <Strong>Sollicitation du haut du corps</Strong> — dos et épaules,
            peu mobilisés en course.
          </Li>
        </Ul>
        <Callout tone="warn" title="Ce qu'elle n'apporte pas">
          <p>
            Aucun bénéfice pour la densité osseuse. Une pratique exclusivement
            aquatique laisse le squelette sans stimulus mécanique — la
            musculation et les sports d&apos;impact restent nécessaires,
            particulièrement en contexte de risque de déficit énergétique.
          </p>
        </Callout>
        <CiteGroup ids={['wilson2012', 'ioc2023']} />
      </Section>

      <Section eyebrow="Structurer" title="À quoi ressemble une séance utile">
        <DataTable
          head={['Bloc', 'Durée indicative', 'Objectif']}
          rows={[
            [
              'Échauffement',
              '200 – 400 m',
              'Nage souple, mise en route des épaules',
            ],
            [
              'Éducatifs',
              '4 à 6 × 50 m',
              'Un défaut à la fois : rattrapé, poings fermés, battements avec planche',
            ],
            [
              'Corps de séance',
              '600 – 1200 m',
              'Séries chronométrées avec récupération fixe, à allure de référence',
            ],
            [
              'Retour au calme',
              '100 – 200 m',
              'Nage très souple, relâchement',
            ],
          ]}
          caption="Structure indicative pour une séance d'environ 45 minutes."
        />

        <SubTitle>Les trois défauts les plus fréquents</SubTitle>
        <Ul>
          <Li>
            <Strong>Jambes qui coulent</Strong> — souvent une tête trop relevée.
            Regarder vers le fond plutôt que devant remonte le bassin.
          </Li>
          <Li>
            <Strong>Respirer en levant la tête</Strong> — au lieu de tourner sur
            l&apos;axe du corps. Casse l&apos;alignement et fait couler les jambes.
          </Li>
          <Li>
            <Strong>Nager trop vite tout le temps</Strong> — la même zone grise
            qu&apos;en course, avec le même résultat : de la fatigue sans
            progrès.
          </Li>
        </Ul>
        <Callout tone="info">
          <p>
            Ces repères techniques relèvent de l&apos;enseignement courant de la
            natation, pas d&apos;un corpus expérimental que nous ayons vérifié.
            Quelques séances avec un maître-nageur font gagner plus de temps que
            des mois de nage en autonomie.
          </p>
        </Callout>
      </Section>

      <Section eyebrow="L'outil" title="Ton allure de référence">
        <P>
          La vitesse critique de nage se calcule à partir de deux tests
          maximaux, sur 400 m et sur 200 m. Elle donne l&apos;allure
          théoriquement soutenable longtemps, et sert de repère pour calibrer
          toutes les autres.
        </P>
        <SwimPace />
      </Section>

      <Section eyebrow="Aller plus loin" title="Natation et musculation">
        <P>
          Le chapitre <em>Combiner</em> du guide explique pourquoi les sports
          portés préservent les gains de force, et comment répartir les séances
          dans la semaine.
        </P>
        <Link
          href="/guide/combiner"
          className="inline-flex items-center rounded-xl border border-ats-green/30 bg-ats-green/10 px-4 py-2.5 text-sm font-semibold text-ats-green-fg transition-colors hover:bg-ats-green/20"
        >
          Lire le chapitre Combiner →
        </Link>
      </Section>
    </>
  );
}
