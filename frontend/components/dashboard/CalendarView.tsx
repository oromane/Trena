'use client';

/**
 * Calendrier des séances : vues 1 jour / 3 jours / 1 semaine / 1 mois.
 * Édition (déplacer jour+heure, supprimer), ajout simple ou depuis un
 * modèle structuré. Sync Google Calendar sous la grille.
 */
import {
  CalendarCheck2,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import type { WorkoutTemplate } from '@/lib/engine';
import { fmtDurationShort } from '@/lib/format';
import {
  completeSession,
  createSession,
  deleteFromLibrary,
  deleteSession,
  publishPlanToCalendar,
  purgeCalendar,
  saveToLibrary,
  scheduleFromLibrary,
  unlinkGoogleCalendar,
  updateSession,
} from '@/app/actions';
import type { LibraryItem } from '@/lib/engine';

const TYPE_COLOR: Record<string, string> = {
  INTERVAL: '#FF4500',
  TEMPO: '#7C6FA8',
  ENDURANCE: '#4F86A8',
  RECOVERY: '#2E8B57',
};

const TYPE_SHORT: Record<string, string> = {
  INTERVAL: 'Fractionné',
  TEMPO: 'Tempo',
  ENDURANCE: 'Endurance',
  RECOVERY: 'Récup',
};

const INPUT_CLS =
  'rounded-lg border border-white/10 bg-ats-bg2 px-2.5 py-1.5 text-xs outline-none focus:border-ats-green/50';

type View = '1j' | '3j' | '1s' | '1m';

interface CalSession {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  session_type: string;
  title: string | null;
  duration_planned_minutes: number;
  intensity_target_trimp: number;
  status: string;
}

type Editing =
  | { mode: 'edit'; session: CalSession }
  | { mode: 'add'; date: string }
  | null;

// ------------------------------- constructeur structuré (style Garmin)
type BType = 'warmup' | 'work' | 'recovery' | 'cooldown';
type BCond = 'time' | 'distance' | 'lap';
type BTarget = 'pace' | 'hr' | 'none';

interface BStep {
  type: BType;
  condition: BCond;
  minutes: number;
  distance_m: number;
  zone: number;
  target: BTarget;
  pace_low: number;   // s/km
  pace_high: number;  // s/km
}
interface BItem {
  kind: 'step' | 'repeat';
  step?: BStep;
  times?: number;
  steps?: BStep[];
}

const ZONE_TRIMP: Record<number, number> = { 1: 0.8, 2: 1.2, 3: 2.0, 4: 2.5, 5: 3.0 };
const ZONES = [1, 2, 3, 4, 5];
const NOMINAL_PACE: Record<number, number> = { 1: 400, 2: 345, 3: 310, 4: 280, 5: 250 };
const LAP_DEFAULT: Record<BType, number> = { warmup: 12, cooldown: 8, recovery: 2, work: 4 };

const TYPE_OPTS: [BType, string][] = [
  ['warmup', 'Échauffement'], ['work', 'Travail'],
  ['recovery', 'Récupération'], ['cooldown', 'Retour au calme'],
];
const COND_OPTS: [BCond, string][] = [['time', 'Temps'], ['distance', 'Distance'], ['lap', 'Lap']];
const TARGET_OPTS: [BTarget, string][] = [['none', 'Ressenti'], ['pace', 'Allure'], ['hr', 'FC']];

function newStep(over?: Partial<BStep>): BStep {
  return {
    type: 'work', condition: 'time', minutes: 10, distance_m: 1000,
    zone: 2, target: 'none', pace_low: 300, pace_high: 320, ...over,
  };
}

function stepMinutes(s: BStep): number {
  if (s.condition === 'distance') return (s.distance_m / 1000) * NOMINAL_PACE[s.zone] / 60;
  if (s.condition === 'lap') return LAP_DEFAULT[s.type];
  return s.minutes;
}

function estimateBuilder(items: BItem[]): { minutes: number; trimp: number } {
  let minutes = 0;
  let trimp = 0;
  const acc = (s: BStep, mult: number) => {
    const m = stepMinutes(s) * mult;
    minutes += m;
    trimp += m * (ZONE_TRIMP[s.zone] ?? 1.2);
  };
  for (const it of items) {
    if (it.kind === 'repeat') (it.steps ?? []).forEach((s) => acc(s, it.times ?? 1));
    else if (it.step) acc(it.step, 1);
  }
  return { minutes: Math.round(minutes), trimp: Math.round(trimp) };
}

function stepToPayload(s: BStep) {
  return {
    kind: 'step', type: s.type, condition: s.condition,
    minutes: s.minutes, distance_m: s.distance_m, zone: s.zone,
    target: s.target, pace_low: s.pace_low, pace_high: s.pace_high,
  };
}

function builderToPayload(title: string, items: BItem[]) {
  return {
    title,
    steps: items.map((it) =>
      it.kind === 'repeat'
        ? { kind: 'repeat', times: it.times, steps: (it.steps ?? []).map(stepToPayload) }
        : stepToPayload(it.step as BStep)
    ),
  };
}

/** Éditeur d'un bloc : type, condition (temps/distance/lap), zone, cible unique. */
function StepEditor({
  s, onChange, onRemove,
}: {
  s: BStep;
  onChange: (n: BStep) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={s.type} onChange={(e) => onChange({ ...s, type: e.target.value as BType })} className={INPUT_CLS}>
        {TYPE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <select value={s.condition} onChange={(e) => onChange({ ...s, condition: e.target.value as BCond })} className={INPUT_CLS}>
        {COND_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {s.condition === 'time' && (
        <><input type="number" min={1} max={180} value={s.minutes}
                 onChange={(e) => onChange({ ...s, minutes: Number(e.target.value) })}
                 className={`${INPUT_CLS} w-16`} /><span className="text-[10px] text-ats-gray">min</span></>
      )}
      {s.condition === 'distance' && (
        <><input type="number" min={100} max={100000} step={100} value={s.distance_m}
                 onChange={(e) => onChange({ ...s, distance_m: Number(e.target.value) })}
                 className={`${INPUT_CLS} w-20`} /><span className="text-[10px] text-ats-gray">m</span></>
      )}
      {s.condition === 'lap' && <span className="text-[10px] text-ats-gray">fin manuelle</span>}
      <select value={s.zone} onChange={(e) => onChange({ ...s, zone: Number(e.target.value) })} className={INPUT_CLS}>
        {ZONES.map((z) => <option key={z} value={z}>Z{z}</option>)}
      </select>
      <select value={s.target} onChange={(e) => onChange({ ...s, target: e.target.value as BTarget })} className={INPUT_CLS}>
        {TARGET_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {s.target === 'pace' && (
        <><input type="number" min={120} max={600} value={s.pace_low} title="allure basse (s/km)"
                 onChange={(e) => onChange({ ...s, pace_low: Number(e.target.value) })}
                 className={`${INPUT_CLS} w-16`} /><span className="text-[10px] text-ats-gray">–</span>
          <input type="number" min={120} max={600} value={s.pace_high} title="allure haute (s/km)"
                 onChange={(e) => onChange({ ...s, pace_high: Number(e.target.value) })}
                 className={`${INPUT_CLS} w-16`} /><span className="text-[10px] text-ats-gray">s/km</span></>
      )}
      {onRemove && (
        <button type="button" aria-label="Supprimer le bloc" onClick={onRemove}
                className="ml-auto text-ats-gray hover:text-ats-red"><X className="h-3.5 w-3.5" /></button>
      )}
    </div>
  );
}

/** Éditeur d'étapes du constructeur (partagé entre création et personnalisation). */
function BuilderFields({
  bTitle,
  setBTitle,
  bItems,
  setBItems,
}: {
  bTitle: string;
  setBTitle: (v: string) => void;
  bItems: BItem[];
  setBItems: (v: BItem[]) => void;
}) {
  const est = estimateBuilder(bItems);
  const removeItem = (i: number) => setBItems(bItems.filter((_, j) => j !== i));
  const setStep = (i: number, s: BStep) => {
    const next = [...bItems];
    next[i] = { ...next[i], step: s };
    setBItems(next);
  };
  const setInner = (i: number, k: number, s: BStep) => {
    const next = [...bItems];
    const inner = [...(next[i].steps ?? [])];
    inner[k] = s;
    next[i] = { ...next[i], steps: inner };
    setBItems(next);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-ats-muted">
          Titre
          <input value={bTitle} onChange={(e) => setBTitle(e.target.value)}
                 className={`${INPUT_CLS} mt-1 block w-48`} />
        </label>
        <span className="metric text-[11px] text-ats-muted">
          Estimation : {est.minutes} min · TRIMP {est.trimp}
        </span>
      </div>

      <div className="space-y-2">
        {bItems.map((it, i) => (
          <div key={i} className="rounded-lg border border-white/10 p-2.5">
            {it.kind === 'step' && it.step ? (
              <StepEditor s={it.step} onChange={(s) => setStep(i, s)} onRemove={() => removeItem(i)} />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ats-violet">
                    Bloc répété
                  </span>
                  <input
                    type="number" min={2} max={30} value={it.times ?? 2}
                    onChange={(e) => {
                      const next = [...bItems];
                      next[i] = { ...it, times: Number(e.target.value) };
                      setBItems(next);
                    }}
                    className={`${INPUT_CLS} w-16`}
                  />
                  <span className="text-[10px] text-ats-gray">fois</span>
                  <button type="button" aria-label="Supprimer le bloc"
                          onClick={() => removeItem(i)}
                          className="ml-auto text-ats-gray hover:text-ats-red">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {(it.steps ?? []).map((s, k) => (
                  <div key={k} className="ml-4">
                    <StepEditor
                      s={s}
                      onChange={(ns) => setInner(i, k, ns)}
                      onRemove={(it.steps?.length ?? 0) > 1
                        ? () => {
                            const next = [...bItems];
                            next[i] = { ...it, steps: (it.steps ?? []).filter((_, j) => j !== k) };
                            setBItems(next);
                          }
                        : undefined}
                    />
                  </div>
                ))}
                <button type="button"
                        onClick={() => {
                          const next = [...bItems];
                          next[i] = { ...it, steps: [...(it.steps ?? []), newStep({ type: 'work', minutes: 2, zone: 4 })] };
                          setBItems(next);
                        }}
                        className="ml-4 text-[10px] text-ats-muted hover:text-ats-text">
                  + bloc dans la répétition
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button"
                onClick={() => setBItems([...bItems, { kind: 'step', step: newStep() }])}
                className="rounded-lg bg-ats-bg2 px-3 py-1.5 text-[11px] text-ats-muted hover:text-ats-text">
          + Bloc
        </button>
        <button type="button"
                onClick={() => setBItems([...bItems, { kind: 'repeat', times: 4, steps: [newStep({ type: 'work', minutes: 2, zone: 4 }), newStep({ type: 'recovery', minutes: 1, zone: 1 })] }])}
                className="rounded-lg bg-ats-bg2 px-3 py-1.5 text-[11px] text-ats-violet hover:text-ats-text">
          + Bloc répété
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ utils
const dayMs = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * dayMs);
const monday = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

function range(view: View, anchor: Date): { start: Date; end: Date } {
  if (view === '1j') return { start: anchor, end: anchor };
  if (view === '3j') return { start: anchor, end: addDays(anchor, 2) };
  if (view === '1s') {
    const m = monday(anchor);
    return { start: m, end: addDays(m, 6) };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { start: monday(first), end: addDays(monday(last), 6) };
}

function rangeLabel(view: View, anchor: Date): string {
  const { start, end } = range(view, anchor);
  if (view === '1j')
    return anchor.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  if (view === '1m')
    return anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

// ------------------------------------------------------------- composant
export default function CalendarView({
  calendarLinked,
  templates,
  library = [],
}: {
  calendarLinked: boolean;
  templates: WorkoutTemplate[];
  library?: LibraryItem[];
}) {
  const [view, setView] = useState<View>('1s');
  const [anchor, setAnchor] = useState(() => new Date());
  const [sessions, setSessions] = useState<CalSession[]>([]);
  const [editing, setEditing] = useState<Editing>(null);
  const [editCustom, setEditCustom] = useState(false);
  const [addMode, setAddMode] = useState<'simple' | 'template' | 'builder'>('simple');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [bTitle, setBTitle] = useState('Ma séance');
  const [bItems, setBItems] = useState<BItem[]>([
    { kind: 'step', step: newStep({ type: 'warmup', minutes: 15, zone: 2 }) },
    {
      kind: 'repeat',
      times: 6,
      steps: [
        newStep({ type: 'work', condition: 'distance', distance_m: 1000, zone: 5, target: 'pace', pace_low: 240, pace_high: 250 }),
        newStep({ type: 'recovery', condition: 'lap', zone: 1 }),
      ],
    },
    { kind: 'step', step: newStep({ type: 'cooldown', minutes: 10, zone: 1 }) },
  ]);
  const [pending, startTransition] = useTransition();
  const [refresh, setRefresh] = useState(0);

  const today = iso(new Date());
  const { start, end } = useMemo(() => range(view, anchor), [view, anchor]);

  // Mobile : la vue 3 jours est plus lisible par défaut qu'une semaine complète
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setView('3j');
    }
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase
      .from('training_sessions')
      .select(
        'id,scheduled_date,scheduled_time,session_type,title,duration_planned_minutes,intensity_target_trimp,status'
      )
      .gte('scheduled_date', iso(start))
      .lte('scheduled_date', iso(end))
      .order('scheduled_date')
      .then(({ data }) => setSessions((data as CalSession[]) ?? []));
  }, [start.getTime(), end.getTime(), refresh]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalSession[]>();
    for (const s of sessions) {
      const list = m.get(s.scheduled_date) ?? [];
      list.push(s);
      m.set(s.scheduled_date, list);
    }
    return m;
  }, [sessions]);

  const submit = useCallback(
    (action: (fd: FormData) => Promise<void>, fd: FormData) => {
      startTransition(async () => {
        await action(fd);
        setEditing(null);
        setRefresh((r) => r + 1);
      });
    },
    []
  );

  function shift(dir: 1 | -1) {
    if (view === '1j') setAnchor((a) => addDays(a, dir));
    else if (view === '3j') setAnchor((a) => addDays(a, 3 * dir));
    else if (view === '1s') setAnchor((a) => addDays(a, 7 * dir));
    else setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1));
  }

  const days: Date[] = useMemo(() => {
    const out: Date[] = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) out.push(new Date(d));
    return out;
  }, [start.getTime(), end.getTime()]);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  // ----------------------------------------------------------- rendu chip
  function Chip({ s, detailed }: { s: CalSession; detailed?: boolean }) {
    const color = TYPE_COLOR[s.session_type] ?? '#94A3B8';
    const done = s.status === 'COMPLETED';
    const missed = s.status === 'MISSED';
    return (
      <button
        onClick={() => {
          setEditCustom(false);
          setEditing({ mode: 'edit', session: s });
        }}
        className="block w-full rounded-md px-1.5 py-1 text-left transition-transform hover:scale-[1.02]"
        style={{
          background: `${color}14`,
          borderLeft: `2px solid ${color}`,
          opacity: missed ? 0.4 : 1,
        }}
        title="Modifier cette séance"
      >
        <p
          className={`truncate font-medium ${detailed ? 'text-xs' : 'text-[9px]'}`}
          style={{ color }}
        >
          {s.title ?? TYPE_SHORT[s.session_type] ?? s.session_type}
          {done && ' ✓'}
          {missed && ' ✕'}
        </p>
        <p className={`metric text-ats-muted ${detailed ? 'text-[11px]' : 'text-[9px]'}`}>
          {s.scheduled_time ? `${s.scheduled_time.slice(0, 5).replace(':', 'h')} · ` : ''}
          {fmtDurationShort(s.duration_planned_minutes)} · TRIMP {s.intensity_target_trimp}
        </p>
      </button>
    );
  }

  function AddButton({ date }: { date: string }) {
    return (
      <button
        onClick={() => setEditing({ mode: 'add', date })}
        className="mx-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] text-ats-gray transition-colors hover:text-ats-muted"
      >
        <Plus className="h-3 w-3" /> ajouter
      </button>
    );
  }

  return (
    <div>
      {/* ------------------------------------------------ barre d'outils */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} aria-label="Précédent"
                  className="rounded-lg p-1 text-ats-muted hover:bg-ats-card2">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => shift(1)} aria-label="Suivant"
                  className="rounded-lg p-1 text-ats-muted hover:bg-ats-card2">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => setAnchor(new Date())}
                  className="rounded-lg px-2 py-1 text-[11px] text-ats-muted hover:bg-ats-card2">
            Aujourd&apos;hui
          </button>
          <span className="ml-1 text-sm font-medium capitalize">
            {rangeLabel(view, anchor)}
          </span>
        </div>
        <div className="flex rounded-lg bg-ats-bg2 p-0.5">
          {(['1j', '3j', '1s', '1m'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
                view === v ? 'bg-ats-card text-ats-text' : 'text-ats-muted hover:text-ats-text'
              }`}
            >
              {{ '1j': '1 jour', '3j': '3 jours', '1s': 'Semaine', '1m': 'Mois' }[v]}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------- grilles */}
      {view === '1m' ? (
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[540px] grid-cols-7 gap-1">
            {['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((d) => (
              <p key={d} className="pb-1 text-center text-[10px] uppercase text-ats-gray">{d}</p>
            ))}
            {days.map((d) => {
              const k = iso(d);
              const inMonth = d.getMonth() === anchor.getMonth();
              return (
                <div
                  key={k}
                  className={`card-2 min-h-[86px] p-1.5 ${k === today ? 'ring-1 ring-ats-green/60' : ''} ${
                    inMonth ? '' : 'opacity-40'
                  }`}
                >
                  <p className="metric text-right text-[10px] text-ats-muted">{d.getDate()}</p>
                  <div className="mt-1 space-y-1">
                    {(byDay.get(k) ?? []).slice(0, 2).map((s) => <Chip key={s.id} s={s} />)}
                    {(byDay.get(k)?.length ?? 0) > 2 && (
                      <p className="text-center text-[9px] text-ats-gray">
                        +{(byDay.get(k)?.length ?? 0) - 2}
                      </p>
                    )}
                    {(byDay.get(k)?.length ?? 0) === 0 && inMonth && <AddButton date={k} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-1">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
            minWidth: days.length === 7 ? '560px' : undefined,
          }}
        >
          {days.map((d) => {
            const k = iso(d);
            const detailed = view !== '1s';
            return (
              <div
                key={k}
                className={`card-2 p-2.5 ${detailed ? 'min-h-[180px]' : 'min-h-[120px]'} ${
                  k === today ? 'ring-1 ring-ats-green/60' : ''
                }`}
              >
                <p className={`text-center text-[10px] font-medium uppercase ${
                  k === today ? 'text-ats-green' : 'text-ats-muted'
                }`}>
                  {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </p>
                <p className={`metric text-center text-sm ${
                  k === today ? 'font-semibold text-ats-text' : 'text-ats-muted'
                }`}>
                  {d.getDate()}
                </p>
                <div className="mt-2 space-y-1.5">
                  {(byDay.get(k) ?? []).map((s) => (
                    <Chip key={s.id} s={s} detailed={detailed} />
                  ))}
                  {(byDay.get(k)?.length ?? 0) === 0 && (
                    <p className="text-center text-[9px] text-ats-gray">repos</p>
                  )}
                  <AddButton date={k} />
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* ------------------------------------------------------- éditeur */}
      {editing && (
        <div className="card-2 mt-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ats-muted">
              {editing.mode === 'edit' ? 'Modifier la séance' : 'Ajouter une séance'}
            </p>
            <button onClick={() => setEditing(null)} aria-label="Fermer">
              <X className="h-4 w-4 text-ats-gray hover:text-ats-muted" />
            </button>
          </div>

          {editing.mode === 'edit' ? (
            editCustom ? (
              <form
                action={(fd) => submit(updateSession, fd)}
                className="mt-3 space-y-3"
              >
                <input type="hidden" name="session_id" value={editing.session.id} />
                <input type="hidden" name="structured_workout"
                       value={JSON.stringify(builderToPayload(bTitle, bItems))} />
                <BuilderFields bTitle={bTitle} setBTitle={setBTitle}
                               bItems={bItems} setBItems={setBItems} />
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => setEditCustom(false)}
                          className="text-[11px] text-ats-muted hover:text-ats-text">
                    ← Retour à l&apos;édition simple
                  </button>
                  <button disabled={pending}
                          className="ml-auto rounded-lg bg-ats-green px-4 py-2 text-xs font-semibold text-ats-bg disabled:opacity-50">
                    {pending ? '…' : 'Remplacer le contenu de la séance'}
                  </button>
                </div>
              </form>
            ) : (
            <form
              action={(fd) => submit(updateSession, fd)}
              className="mt-3 flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="session_id" value={editing.session.id} />
              <label className="text-xs text-ats-muted">
                Jour
                <input name="new_date" type="date" required
                       defaultValue={editing.session.scheduled_date}
                       className={`${INPUT_CLS} mt-1 block`} />
              </label>
              <label className="text-xs text-ats-muted">
                Heure
                <input name="new_time" type="time"
                       defaultValue={editing.session.scheduled_time?.slice(0, 5) ?? '18:00'}
                       className={`${INPUT_CLS} mt-1 block`} />
              </label>
              <label className="text-xs text-ats-muted">
                Type
                <select name="session_type" defaultValue={editing.session.session_type}
                        className={`${INPUT_CLS} mt-1 block`}>
                  <option value="ENDURANCE">Endurance</option>
                  <option value="INTERVAL">Fractionné</option>
                  <option value="TEMPO">Tempo / Seuil</option>
                  <option value="RECOVERY">Récupération</option>
                </select>
              </label>
              <label className="text-xs text-ats-muted">
                Durée (min)
                <input name="duration_minutes" type="number" min={10} max={360}
                       defaultValue={editing.session.duration_planned_minutes}
                       className={`${INPUT_CLS} mt-1 block w-20`} />
              </label>
              <label className="text-xs text-ats-muted">
                Titre (optionnel)
                <input name="title" defaultValue={editing.session.title ?? ''}
                       placeholder="Ex : Sortie côte"
                       className={`${INPUT_CLS} mt-1 block w-40`} />
              </label>
              <button disabled={pending}
                      className="rounded-lg bg-ats-green px-4 py-2 text-xs font-semibold text-ats-bg disabled:opacity-50">
                {pending ? '…' : 'Enregistrer'}
              </button>
              <button type="button" onClick={() => setEditCustom(true)}
                      className="rounded-lg bg-ats-violet/10 px-3 py-2 text-xs font-semibold text-ats-violet hover:bg-ats-violet/20">
                Personnaliser (constructeur)
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set('session_id', editing.session.id);
                  fd.set('done', editing.session.status === 'COMPLETED' ? 'false' : 'true');
                  submit(completeSession, fd);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                  editing.session.status === 'COMPLETED'
                    ? 'border border-ats-green/40 bg-ats-green/10 text-ats-green hover:bg-ats-green/20'
                    : 'bg-ats-green px-4 text-ats-bg hover:brightness-110'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {editing.session.status === 'COMPLETED' ? 'Faite — annuler' : 'Marquer comme faite'}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set('session_id', editing.session.id);
                  submit(deleteSession, fd);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ats-red/10 px-3 py-2 text-xs font-semibold text-ats-red hover:bg-ats-red/20 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
              <p className="w-full text-[10px] text-ats-gray">
                Changer le type ou la durée recalcule le TRIMP cible. Google Calendar
                est mis à jour automatiquement si la séance y est publiée.
              </p>
            </form>
            )
          ) : (
            <form
              action={(fd) => submit(createSession, fd)}
              className="mt-3 space-y-3"
            >
              <input type="hidden" name="scheduled_date" value={editing.date} />
              <div className="flex flex-wrap gap-2">
                {([
                  ['simple', 'Séance simple'],
                  ['template', 'Depuis un modèle'],
                  ['builder', 'Constructeur'],
                ] as const).map(([m, label]) => (
                  <button key={m} type="button" onClick={() => setAddMode(m)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${
                            addMode === m ? 'bg-ats-card text-ats-text' : 'bg-ats-bg2 text-ats-muted'
                          }`}>
                    {label}
                  </button>
                ))}
              </div>

              {library.length > 0 && (
                <div className="mb-3 rounded-lg border border-white/10 p-2.5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ats-muted">
                    Bibliothèque de test
                  </p>
                  <ul className="space-y-1.5">
                    {library.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="min-w-0 truncate">
                          <span className="text-ats-text/90">{t.title}</span>
                          <span className="metric ml-2 text-[11px] text-ats-gray">
                            {t.duration_minutes}′ · {t.target_trimp} TRIMP
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <button type="button" disabled={pending}
                                  onClick={() => {
                                    const fd = new FormData();
                                    fd.set('template_id', t.id);
                                    fd.set('scheduled_date', editing.date);
                                    fd.set('scheduled_time', '18:00');
                                    submit(scheduleFromLibrary, fd);
                                  }}
                                  className="rounded-md bg-ats-green/15 px-2.5 py-1 text-[11px] font-semibold text-ats-green hover:bg-ats-green/25 disabled:opacity-50">
                            Planifier ici
                          </button>
                          <button type="button" aria-label="Supprimer de la bibliothèque" disabled={pending}
                                  onClick={() => {
                                    const fd = new FormData();
                                    fd.set('template_id', t.id);
                                    submit(deleteFromLibrary, fd);
                                  }}
                                  className="text-ats-gray hover:text-ats-red disabled:opacity-50">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {addMode === 'builder' ? (
                <div className="space-y-3">
                  <input type="hidden" name="structured_workout"
                         value={JSON.stringify(builderToPayload(bTitle, bItems))} />
                  <BuilderFields bTitle={bTitle} setBTitle={setBTitle}
                                 bItems={bItems} setBItems={setBItems} />
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-xs text-ats-muted">
                      Heure
                      <input name="scheduled_time" type="time" defaultValue="18:00"
                             className={`${INPUT_CLS} mt-1 block`} />
                    </label>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const fd = new FormData();
                        fd.set('structured_workout', JSON.stringify(builderToPayload(bTitle, bItems)));
                        submit(saveToLibrary, fd);
                      }}
                      className="ml-auto rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-ats-text/90 hover:bg-white/5 disabled:opacity-50"
                    >
                      Enregistrer en bibliothèque
                    </button>
                    <button disabled={pending}
                            className="rounded-lg bg-ats-green px-4 py-2 text-xs font-semibold text-ats-bg disabled:opacity-50">
                      {pending ? '…' : 'Ajouter au plan'}
                    </button>
                  </div>
                </div>
              ) : addMode === 'template' && selectedTemplate ? (
                <div className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="template_id" value={templateId} />
                  <label className="text-xs text-ats-muted">
                    Modèle
                    <select value={templateId}
                            onChange={(e) => setTemplateId(e.target.value)}
                            className={`${INPUT_CLS} mt-1 block`}>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </label>
                  {selectedTemplate.params.map((p) => (
                    <label key={p.key} className="text-xs text-ats-muted">
                      {p.label}
                      <input name={`param_${p.key}`} type="number"
                             defaultValue={p.default} min={p.min} max={p.max}
                             step="any"
                             className={`${INPUT_CLS} mt-1 block w-24`} />
                    </label>
                  ))}
                  <label className="text-xs text-ats-muted">
                    Heure
                    <input name="scheduled_time" type="time" defaultValue="18:00"
                           className={`${INPUT_CLS} mt-1 block`} />
                  </label>
                  <button disabled={pending}
                          className="rounded-lg bg-ats-green px-4 py-2 text-xs font-semibold text-ats-bg disabled:opacity-50">
                    {pending ? '…' : 'Ajouter'}
                  </button>
                  <p className="w-full text-[10px] text-ats-gray">
                    {selectedTemplate.description}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-xs text-ats-muted">
                    Type
                    <select name="session_type" className={`${INPUT_CLS} mt-1 block`}>
                      <option value="ENDURANCE">Endurance</option>
                      <option value="INTERVAL">Fractionné</option>
                      <option value="TEMPO">Tempo / Seuil</option>
                      <option value="RECOVERY">Récupération</option>
                    </select>
                  </label>
                  <label className="text-xs text-ats-muted">
                    Durée (min)
                    <input name="duration_minutes" type="number" min={10} max={360}
                           defaultValue={60} required
                           className={`${INPUT_CLS} mt-1 block w-20`} />
                  </label>
                  <label className="text-xs text-ats-muted">
                    Heure
                    <input name="scheduled_time" type="time" defaultValue="18:00"
                           className={`${INPUT_CLS} mt-1 block`} />
                  </label>
                  <button disabled={pending}
                          className="rounded-lg bg-ats-green px-4 py-2 text-xs font-semibold text-ats-bg disabled:opacity-50">
                    {pending ? '…' : 'Ajouter'}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* ------------------------------------------ légende + calendrier */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-ats-muted">
        <div className="flex items-center gap-4">
          {Object.entries(TYPE_COLOR).map(([t, c]) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
              {TYPE_SHORT[t]}
            </span>
          ))}
        </div>
        {calendarLinked ? (
          <div className="flex items-center gap-3">
            <form action={publishPlanToCalendar}>
              <button className="inline-flex items-center gap-1.5 text-ats-muted transition-colors hover:text-ats-text">
                <CalendarCheck2 className="h-3.5 w-3.5 text-ats-green" />
                Synchroniser Google Calendar
              </button>
            </form>
            <form action={purgeCalendar}>
              <button
                className="inline-flex items-center gap-1.5 text-ats-muted transition-colors hover:text-ats-red"
                title="Supprime tous les événements Trena (doublons inclus) du calendrier"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Nettoyer les doublons
              </button>
            </form>
            <form action={unlinkGoogleCalendar}>
              <button className="text-ats-gray transition-colors hover:text-ats-muted">
                Délier
              </button>
            </form>
          </div>
        ) : (
          <a href="/api/google/authorize"
             className="inline-flex items-center gap-1.5 transition-colors hover:text-ats-text">
            <CalendarPlus className="h-3.5 w-3.5" />
            Lier Google Calendar
          </a>
        )}
      </div>
    </div>
  );
}
