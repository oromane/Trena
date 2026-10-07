import GuidePage from '@/components/guide/GuidePage';
import VideoEmbed from '@/components/guide/VideoEmbed';
import CiteGroup from '@/components/guide/CiteGroup';
import Cite from '@/components/guide/Cite';
import NutritionCalculator from '@/components/guide/calculators/NutritionCalculator';
import {
  Callout,
  DataTable,
  EvidenceBadge,
  KeyNumber,
  KeyNumberGrid,
  Li,
  P,
  Section,
  Strong,
  SubTitle,
  Ul,
} from '@/components/guide/ui';

export const metadata = { title: 'Manger pour progresser | Guide Trena' };

export default function NutritionPage() {
  return (
    <GuidePage
      slug="nutrition"
      intro={
        <>
          L&apos;entraînement crée le signal, l&apos;alimentation fournit la
          matière. On peut faire un programme parfait et ne rien construire du
          tout si l&apos;apport ne suit pas — c&apos;est même le scénario le plus
          fréquent chez les femmes actives.
        </>
      }
    >
      <Section eyebrow="L'outil" title="Tes besoins, calculés">
        <NutritionCalculator />
        <CiteGroup ids={['issn2017', 'thomas2016']} />
      </Section>

      <Section eyebrow="Protéines" title="Combien, et surtout comment les répartir">
        <P>
          Les protéines apportent les briques du muscle. La position officielle
          de l&apos;International Society of Sports Nutrition fixe une plage
          claire, et surtout précise un point souvent ignoré : la{' '}
          <Strong>répartition</Strong> compte autant que le total.
        </P>

        <KeyNumberGrid>
          <KeyNumber value="1,4 – 2,0" unit="g/kg/j" label="apport quotidien suffisant pour construire et maintenir le muscle" />
          <KeyNumber value="0,25" unit="g/kg" label="par prise, soit environ 20 à 40 g" tone="blue" />
          <KeyNumber value="3 – 4" unit="h" label="d'intervalle entre les prises" tone="violet" />
          <KeyNumber value="≥ 24" unit="h" label="durée de l'effet anabolique d'une séance" tone="orange" />
        </KeyNumberGrid>

        <P>
          Concrètement, quatre prises de 25 à 30 g réparties sur la journée sont
          plus efficaces que 100 g concentrés le soir. Chaque prise doit
          apporter suffisamment de leucine (700 à 3000 mg selon les sources) pour
          déclencher la synthèse protéique.
        </P>

        <SubTitle>Le cas de la caséine avant le coucher</SubTitle>
        <P>
          30 à 40 g de caséine (fromage blanc, skyr, ou poudre) avant de dormir
          augmentent la synthèse protéique nocturne.
          <Cite id="issn2017" /> C&apos;est l&apos;une des
          rares recommandations de timing réellement soutenues par les données.
        </P>
        <CiteGroup ids={['issn2017']} />
      </Section>

      <Section eyebrow="Idée reçue" title="La fenêtre anabolique">
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-semibold text-ats-text">
              « Il faut ta protéine dans les 30 minutes après la séance, sinon
              c&apos;est perdu »
            </h3>
            <EvidenceBadge level="marketing" />
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-ats-muted">
            Cette croyance a vendu beaucoup de shakers. L&apos;analyse retenue
            par l&apos;ISSN montre que le prédicteur le plus fort de
            l&apos;hypertrophie est l&apos;
            <strong className="font-semibold text-ats-text">
              apport protéique total sur la journée
            </strong>
            , le timing n&apos;ayant qu&apos;un effet mineur. L&apos;effet
            anabolique d&apos;une séance dure au moins 24 heures : rentrer
            tranquillement chez soi et dîner normalement ne fait rien perdre du
            tout.
          </p>
        </div>
        <CiteGroup ids={['issn2017']} />
      </Section>

      <Section eyebrow="Glucides" title="Le carburant de l'intensité">
        <P>
          Les glucides alimentent les efforts intenses. Leur besoin n&apos;est
          pas fixe : il se module selon la charge de la semaine. Les jours durs
          demandent davantage, les jours calmes moins.
        </P>

        <DataTable
          head={["Charge d'entraînement", 'Glucides', 'Exemple']}
          rows={[
            ['Activité légère', '3 – 5 g/kg/j', '1 à 2 séances dans la semaine'],
            ['Modérée', '≈ 5 – 7 g/kg/j', '3 à 4 séances, durées moyennes'],
            ['Endurance élevée', '6 – 10 g/kg/j', "5 à 6 séances dont de l'endurance longue"],
            ['Très élevée', '8 – 12 g/kg/j', 'Préparation compétition, très gros volume'],
          ]}
        />

        <Ul>
          <Li>
            Récupération rapide (moins de 4 h avant l&apos;effort suivant) :
            1,0 à 1,2 g/kg/h de glucides pendant les quatre premières heures.
          </Li>
          <Li>
            Pendant un effort de plus de 70 minutes : environ 30 à 60 g de
            glucides par heure.
          </Li>
        </Ul>
        <CiteGroup ids={['thomas2016']} />
      </Section>

      <Section eyebrow="Hydratation" title="Boire à la soif — ni plus, ni moins">
        <Callout tone="warn" title="Le conseil « bois autant que possible » est dangereux">
          <p>
            L&apos;hyponatrémie liée à l&apos;exercice résulte principalement
            d&apos;une <strong className="font-semibold text-ats-text">
            surconsommation de boissons peu salées</strong>, associée à une
            sécrétion inappropriée de vasopressine — et non d&apos;un manque de
            sel. Dans ses formes sévères, elle peut évoluer vers un œdème
            cérébral ou pulmonaire.
          </p>
          <p>
            Un signe simple : si tu as <em>pris</em> du poids pendant un effort,
            tu as trop bu.
          </p>
        </Callout>
        <P>
          La recommandation issue de la conférence de consensus internationale
          est d&apos;une simplicité rassurante : <Strong>boire à la soif</Strong>.
          Le mécanisme de la soif est fiable et suffit dans la très grande
          majorité des situations sportives.
        </P>
        <CiteGroup ids={['eah2015']} />
      </Section>

      <Section eyebrow="Le point critique" title="Le déficit énergétique (RED-S)">
        <P>
          C&apos;est le risque de santé central pour une femme qui s&apos;entraîne
          beaucoup, et il est largement sous-estimé. Le RED-S désigne les
          conséquences d&apos;une disponibilité énergétique insuffisante :
          l&apos;apport alimentaire ne couvre pas la dépense de l&apos;exercice{' '}
          <em>plus</em> les besoins de base de l&apos;organisme.
        </P>
        <P>
          Le corps réagit en réduisant ce qui n&apos;est pas vital dans
          l&apos;immédiat : la fonction reproductive, la construction osseuse, le
          métabolisme, l&apos;immunité.
        </P>

        <DataTable
          head={['Système touché', 'Conséquence possible']}
          rows={[
            ['Hormonal et reproductif', 'Règles irrégulières, puis disparition des règles'],
            ['Osseux', 'Baisse de densité minérale, fractures de stress'],
            ['Métabolique', 'Métabolisme de repos abaissé, frilosité, fatigue chronique'],
            ['Immunitaire', 'Infections à répétition, récupération plus lente'],
            ['Mental', 'Irritabilité, troubles de l’humeur, rapport dégradé à l’alimentation'],
          ]}
          caption="D'après le consensus du CIO 2023 sur le RED-S."
        />

        <Callout tone="warn" title="Signaux qui doivent alerter">
          <p>
            Disparition ou irrégularité des règles, fatigue qui ne passe pas
            malgré le repos, fractures de stress, perte de poids involontaire,
            baisse de performance inexpliquée, frilosité inhabituelle.
          </p>
          <p>
            Ces signes justifient une consultation médicale — pas un ajustement
            fait seule.
          </p>
        </Callout>

        <Callout tone="info" title="Un débat à connaître">
          <p>
            Une revue critique souligne que la disponibilité énergétique est
            difficile à mesurer sur le terrain et que ces symptômes sont
            multifactoriels. Ce modèle doit donc guider la{' '}
            <strong className="font-semibold text-ats-text">vigilance et
            l&apos;orientation vers un médecin</strong>, jamais l&apos;autodiagnostic.
          </p>
        </Callout>
        <CiteGroup ids={['ioc2023']} />
      </Section>

      <Section eyebrow="Micronutriments" title="Fer et vitamine D : les deux à surveiller">
        <SubTitle>Fer</SubTitle>
        <P>
          Jusqu&apos;à 60 % des sportives présentent une déficience en fer. Elle
          dégrade la performance d&apos;endurance de 3 à 4 %, et la performance
          s&apos;améliore de 2 à 20 % avec un traitement approprié.
          <Cite id="pengelly2025" />
        </P>
        <Callout tone="warn" title="Jamais d'auto-supplémentation en fer">
          <p>
            Le fer se supplémente uniquement après un bilan sanguin et sous
            encadrement médical. Une supplémentation prolongée sans carence réelle
            expose à une surcharge (hémochromatose). Si tu es essoufflée, fatiguée
            ou en baisse de performance : bilan sanguin d&apos;abord — ferritine,
            hémogramme, vitamine D.
          </p>
        </Callout>
        <P>
          Les seuils retenus varient : la ferritine sérique sous 30 µg/L est
          couramment utilisée en médecine du sport, tandis que la revue de
          référence citée ci-dessous a retenu 40 µg/L comme critère
          d&apos;inclusion.
        </P>

        <SubTitle>Vitamine D et calcium</SubTitle>
        <P>
          Le déficit en vitamine D est fréquent et s&apos;aggrave mutuellement
          avec le statut en fer. Le seuil de suffisance est souvent fixé à
          25(OH)D ≥ 75 nmol/L. Le calcium reste essentiel à la santé osseuse,
          particulièrement en contexte de risque de RED-S.
        </P>
        <CiteGroup ids={['pengelly2025']} />
      </Section>
      <Section eyebrow="Aller plus loin" title="La synthèse protéique, expliquée par un spécialiste">
        <VideoEmbed id="phillips-protein" />
      </Section>
    </GuidePage>
  );
}
