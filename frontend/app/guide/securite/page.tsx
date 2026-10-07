import GuidePage from '@/components/guide/GuidePage';
import CiteGroup from '@/components/guide/CiteGroup';
import {
  Callout,
  DataTable,
  Li,
  P,
  Section,
  Strong,
  SubTitle,
  Ul,
} from '@/components/guide/ui';

export const metadata = { title: 'Signaux d’alerte et limites | Guide Trena' };

export default function SecuritePage() {
  return (
    <GuidePage
      slug="securite"
      intro={
        <>
          Un guide honnête doit aussi dire où il s&apos;arrête. Voici ce qui
          justifie de consulter sans attendre, ce qui prévient réellement les
          blessures, et ce que ce contenu ne peut pas faire.
        </>
      }
    >
      <Section eyebrow="Urgent" title="Consulter sans attendre">
        <Callout tone="warn" title="Ces signes imposent un avis médical">
          <ul className="space-y-1.5">
            <li>
              Douleur thoracique, malaise, essoufflement anormal à l&apos;effort
            </li>
            <li>Disparition des règles ou troubles menstruels inhabituels</li>
            <li>
              Fatigue chronique qui ne cède pas au repos, fractures de stress,
              perte de poids involontaire
            </li>
            <li>
              Douleur articulaire ou musculaire persistante, ou apparue
              brutalement
            </li>
            <li>Rapport à l&apos;alimentation qui devient source d&apos;angoisse</li>
          </ul>
        </Callout>
        <P>
          Aucun de ces signes ne se règle en ajustant un programme. Ils relèvent
          d&apos;un médecin — idéalement un médecin du sport.
        </P>
        <CiteGroup ids={['ioc2023']} />
      </Section>

      <Section eyebrow="Avant de commencer" title="Quand demander un avis préalable">
        <P>
          Un avis médical est recommandé avant de débuter ou de reprendre, en
          particulier en cas de :
        </P>
        <Ul>
          <Li>pathologie cardiovasculaire connue ou hypertension non contrôlée ;</Li>
          <Li>blessure en cours ou récente, chirurgie récente ;</Li>
          <Li>ostéoporose ou fragilité osseuse connue ;</Li>
          <Li>grossesse ou post-partum ;</Li>
          <Li>longue période sans activité physique.</Li>
        </Ul>
      </Section>

      <Section eyebrow="Prévenir" title="Ce qui protège réellement">
        <DataTable
          head={['Levier', 'Pourquoi ça marche']}
          rows={[
            [
              'Progressivité',
              "Les hausses brutales de volume sont le facteur de blessure le mieux documenté. Augmenter lentement est la mesure la plus efficace qui soit.",
            ],
            [
              'Musculation',
              "Elle est protectrice : renforcement musculo-tendineux, densité osseuse, équilibre. C'est un moyen de prévention, pas un risque.",
            ],
            [
              'Technique et amplitude',
              'Un mouvement maîtrisé sur toute son amplitude répartit correctement les contraintes et développe la force sur toute la course articulaire.',
            ],
            [
              'Échauffement',
              'Prépare les tissus et le système nerveux, améliore la qualité des premières séries.',
            ],
            [
              'Sommeil',
              'Le manque de sommeil augmente mesurablement le risque de blessure.',
            ],
          ]}
        />

        <SubTitle>La différence entre inconfort et douleur</SubTitle>
        <P>
          L&apos;inconfort de l&apos;effort — brûlure musculaire, essoufflement,
          courbatures diffuses — fait partie de l&apos;entraînement. Une{' '}
          <Strong>douleur localisée, aiguë, ou qui modifie ton mouvement</Strong>{' '}
          est un signal d&apos;arrêt. Continuer « en serrant les dents » transforme
          régulièrement un problème de deux semaines en un problème de six mois.
        </P>
        <CiteGroup ids={['acsm2026']} />
      </Section>

      <Section eyebrow="Honnêteté" title="Ce que ce guide ne peut pas faire">
        <P>
          Ce contenu est pédagogique. Il synthétise de la littérature scientifique
          en citant ses sources, mais il ne connaît ni ton histoire médicale, ni
          tes antécédents, ni ton examen clinique.
        </P>
        <Ul>
          <Li>Il ne pose <Strong>aucun diagnostic</Strong>.</Li>
          <Li>Il ne prescrit <Strong>aucun traitement</Strong>.</Li>
          <Li>
            Il ne remplace <Strong>pas</Strong> un avis médical individualisé.
          </Li>
          <Li>
            Il ne prétend traiter ni le déficit énergétique, ni l&apos;aménorrhée,
            ni un trouble du comportement alimentaire.
          </Li>
        </Ul>

        <SubTitle>Vers qui se tourner</SubTitle>
        <DataTable
          head={['Professionnel', 'Pour quoi']}
          rows={[
            [
              'Médecin du sport',
              'Bilan avant reprise, fatigue inexpliquée, troubles menstruels, suspicion de RED-S',
            ],
            [
              'Diététicien·ne du sport',
              "Besoins individualisés, gestion du poids, rapport à l'alimentation",
            ],
            [
              'Kinésithérapeute',
              'Douleur persistante, rééducation, correction technique après blessure',
            ],
            [
              'Médecin traitant',
              'Bilan sanguin (ferritine, vitamine D, hémogramme), orientation générale',
            ],
          ]}
        />
      </Section>

      <Section eyebrow="Limites" title="Ce que la science elle-même ne sait pas encore">
        <Ul>
          <Li>
            Les interventions étudiées durent le plus souvent 6 à 16 semaines :
            les données à très long terme restent rares.
          </Li>
          <Li>
            Les échantillons sont majoritairement des adultes de 20 à 50 ans. La
            direction des recommandations se généralise, mais pas nécessairement
            les chiffres exacts chez les femmes ménopausées ou plus âgées.
          </Li>
          <Li>
            Sur le cycle menstruel, la recherche est jeune et méthodologiquement
            hétérogène : l&apos;absence de preuve d&apos;un effet moyen ne prouve
            pas l&apos;absence d&apos;effet individuel.
          </Li>
          <Li>
            Le RED-S est cliniquement robuste mais débattu quant à sa
            mesurabilité sur le terrain : il doit guider la vigilance et
            l&apos;orientation médicale, pas l&apos;autodiagnostic.
          </Li>
          <Li>
            La supériorité de la distribution polarisée repose sur des essais de
            petite taille et de courte durée.
          </Li>
        </Ul>
        <Callout tone="key" title="Ce qui reste solide malgré tout">
          <p>
            La régularité sur des années bat n&apos;importe quelle optimisation de
            détail. Un programme imparfait mais suivi produit infiniment plus
            qu&apos;un programme parfait abandonné au bout de trois semaines.
          </p>
        </Callout>
        <CiteGroup ids={['acsm2026', 'ioc2023']} />
      </Section>
    </GuidePage>
  );
}
