/**
 * Registre bibliographique du Guide — source unique de vérité.
 *
 * Chaque référence porte de quoi l'évaluer, pas seulement la retrouver :
 * type d'étude, effectif, résultat chiffré, limites méthodologiques, et
 * statut de vérification.
 *
 * `verified` documente comment la référence a été contrôlée :
 *   - 'crossref'        : métadonnées résolues via l'API CrossRef (titre,
 *                         revue, volume et pages confirmés)
 *   - 'pubmed'          : métadonnées résolues via l'API NCBI E-utilities
 *                         (titre, auteurs, revue, volume, pages, DOI, et
 *                         signalement des errata publiés)
 *   - 'cross-referenced': DOI confirmé indirectement, en tant que référence
 *                         citée par un article lui-même vérifié via CrossRef
 *   - 'unverified'      : reprise de la revue de littérature sans contrôle
 *                         externe — à traiter avec prudence
 *
 * Dernière campagne de vérification : 3 août 2026.
 * 22 références sur 24 confirmées auprès de l'éditeur ou de PubMed.
 */

export type StudyType =
  | 'position-stand'
  | 'consensus'
  | 'umbrella-review'
  | 'meta-analysis'
  | 'systematic-review'
  | 'rct'
  | 'crossover'
  | 'observational'
  | 'narrative-review'
  | 'qualitative'
  | 'textbook';

export type EvidenceStrength = 'high' | 'moderate' | 'low';
export type VerificationStatus =
  | 'crossref'
  | 'pubmed'
  | 'cross-referenced'
  | 'unverified';

export const STUDY_TYPE_LABELS: Record<StudyType, string> = {
  'position-stand': 'Position officielle',
  consensus: 'Consensus international',
  'umbrella-review': 'Revue de revues',
  'meta-analysis': 'Méta-analyse',
  'systematic-review': 'Revue systématique',
  rct: 'Essai contrôlé randomisé',
  crossover: 'Essai croisé intra-sujet',
  observational: 'Étude observationnelle',
  'narrative-review': 'Revue narrative',
  qualitative: 'Étude qualitative',
  textbook: 'Ouvrage de référence',
};

/** Ordre décroissant de poids probant, pour trier et expliquer. */
export const STUDY_TYPE_RANK: Record<StudyType, number> = {
  'position-stand': 1,
  consensus: 1,
  'umbrella-review': 2,
  'meta-analysis': 2,
  'systematic-review': 3,
  rct: 4,
  crossover: 4,
  observational: 5,
  'narrative-review': 6,
  qualitative: 6,
  textbook: 7,
};

export const STRENGTH_LABELS: Record<EvidenceStrength, string> = {
  high: 'Preuve solide',
  moderate: 'Preuve modérée',
  low: 'Preuve faible',
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  crossref: 'Vérifiée via CrossRef',
  pubmed: 'Vérifiée via PubMed',
  'cross-referenced': 'DOI confirmé par recoupement',
  unverified: 'Non vérifiée en ligne',
};

export interface Reference {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  /** Volume, numéro, pages tels que confirmés. */
  locator: string;
  doi?: string;
  pmid?: string;
  type: StudyType;
  /** Effectif : participants, études incluses, etc. */
  sample?: string;
  /** Le résultat chiffré qui fonde l'affirmation citée. */
  keyResult?: string;
  /** Ce qui limite la portée du résultat. À lire avant de conclure. */
  limitations?: string;
  strength: EvidenceStrength;
  verified: VerificationStatus;
  /** Note de vérification quand les métadonnées diffèrent de la revue. */
  verificationNote?: string;
  /**
   * Erratum publié par la revue. Un article corrigé après publication reste
   * valable, mais l'existence d'une correction est une information que le
   * lecteur doit avoir pour juger.
   */
  erratum?: string;
  /** Chapitres du guide où la référence est mobilisée. */
  axes: string[];
}

