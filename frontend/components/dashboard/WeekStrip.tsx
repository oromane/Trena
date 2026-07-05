'use client';

/**
 * Semaine interactive : cliquer une séance ouvre l'éditeur (déplacer jour + heure,
 * supprimer) ; chaque jour permet d'ajouter une séance. La sync Google Calendar
 * vit sous la grille (publier / purger les doublons / lier).
 */
import { CalendarCheck2, CalendarPlus, Plus, Trash2, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import type { DashboardSummary } from '@/lib/engine';
import { fmtDurationShort } from '@/lib/format';
import {
  createSession,
  deleteSession,
  publishPlanToCalendar,
  purgeCalendar,
  rescheduleSession,
  unlinkGoogleCalendar,
} from '@/app/actions';

const TYPE_COLOR: Record<string, string> = {
  INTERVAL: '#F59E0B',
  TEMPO: '#8B5CF6',
  ENDURANCE: '#3B82F6',
  RECOVERY: '#00E676',
};

const TYPE_SHORT: Record<string, string> = {
  INTERVAL: 'Fractionné',
  TEMPO: 'Tempo',
  ENDURANCE: 'Endurance',
  RECOVERY: 'Récup',
};

const INPUT_CLS =
  'rounded-lg border border-white/10 bg-ats-bg2 px-2.5 py-1.5 text-xs outline-none focus:border-ats-green/50';

type Editing =
  | { mode: 'edit'; sessionId: string; date: string }
  | { mode: 'add'; date: string }
  | null;

export default function WeekStrip({
  week,
  calendarLinked,
}: {
  week: DashboardSummary['week'];
  calendarLinked: boolean;
}) {
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, startTransition] = useTransition();

  function submit(action: (fd: FormData) => Promise<void>, fd: FormData) {
    startTransition(async () => {
      await action(fd);
      setEditing(null);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {week.map((day) => {
          const d = new Date(day.date);
          return (
            <div
              key={day.date}
              className={`card-2 group/day min-h-[120px] p-2.5 ${
                day.is_today ? 'ring-1 ring-ats-green/60' : ''
              }`}
            >
              <p
                className={`text-center text-[10px] font-medium uppercase ${
                  day.is_today ? 'text-ats-green' : 'text-ats-muted'
                }`}
              >
                {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </p>
              <p
                className={`metric text-center text-sm ${
                  day.is_today ? 'font-semibold text-ats-text' : 'text-ats-muted'
                }`}
              >
                {d.getDate()}
              </p>
              <div className="mt-2 space-y-1.5">
                {day.sessions.map((s) => {
                  const color = TYPE_COLOR[s.session_type] ?? '#94A3B8';
                  const done = s.status === 'COMPLETED';
                  const missed = s.status === 'MISSED';
                  return (
                    <button
                      key={s.id}
                      onClick={() =>
                        setEditing({ mode: 'edit', sessionId: s.id, date: day.date })
                      }
                      className="block w-full rounded-md px-1.5 py-1 text-left transition-transform hover:scale-[1.03]"
                      style={{
                        background: `${color}14`,
                        borderLeft: `2px solid ${color}`,
                        opacity: missed ? 0.4 : 1,
                      }}
                      title="Modifier cette séance"
                    >
                      <p className="truncate text-[9px] font-medium" style={{ color }}>
                        {TYPE_SHORT[s.session_type] ?? s.session_type}
                        {done && ' ✓'}
                        {missed && ' ✕'}
                      </p>
                      <p className="metric text-[9px] text-ats-muted">
                        {fmtDurationShort(s.duration_minutes)} · {s.target_trimp}
                      </p>
                    </button>
                  );
                })}
                {day.sessions.length === 0 && (
                  <p className="text-center text-[9px] text-ats-gray">repos</p>
                )}
                <button
                  onClick={() => setEditing({ mode: 'add', date: day.date })}
                  className="mx-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] text-ats-gray opacity-0 transition-opacity hover:text-ats-muted group-hover/day:opacity-100"
                >
                  <Plus className="h-3 w-3" /> ajouter
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------ éditeur */}
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
            <form
              action={(fd) => submit(rescheduleSession, fd)}
              className="mt-3 flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="session_id" value={editing.sessionId} />
              <label className="text-xs text-ats-muted">
                Nouveau jour
                <input
                  name="new_date"
                  type="date"
                  defaultValue={editing.date}
                  required
                  className={`${INPUT_CLS} mt-1 block`}
                />
              </label>
              <label className="text-xs text-ats-muted">
                Heure
                <input
                  name="new_time"
                  type="time"
                  defaultValue="18:00"
                  className={`${INPUT_CLS} mt-1 block`}
                />
              </label>
              <button
                disabled={pending}
                className="rounded-lg bg-ats-green px-4 py-2 text-xs font-semibold text-ats-bg disabled:opacity-50"
              >
                {pending ? '…' : 'Déplacer'}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set('session_id', editing.sessionId);
                  submit(deleteSession, fd);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ats-red/10 px-3 py-2 text-xs font-semibold text-ats-red hover:bg-ats-red/20 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </button>
              <p className="w-full text-[10px] text-ats-gray">
                Si la séance est publiée dans Google Calendar, l&apos;événement est
                déplacé / supprimé automatiquement.
              </p>
            </form>
          ) : (
            <form
              action={(fd) => submit(createSession, fd)}
              className="mt-3 flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="scheduled_date" value={editing.date} />
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
                <input
                  name="duration_minutes"
                  type="number"
                  min={10}
                  max={360}
                  defaultValue={60}
                  required
                  className={`${INPUT_CLS} mt-1 block w-20`}
                />
              </label>
              <label className="text-xs text-ats-muted">
                Heure
                <input
                  name="scheduled_time"
                  type="time"
                  defaultValue="18:00"
                  className={`${INPUT_CLS} mt-1 block`}
                />
              </label>
              <button
                disabled={pending}
                className="rounded-lg bg-ats-green px-4 py-2 text-xs font-semibold text-ats-bg disabled:opacity-50"
              >
                {pending ? '…' : 'Ajouter'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ------------------------------------------------ légende + calendrier */}
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
          <a
            href="/api/google/authorize"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-ats-text"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Lier Google Calendar
          </a>
        )}
      </div>
    </div>
  );
}
