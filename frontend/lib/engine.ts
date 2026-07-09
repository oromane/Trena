/**
 * Client serveur-à-serveur vers le moteur de décision.
 * À utiliser uniquement côté serveur (Server Components / Route Handlers) —
 * PERFORMANCE_ENGINE_URL pointe vers le réseau Docker interne.
 */
const ENGINE_URL = process.env.PERFORMANCE_ENGINE_URL ?? 'http://performance-engine:8000';

export interface GarminStatus {
  linked: boolean;
  updated_at?: string;
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

export interface SimulateResult {
  fitness: number[];
  fatigue: number[];
  performance: number[];
  form: number[];
}

const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? '';

// ---------------------------------------------------------------- summary
export interface MetricBlock {
  today: number | null;
  baseline: number | null;
  delta_pct: number | null;
}

export interface WeekDay {
  date: string;
  is_today: boolean;
  sessions: {
    id: string;
    session_type: string;
    duration_minutes: number;
    target_trimp: number;
    status: string;
  }[];
}

export interface SessionComparison {
  actual_pace_s_per_km?: number;
  actual_pace?: string;
  target_pace_s_per_km?: number;
  target_pace?: string;
  pace_delta_s?: number;
  target_trimp?: number;
  actual_trimp?: number;
  trimp_delta?: number;
  avg_hr?: number;
}

export interface SessionRow {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  session_type: string;
  duration_planned_minutes: number;
  intensity_target_trimp: number;
  status: string;
  duration_actual_minutes: number | null;
  trimp_actual: number | null;
  distance_m?: number | null;
  avg_hr?: number | null;
  comparison?: SessionComparison | null;
}

export interface ZonePace {
  zone: number;
  label: string;
  pace_s_per_km: number;
  pace: string;
}

export interface PacesPayload {
  distance_m: number;
  race: { pace_s_per_km: number; pace: string };
  zones: ZonePace[];
}

export interface Workout {
  blocks: { label: string; detail: string }[];
  focus: string;
  pace_hint?: string;
  paces?: PacesPayload;
}

export interface RaceWeek {
  days_remaining: number;
  title: string;
  target_date: string;
  race_pace: { pace_s_per_km: number; pace: string } | null;
  checklist: { days_before: number; label: string; done_window: boolean }[];
  reminders: { nutrition: string; sommeil: string; hydratation: string };
}

export interface DashboardSummary {
  date: string;
  objective: {
    title: string;
    sport_type: string;
    target_date: string;
    target_time_seconds: number | null;
    days_remaining: number;
  } | null;
  paces?: PacesPayload | null;
  race_week?: RaceWeek | null;
  readiness: { level: 'NORMAL' | 'CAUTION' | 'REDUCE'; hrv_zscore: number | null; detail: string };
  today_session: SessionRow | null;
  workout: Workout | null;
  physio: {
    hrv: MetricBlock | null;
    sleep: MetricBlock | null;
    resting_hr: MetricBlock | null;
    stress: MetricBlock | null;
  };
  probability: {
    value: number;
    adherence: number;
    form_score: number;
    readiness_factor: number;
    explanation: string[];
    gain_if_completed_pct: number;
  };
  trajectory: {
    start_date: string;
    today_index: number;
    fitness: number[];
    fatigue: number[];
    form: number[];
    loads: number[];
  };
  weekly_load: {
    week_start: string;
    planned_trimp: number;
    actual_trimp: number;
    planned_minutes: number;
    actual_minutes: number;
  }[];
  week: WeekDay[];
  history: SessionRow[];
  insights: { kind: string; severity: 'positive' | 'info' | 'warning'; text: string }[];
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary | null> {
  try {
    const res = await fetch(`${ENGINE_URL}/dashboard/summary`, {
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

export interface WorkoutTemplate {
  id: string;
  name: string;
  session_type: string;
  description: string;
  params: { key: string; label: string; default: number; min: number; max: number }[];
}

/** Bibliothèque de séances structurées (modèles paramétrables). */
export async function getWorkoutTemplates(): Promise<WorkoutTemplate[]> {
  try {
    const res = await fetch(`${ENGINE_URL}/sessions/templates`, {
      headers: { 'X-Internal-Key': INTERNAL_KEY },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return (await res.json()).templates ?? [];
  } catch {
    return [];
  }
}

export interface CalendarStatus {
  linked: boolean;
  expires_at?: string;
  scopes?: string[];
}

/** Statut de liaison Google Calendar (route interne, clé requise). */
export async function getCalendarStatus(userId: string): Promise<CalendarStatus> {
  try {
    const res = await fetch(
      `${ENGINE_URL}/calendar/status?user_id=${encodeURIComponent(userId)}`,
      { headers: { 'X-Internal-Key': INTERNAL_KEY }, cache: 'no-store' }
    );
    if (!res.ok) return { linked: false };
    return res.json();
  } catch {
    return { linked: false };
  }
}

export async function simulate(
  loads: number[],
  params?: Partial<{ p0: number; k1: number; k2: number; tau1: number; tau2: number }>
): Promise<SimulateResult> {
  const res = await fetch(`${ENGINE_URL}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loads, ...params }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Engine error ${res.status}: ${await res.text()}`);
  return res.json();
}
