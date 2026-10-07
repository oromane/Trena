import GuidePage from '@/components/guide/GuidePage';
import CiteGroup from '@/components/guide/CiteGroup';
import PrescriptionTable from '@/components/guide/calculators/PrescriptionTable';
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

export const metadata = { title: 'Choisir son programme | Guide Trena' };

export default function ProgrammesPage() {
  return (
    <GuidePage
      slug="programmes"
      intro={
        <>
          « Prise de masse », « sèche », « force », « circuit cardio » : ces mots
          désignent surtout des réglages différents des mêmes curseurs. Voici ce
          que chaque objectif change réellement dans la séance — et dans
          l&apos;assiette.
        </>
      }
    >
      <Section eyebrow="L'outil" title="Ton objectif, ta prescription">
        <P>
          Choisis un objectif ci-dessous : le tableau affiche la charge, les
          répétitions, les séries, le repos et le niveau d&apos;effort
          correspondants, ainsi que la raison physiologique derrière chaque
          chiffre.
        </P>
        <PrescriptionTable />
        <CiteGroup ids={['acsm2026']} />
      </Section>

      <Section eyebrow="Nuance importante" title="Masse et sèche ne sont pas des programmes">
        <P>
          C&apos;est le malentendu le plus répandu en salle. Prendre du muscle ou
          perdre du gras ne se décide pas dans la séance, mais dans le{' '}
          <Strong>bilan énergétique</Strong>. L&apos;entraînement dit au corps{' '}
          <em>quoi</em> construire ou préserver ; l&apos;alimentation dit{' '}
          <em>avec quoi</em>.
        </P>

        <DataTable
          head={['', 'Prise de masse', 'Sèche']}
          rows={[
            [
              'Ce qui change',
              'Léger surplus calorique',
              'Léger déficit calorique',
            ],
            [
              'Entraînement',
              'Hypertrophie : ≥10 séries/groupe/semaine',
              'Identique — surtout ne pas alléger les charges',
            ],
            [
              'Protéines',
              '1,4 – 2,0 g/kg/j',
              "1,4 – 2,0 g/kg/j, voire le haut de la plage : elles protègent le muscle en déficit",
            ],
            [
              'Erreur classique',
              'Surplus trop important : on prend surtout du gras',
              'Passer en séries longues et légères « pour brûler » — on perd du muscle',
            ],
          ]}
        />

        <Callout tone="key" title="La règle qui compte">
          <p>
            En période de perte de poids, on garde{' '}
            <strong className="font-semibold text-ats-text">
              exactement le même entraînement de force
            </strong>
            . Les charges lourdes signalent au corps que le muscle est utile et
            doit être conservé. C&apos;est le déficit alimentaire, pas la séance,
            qui fait perdre le gras.
          </p>
        </Callout>
        <CiteGroup ids={['issn2017']} />
      </Section>

      <Section eyebrow="Le cas particulier" title="Le « cardio en musculation »">
        <P>
          Les formats type circuit training, HIIT en salle ou WOD enchaînent des
          mouvements de force avec peu de repos. Ils sont efficaces et
          agréables, mais il faut savoir ce qu&apos;ils sont : essentiellement du{' '}
          <Strong>travail cardiovasculaire</Strong> déguisé en musculation.
        </P>
        <Ul>
          <Li>
            Les repos très courts empêchent d&apos;utiliser des charges
            suffisantes pour un stimulus de force optimal.
          </Li>
          <Li>
            La fatigue cardiovasculaire limite la qualité des dernières séries,
            souvent les plus importantes.
          </Li>
          <Li>
            Ils comptent dans le budget d&apos;endurance de la semaine, pas
            seulement dans celui de la musculation.
          </Li>
        </Ul>
        <Callout tone="tip">
          <p>
            Ce n&apos;est pas une raison de s&apos;en priver — la régularité et le
            plaisir comptent énormément. Mais si l&apos;objectif est de prendre du
            muscle, ces séances ne remplacent pas deux vraies séances de force
            avec repos complets. Considère-les comme une troisième catégorie, à
            côté de la force et de l&apos;endurance.
          </p>
        </Callout>
        <CiteGroup ids={['acsm2026']} />
      </Section>

      <Section eyebrow="Structure" title="Full-body, half-body, split : lequel choisir">
        <DataTable
          head={['Format', 'Séances / semaine', 'Pour qui']}
          rows={[
            [
              'Full-body',
              '2 – 3',
              "Le meilleur rapport résultat/temps quand on s'entraîne 2 à 3 fois. Chaque muscle est touché à chaque séance, le plancher de fréquence est atteint automatiquement.",
            ],
            [
              'Haut / bas',
              '4',
              'Permet plus de volume par groupe sans allonger indéfiniment les séances. Chaque moitié du corps est travaillée 2 fois par semaine.',
            ],
            [
              'Split par groupe',
              '5 – 6',
              "Réservé aux pratiquantes avancées disposant de beaucoup de temps. Risque : chaque muscle n'est travaillé qu'une fois par semaine si le découpage est mal fait.",
            ],
          ]}
        />
        <Callout tone="info">
          <p>
            À deux ou trois séances par semaine, le full-body n&apos;est pas un
            choix par défaut faute de mieux : c&apos;est objectivement la
            meilleure structure. Les splits très découpés ne deviennent
            intéressants qu&apos;au-delà de quatre séances hebdomadaires.
          </p>
        </Callout>
        <CiteGroup ids={['acsm2026', 'schoenfeld2019freq']} />
      </Section>

      <Section eyebrow="Construire" title="Composer une séance full-body">
        <P>
          Une séance efficace couvre les grands patrons de mouvement plutôt que
          les muscles un par un. Six mouvements suffisent.
        </P>
        <DataTable
          head={['Patron', 'Exemples', 'Séries']}
          rows={[
            ['Pousser horizontal', 'Développé couché, pompes, écarté élastique', '2 – 3'],
            ['Tirer horizontal', 'Rowing, tirage à la poulie basse', '2 – 3'],
            ['Pousser vertical', 'Développé militaire, élévations latérales', '2'],
            ['Tirer vertical', 'Traction assistée, tirage vertical', '2 – 3'],
            ['Dominante genou', 'Squat, presse, fentes', '3'],
            ['Dominante hanche', 'Soulevé de terre roumain, hip thrust', '3'],
          ]}
          caption="Ordre conseillé : les mouvements les plus exigeants en premier, quand le système nerveux est frais."
        />
        <SubTitle>Progresser semaine après semaine</SubTitle>
        <P>
          Note tes charges et tes répétitions. La règle la plus simple qui
          fonctionne : quand tu atteins le haut de la fourchette de répétitions
          sur toutes les séries avec 2 répétitions en réserve, augmente la charge
          au prochain entraînement et redescends en bas de la fourchette.
        </P>
        <CiteGroup ids={['acsm2026']} />
      </Section>

      <Section eyebrow="Repères" title="Combien de temps avant de voir quelque chose">
        <DataTable
          head={['Délai', 'Ce qui change']}
          rows={[
            [
              '2 – 4 semaines',
              "Adaptations nerveuses : tu soulèves plus lourd sans avoir pris de muscle. Le gain de force précède toujours le gain de volume.",
            ],
            [
              '6 – 10 semaines',
              'Premières modifications visibles de la composition corporelle, surtout sur la fermeté et la posture.',
            ],
            [
              '3 – 6 mois',
              'Hypertrophie mesurable, changements nets de silhouette, force sensiblement supérieure.',
            ],
            [
              '1 an et plus',
              'Bénéfices structurels durables : densité osseuse, équilibre, protection articulaire.',
            ],
          ]}
          caption="Les interventions étudiées durent le plus souvent 6 à 16 semaines ; les données à très long terme restent rares."
        />
        <CiteGroup ids={['pelland2026', 'acsm2026']} />
      </Section>
    </GuidePage>
  );
}
