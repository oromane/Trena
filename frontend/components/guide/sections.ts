/**
 * Table des matières du Guide — source unique partagée par la navigation,
 * la page d'accueil et les liens « suivant / précédent » en bas de page.
 */
export type GuideSection = {
  slug: string;
  href: string;
  label: string;
  title: string;
  summary: string;
  /** Nom d'icône lucide-react, résolu côté composant. */
  icon: string;
  minutes: number;
};

export const SECTIONS: GuideSection[] = [
  {
    slug: 'musculation',
    href: '/guide/musculation',
    label: 'Musculation',
    title: 'La musculation, expliquée',
    summary:
      "Pourquoi tel nombre de répétitions, de séries, tel temps de repos. Ce qui fait vraiment grossir un muscle — et ce qui n'y change rien.",
    icon: 'Dumbbell',
    minutes: 12,
  },
  {
    slug: 'programmes',
    href: '/guide/programmes',
    label: 'Programmes',
    title: 'Choisir son programme',
    summary:
      'Prise de masse, sèche, force, endurance musculaire, cardio en salle : ce que chaque objectif change concrètement dans la séance.',
    icon: 'ListChecks',
    minutes: 10,
  },
  {
    slug: 'endurance',
    href: '/guide/endurance',
    label: 'Endurance',
    title: 'Course, vélo, natation',
    summary:
      "Les zones d'intensité, pourquoi 80 % de l'entraînement doit être facile, et comment calibrer ses allures sans se fier au 220 − âge.",
    icon: 'Footprints',
    minutes: 11,
  },
  {
    slug: 'combiner',
    href: '/guide/combiner',
    label: 'Combiner',
    title: 'Muscler et courir en même temps',
    summary:
      "L'effet d'interférence : ce que le cardio coûte vraiment aux gains musculaires, et les quatre règles pour l'annuler presque entièrement.",
    icon: 'Shuffle',
    minutes: 10,
  },
  {
    slug: 'nutrition',
    href: '/guide/nutrition',
    label: 'Nutrition',
    title: 'Manger pour progresser',
    summary:
      'Protéines, glucides, hydratation. Les quantités réelles, la fenêtre anabolique démontée, et le risque le plus sérieux : le déficit énergétique.',
    icon: 'Apple',
    minutes: 12,
  },
  {
    slug: 'cycle',
    href: '/guide/cycle',
    label: 'Cycle',
    title: 'Cycle menstruel et entraînement',
    summary:
      "Ce que la science montre vraiment — et pourquoi les programmes « synchronisés au cycle » vendus en ligne ne reposent sur rien de solide.",
    icon: 'Moon',
    minutes: 13,
  },
  {
    slug: 'recuperation',
    href: '/guide/recuperation',
    label: 'Récupération',
    title: 'Récupérer, dormir, doser',
    summary:
      "Le sommeil comme premier levier de progression, et comment repérer la fatigue qui s'accumule avant qu'elle ne coûte cher.",
    icon: 'BedDouble',
    minutes: 7,
  },
  {
    slug: 'securite',
    href: '/guide/securite',
    label: 'Sécurité',
    title: 'Signaux d’alerte et limites',
    summary:
      'Ce qui justifie de consulter sans attendre, comment prévenir les blessures, et ce que ce guide ne peut pas faire.',
    icon: 'ShieldAlert',
    minutes: 6,
  },
];

/** Page transverse, hors numérotation des chapitres. */
export const SOURCES_PAGE = {
  href: '/guide/sources',
  label: 'Sources',
};

export function sectionIndex(slug: string): number {
  return SECTIONS.findIndex((s) => s.slug === slug);
}

export function neighbours(slug: string): {
  prev: GuideSection | null;
  next: GuideSection | null;
} {
  const i = sectionIndex(slug);
  return {
    prev: i > 0 ? SECTIONS[i - 1] : null,
    next: i >= 0 && i < SECTIONS.length - 1 ? SECTIONS[i + 1] : null,
  };
}
