import GuidePage from '@/components/guide/GuidePage';
import CiteGroup from '@/components/guide/CiteGroup';
import Cite from '@/components/guide/Cite';
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

export const metadata = { title: 'Récupérer, dormir, doser | Guide Trena' };

export default function RecuperationPage() {
  return (
    <GuidePage
      slug="recuperation"
      intro={
        <>
          L&apos;entraînement ne fait que créer le signal. La progression, elle,
          se produit pendant la récupération. C&apos;est la partie la plus
          négligée et probablement celle qui offre le meilleur retour sur
          investissement.
        </>
      }
    >
      <Section eyebrow="Priorité n°1" title="Le sommeil bat tous les autres leviers">
        <P>
          Parmi toutes les interventions de récupération étudiées — étirements,
          froid, compression, massages, compléments — celle qui produit les
          effets les plus nets sur la performance est la plus simple :{' '}
          <Strong>dormir davantage</Strong>. L&apos;extension du temps de sommeil
          ressort comme l&apos;intervention la plus efficace.
          <Cite id="bonnar2018" />
        </P>
        <Ul>
          <Li>
            Le manque de sommeil augmente le risque de blessure et dégrade la
            récupération.
          </Li>
          <Li>
            Les siestes donnent des résultats mixtes : utiles ponctuellement,
            elles ne compensent pas une dette chronique.
          </Li>
          <Li>
            La <Strong>régularité</Strong> des horaires compte autant que la
            durée totale.
          </Li>
        </Ul>
        <Callout tone="key">
          <p>
            Avant d&apos;ajouter une séance, un complément ou un protocole de
            récupération sophistiqué : ajouter quarante-cinq minutes de sommeil
            par nuit produira presque certainement plus d&apos;effet.
          </p>
        </Callout>
        <CiteGroup ids={['bonnar2018']} />
      </Section>

      <Section eyebrow="Mesurer" title="Repérer la fatigue avant qu'elle ne coûte cher">
        <P>
          Aucun marqueur pris isolément ne suffit à dire si tu récupères bien. Ce
          qui fonctionne, c&apos;est le suivi combiné et longitudinal — comparé à{' '}
          <Strong>ta propre ligne de base</Strong>, jamais à celle de quelqu&apos;un
          d&apos;autre.
        </P>

        <DataTable
          head={['Marqueur', 'Ce qu’il capte', 'Limite']}
          rows={[
            [
              'RPE (effort perçu)',
              'La difficulté ressentie de chaque séance — gratuit et étonnamment fiable',
              'Subjectif, influencé par l’humeur et le contexte',
            ],
            [
              'Questionnaire de bien-être',
              'Sommeil, humeur, courbatures, stress — les premiers signes de dérive',
              'Demande de la régularité pour être utile',
            ],
            [
              'Variabilité cardiaque (VFC)',
              "L'état du système nerveux autonome au réveil",
              'Très bruitée au jour le jour : seule la tendance sur plusieurs jours compte',
            ],
            [
              'FC de repos',
              'Une élévation durable signale souvent une fatigue accumulée',
              'Sensible à la déshydratation, à l’alcool, à une infection',
            ],
          ]}
        />

        <Callout tone="info">
          <p>
            Le surentraînement et le déficit énergétique partagent les mêmes
            symptômes : fatigue persistante, baisse de performance, troubles de
            l&apos;humeur. Avant de conclure « je m&apos;entraîne trop », vérifie
            aussi « est-ce que je mange assez ». Le second cas est plus fréquent.
          </p>
        </Callout>
        <CiteGroup ids={['ioc2023']} />
      </Section>

      <Section eyebrow="Doser" title="Repos actif ou repos complet">
        <P>
          Les deux ont leur place, et le choix dépend du niveau de fatigue.
        </P>
        <SubTitle>Repos actif</SubTitle>
        <P>
          Une activité légère — marche, vélo tranquille, natation souple — peut
          favoriser la récupération sans nuire aux adaptations. Utile lors
          d&apos;une fatigue modérée ou de courbatures.
        </P>
        <SubTitle>Repos complet</SubTitle>
        <P>
          Indispensable en cas de fatigue marquée, de sommeil dégradé, de
          maladie ou de douleur. Ne rien faire est parfois la décision la plus
          productive de la semaine.
        </P>

        <Callout tone="tip" title="Une règle simple">
          <p>
            Prévois une semaine allégée (volume réduit d&apos;environ 40 %)
            toutes les trois à quatre semaines. Cela permet à la fatigue
            accumulée de redescendre et laisse les adaptations s&apos;exprimer —
            c&apos;est souvent là qu&apos;on constate les meilleures performances.
          </p>
        </Callout>
      </Section>

      <Section eyebrow="Courbatures" title="Ce qu'elles disent (et ne disent pas)">
        <P>
          Les courbatures signalent surtout qu&apos;un mouvement était nouveau ou
          inhabituellement excentrique. Elles ne sont ni un indicateur fiable de
          la qualité d&apos;une séance, ni un marqueur de croissance musculaire.
        </P>
        <P>
          S&apos;entraîner un groupe musculaire deux fois par semaine reste
          compatible avec la récupération pour la grande majorité des adultes,
          même si de légères courbatures subsistent.
        </P>
        <CiteGroup ids={['acsm2026']} />
      </Section>
    </GuidePage>
  );
}
