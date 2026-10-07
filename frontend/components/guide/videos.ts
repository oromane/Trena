/**
 * Vidéos du guide.
 *
 * Règle : aucune vidéo n'entre ici sans que son identifiant ait été résolu
 * auprès de l'API oEmbed de YouTube. Le titre et la chaîne enregistrés
 * ci-dessous sont les valeurs canoniques renvoyées par cette API, pas une
 * reformulation — si une vidéo est retirée ou renommée, l'écart se voit.
 *
 * Campagne de vérification : 3 août 2026.
 */

export type VideoFormat = 'lecture' | 'podcast' | 'interview';

export const VIDEO_FORMAT_LABELS: Record<VideoFormat, string> = {
  lecture: 'Conférence académique',
  podcast: 'Podcast',
  interview: 'Entretien',
};

export interface GuideVideo {
  id: string;
  /** Identifiant YouTube, vérifié via oEmbed. */
  youtubeId: string;
  /** Titre canonique renvoyé par l'API oEmbed. */
  title: string;
  /** Chaîne canonique renvoyée par l'API oEmbed. */
  channel: string;
  format: VideoFormat;
  language: 'en' | 'fr';
  /** Qui parle, et à quel titre — c'est ce qui fonde la crédibilité. */
  speaker: string;
  credentials: string;
  /** Pourquoi cette vidéo est pertinente ici. */
  why: string;
  /** Références du registre auxquelles l'intervenant est directement lié. */
  relatedRefs: string[];
  axes: string[];
}

export const VIDEOS: GuideVideo[] = [
  {
    id: 'phillips-protein',
    youtubeId: 'VbrBfIghnzA',
    title:
      'All Things Protein, Protein Synthesis and Hypertrophy - Dr. Stuart Phillips & Dr. Richard Mackenzie',
    channel: 'Metabolic Health',
    format: 'lecture',
    language: 'en',
    speaker: 'Pr Stuart M. Phillips',
    credentials:
      'McMaster University — président du comité de rédaction de la Position Stand ACSM 2026 sur la musculation, et co-auteur des travaux sur cycle menstruel et synthèse protéique cités dans ce guide',
    why: "Exposé de fond sur la synthèse protéique musculaire par l'auteur qui préside la principale source de ce chapitre. Permet d'entendre le raisonnement derrière les recommandations, pas seulement leur conclusion.",
    relatedRefs: ['acsm2026', 'issn2017', 'colenso2025'],
    axes: ['musculation', 'nutrition'],
  },
  {
    id: 'seiler-polarized',
    youtubeId: 'bxEaAbcO64s',
    title:
      'Polarized Training 101: Dr. Stephen Seiler’s Deep Dive into 80/20 Endurance Training',
    channel: 'Fast Talk Laboratories',
    format: 'interview',
    language: 'en',
    speaker: 'Dr Stephen Seiler',
    credentials:
      "Université d'Agder — auteur de l'étude fondatrice de 2006 sur la distribution d'intensité chez les athlètes d'endurance, citée dans ce chapitre",
    why: "Seiler explique lui-même d'où vient le fameux 80/20, ce que ses données montrent réellement, et ce qu'elles ne montrent pas. Utile pour distinguer le principe solide de la règle chiffrée devenue slogan.",
    relatedRefs: ['seiler2006'],
    axes: ['endurance'],
  },
  {
    id: 'colenso-periodization',
    youtubeId: 'esHslB5IOQA',
    title:
      'Ep. 207 - Is Menstrual Cycle Periodization Evidence-Based? (ft. Lauren Colenso-Semple)',
    channel: 'Iron Culture Podcast',
    format: 'podcast',
    language: 'en',
    speaker: 'Dr Lauren Colenso-Semple',
    credentials:
      'McMaster University — première auteure de la revue de revues 2023 et de l’étude 2025 sur la synthèse protéique, les deux sources centrales de ce chapitre',
    why: "La chercheuse qui a produit les données présente elle-même pourquoi la périodisation selon le cycle n'est pas soutenue par les preuves — y compris les nuances qu'on perd dans les résumés.",
    relatedRefs: ['colenso2023', 'colenso2025', 'scj2025'],
    axes: ['cycle'],
  },
  {
    id: 'colenso-myths',
    youtubeId: 'J6A7axjHo2E',
    title:
      'Menstrual cycle effects on strength gains: debunking the myths with Lauren Colenso-Semple',
    channel: 'Evidence Strong',
    format: 'interview',
    language: 'en',
    speaker: 'Dr Lauren Colenso-Semple',
    credentials:
      'McMaster University — première auteure des deux études sur cycle menstruel et musculation citées ici',
    why: 'Format plus court et plus accessible que le podcast précédent, centré sur les idées reçues les plus répandues.',
    relatedRefs: ['colenso2023', 'colenso2025'],
    axes: ['cycle'],
  },
];

export function getVideo(id: string): GuideVideo | undefined {
  return VIDEOS.find((v) => v.id === id);
}

export function videosForAxis(slug: string): GuideVideo[] {
  return VIDEOS.filter((v) => v.axes.includes(slug));
}
