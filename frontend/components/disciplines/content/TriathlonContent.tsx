import Link from 'next/link';
import Cite from '@/components/guide/Cite';
import CiteGroup from '@/components/guide/CiteGroup';
import TriSplit from '@/components/disciplines/calculators/TriSplit';
import {
  Callout,
  DataTable,
  KeyNumber,
  KeyNumberGrid,
  Li,
  P,
  Section,
  SubTitle,
  Ul,
} from '@/components/guide/ui';

export default function TriathlonContent() {
  return (
    <>
      <Section eyebrow="La difficulté propre" title="Trois sports, un seul corps">
        <P>
          Le triathlon n&apos;est pas la somme de trois entraînements. C&apos;est
          un problème de répartition sous contrainte : le temps disponible et la
          capacité de récupération sont communs aux trois disciplines. Chaque
          heure attribuée à l&apos;une est retirée aux autres.
        </P>
        <P>
          Bonne nouvelle : deux des trois disciplines coûtent peu en
          récupération. Le vélo et la natation, sans phase de freinage
          excentrique, permettent d&apos;accumuler du volume aérobie sans
          empiéter sur la capacité à courir ou à soulever.<Cite id="wilson2012" />{' '}
          La course est la seule à réellement se doser.
        </P>

        <KeyNumberGrid>
          <KeyNumber value="≈ 50 %" label="part du vélo dans le chrono d'un triathlon olympique" />
          <KeyNumber value="2–10" unit="min" label="durée de dégradation de l'économie de course après le vélo" tone="orange" />
          <KeyNumber value="75–110°" label="flexion de hanche à vélo" tone="blue" />
          <KeyNumber value="10–50°" label="flexion de hanche en course — d'où la transition difficile" tone="violet" />
        </KeyNumberGrid>
      </Section>

      <Section eyebrow="L'outil" title="Répartir ton temps">
        <P>
          Choisis ton format et le temps dont tu disposes : la répartition
          proposée suit le poids de chaque discipline dans le chrono de course.
        </P>
        <TriSplit />
      </Section>

      <Section eyebrow="La transition" title="Pourquoi les jambes ne répondent pas">
        <P>
          Passer du vélo à la course provoque une sensation caractéristique de
          jambes lourdes et de foulée mécanique. Ce n&apos;est pas un manque
          d&apos;entraînement, c&apos;est de la physiologie.
        </P>
        <Ul>
          <Li>
            Le flux sanguin doit se redistribuer des muscles du pédalage vers
            ceux de la course.
          </Li>
          <Li>
            Les patrons de recrutement neuromusculaire diffèrent nettement : le
            cyclisme travaille autour de 75 à 110° de flexion de hanche, la
            course autour de 10 à 50°.
          </Li>
          <Li>
            L&apos;économie de course est dégradée pendant les 2 à 10 premières
            minutes.
          </Li>
        </Ul>

        <SubTitle>La séance brick</SubTitle>
        <P>
          Enchaîner immédiatement une course après le vélo entraîne précisément
          cette transition, et améliore la coordination et l&apos;économie en
          début de portion pédestre. Le format n&apos;a pas besoin d&apos;être
          long pour être utile.
        </P>

        <DataTable
          head={['Objectif', 'Format', 'Fréquence']}
          rows={[
            [
              'Habituer le corps',
              '45 min vélo puis 10 min course facile',
              'Toutes les 1 à 3 semaines',
            ],
            [
              'Travailler la transition',
              '3 × (10 min vélo + 5 min course)',
              'Occasionnellement, en phase spécifique',
            ],
            [
              'Simuler la course',
              'Portions proches du format visé, à allure cible',
              '2 à 3 fois dans une préparation',
            ],
          ]}
        />

        <Callout tone="key" title="Pour une pratique loisir">
          <p>
            Un brick modéré toutes les une à trois semaines suffit largement.
            L&apos;objectif est d&apos;habituer le corps à la transition, pas de
            le casser : ces séances sont souvent transformées en tests
            épuisants, ce qui coûte plus qu&apos;il ne rapporte.
          </p>
        </Callout>
        <CiteGroup ids={['wilson2012', 'seiler2006']} />
      </Section>

      <Section eyebrow="Arbitrages" title="Où mettre l'effort en priorité">
        <P>
          Une règle simple : investis là où tu perds le plus de temps, pas là où
          tu prends le plus de plaisir.
        </P>
        <DataTable
          head={['Situation', 'Priorité']}
          rows={[
            [
              'La natation te fait peur ou te coûte très cher',
              "Technique avant volume. C'est la discipline où le gain par heure investie est le plus élevé quand le niveau de départ est bas.",
            ],
            [
              'Tu finis le vélo déjà vidée',
              "Volume d'endurance à vélo, en zone facile. Peu coûteux en récupération, effet direct sur la course qui suit.",
            ],
            [
              'Tu perds pied sur la portion course',
              'Bricks plus réguliers, et vérification que le vélo est couru à une intensité soutenable.',
            ],
            [
              'Tu enchaînes les blessures',
              "Réduire le volume de course, transférer sur vélo et natation, et maintenir la musculation — elle est protectrice.",
            ],
          ]}
        />
        <Callout tone="warn" title="Le risque numéro un">
          <p>
            Trois disciplines invitent à empiler les séances. Chez une femme qui
            cumule un gros volume, le problème le plus fréquent n&apos;est pas
            l&apos;entraînement mais l&apos;apport énergétique insuffisant face à
            la dépense — avec des conséquences hormonales, menstruelles et
            osseuses réelles.
          </p>
        </Callout>
        <CiteGroup ids={['ioc2023', 'acsm2026']} />
      </Section>

      <Section eyebrow="Aller plus loin" title="Les chapitres utiles du guide">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/guide/combiner"
            className="card p-4 transition-colors hover:bg-ats-card2"
          >
            <p className="font-semibold text-ats-text">Combiner</p>
            <p className="mt-1 text-xs text-ats-muted">
              Muscler et courir sans perdre ses gains, et le détail des séances
              brick.
            </p>
          </Link>
          <Link
            href="/guide/nutrition"
            className="card p-4 transition-colors hover:bg-ats-card2"
          >
            <p className="font-semibold text-ats-text">Nutrition</p>
            <p className="mt-1 text-xs text-ats-muted">
              Glucides selon la charge, et le déficit énergétique — le risque
              central du gros volume.
            </p>
          </Link>
        </div>
      </Section>
    </>
  );
}
