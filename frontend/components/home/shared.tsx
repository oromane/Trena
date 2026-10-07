/**
 * Résolution des icônes et couleurs par discipline + formats d'affichage,
 * partagés par toutes les briques du dashboard d'accueil.
 */
import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  HeartPulse,
  Waves,
} from 'lucide-react';
import type { DisciplineAccent } from '@/lib/engine';

export const DISCIPLINE_ICONS: Record<string, typeof Activity> = {
  run: Footprints,
  strength: Dumbbell,
  bike: Bike,
  swim: Waves,
  triathlon: HeartPulse,
  other: Activity,
};

export function disciplineIcon(icon: string) {
  return DISCIPLINE_ICONS[icon] ?? Activity;
}

/** Destination du module correspondant, pour rendre les tuiles cliquables. */
export const DISCIPLINE_HREF: Record<string, string> = {
  STRENGTH: '/strength',
  BIKE: '/autres/velo',
  SWIM: '/autres/natation',
  TRIATHLON: '/autres/triathlon',
};

export const ACCENT: Record<
  DisciplineAccent,
  { text: string; bg: string; border: string; dot: string }
> = {
  green: {
    text: 'text-ats-green',
    bg: 'bg-ats-green/10',
    border: 'border-ats-green/25',
    dot: 'bg-ats-green',
  },
  blue: {
    text: 'text-ats-blue',
    bg: 'bg-ats-blue/10',
    border: 'border-ats-blue/25',
    dot: 'bg-ats-blue',
  },
  violet: {
    text: 'text-ats-violet',
    bg: 'bg-ats-violet/10',
    border: 'border-ats-violet/25',
    dot: 'bg-ats-violet',
  },
  orange: {
    text: 'text-ats-orange',
    bg: 'bg-ats-orange/10',
    border: 'border-ats-orange/25',
    dot: 'bg-ats-orange',
  },
  gray: {
    text: 'text-ats-gray',
    bg: 'bg-ats-gray/10',
    border: 'border-ats-gray/25',
    dot: 'bg-ats-gray',
  },
};

/* ------------------------------------------------------------- formats */

export function fmtDuration(minutes: number | null | undefined): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

export function fmtDistance(metres: number | null | undefined): string {
  if (!metres) return '—';
  if (metres < 1000) return `${metres} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

export function fmtTonnage(kg: number | null | undefined): string {
  if (!kg) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${Math.round(kg)} kg`;
}

const DAY_MS = 86400000;

/** « aujourd'hui », « hier », « il y a 3 jours », puis date courte. */
export function relativeDay(dateStr: string, today: string): string {
  const diff = Math.round(
    (new Date(today).getTime() - new Date(dateStr).getTime()) / DAY_MS
  );
  if (diff <= 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  if (diff < 7) return `il y a ${diff} jours`;
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

export const SESSION_TYPE_LABELS: Record<string, string> = {
  INTERVAL: 'Fractionné',
  TEMPO: 'Tempo',
  ENDURANCE: 'Endurance',
  RECOVERY: 'Récupération',
  LONG_RUN: 'Sortie longue',
  RACE: 'Course',
  FULL_BODY: 'Full-body',
  UPPER: 'Haut du corps',
  LOWER: 'Bas du corps',
  PUSH: 'Poussée',
  PULL: 'Tirage',
  CORE: 'Gainage',
  MOBILITY: 'Mobilité',
};

export function sessionLabel(type: string | null | undefined): string {
  if (!type) return 'Séance';
  return SESSION_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase();
}
