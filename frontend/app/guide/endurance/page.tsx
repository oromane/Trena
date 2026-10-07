import GuidePage from '@/components/guide/GuidePage';
import VideoEmbed from '@/components/guide/VideoEmbed';
import CiteGroup from '@/components/guide/CiteGroup';
import Cite from '@/components/guide/Cite';
import VmaCalculator from '@/components/guide/calculators/VmaCalculator';
import HeartRateZones from '@/components/guide/calculators/HeartRateZones';
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

export const metadata = { title: 'Course, vélo, natation | Guide Trena' };

export default function EndurancePage() {
  return (
    <GuidePage
      slug="endurance"
      intro={
        <>
          L&apos;erreur la plus répandue en endurance est de courir trop vite les
          jours faciles et pas assez vite les jours durs. Tout finit au milieu :
          trop dur pour récupérer, trop facile pour progresser.
        </>
      }
    >
      <Section eyebrow="Le principe" title="Trois zones, deux seuils">
        <P>
          Le corps change de mode de fonctionnement à deux moments précis, qu&apos;on
          appelle des seuils. En dessous du premier (seuil aérobie), l&apos;effort
          est soutenable très longtemps. Au-dessus du second (seuil anaérobie),
          l&apos;acidité s&apos;accumule plus vite qu&apos;elle n&apos;est
          éliminée et le compte à rebours est lancé. Entre les deux se trouve une
          zone intermédiaire.
        </P>

        <DataTable
          head={['Zone', 'Sensation', 'Ce que ça développe']}
          rows={[
            [
              'Zone 1 — facile',
              'Conversation possible en phrases complètes',
              'Base aérobie : mitochondries, capillaires, volume du cœur, économie de mouvement',
            ],
            [
              'Zone 2 — intermédiaire',
              'Phrases courtes, respiration marquée',
              'La « zone grise » : fatigue réelle, bénéfice limité. À utiliser avec parcimonie',
            ],
            [
              'Zone 3 — dur',
              'Quelques mots seulement, respiration maximale',
              'VO2max, capacité au seuil, tolérance à haute intensité',
            ],
          ]}
        />
        <CiteGroup ids={['seiler2006']} />
      </Section>

      <Section eyebrow="La distribution" title="Pourquoi 80 % de facile">
        <P>
          Quand on a mesuré la répartition réelle des intensités chez des
          athlètes d&apos;endurance de haut niveau, le résultat a surpris : ils
          passent l&apos;écrasante majorité de leur temps très lentement.
          <Cite id="seiler2006" />
        </P>

        <KeyNumberGrid>
          <KeyNumber value="75 ± 3" unit="%" label="du volume en Zone 1 — facile" />
          <KeyNumber value="8 ± 3" unit="%" label="en Zone 2 — la zone grise" tone="violet" />
          <KeyNumber value="17 ± 4" unit="%" label="en Zone 3 — dur" tone="orange" />
          <KeyNumber value="347" unit="séances" label="analysées chez 11 skieurs de fond" tone="blue" />
        </KeyNumberGrid>

        <P>
          La logique est simple : le volume facile construit la base sans coûter
          de récupération, ce qui permet ensuite d&apos;encaisser des séances
          dures réellement dures. Courir tous ses footings à allure moyenne, au
          contraire, accumule de la fatigue sans jamais fournir de stimulus
          intense.
        </P>

        <Callout tone="info" title="Une nuance honnête">
          <p>
            Les essais contrôlés qui comparent les distributions restent petits
            (12 à 48 participants, 6 à 12 semaines) et le débat entre modèle
            « polarisé » et « pyramidal » n&apos;est pas tranché. Le principe
            « la majorité du volume doit être facile » est solide. La proportion
            exacte 80/20 est indicative, pas sacrée.
          </p>
        </Callout>

        <Callout tone="tip" title="Le test le plus fiable est gratuit">
          <p>
            Pas besoin de capteur : si tu ne peux pas tenir une conversation en
            phrases complètes, tu n&apos;es pas en endurance fondamentale. La
            plupart des gens doivent ralentir bien plus qu&apos;ils ne le
            pensent — au début, cela demande d&apos;accepter de courir lentement.
          </p>
        </Callout>
        <CiteGroup ids={['seiler2006', 'stoggl2014']} />
      </Section>

      <Section eyebrow="Calibrer" title="Trouver ses allures : la VMA">
        <P>
          La VMA (vitesse maximale aérobie) est la vitesse à laquelle tu atteins
          ta consommation maximale d&apos;oxygène. Elle sert de référence pour
          calculer toutes les autres allures. Le test le plus accessible est le
          demi-Cooper : courir le plus loin possible en six minutes, puis diviser
          la distance par cent.
        </P>
        <VmaCalculator />
        <CiteGroup ids={['seiler2006']} />
      </Section>

      <Section eyebrow="Attention" title="Le piège du 220 − âge">
        <P>
          La formule « 220 moins l&apos;âge » est la plus utilisée au monde et
          l&apos;une des moins fiables. Une révision portant sur 351 études et
          18 712 sujets propose une meilleure équation —{' '}
          <Strong>FCmax = 208 − 0,7 × âge</Strong> — mais avec un écart-type
          d&apos;environ ±10 battements par minute.
          <Cite id="tanaka2001" />
        </P>
        <P>
          Autrement dit : deux femmes du même âge peuvent avoir vingt battements
          d&apos;écart de fréquence cardiaque maximale sans que rien ne soit
          anormal. Des zones calculées sur une FCmax estimée peuvent donc être
          totalement décalées pour toi personnellement.
        </P>
        <HeartRateZones />
        <CiteGroup ids={['tanaka2001']} />
      </Section>

      <Section eyebrow="Les séances" title="Quatre formats et ce qu'ils apportent">
        <DataTable
          head={['Séance', 'Format type', 'Bénéfice principal']}
          rows={[
            [
              'Endurance fondamentale',
              '40 – 75 min en Zone 1',
              'Adaptations mitochondriales et capillaires, économie de mouvement',
            ],
            [
              'Fractionné court',
              '10 × 1 min rapide / 1 min récup',
              'VO2max, tolérance à haute intensité',
            ],
            [
              'Seuil',
              '2 × 10 min à allure soutenue contrôlée',
              'Capacité à tenir longtemps près du seuil lactique',
            ],
            [
              'Sortie longue',
              '1 h 15 – 2 h en Zone 1',
              'Endurance, oxydation des lipides, résistance mentale',
            ],
          ]}
        />
        <CiteGroup ids={['seiler2006']} />
      </Section>

      <Section eyebrow="Les trois sports" title="Ce que chacun apporte de spécifique">
        <SubTitle>Course à pied</SubTitle>
        <P>
          La plus accessible et la plus efficace en temps. C&apos;est aussi celle
          qui sollicite le plus l&apos;appareil locomoteur : les impacts
          renforcent l&apos;os mais fatiguent les muscles de façon durable, et
          c&apos;est elle qui interfère le plus avec les gains de force.
        </P>

        <SubTitle>Vélo</SubTitle>
        <P>
          Mouvement presque exclusivement concentrique, donc peu de dommages
          musculaires. Permet d&apos;accumuler beaucoup de volume aérobie sans
          compromettre la musculation. En contrepartie, aucun effet bénéfique sur
          la densité osseuse.
        </P>

        <SubTitle>Natation</SubTitle>
        <P>
          Sollicite fortement le haut du corps et dépend énormément de la
          technique — une nageuse peu technique se fatigue vite sans que le
          système cardiovasculaire travaille beaucoup. Impact articulaire quasi
          nul, ce qui en fait l&apos;option idéale en récupération active ou en
          cas de gêne articulaire.
        </P>

        <Callout tone="key">
          <p>
            Alterner les trois disciplines permet d&apos;accumuler du volume
            aérobie tout en répartissant la contrainte mécanique. C&apos;est
            souvent plus intelligent que d&apos;augmenter indéfiniment le
            kilométrage de course.
          </p>
        </Callout>
        <CiteGroup ids={['wilson2012']} />
      </Section>

      <Section eyebrow="Progresser" title="Augmenter sans se blesser">
        <Ul>
          <Li>
            Augmente le volume <Strong>progressivement</Strong> : les hausses
            brutales sont le principal facteur de blessure.
          </Li>
          <Li>
            Ne modifie qu&apos;une variable à la fois — soit la durée, soit
            l&apos;intensité, jamais les deux la même semaine.
          </Li>
          <Li>
            Prévois une semaine allégée toutes les trois à quatre semaines.
          </Li>
          <Li>
            Une douleur qui modifie ta foulée impose l&apos;arrêt, pas
            l&apos;adaptation.
          </Li>
        </Ul>
      </Section>
      <Section eyebrow="Aller plus loin" title="Seiler explique lui-même son propre travail">
        <VideoEmbed id="seiler-polarized" />
      </Section>
    </GuidePage>
  );
}
