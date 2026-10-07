/**
 * Client serveur-à-serveur vers le moteur de décision.
 * À utiliser uniquement côté serveur (Server Components / Route Handlers) —
 * PERFORMANCE_ENGINE_URL pointe vers le réseau Docker interne.
 */
const ENGINE_URL = process.env.PERFORMANCE_ENGINE_URL ?? 'http://performance-engine:8000';

export interface SyncRun {
  status: 'running' | 'success' | 'partial' | 'error';
  daily_days: number | null;
  wellness_days: number | null;
  activities_imported: number | null;
  error: string | null;
  created_at: string;
}

export interface GarminStatus {
  linked: boolean;
  updated_at?: string;
  last_sync?: SyncRun | null;
}

export async function getGarminStatus(userId: string): Promise<GarminStatus> {
  try {
    const res = await fetch(
      `${ENGINE_URL}/garmin/status?user_id=${encodeURIComponent(userId)}`,
      { headers: { 'X-Internal-Key': INTERNAL_KEY }, cache: 'no-store' }
    );
    if (!res.ok) return { linked: false };
    return res.json();
  } catch {
    return { linked: false };
  }
}

const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? '';

// ---------------------------------------------------------------- summary
export interface MetricBlock {
  today: number | null;
  baseline: number | null;
  delta_pct: number | null;
}

// ---------------------------------------------------------------- overview
export type DisciplineAccent = 'green' | 'blue' | 'violet' | 'orange' | 'gray';

export interface DisciplineTotals {
  sessions: number;
  minutes: number;
  distance_m: number;
  trimp: number;
  tonnage_kg: number;
}

export interface DisciplineTile extends DisciplineTotals {
  discipline: string;
  label: string;
  icon: string;
  accent: DisciplineAccent;
}

export interface FeedEntry {
  id: string;
  date: string;
  discipline: string;
  discipline_label: string;
  icon: string;
  accent: DisciplineAccent;
  session_type: string | null;
  title: string | null;
  duration_minutes: number | null;
  distance_m: number | null;
  trimp: number | null;
  tonnage_kg: number | null;
  avg_hr: number | null;
  rpe: number | null;
  /** Analyse chiffrée instantanée (comparaison à tes habitudes, 90 j). */
  analysis?: ActivityAnalysis;
  /** Commentaire de Perlo, rédigé en tâche de fond après la synchro. */
  comment?: string | null;
}

export interface ActivityAnalysis {
  headline: string;
  facts: string[];
  tags: ('record' | 'efficiency' | 'easy' | 'hard')[];
  history_n: number;
}

export interface OverviewWeekDay {
  date: string;
  is_today: boolean;
  is_past: boolean;
  planned: number;
  completed: number;
  disciplines: string[];
}

export interface DashboardOverview {
  date: string;
  readiness: {
    level: 'NORMAL' | 'CAUTION' | 'REDUCE';
    hrv_zscore: number | null;
    detail: string;
  };
  physio: {
    hrv: MetricBlock | null;
    sleep: MetricBlock | null;
    resting_hr: MetricBlock | null;
    stress: MetricBlock | null;
  };
  last_metric_date: string | null;
  totals: { week: DisciplineTotals; month: DisciplineTotals };
  by_discipline: DisciplineTile[];
  week: OverviewWeekDay[];
  recent: FeedEntry[];
  streak_weeks: number;
  active_days_28: number;
}

export async function getDashboardOverview(
  userId: string
): Promise<DashboardOverview | null> {
  try {
    const res = await fetch(`${ENGINE_URL}/dashboard/overview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': INTERNAL_KEY },
      body: JSON.stringify({ user_id: userId }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Bibliothèque de séances structurées (modèles paramétrables). */

/** Bibliothèque de séances de test de l'utilisateur (isolée du moteur). */

/** Statut de liaison Google Calendar (route interne, clé requise). */


// ---------------------------------------------------------------- conseiller
export interface AdvisorDaily {
  date: string;
  text: string;
  /** 'llm' : rédigée à 6h30 par l'IA locale ; 'summary' : synthèse chiffrée. */
  source: 'llm' | 'summary';
  generated_at: string | null;
}

/** Analyse du jour de Perlo : instantanée (pré-générée ou calculée). */
export async function getAdvisorDaily(userId: string): Promise<AdvisorDaily | null> {
  try {
    const res = await fetch(
      `${ENGINE_URL}/advisor/daily?user_id=${encodeURIComponent(userId)}`,
      { headers: { 'X-Internal-Key': INTERNAL_KEY }, cache: 'no-store' }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- amis
export interface FriendItem {
  friendship_id: string;
  name: string;
}

export interface SocialMe {
  friend_code: string;
  prefs: { share_activities: boolean; share_physio: boolean };
  friends: FriendItem[];
  incoming: FriendItem[];
  outgoing: FriendItem[];
}

export interface FriendActivity {
  date: string;
  discipline: string;
  discipline_label: string;
  icon: string;
  accent: DisciplineAccent;
  title: string | null;
  duration_minutes: number | null;
  distance_m: number | null;
  headline: string;
  tags: string[];
}

export interface FriendFeedItem extends FriendItem {
  shares_activities: boolean;
  shares_physio: boolean;
  week: { sessions: number; minutes: number; distance_m: number } | null;
  recent: FriendActivity[];
  readiness: 'NORMAL' | 'CAUTION' | 'REDUCE' | null;
}

async function engineGet<T>(path: string): Promise<T | null> {
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

export function getSocialMe(userId: string) {
  return engineGet<SocialMe>(`/social/me?user_id=${encodeURIComponent(userId)}`);
}

export async function getSocialFeed(userId: string): Promise<FriendFeedItem[]> {
  const r = await engineGet<{ friends: FriendFeedItem[] }>(
    `/social/feed?user_id=${encodeURIComponent(userId)}`
  );
  return r?.friends ?? [];
}

// ---------------------------------------------------------------- profil
export interface ProfileData {
  full_name: string | null;
  sessions_per_week: number | null;
  hr_max: number | null;
  hr_rest: number | null;
  sex: 'M' | 'F' | null;
  share_activities: boolean | null;
  share_physio: boolean | null;
}

export interface DailyMetricRow {
  recorded_date: string;
  hrv_ms: number | null;
  sleep_minutes: number | null;
  resting_heart_rate: number | null;
  stress_score?: number | null;
}

export function getProfile(userId: string) {
  return engineGet<ProfileData>(`/profile?user_id=${encodeURIComponent(userId)}`);
}

export async function getRecentMetrics(userId: string, limit = 14): Promise<DailyMetricRow[]> {
  return (
    (await engineGet<DailyMetricRow[]>(
      `/profile/metrics?user_id=${encodeURIComponent(userId)}&limit=${limit}`
    )) ?? []
  );
}

// ---------------------------------------------------------------- accueil
export interface DashboardHome {
  overview: DashboardOverview;
  daily: AdvisorDaily;
  friends: FriendFeedItem[];
  profile: { full_name: string | null };
}

/** Accueil complet en un seul appel moteur (lectures parallélisées côté moteur). */
export async function getDashboardHome(userId: string): Promise<DashboardHome | null> {
  try {
    const res = await fetch(`${ENGINE_URL}/dashboard/home`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': INTERNAL_KEY },
      body: JSON.stringify({ user_id: userId }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
