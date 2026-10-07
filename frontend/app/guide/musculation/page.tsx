import GuidePage from '@/components/guide/GuidePage';
import VideoEmbed from '@/components/guide/VideoEmbed';
import CiteGroup from '@/components/guide/CiteGroup';
import Cite from '@/components/guide/Cite';
import VolumeChecker from '@/components/guide/calculators/VolumeChecker';
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

export const metadata = { title: 'La musculation, expliquée | Guide Trena' };

export default function MusculationPage() {
  return (
    <GuidePage
      slug="musculation"
      intro={
        <>
          En 2026, l&apos;American College of Sports Medicine a publié sa
          première grande mise à jour depuis 2009 : une synthèse de 137 revues
          systématiques et de plus de 30 000 participants. Plusieurs certitudes
          du milieu de la salle de sport n&apos;y ont pas survécu.
        </>
      }
    >
      <Section eyebrow="Le socle" title="Trois variables, et une seule qui domine">
        <P>
          Une séance de musculation se décrit par trois curseurs : la{' '}
          <Strong>charge</Strong> (le poids sur la barre), le{' '}
          <Strong>volume</Strong> (le nombre de séries), et l&apos;
          <Strong>effort</Strong> (à quel point on s&apos;approche de l&apos;échec).
          On a longtemps cru que la charge était reine. La recherche récente dit
          autre chose.
        </P>

        <KeyNumberGrid>
          <KeyNumber value="≥ 10" unit="séries" label="par groupe musculaire et par semaine, pour l'hypertrophie" />
          <KeyNumber value="30–100" unit="% 1RM" label="toute cette plage de charges fonctionne" tone="blue" />
          <KeyNumber value="2–3" unit="reps" label="en réserve : inutile d'aller à l'échec" tone="violet" />
          <KeyNumber value="≥ 2" unit="× / sem" label="par groupe musculaire — le plancher universel" tone="orange" />
        </KeyNumberGrid>

        <Callout tone="key" title="Le message principal">
          <p>
            La régularité et un volume suffisant priment sur la complexité. Une
            femme qui fait consciencieusement deux séances full-body par semaine,
            avec des élastiques, en s&apos;arrêtant à deux répétitions de
            l&apos;échec, obtiendra l&apos;essentiel des adaptations possibles.
          <Cite id="acsm2026" />
          </p>
        </Callout>
        <CiteGroup ids={['acsm2026']} />
      </Section>

      <Section eyebrow="Répétitions" title="Pourquoi 8 à 12 n'est pas une loi">
        <P>
          La fameuse « zone d&apos;hypertrophie » de 8 à 12 répétitions est un
          héritage pédagogique commode, pas une frontière physiologique. Ce qui
          déclenche la croissance musculaire, c&apos;est le recrutement des
          fibres à haut seuil — celles qui grossissent le plus. Or ces fibres
          sont recrutées de deux façons : soit d&apos;emblée par une charge très
          lourde, soit progressivement, à mesure que la fatigue s&apos;installe,
          avec une charge légère.
        </P>
        <P>
          C&apos;est pour cela qu&apos;une série de 25 répétitions menée jusqu&apos;à
          ne plus pouvoir en faire que deux ou trois produit un stimulus
          comparable à une série de 6 répétitions lourdes. La condition est{' '}
          <Strong>l&apos;effort</Strong>, pas le poids.
        </P>

        <Callout tone="myth" title="« Il faut aller à l'échec pour progresser »">
          <p>
            Faux, et coûteux. S&apos;arrêter à 2–3 répétitions en réserve produit
            les mêmes gains que l&apos;échec absolu, avec nettement moins de
            fatigue accumulée et moins de risque de blessure.
          <Cite id="acsm2026" /> L&apos;échec
            systématique dégrade la qualité des séries suivantes et allonge la
            récupération, ce qui réduit le volume total sur la semaine — donc,
            au final, les résultats.
          </p>
        </Callout>

        <SubTitle>Comment savoir où on en est</SubTitle>
        <P>
          Pendant la série, demande-toi : « combien pourrais-je encore en faire
          proprement ? ». C&apos;est le RIR (<em>Reps In Reserve</em>). Si la
          réponse est « 5 ou 6 », la série est trop facile. Si c&apos;est « 2 ou
          3 », c&apos;est exactement la cible. Si c&apos;est « zéro », tu es allée
          à l&apos;échec — pas grave ponctuellement, contre-productif à chaque
          série.
        </P>
        <CiteGroup ids={['acsm2026']} />
      </Section>

      <Section eyebrow="Volume" title="La vraie unité de compte : la série hebdomadaire">
        <P>
          Le volume ne se compte pas par séance mais par semaine. C&apos;est le
          total de séries difficiles reçues par un muscle sur sept jours qui
          détermine sa croissance. La cible de référence est de dix séries par
          groupe musculaire et par semaine.
        </P>
        <P>
          Fait important : à volume égal, la{' '}
          <Strong>fréquence n&apos;a pas d&apos;effet propre</Strong>. Faire dix
          séries de pectoraux en une seule séance ou en deux séances de cinq
          donne des résultats équivalents.
          <Cite id="schoenfeld2019freq" /> Si l&apos;on recommande malgré tout
          deux séances par semaine, c&apos;est pour une raison pratique : dix
          séries d&apos;affilée sur un même muscle, ce sont les dernières qui
          sont bâclées. Réparties, elles sont toutes de bonne qualité.
          <Cite id="schoenfeld2019freq" />
        </P>

        <div className="pt-2">
          <VolumeChecker />
        </div>
        <CiteGroup ids={['schoenfeld2019freq', 'acsm2026']} />
      </Section>

      <Section eyebrow="Repos" title="Combien de temps entre deux séries">
        <P>
          Le temps de repos n&apos;est pas du temps mort : il détermine ce que tu
          pourras produire à la série suivante. Mais son importance dépend
          totalement de l&apos;objectif.
        </P>

        <DataTable
          head={['Objectif', 'Repos', 'Pourquoi']}
          rows={[
            [
              'Hypertrophie',
              '60 – 90 s',
              "Bénéfice mesuré au-delà de 60 s, mais plateau à partir de ~90 s. Traîner davantage n'apporte rien.",
            ],
            [
              'Force',
              '2 – 3 min',
              'Il faut retrouver sa capacité nerveuse complète, sinon la charge chute et la série ne sert plus l’objectif.',
            ],
            [
              'Endurance musculaire',
              '30 – 60 s',
              "La récupération incomplète est ici le stimulus recherché, pas un défaut.",
            ],
            [
              'Puissance',
              '2 – 3 min',
              'Le geste doit rester explosif : la moindre fatigue ralentit le mouvement et annule le bénéfice.',
            ],
          ]}
          caption="Repos entre séries selon l'objectif — les valeurs hypertrophie proviennent de la méta-analyse bayésienne de Singer et al. 2024."
        />
        <CiteGroup ids={['singer2024', 'schoenfeld2016rest']} />
      </Section>

      <Section eyebrow="Progresser" title="La surcharge progressive, seul vrai moteur">
        <P>
          Un muscle s&apos;adapte à ce qu&apos;on lui impose. Si la contrainte ne
          change jamais, l&apos;adaptation s&apos;arrête. La surcharge
          progressive consiste à augmenter graduellement la difficulté — et le
          poids n&apos;est qu&apos;une façon parmi d&apos;autres de le faire.
        </P>
        <Ul>
          <Li>Ajouter du poids, même 1 kg.</Li>
          <Li>Faire une répétition de plus avec la même charge.</Li>
          <Li>Ajouter une série.</Li>
          <Li>Ralentir la phase de descente (excentrique).</Li>
          <Li>Augmenter l&apos;amplitude, ou allonger le levier.</Li>
          <Li>Réduire légèrement le temps de repos, à charge égale.</Li>
        </Ul>

        <Callout tone="info" title="La périodisation a été rétrogradée">
          <p>
            Les schémas complexes (linéaire, ondulatoire, par blocs) ne
            surpassent pas systématiquement une simple surcharge progressive
            chez les pratiquants non compétiteurs. Autrement dit : noter ses
            performances et chercher à faire un peu mieux la fois suivante suffit
            largement. La complexité vient plus tard, si jamais.
          </p>
        </Callout>
        <CiteGroup ids={['acsm2026', 'ratamess2009']} />
      </Section>

      <Section eyebrow="Matériel" title="Poids libres, machines, élastiques : match nul">
        <P>
          Le changement le plus libérateur de l&apos;ACSM 2026 concerne le
          matériel : élastiques, poids du corps, machines et haltères mènent aux
          mêmes adaptations. Aucune supériorité des charges conventionnelles sur
          <Cite id="lopes2019" />
          les élastiques n&apos;a été démontrée.
        </P>
        <Callout tone="tip">
          <p>
            Concrètement : ne pas avoir de salle n&apos;est pas une excuse
            valable. Un jeu d&apos;élastiques et le poids du corps permettent
            d&apos;obtenir des adaptations complètes, à condition de respecter
            l&apos;effort et le volume.
          </p>
        </Callout>
        <CiteGroup ids={['acsm2026', 'lopes2019']} />
      </Section>

      <Section eyebrow="Idées reçues" title="Trois croyances à abandonner">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-ats-text">
                « Si je n&apos;ai pas de courbatures, la séance n&apos;a rien donné »
              </h3>
              <EvidenceBadge level="marketing" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ats-muted">
              Les courbatures ne sont ni un indicateur fiable de la qualité
              d&apos;une séance, ni un signal de croissance musculaire. Elles
              reflètent surtout la nouveauté d&apos;un mouvement. On peut
              progresser sans jamais en avoir.
            </p>
          </div>

          <div className="card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-ats-text">
                « La musculation va me rendre massive »
              </h3>
              <EvidenceBadge level="marketing" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ats-muted">
              L&apos;hypertrophie est un processus lent qui demande des années de
              volume soutenu et un surplus calorique. Chez une femme,
              l&apos;environnement hormonal rend la prise de masse encore plus
              graduelle. Le risque réel n&apos;est pas d&apos;en prendre trop,
              c&apos;est de ne pas s&apos;entraîner assez pour en prendre.
            </p>
          </div>

          <div className="card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-ats-text">
                « Il faut changer de programme souvent pour choquer le muscle »
              </h3>
              <EvidenceBadge level="marketing" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ats-muted">
              Changer constamment empêche justement de mesurer la progression et
              de charger davantage. La répétition d&apos;un même mouvement permet
              d&apos;en maîtriser la technique, donc de le charger plus lourd —
              c&apos;est ça qui fait progresser.
            </p>
          </div>
        </div>
        <CiteGroup ids={['acsm2026']} />
      </Section>
      <Section eyebrow="Aller plus loin" title="Écouter le chercheur qui préside la source principale">
        <VideoEmbed id="phillips-protein" />
      </Section>
    </GuidePage>
  );
}
