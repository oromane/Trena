import Link from 'next/link';
import Cite from '@/components/guide/Cite';
import CiteGroup from '@/components/guide/CiteGroup';
import FtpZones from '@/components/disciplines/calculators/FtpZones';
import {
  Callout,
  DataTable,
  KeyNumber,
  KeyNumberGrid,
  Li,
  P,
  Section,
  Strong,
  Ul,
} from '@/components/guide/ui';

export default function VeloContent() {
  return (
    <>
      <Section
        eyebrow="Pourquoi le vélo"
        title="La discipline qui coûte le moins à tes muscles"
      >
        <P>
          C&apos;est le résultat le plus exploitable de la recherche sur
          l&apos;entraînement combiné : la course à pied dégrade les gains de
          force et de volume musculaire, <Strong>le vélo non</Strong>.
          <Cite id="wilson2012" />
        </P>
        <P>
          L&apos;explication tient à la mécanique du geste. En courant, les
          muscles freinent l&apos;impact à chaque foulée — une contraction
          excentrique qui provoque des micro-dommages et une fatigue résiduelle.
          Le pédalage est presque purement concentrique : le muscle pousse, il
          ne freine jamais. D&apos;où une récupération bien plus rapide à charge
          cardiovasculaire équivalente.
        </P>

        <KeyNumberGrid>
          <KeyNumber value="0" label="décrément significatif de force attribué au vélo" />
          <KeyNumber value="Concentrique" label="nature du geste : pas de phase de freinage" tone="blue" />
          <KeyNumber value="≈ 0" label="impact osseux — c'est le revers de la médaille" tone="orange" />
          <KeyNumber value="80–100" unit="rpm" label="cadence de confort couramment retenue" tone="violet" />
        </KeyNumberGrid>

        <Callout tone="key" title="Quand le privilégier">
          <p>
            Pendant une phase où tu veux vraiment progresser en salle, remplacer
            une partie de la course par du vélo conserve le bénéfice
            cardiovasculaire en réduisant nettement le coût sur tes gains
            musculaires.
          </p>
        </Callout>

        <Callout tone="warn" title="Le revers : rien pour l'os">
          <p>
            Le vélo est un sport porté. Il ne stimule pas la densité minérale
            osseuse, contrairement à la course et à la musculation. Une pratique
            exclusivement cycliste, surtout chez une femme, prive le squelette
            d&apos;un stimulus qui compte — raison de plus pour garder de la
            musculation à côté.
          </p>
        </Callout>
        <CiteGroup ids={['wilson2012', 'acsm2026']} />
      </Section>

      <Section eyebrow="Intensité" title="Le piège du rythme unique">
        <P>
          L&apos;erreur la plus répandue à vélo est de rouler toujours au même
          rythme : ni assez facile pour récupérer, ni assez dur pour progresser.
          La logique est la même qu&apos;en course — la majorité du volume doit
          être franchement facile, pour permettre à quelques séances d&apos;être
          franchement dures.<Cite id="seiler2006" />
        </P>

        <DataTable
          head={['Séance', 'Format type', 'Ce que ça développe']}
          rows={[
            [
              'Endurance',
              '1 h 30 – 3 h en zone facile',
              'Base aérobie, capillarisation, efficacité de pédalage',
            ],
            [
              'Tempo',
              '2 × 20 min soutenu contrôlé',
              'Capacité à tenir près du seuil sans exploser',
            ],
            [
              'Fractionné',
              '5 × 4 min dur / 4 min récup',
              'VO2max et tolérance à haute intensité',
            ],
            [
              'Récupération',
              '45 min très souple, braquet léger',
              'Circulation, décrassage sans coût de récupération',
            ],
          ]}
        />

        <Callout tone="tip" title="Home-trainer : plus dur qu'il n'y paraît">
          <p>
            Sans refroidissement par le déplacement d&apos;air, la fréquence
            cardiaque dérive vite pour une même puissance. Une séance en
            intérieur est donc plus contraignante qu&apos;à l&apos;extérieur :
            ventile, hydrate-toi, et ne compare pas tes chiffres indoor à ceux
            de la route.
          </p>
        </Callout>
        <CiteGroup ids={['seiler2006']} />
      </Section>

      <Section eyebrow="L'outil" title="Tes zones de puissance">
        <P>
          Si tu as un capteur de puissance, un test de 20 minutes suffit à
          calibrer tes zones. Sans capteur, ignore cet outil et fie-toi au test
          de la parole : la puissance n&apos;est qu&apos;un moyen de mesurer
          l&apos;intensité, pas une condition pour progresser.
        </P>
        <FtpZones />
      </Section>

      <Section eyebrow="Confort" title="Ce qui fait mal, et pourquoi">
        <P>
          La plupart des douleurs à vélo ne viennent pas de l&apos;effort mais du
          réglage. Trois causes reviennent constamment.
        </P>
        <Ul>
          <Li>
            <Strong>Genoux</Strong> — selle trop basse ou trop avancée, ou
            braquet trop lourd à cadence trop lente.
          </Li>
          <Li>
            <Strong>Lombaires et nuque</Strong> — position trop étirée ou trop
            basse pour ta souplesse actuelle.
          </Li>
          <Li>
            <Strong>Mains engourdies</Strong> — trop de poids sur les bras,
            souvent lié au même problème de position.
          </Li>
        </Ul>
        <Callout tone="info">
          <p>
            Ces liens relèvent de la pratique courante et de l&apos;expérience
            des professionnels du cycle, pas d&apos;un corpus expérimental que
            nous ayons vérifié. Une douleur qui persiste malgré les ajustements
            justifie l&apos;avis d&apos;un professionnel — étude posturale ou
            kinésithérapeute, selon le cas.
          </p>
        </Callout>
      </Section>

      <Section eyebrow="Aller plus loin" title="Combiner le vélo avec le reste">
        <P>
          Le chapitre <em>Combiner</em> du guide détaille les quatre règles qui
          annulent presque entièrement l&apos;effet d&apos;interférence, et
          propose un constructeur de semaine qui les vérifie.
        </P>
        <Link
          href="/guide/combiner"
          className="inline-flex items-center rounded-xl border border-ats-green/30 bg-ats-green/10 px-4 py-2.5 text-sm font-semibold text-ats-green transition-colors hover:bg-ats-green/20"
        >
          Lire le chapitre Combiner →
        </Link>
      </Section>
    </>
  );
}
