/**
 * Semaine — 7 colonnes, aujourd'hui mis en avant, séances colorées par type.
 * La sync Google Calendar vit ici, discrète, sous la grille.
 */
import { CalendarCheck2, CalendarPlus } from 'lucide-react';
import type { DashboardSummary } from '@/lib/engine';
import { publishPlanToCalendar, unlinkGoogleCalendar } from '@/app/actions';

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

export default function WeekStrip({
  week,
  calendarLinked,
}: {
  week: DashboardSummary['week'];
  calendarLinked: boolean;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {week.map((day) => {
          const d = new Date(day.date);
          return (
            <div
              key={day.date}
              className={`card-2 min-h-[110px] p-2.5 ${
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
                {day.sessions.length === 0 ? (
                  <p className="text-center text-[9px] text-ats-gray">repos</p>
                ) : (
                  day.sessions.map((s) => {
                    const color = TYPE_COLOR[s.session_type] ?? '#94A3B8';
                    const done = s.status === 'COMPLETED';
                    const missed = s.status === 'MISSED';
                    return (
                      <div
                        key={s.id}
                        className="rounded-md px-1.5 py-1"
                        style={{
                          background: `${color}14`,
                          borderLeft: `2px solid ${color}`,
                          opacity: missed ? 0.4 : 1,
                        }}
                      >
                        <p className="truncate text-[9px] font-medium" style={{ color }}>
                          {TYPE_SHORT[s.session_type] ?? s.session_type}
                          {done && ' ✓'}
                          {missed && ' ✕'}
                        </p>
                        <p className="metric text-[9px] text-ats-muted">
                          {s.duration_minutes}′ · {s.target_trimp}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-ats-muted">
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
