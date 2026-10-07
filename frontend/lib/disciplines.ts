/**
 * Client serveur-à-serveur du module disciplines (vélo, natation, triathlon).
 * À utiliser côté serveur uniquement — la clé interne ne doit pas fuiter.
 */
const ENGINE_URL =
  process.env.PERFORMANCE_ENGINE_URL ?? 'http://performance-engine:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? '';

/** Correspondance slug d'URL (français) → valeur de l'enum en base. */
export const SLUG_TO_DISCIPLINE: Record<string, string> = {
  velo: 'BIKE',
  natation: 'SWIM',
  triathlon: 'TRIATHLON',
};

export const DISCIPLINE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_DISCIPLINE).map(([s, d]) => [d, s])
);

export interface DisciplineConfig {
  discipline: string;
  label: string;
  tracks_distance: boolean;
  hint: string;
  session_types: { value: string; label: string }[];
}

export interface DisciplineSession {
  id: string;
  date: string;
  session_type: string | null;
  session_type_label: string | null;
  title: string | null;
  status: string | null;
  duration_minutes: number | null;
  distance_m: number | null;
  avg_hr: number | null;
  rpe: number | null;
  trimp: number | null;
}

export interface DisciplineTotals {
  sessions: number;
  minutes: number;
  distance_m: number;
  trimp: number;
}

export interface DisciplineStats {
  discipline: string;
  week: DisciplineTotals;
  month: DisciplineTotals;
  all_time: DisciplineTotals;
  longest_distance_m: number | null;
  last_session_date: string | null;
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${ENGINE_URL}${path}`, {
      headers: { 'X-Internal-Key': INTERNAL_KEY },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function getDisciplineConfig(discipline: string) {
  return get<DisciplineConfig>(`/disciplines/${discipline}/config`);
}

export async function getDisciplineSessions(
  discipline: string,
  userId: string,
  limit = 30
): Promise<DisciplineSession[]> {
  const data = await get<{ sessions: DisciplineSession[] }>(
    `/disciplines/${discipline}/sessions?user_id=${encodeURIComponent(userId)}&limit=${limit}`
  );
  return data?.sessions ?? [];
}

export function getDisciplineStats(discipline: string, userId: string) {
  return get<DisciplineStats>(
    `/disciplines/${discipline}/stats?user_id=${encodeURIComponent(userId)}`
  );
}