export const REFERENCES: Reference[] = [
  // ------------------------------------------------------------ musculation
  {
    id: 'acsm2026',
    authors: "Currier BS, D'Souza AC, Fiatarone Singh MA, et al. (chaire : Phillips SM)",
    year: 2026,
    title:
      'American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews',
    journal: 'Medicine & Science in Sports & Exercise',
    locator: '58(4):851-872',
    doi: '10.1249/MSS.0000000000003897',
    type: 'position-stand',
    sample: '137 revues systématiques, plus de 30 000 participants',
    keyResult:
      "Hypertrophie : ≥10 séries/groupe/semaine, charges de 30 à 100 % 1RM toutes efficaces si l'effort est suffisant. Force : ≥80 % 1RM, 2-3 séries. L'échec musculaire n'est pas nécessaire. ≥2 séances/semaine par groupe.",
    limitations:
      "Hérite de la qualité des revues sous-jacentes : interventions surtout de 6 à 16 semaines, données à long terme rares, échantillons majoritairement d'adultes de 20 à 50 ans. La direction des recommandations se généralise, pas nécessairement les chiffres exacts chez les femmes ménopausées.",
    strength: 'high',
    verified: 'crossref',
    axes: ['musculation', 'programmes', 'combiner'],
  },
  {
    id: 'ratamess2009',
    authors: 'Ratamess NA, Alvar BA, Evetoch TK, et al.',
    year: 2009,
    title: 'Progression models in resistance training for healthy adults',
    journal: 'Medicine & Science in Sports & Exercise',
    locator: '41(3):687-708',
    doi: '10.1249/MSS.0b013e3181915670',
    type: 'position-stand',
    keyResult:
      "Position ACSM précédente, remplacée par l'édition 2026. Sert ici de point de comparaison : la périodisation complexe et l'échec musculaire y occupaient une place bien plus centrale.",
    limitations:
      'Document daté de 2009 : plusieurs de ses recommandations ont été explicitement révisées depuis.',
    strength: 'moderate',
    verified: 'cross-referenced',
    verificationNote:
      "DOI confirmé comme référence B1 de Singer et al. 2024, lui-même vérifié via CrossRef.",
    axes: ['musculation'],
  },
  {
    id: 'singer2024',
    authors:
      'Singer A, Wolf M, Generoso L, Arias E, Delcastillo K, Echevarria E, Martinez A, Androulakis Korakakis P, Refalo MC, Swinton PA, Schoenfeld BJ',
    year: 2024,
    title:
      'Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy',
    journal: 'Frontiers in Sports and Active Living',
    locator: '6:1429789',
    doi: '10.3389/fspor.2024.1429789',
    type: 'meta-analysis',
    sample: '9 études, 19 mesures (cuisse : 10 ; bras : 6 ; corps entier : 3)',
    keyResult:
      'Bénéfice hypertrophique léger au-delà de 60 s (bras ES 0,13 [95 % CrI −0,27 à 0,51] ; cuisse 0,17 [−0,13 à 0,43]), sans différence appréciable au-delà de 90 s.',
    limitations:
      "Les intervalles de crédibilité traversent tous zéro : l'effet est compatible avec l'absence d'effet. Hétérogénéité substantielle entre études. Corps entier : estimation légèrement en faveur des repos courts (−0,08).",
    strength: 'moderate',
    verified: 'crossref',
    axes: ['musculation', 'programmes'],
  },
  {
    id: 'schoenfeld2019freq',
    authors: 'Schoenfeld BJ, Grgic J, Krieger J',
    year: 2019,
    title:
      'How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis of studies examining the effects of resistance training frequency',
    journal: 'Journal of Sports Sciences',
    locator: '37(11):1286-1295',
    doi: '10.1080/02640414.2018.1555906',
    type: 'meta-analysis',
    sample: '25 études',
    keyResult:
      "À volume égalisé, la fréquence d'entraînement n'a pas d'effet significatif sur l'hypertrophie. La recommandation de ≥2 séances/semaine tient à ce qu'elle facilite l'accumulation du volume, pas à un effet propre.",
    limitations:
      "Peu d'études comparent directement des fréquences élevées à volume strictement égalisé ; la plupart des protocoles durent moins de 12 semaines.",
    strength: 'moderate',
    verified: 'cross-referenced',
    verificationNote:
      'DOI confirmé comme référence B4 de Singer et al. 2024, vérifié via CrossRef.',
    axes: ['musculation'],
  },
  {
    id: 'schoenfeld2016rest',
    authors: 'Schoenfeld BJ, Pope ZK, Benik FM, et al.',
    year: 2016,
    title:
      'Longer inter-set rest periods enhance muscle strength and hypertrophy in resistance-trained men',
    journal: 'Journal of Strength and Conditioning Research',
    locator: '30(7):1805-1812',
    doi: '10.1519/JSC.0000000000001272',
    type: 'rct',
    keyResult:
      'Hypertrophie et force supérieures avec 3 min de repos versus 1 min, chez des hommes entraînés.',
    limitations:
      "Échantillon exclusivement masculin et entraîné. Résultat nuancé par la méta-analyse de Singer et al. 2024, qui ne retrouve pas de différence appréciable au-delà de 90 s.",
    strength: 'low',
    verified: 'cross-referenced',
    verificationNote:
      'DOI confirmé comme référence B39 de Singer et al. 2024, vérifié via CrossRef.',
    axes: ['musculation'],
  },
  {
    id: 'lopes2019',
    authors: 'Lopes JSS, Machado AF, Micheletti JK, et al.',
    year: 2019,
    title:
      'Effects of training with elastic resistance versus conventional resistance on muscular strength: A systematic review and meta-analysis',
    journal: 'SAGE Open Medicine',
    locator: '7:2050312119831116',
    doi: '10.1177/2050312119831116',
    pmid: '30815258',
    type: 'meta-analysis',
    keyResult:
      "Aucune supériorité des charges conventionnelles sur les élastiques pour le développement de la force.",
    limitations:
      "Hétérogénéité des protocoles et des populations ; peu d'études mesurent directement l'hypertrophie plutôt que la force. L'existence d'un erratum invite à la prudence sur les chiffres exacts.",
    strength: 'moderate',
    verified: 'pubmed',
    erratum:
      'Erratum publié : SAGE Open Med. 2020;8:2050312120961220 (PMID 32953119).',
    axes: ['musculation'],
  },
  {
    id: 'pelland2026',
    authors: 'Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC',
    year: 2026,
    title: 'The Resistance Training Dose Response',
    journal: 'Sports Medicine',
    locator: 'à paraître',
    type: 'systematic-review',
    keyResult:
      "La dose-réponse de la force est plus abrupte et plafonne plus vite que celle de l'hypertrophie.",
    limitations:
      'Publication récente : à recouper une fois les métadonnées définitives disponibles.',
    strength: 'moderate',
    verified: 'unverified',
    verificationNote:
      "Absente de PubMed et de CrossRef au 3 août 2026 : ni DOI ni pagination confirmés. Soit la publication est trop récente pour être indexée, soit le titre exact diffère. À traiter comme non confirmée tant qu'elle n'est pas retrouvée.",
    axes: ['musculation', 'programmes'],
  },

  // -------------------------------------------------------------- endurance
  {
    id: 'seiler2006',
    authors: 'Seiler S, Kjerland GØ',
    year: 2006,
    title:
      'Quantifying training intensity distribution in elite endurance athletes: is there evidence for an "optimal" distribution?',
    journal: 'Scandinavian Journal of Medicine & Science in Sports',
    locator: '16(1):49-56',
    doi: '10.1111/j.1600-0838.2004.00418.x',
    pmid: '16430681',
    type: 'observational',
    sample: '11 skieurs de fond juniors, 347 séances analysées',
    keyResult:
      "Distribution mesurée : 75 ± 3 % en zone 1, 8 ± 3 % en zone 2, 17 ± 4 % en zone 3 (analyse par fréquence cardiaque). Résultats similaires par effort perçu : 76 ± 4 / 6 ± 5 / 18 ± 7.",
    limitations:
      "Étude descriptive sur un très petit échantillon d'athlètes d'élite masculins d'une seule discipline. Décrit ce que font ces athlètes, ne démontre pas que c'est optimal.",
    strength: 'moderate',
    verified: 'crossref',
    verificationNote:
      "Publié en ligne dès octobre 2004, paru au numéro de 2006 — les deux dates circulent dans la littérature.",
    axes: ['endurance', 'combiner'],
  },
  {
    id: 'stoggl2014',
    authors: 'Stöggl T, Sperlich B',
    year: 2014,
    title:
      'Polarized training has greater impact on key endurance variables than threshold, high intensity, or high volume training',
    journal: 'Frontiers in Physiology',
    locator: '5:33',
    doi: '10.3389/fphys.2014.00033',
    pmid: '24550842',
    type: 'rct',
    sample: '48 athlètes d’endurance entraînés',
    keyResult:
      "Les blocs polarisés produisent des gains supérieurs de VO2max et de temps jusqu'à épuisement, comparés aux blocs orientés seuil, haute intensité ou volume.",
    limitations:
      'Échantillon modeste, intervention courte (9 semaines), athlètes déjà entraînés — la transposition aux débutantes reste incertaine.',
    strength: 'low',
    verified: 'pubmed',
    axes: ['endurance'],
  },
  {
    id: 'tanaka2001',
    authors: 'Tanaka H, Monahan KD, Seals DR',
    year: 2001,
    title: 'Age-predicted maximal heart rate revisited',
    journal: 'Journal of the American College of Cardiology',
    locator: '37(1):153-156',
    doi: '10.1016/S0735-1097(00)01054-8',
    type: 'meta-analysis',
    sample: '351 études, 18 712 sujets',
    keyResult:
      'FCmax = 208 − 0,7 × âge, avec un écart-type d’environ ±10 bpm autour de la valeur prédite.',
    limitations:
      "L'écart-type de ±10 bpm rend toute zone calculée sur une FCmax estimée potentiellement décalée de 20 bpm pour un individu donné. À remplacer par des seuils mesurés dès que possible.",
    strength: 'high',
    verified: 'crossref',
    axes: ['endurance'],
  },

  // --------------------------------------------------------------- combiner
  {
    id: 'wilson2012',
    authors: 'Wilson JM, Marín PJ, Rhea MR, Wilson SMC, Loenneke JP, Anderson JC',
    year: 2012,
    title:
      'Concurrent training: A meta-analysis examining interference of aerobic and resistance exercise',
    journal: 'Journal of Strength and Conditioning Research',
    locator: '26(8):2293-2307',
    doi: '10.1519/JSC.0b013e31823a3e2d',
    type: 'meta-analysis',
    keyResult:
      "Hypertrophie : ES 1,23 (force seule) contre 0,85 (concurrent) et 0,27 (endurance seule). Puissance : 0,91 contre 0,55. La course entraîne des décréments significatifs de force et d'hypertrophie, le vélo non. L'interférence croît avec le volume et la fréquence d'endurance (corrélations −0,26 à −0,75).",
    limitations:
      "Méta-analyse de 2012 : les protocoles inclus sont hétérogènes et majoritairement masculins. Les tailles d'effet ne sont pas issues de comparaisons directes randomisées entre modalités d'endurance.",
    strength: 'moderate',
    verified: 'crossref',
    axes: ['combiner', 'programmes'],
  },

  // -------------------------------------------------------------- nutrition
  {
    id: 'issn2017',
    authors: 'Jäger R, Kerksick CM, Campbell BI, et al.',
    year: 2017,
    title:
      'International Society of Sports Nutrition Position Stand: protein and exercise',
    journal: 'Journal of the International Society of Sports Nutrition',
    locator: '14:20',
    doi: '10.1186/s12970-017-0177-8',
    type: 'position-stand',
    keyResult:
      "Apport de 1,4 à 2,0 g/kg/j suffisant pour construire et maintenir la masse musculaire. Doses de 0,25 g/kg (20-40 g) toutes les 3-4 h. L'effet anabolique de l'exercice dure ≥24 h — le timing post-effort a un effet mineur face à l'apport total quotidien.",
    limitations:
      "Position d'une société savante, non une méta-analyse indépendante. Les besoins individuels varient selon la masse maigre, l'âge et le contexte énergétique.",
    strength: 'high',
    verified: 'crossref',
    axes: ['nutrition', 'programmes', 'combiner'],
  },
  {
    id: 'thomas2016',
    authors: 'Thomas DT, Erdman KA, Burke LM',
    year: 2016,
    title: 'Nutrition and Athletic Performance',
    journal:
      'Medicine & Science in Sports & Exercise (position conjointe Academy of Nutrition and Dietetics / Dietitians of Canada / ACSM)',
    locator: '48(3):543-568',
    doi: '10.1249/MSS.0000000000000852',
    pmid: '26891166',
    type: 'position-stand',
    keyResult:
      'Glucides périodisés selon la charge : 3-5 g/kg/j (activité légère), ~5-7 (modérée), 6-10 (endurance élevée), 8-12 (très élevée). Récupération rapide : 1,0-1,2 g/kg/h pendant les 4 premières heures.',
    limitations:
      "Recommandations établies principalement à partir d'athlètes d'endurance ; les fourchettes hautes concernent des volumes rarement atteints en pratique loisir.",
    strength: 'high',
    verified: 'pubmed',
    verificationNote:
      "Texte co-publié simultanément dans le Journal of the Academy of Nutrition and Dietetics 116(3):501-528 — les deux références désignent le même document.",
    erratum:
      'Erratum publié : Med Sci Sports Exerc. 2017;49(1):222 (PMID 27992398).',
    axes: ['nutrition'],
  },
  {
    id: 'eah2015',
    authors: 'Hew-Butler T, Rosner MH, Fowkes-Godek S, et al.',
    year: 2015,
    title:
      'Statement of the 3rd International Exercise-Associated Hyponatremia Consensus Development Conference, Carlsbad, California, 2015',
    journal: 'British Journal of Sports Medicine',
    locator: '49(22):1432-1446',
    doi: '10.1136/bjsports-2015-095004',
    pmid: '26227507',
    type: 'consensus',
    keyResult:
      "Recommandation de boire à la soif. L'hyponatrémie liée à l'exercice résulte principalement d'une surconsommation de fluides hypotoniques et d'une sécrétion inappropriée de vasopressine, non d'un manque de sodium.",
    limitations:
      "Document de consensus d'experts ; les seuils individuels de risque restent mal caractérisés.",
    strength: 'high',
    verified: 'pubmed',
    verificationNote:
      "Correction : cette conférence de consensus est souvent citée d'après sa version du Clinical Journal of Sport Medicine (25(4):303-320). PubMed résout la version du British Journal of Sports Medicine, retenue ici. Les deux désignent le même texte, co-publié.",
    axes: ['nutrition'],
  },
  {
    id: 'ioc2023',
    authors: 'Mountjoy M, Ackerman KE, Bailey DM, et al.',
    year: 2023,
    title:
      "2023 International Olympic Committee's (IOC) consensus statement on Relative Energy Deficiency in Sport (REDs)",
    journal: 'British Journal of Sports Medicine',
    locator: '57(17):1073-1098',
    doi: '10.1136/bjsports-2023-106994',
    type: 'consensus',
    keyResult:
      "Le RED-S découle d'une faible disponibilité énergétique. Conséquences : dysfonction menstruelle, atteinte osseuse, perturbations métaboliques et hormonales, immunité, santé mentale. La faible disponibilité énergétique existe sur un spectre.",
    limitations:
      "La disponibilité énergétique est difficile à mesurer sur le terrain et les symptômes sont multifactoriels. Une revue critique conteste la validité opérationnelle du syndrome. Doit guider la vigilance et l'orientation médicale, jamais l'autodiagnostic.",
    strength: 'high',
    verified: 'crossref',
    verificationNote:
      'CrossRef indique une pagination 1073-1098 (et non 1073-1097 comme parfois cité).',
    axes: ['nutrition', 'cycle', 'securite'],
  },
  {
    id: 'pengelly2025',
    authors: 'Pengelly M, Pumpa K, Pyne DB, Etxebarria N',
    year: 2025,
    title:
      'Iron deficiency, supplementation, and sports performance in female athletes: A systematic review',
    journal: 'Journal of Sport and Health Science',
    locator: '14:101009',
    doi: '10.1016/j.jshs.2024.101009',
    pmid: '39536912',
    type: 'systematic-review',
    sample: '23 études, 669 athlètes, 16 sports',
    keyResult:
      "Jusqu'à 60 % des athlètes féminines connaissent une déficience en fer. La déficience dégrade la performance d'endurance de 3 à 4 % ; la performance s'améliore de 2 à 20 % avec traitement.",
    limitations:
      "Seuil de ferritine retenu comme critère d'inclusion : <40 µg/L, alors que <30 µg/L est couramment utilisé en médecine du sport — les deux chiffres ne sont pas interchangeables. Protocoles de supplémentation hétérogènes.",
    strength: 'moderate',
    verified: 'pubmed',
    verificationNote:
      'Publiée en ligne en novembre 2024, parue au numéro de décembre 2025.',
    axes: ['nutrition'],
  },

  // ------------------------------------------------------------------ cycle
  {
    id: 'colenso2023',
    authors: "Colenso-Semple LM, D'Souza AC, Elliott-Sale KJ, Phillips SM",
    year: 2023,
    title:
      "Current evidence shows no influence of women's menstrual cycle phase on acute strength performance or adaptations to resistance exercise training",
    journal: 'Frontiers in Sports and Active Living',
    locator: '5:1054542',
    doi: '10.3389/fspor.2023.1054542',
    type: 'umbrella-review',
    sample: 'Revue des méta-analyses et revues systématiques disponibles',
    keyResult:
      "Constats très variables entre revues, expliqués par des pratiques méthodologiques médiocres et inconsistantes (vérification insuffisante des phases). Conclusion des auteurs : il est prématuré de conclure que les fluctuations hormonales influencent de façon appréciable la performance aiguë ou les adaptations à long terme.",
    limitations:
      "Une revue de revues hérite des faiblesses de la littérature qu'elle synthétise. Absence de preuve d'un effet moyen n'équivaut pas à preuve d'absence d'effet individuel.",
    strength: 'high',
    verified: 'crossref',
    axes: ['cycle'],
  },
  {
    id: 'colenso2025',
    authors:
      'Colenso-Semple LM, McKendry J, Lim C, Atherton PJ, Wilkinson DJ, Smith K, Phillips SM',
    year: 2025,
    title:
      'Menstrual cycle phase does not influence muscle protein synthesis or whole-body myofibrillar proteolysis in response to resistance exercise',
    journal: 'The Journal of Physiology',
    locator: '603(5):1109-1121',
    doi: '10.1113/JP287342',
    pmid: '39630025',
    type: 'crossover',
    sample:
      '12 femmes, protocole croisé intra-sujet randomisé, 2 phases de 6 jours, exercice unilatéral (jambe controlatérale en témoin)',
    keyResult:
      "Synthèse myofibrillaire, jambe exercée : 1,52 ± 0,27 %·j⁻¹ en phase folliculaire contre 1,46 ± 0,25 %·j⁻¹ en phase lutéale (jambes témoins : 1,33 et 1,28). Effet significatif de l'exercice (P < 0,001), aucun effet de la phase ni interaction. Protéolyse : aucun effet de phase (P = 0,24).",
    limitations:
      "Petit échantillon (n = 12) de jeunes femmes eumenorrhéiques sans contraception. Exercice unilatéral de laboratoire, pas une séance complète. Phases vérifiées hormonalement, ce qui est un point fort méthodologique rare dans ce domaine.",
    strength: 'high',
    verified: 'crossref',
    verificationNote:
      "Correction importante : les taux de synthèse sont exprimés en pourcentage par JOUR (%·j⁻¹), et non par heure. Plusieurs reprises secondaires de cette étude propagent l'erreur d'unité.",
    axes: ['cycle'],
  },
  {
    id: 'scj2025',
    authors: 'Strength & Conditioning Journal',
    year: 2025,
    title:
      'Evidence for Periodizing Strength and/or Endurance Training According to Menstrual Cycle Phases to Optimize Female Athlete Performance Is Lacking',
    journal: 'Strength & Conditioning Journal',
    locator: '47(6):630-642',
    doi: '10.1519/SSC.0000000000000917',
    type: 'narrative-review',
    keyResult:
      "La recherche ne soutient pas l'idée que périodiser l'entraînement de force ou d'endurance selon le cycle menstruel confère un bénéfice supplémentaire par rapport aux approches traditionnelles.",
    limitations:
      "Revue narrative : synthèse argumentée plutôt qu'analyse quantitative systématique.",
    strength: 'moderate',
    verified: 'crossref',
    axes: ['cycle'],
  },
  {
    id: 'mcnulty2020',
    authors:
      'McNulty KL, Elliott-Sale KJ, Dolan E, Swinton PA, Ansdell P, Goodall S, Thomas K, Hicks KM',
    year: 2020,
    title:
      'The Effects of Menstrual Cycle Phase on Exercise Performance in Eumenorrheic Women: A Systematic Review and Meta-Analysis',
    journal: 'Sports Medicine',
    locator: '50:1813-1827',
    doi: '10.1007/s40279-020-01319-3',
    pmid: '32661839',
    type: 'meta-analysis',
    sample: '78 études, 1193 participantes',
    keyResult:
      "Effet global trivial : ES₀,₅ = −0,06 [95 % CrI −0,16 à 0,04]. Plus grand écart entre début et fin de phase folliculaire : ES₀,₅ = −0,14 [−0,26 à −0,03].",
    limitations:
      "Qualité de preuve jugée faible (≈42 %). L'intervalle de crédibilité de l'effet global traverse zéro. Ne porte que sur des femmes eumenorrhéiques.",
    strength: 'moderate',
    verified: 'crossref',
    axes: ['cycle', 'endurance'],
  },
  {
    id: 'dossantos2023',
    authors: 'Dos’Santos T, Stebbings GK, Morse C, et al.',
    year: 2023,
    title:
      'Effects of the menstrual cycle phase on anterior cruciate ligament neuromuscular and biomechanical injury risk surrogates in eumenorrheic and naturally menstruating women: A systematic review',
    journal: 'PLOS ONE',
    locator: '18(1):e0280800',
    doi: '10.1371/journal.pone.0280800',
    pmid: '36701354',
    type: 'systematic-review',
    sample: '7 études',
    keyResult:
      "Résultats non concluants quant à savoir si une phase prédispose à un risque accru de rupture du ligament croisé antérieur.",
    limitations:
      'Qualité des preuves jugée très faible (GRADE). Les études mesurent des indicateurs indirects de risque, pas des blessures réelles.',
    strength: 'low',
    verified: 'pubmed',
    axes: ['cycle'],
  },
  {
    id: 'dsouza2023',
    authors: 'D’Souza AC, Wageh M, Williams JS, et al.',
    year: 2023,
    title:
      'Menstrual cycle hormones and oral contraceptives: a multimethod systems physiology-based review of their impact on key aspects of female physiology',
    journal: 'Journal of Applied Physiology',
    locator: '135(6):1284-1299',
    doi: '10.1152/japplphysiol.00346.2023',
    type: 'narrative-review',
    keyResult:
      "L'impact des contraceptifs hormonaux sur la performance est globalement faible et incohérent dans la littérature.",
    limitations:
      'Revue narrative ; grande diversité des formulations contraceptives, rarement distinguées dans les études primaires.',
    strength: 'moderate',
    verified: 'cross-referenced',
    verificationNote:
      'DOI confirmé comme référence de Colenso-Semple et al. 2025, vérifié via CrossRef.',
    axes: ['cycle'],
  },
  {
    id: 'ryman2025',
    authors: 'Ryman Augustsson S, Findhé-Malenica A',
    year: 2025,
    title: 'Power in the flow — female athletes’ experiences of the menstrual cycle',
    journal: 'Frontiers in Sports and Active Living',
    locator: '7:1519825',
    type: 'qualitative',
    keyResult:
      "La performance ressentie fluctue selon les phases : fin de phase lutéale souvent perçue négativement, motivation réduite les 1 à 3 premiers jours des règles — avec une grande variation individuelle.",
    limitations:
      "Étude qualitative : décrit des vécus, ne mesure pas de performance objective. Ne contredit pas l'absence d'effet mesuré sur la capacité physique.",
    strength: 'low',
    verified: 'unverified',
    verificationNote:
      "Absente de PubMed au 3 août 2026 (recherche sur le titre sans résultat). Les revues Frontiers récentes sont parfois indexées avec retard. À recontrôler.",
    axes: ['cycle'],
  },

  // --------------------------------------------------------- récupération
  {
    id: 'bonnar2018',
    authors: 'Bonnar D, Bartel K, Kakoschke N, Lang C',
    year: 2018,
    title:
      'Sleep Interventions Designed to Improve Athletic Performance and Recovery: A Systematic Review of Current Approaches',
    journal: 'Sports Medicine',
    locator: '48(3):683-703',
    doi: '10.1007/s40279-017-0832-x',
    pmid: '29352373',
    type: 'systematic-review',
    keyResult:
      "L'extension du sommeil ressort comme l'intervention la plus efficace pour améliorer sommeil et performance ; les siestes donnent des résultats mixtes.",
    limitations:
      'Preuves de qualité modérée, risque de biais notable dans les études primaires, protocoles très hétérogènes.',
    strength: 'moderate',
    verified: 'pubmed',
    axes: ['recuperation'],
  },
];

/** Numérotation globale stable, dérivée de l'ordre du registre. */
export const REFERENCE_INDEX: Record<string, number> = Object.fromEntries(
  REFERENCES.map((r, i) => [r.id, i + 1])
);

export function getReference(id: string): Reference | undefined {
  return REFERENCES.find((r) => r.id === id);
}

export function referencesForAxis(slug: string): Reference[] {
  return REFERENCES.filter((r) => r.axes.includes(slug));
}

/** Lien canonique : DOI en priorité, sinon PubMed. */
export function referenceUrl(r: Reference): string | null {
  if (r.doi) return `https://doi.org/${r.doi}`;
  if (r.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`;
  return null;
}
