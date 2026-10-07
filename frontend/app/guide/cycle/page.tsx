import GuidePage from '@/components/guide/GuidePage';
import VideoEmbed from '@/components/guide/VideoEmbed';
import CiteGroup from '@/components/guide/CiteGroup';
import Cite from '@/components/guide/Cite';
import {
  Callout,
  DataTable,
  EvidenceBadge,
  EvidenceLegend,
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
  title: 'Cycle menstruel et entraînement | Guide Trena',
};

export default function CyclePage() {
  return (
    <GuidePage
      slug="cycle"
      intro={
        <>
          C&apos;est le sujet où l&apos;écart entre ce qui se vend et ce qui se
          démontre est le plus grand. Ce chapitre sépare strictement les trois :
          ce qui est établi, ce qui reste hypothétique, et ce qui relève du
          marketing.
        </>
      }
    >
      <Section eyebrow="Méthode" title="Comment lire ce chapitre">
        <P>
          Chaque affirmation porte un niveau de preuve. Cette distinction est
          particulièrement nécessaire ici : la recherche sur le sujet est jeune,
          méthodologiquement hétérogène, et abondamment récupérée à des fins
          commerciales.
        </P>
        <EvidenceLegend />
      </Section>

      <Section eyebrow="Physiologie" title="Le cycle « de 28 jours » n'existe presque pas">
        <P>
          Le modèle appris à l&apos;école — 28 jours, ovulation au jour 14 — est
          une moyenne théorique, pas une norme. La variabilité entre femmes, et
          d&apos;un cycle à l&apos;autre chez une même femme, est considérable :
          la fourchette habituelle va de 21 à 35 jours.
        </P>
        <P>
          L&apos;illustration la plus parlante vient d&apos;une étude canadienne
          de 2025 : sur douze participantes suivies avec tests d&apos;ovulation et
          dosages hormonaux, <Strong>une seule avait un cycle de 28 jours</Strong>,
          et l&apos;ovulation s&apos;est produite entre le jour 13 et le jour 26.
        </P>

        <KeyNumberGrid>
          <KeyNumber value="21 – 35" unit="jours" label="fourchette normale de durée d'un cycle" tone="blue" />
          <KeyNumber value="1 / 12" label="participantes ayant un cycle de 28 jours dans l'étude McMaster" tone="orange" />
          <KeyNumber value="J13 – J26" label="fenêtre observée d'ovulation entre les participantes" tone="violet" />
          <KeyNumber value="2" label="phases principales : folliculaire puis lutéale" />
        </KeyNumberGrid>

        <Callout tone="info">
          <p>
            Conséquence pratique immédiate : tout programme qui prescrit « telle
            séance au jour 14 » suppose une régularité que la plupart des femmes
            n&apos;ont pas. Sans test d&apos;ovulation, on ne sait tout simplement
            pas dans quelle phase on se trouve.
          </p>
        </Callout>
        <CiteGroup ids={['colenso2025']} />
      </Section>

      <Section eyebrow="Ce qui est établi" title="La phase du cycle n'affecte pas la force">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold text-ats-text">
            Performance de force et adaptations à la musculation
          </h3>
          <EvidenceBadge level="prouve" />
        </div>
        <P>
          Une revue de revues a examiné l&apos;ensemble de la littérature
          disponible. Les résultats variaient énormément d&apos;une revue à
          l&apos;autre — mais l&apos;analyse a montré que cette variabilité
          s&apos;expliquait surtout par des pratiques méthodologiques médiocres :
          phases mal vérifiées, absence de confirmation hormonale, échantillons
          trop petits. Une fois ces biais pris en compte, aucune influence
          démontrée de la phase sur la force aiguë ni sur les adaptations.
        </P>

        <SubTitle>La construction musculaire elle-même a été mesurée</SubTitle>
        <P>
          En 2025, une équipe est allée plus loin en mesurant directement la
          synthèse des protéines musculaires — le mécanisme par lequel un muscle
          grossit. Protocole rigoureux : chaque participante était son propre
          témoin, les phases étaient confirmées par tests d&apos;ovulation LH et
          dosages sanguins (œstradiol, progestérone, LH), et la synthèse était
          mesurée à l&apos;eau deutérée.
        </P>

        <DataTable
          head={['Mesure', 'Phase folliculaire', 'Phase lutéale', 'Effet de la phase']}
          rows={[
            [
              'Synthèse myofibrillaire — jambe exercée',
              '1,52 ± 0,27 %·j⁻¹',
              '1,46 ± 0,25 %·j⁻¹',
              'non significatif',
            ],
            [
              'Synthèse myofibrillaire — jambe témoin',
              '1,33 ± 0,27 %·j⁻¹',
              '1,28 ± 0,27 %·j⁻¹',
              'non significatif',
            ],
            [
              'Dégradation des protéines',
              '—',
              '—',
              'P = 0,24 — non significatif',
            ],
            [
              "Effet de l'exercice lui-même",
              '—',
              '—',
              'P < 0,001 — très significatif',
            ],
          ]}
          caption="12 femmes, protocole croisé intra-sujet randomisé sur 2 phases de 6 jours, exercice unilatéral avec la jambe controlatérale en témoin, phases vérifiées hormonalement."
        />

        <Callout tone="info" title="Une précision d'unité qui compte">
          <p>
            Ces taux de synthèse sont exprimés en pourcentage{' '}
            <strong className="font-semibold text-ats-text">par jour</strong>,
            pas par heure. Plusieurs reprises secondaires de cette étude
            propagent l&apos;erreur — un facteur 24. Nous avons vérifié la valeur
            directement auprès de l&apos;éditeur.
          </p>
        </Callout>

        <Callout tone="key" title="Ce que concluent les auteurs">
          <p>
            L&apos;exercice, lui, a un effet massif. La phase du cycle, aucun.
            Leur conclusion est explicite : il n&apos;y a pas d&apos;avantage
            apparent à planifier la musculation pour privilégier une phase
            menstruelle plutôt qu&apos;une autre.
          </p>
        </Callout>
        <CiteGroup ids={['colenso2023', 'colenso2025']} />
      </Section>

      <Section eyebrow="Ce qui est établi" title="Périodiser selon le cycle : pas de bénéfice démontré">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold text-ats-text">
            Programmes calés sur les phases du cycle
          </h3>
          <EvidenceBadge level="marketing" />
        </div>
        <P>
          Une revue publiée fin 2025 porte un titre qui résume à lui seul
          l&apos;état des connaissances : <em>« Les preuves manquent pour
          périodiser l&apos;entraînement de force ou d&apos;endurance selon les
          phases du cycle menstruel »</em>. Les auteurs concluent que la recherche
          ne soutient pas l&apos;idée qu&apos;une telle périodisation apporte un
          bénéfice supplémentaire par rapport aux approches classiques.
        </P>
        <Callout tone="myth" title="Le « cycle-syncing » commercial">
          <p>
            Les programmes vendus en ligne qui prescrivent rigidement « force en
            phase folliculaire, yoga en phase lutéale » ne reposent pas sur les
            données disponibles. Ils ont un coût réel : ils peuvent dissuader une
            femme de faire une séance qu&apos;elle aurait très bien pu faire, et
            installer l&apos;idée que son corps est un obstacle à contourner.
          </p>
        </Callout>
        <CiteGroup ids={['scj2025']} />
      </Section>

      <Section eyebrow="Ce qui est plausible" title="Endurance : un effet trivial">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold text-ats-text">
            Performance aérobie selon la phase
          </h3>
          <EvidenceBadge level="plausible" />
        </div>
        <P>
          La méta-analyse de référence rassemble 78 études et 1193 participantes.
          Elle trouve un effet global qualifié de <Strong>trivial</Strong> : une
          taille d&apos;effet de −0,06, avec un intervalle de crédibilité à 95 %
          allant de −0,16 à 0,04 — donc compatible avec l&apos;absence totale
          d&apos;effet.
        </P>
        <P>
          Le plus grand écart observé concerne la phase folliculaire précoce
          (juste au début des règles), avec une taille d&apos;effet de −0,14. La
          qualité globale des preuves est jugée faible.
        </P>
        <Callout tone="info" title="Comment l'interpréter">
          <p>
            Une performance peut-être très légèrement réduite en tout début de
            cycle, d&apos;une ampleur négligeable en pratique pour une
            pratiquante non compétitrice. Ce n&apos;est pas une raison de
            s&apos;abstenir ; c&apos;est éventuellement une explication si une
            séance semble plus dure que prévu ce jour-là.
          </p>
        </Callout>
        <CiteGroup ids={['mcnulty2020']} />
      </Section>

      <Section eyebrow="Ce qui est plausible" title="Risque de blessure du genou">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold text-ats-text">
            Ligament croisé antérieur et phases du cycle
          </h3>
          <EvidenceBadge level="plausible" />
        </div>
        <P>
          Une revue portant sur sept études conclut que les résultats sont{' '}
          <Strong>non concluants</Strong> quant à savoir si une phase prédispose
          à un risque accru de rupture du ligament croisé antérieur ; la qualité
          des preuves est jugée très faible. Une autre revue suggère un pic de
          relaxine autour des jours 21 à 24 associé à un risque accru, mais avec
          un niveau de preuve faible.
        </P>
        <Callout tone="info">
          <p>
            Prudence : ces données ne justifient pas de modifier son entraînement.
            Ce qui protège réellement le genou est documenté et indépendant du
            cycle — renforcement musculaire, qualité technique, progressivité de
            la charge.
          </p>
        </Callout>
        <CiteGroup ids={['dossantos2023']} />
      </Section>

      <Section eyebrow="Ce qui compte vraiment" title="Le ressenti, lui, est bien réel">
        <P>
          Voici le point essentiel, et il n&apos;est pas contradictoire avec tout
          ce qui précède. Les études montrent que la <em>capacité physique
          mesurée</em> ne change pas significativement. Elles ne disent
          absolument pas que les symptômes sont imaginaires.
        </P>
        <P>
          Une étude qualitative de 2025 documente que la performance{' '}
          <Strong>ressentie</Strong> fluctue nettement selon les phases : la fin
          de phase lutéale est souvent perçue négativement, la motivation baisse
          fréquemment les un à trois premiers jours des règles. Avec, là encore,
          une très grande variation d&apos;une femme à l&apos;autre.
        </P>

        <Callout tone="key" title="La synthèse honnête">
          <p>
            Ton corps est capable de la même performance à peu près tout le
            temps. Ce qui change, c&apos;est ce que ça <em>coûte</em>
            subjectivement certains jours. Les deux affirmations sont vraies
            simultanément — et c&apos;est la seconde qui doit guider les
            ajustements du quotidien.
          </p>
        </Callout>
        <CiteGroup ids={['ryman2025']} />
      </Section>

      <Section eyebrow="En pratique" title="Le journal, pas le calendrier">
        <P>
          Puisqu&apos;aucune règle générale ne s&apos;applique mais que la
          variation individuelle est forte, l&apos;outil pertinent n&apos;est pas
          un programme préfabriqué : c&apos;est ton propre suivi.
        </P>
        <Ul>
          <Li>
            Note chaque jour trois choses simples : énergie perçue, qualité du
            sommeil, symptômes éventuels.
          </Li>
          <Li>
            Ajoute la difficulté ressentie de la séance, sur une échelle de 1 à
            10.
          </Li>
          <Li>
            Après deux ou trois cycles, regarde si des motifs se dégagent{' '}
            <Strong>chez toi</Strong>. S&apos;il y en a, adapte. Sinon, ne change
            rien.
          </Li>
          <Li>
            Un jour où l&apos;énergie n&apos;est pas là : allège plutôt que de
            supprimer. Une séance facile vaut infiniment mieux qu&apos;une séance
            annulée.
          </Li>
        </Ul>

        <Callout tone="tip" title="Ce qu'il ne faut surtout pas faire">
          <p>
            Culpabiliser d&apos;une baisse de performance ressentie, ou
            s&apos;interdire une séance parce qu&apos;un programme trouvé en
            ligne dit qu&apos;on est « dans la mauvaise phase ». Les données ne
            soutiennent pas cette interdiction.
          </p>
        </Callout>
      </Section>

      <Section eyebrow="Contraception" title="Effet de la contraception hormonale">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold text-ats-text">
            Pilule et performance
          </h3>
          <EvidenceBadge level="plausible" />
        </div>
        <P>
          L&apos;impact des contraceptifs hormonaux sur la performance est
          globalement <Strong>faible et incohérent</Strong> dans la littérature.
          Il n&apos;existe pas de raison solide, à ce jour, d&apos;adapter son
          entraînement en fonction d&apos;une contraception hormonale.
        </P>
        <CiteGroup ids={['dsouza2023']} />
      </Section>

      <Section eyebrow="Signal d'alerte" title="L'absence de règles n'est jamais normale">
        <Callout tone="warn" title="Aménorrhée : consulter, sans attendre">
          <p>
            La disparition des règles chez une femme qui s&apos;entraîne n&apos;est{' '}
            <strong className="font-semibold text-ats-text">pas</strong> un signe
            que l&apos;entraînement « fonctionne », ni une conséquence banale du
            sport de haut niveau. C&apos;est un signal d&apos;alerte, le plus
            souvent lié à un déficit énergétique, avec des conséquences osseuses
            qui peuvent être durables.
          </p>
          <p>
            Bonne nouvelle : c&apos;est généralement réversible avec la
            restauration d&apos;un équilibre énergétique correct. Mais cela se
            fait avec un médecin, pas seule.
          </p>
        </Callout>
        <CiteGroup ids={['ioc2023']} />
      </Section>

      <Section eyebrow="Conclusion" title="Les trois niveaux, résumés">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card space-y-2.5 p-5">
            <EvidenceBadge level="prouve" />
            <p className="text-sm leading-relaxed text-ats-muted">
              La phase du cycle n&apos;affecte pas de façon démontrée la force
              aiguë, la synthèse protéique musculaire ni les adaptations à la
              musculation. Périodiser l&apos;entraînement selon le cycle n&apos;a
              pas de bénéfice démontré.
            </p>
          </div>
          <div className="card space-y-2.5 p-5">
            <EvidenceBadge level="plausible" />
            <p className="text-sm leading-relaxed text-ats-muted">
              Léger avantage aérobie en phase folliculaire (effet trivial).
              Modulation possible du risque ligamentaire. Effets
              thermorégulateurs et métaboliques en phase lutéale.
            </p>
          </div>
          <div className="card space-y-2.5 p-5">
            <EvidenceBadge level="marketing" />
            <p className="text-sm leading-relaxed text-ats-muted">
              Les programmes commerciaux de « cycle-syncing » rigides et
              prescriptifs ne sont pas soutenus par les preuves disponibles.
            </p>
          </div>
        </div>

        <Callout tone="info" title="Une limite importante de tout ce chapitre">
          <p>
            L&apos;absence de preuve d&apos;un effet <em>moyen</em> n&apos;est pas
            une preuve d&apos;absence d&apos;effet <em>individuel</em>. Ces
            recherches portent majoritairement sur de jeunes femmes ayant des
            cycles réguliers et sans contraception. Si tu observes chez toi un
            motif net et reproductible, il est légitime — c&apos;est exactement
            pourquoi le journal personnel prime sur toute règle générale.
          </p>
        </Callout>
        <CiteGroup ids={['colenso2023', 'scj2025', 'mcnulty2020']} />
      </Section>
      <Section eyebrow="Aller plus loin" title="Entendre la chercheuse qui a produit ces données">
        <VideoEmbed id="colenso-periodization" />
        <VideoEmbed id="colenso-myths" />
      </Section>
    </GuidePage>
  );
}
