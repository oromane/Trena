/**
 * Historique — timeline des dernières séances, prévu vs réalisé.
 */
import { History } from 'lucide-react';
import type { DashboardSummary } from '@/lib/engine';
import { fmtDurationShort } from '@/lib/format';

const TYPE_COLOR: Record<string, string> = {
  INTERVAL: '#FF4500',
  TEMPO: '#7C6FA8',
  ENDURANCE: '#4F86A8',
  RECOVERY: '#2E8B57',
};

const TYPE_LABEL: Record<string, string> = {
  INTERVAL: 'Fractionné',
  TEMPO: 'Tempo / Seuil',
  ENDURANCE: 'Endurance',
  RECOVERY: 'Récupération',
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  COMPLETED: { text: 'Réalisée', cls: 'text-ats-green' },
  PLANNED: { text: 'À venir', cls: 'text-ats-muted' },
  MODIFIED: { text: 'Adaptée', cls: 'text-ats-blue' },
  MISSED: { text: 'Manquée', cls: 'text-ats-red' },
};

function relativeDay(dateStr: string, today: string): string {
  const diff = Math.round(
    (new Date(today).getTime() - new Date(dateStr).getTime()) / 86400000
  );
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff < 7) return `Il y a ${diff} jours`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function StatCell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl bg-ats-card2 p-3">
      <p className="text-[10px] uppercase tracking-wider text-ats-muted">{label}</p>
      <p className="metric mt-1 text-lg font-semibold">
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-ats-muted">{unit}</span>}
      </p>
    </div>
  );
}

export default function HistoryTimeline({
  history,
  today,
}: {
  history: DashboardSummary['history'];
  today: string;
}) {
  const completed = history.filter((s) => s.status === 'COMPLETED');
  const km = completed.reduce(
    (a, s) => a + (s.activity_metrics?.distance_m ?? s.distance_m ?? 0) / 1000,
    0
  );
  const trimp = completed.reduce((a, s) => a + (s.trimp_actual ?? 0), 0);
  const minutes = completed.reduce((a, s) => a + (s.duration_actual_minutes ?? 0), 0);
  const withHr = completed.filter((s) => s.comparison?.avg_hr || s.activity_metrics?.avg_hr);
  const avgHr = withHr.length
    ? Math.round(
        withHr.reduce((a, s) => a + (s.comparison?.avg_hr ?? s.activity_metrics?.avg_hr ?? 0), 0) /
          withHr.length
      )
    : null;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 text-ats-muted">
        <History className="h-4 w-4" />
        <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Historique</span>
      </div>

      {completed.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCell label="Réalisées" value={String(completed.length)} />
          <StatCell label="Distance" value={km.toFixed(1)} unit="km" />
          <StatCell
            label="Durée"
            value={minutes >= 60 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}` : String(minutes)}
            unit={minutes >= 60 ? '' : 'min'}
          />
          <StatCell label="Charge" value={String(trimp)} unit="TRIMP" />
        </div>
      )}
      {avgHr && (
        <p className="metric mt-2 text-[11px] text-ats-gray">
          FC moyenne sur la période : {avgHr} bpm · {completed.length} séance(s)
        </p>
      )}

      {history.length === 0 ? (
        <p className="mt-4 text-sm text-ats-muted">
          Tes séances passées apparaîtront ici, avec l&apos;écart prévu / réalisé.
        </p>
      ) : (
        <ol className="mt-4 space-y-0">
          {history.map((s, i) => {
            const color = TYPE_COLOR[s.session_type] ?? '#94A3B8';
            const status = STATUS_LABEL[s.status] ?? STATUS_LABEL.PLANNED;
            const trimpDelta =
              s.trimp_actual != null
                ? s.trimp_actual - s.intensity_target_trimp
                : null;
            return (
              <li key={s.id} className="relative flex gap-4 pb-5 last:pb-0">
                {/* rail */}
                {i < history.length - 1 && (
                  <span className="absolute left-[5px] top-4 h-full w-px bg-ats-card2" />
                )}
                <span
                  className="relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-ats-card"
                  style={{ background: color }}
                />
                <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {TYPE_LABEL[s.session_type] ?? s.session_type}
                      <span className={`ml-2 text-[10px] ${status.cls}`}>{status.text}</span>
                    </p>
                    <p className="metric mt-0.5 text-[11px] text-ats-muted">
                      {relativeDay(s.scheduled_date, today)} · prévu{' '}
                      {fmtDurationShort(s.duration_planned_minutes)} / {s.intensity_target_trimp} TRIMP
                      {s.status === 'COMPLETED' && s.duration_actual_minutes != null && (
                        <>
                          {' '}
                          → réalisé {fmtDurationShort(s.duration_actual_minutes)} / {s.trimp_actual} TRIMP
                        </>
                      )}
                    </p>
                    {s.comparison?.actual_pace && (
                      <p className="metric mt-0.5 text-[11px] text-ats-muted">
                        allure {s.comparison.actual_pace}
                        {s.comparison.target_pace && (
                          <>
                            {' '}
                            <span className="text-ats-gray">
                              (cible {s.comparison.target_pace}
                              {s.comparison.pace_delta_s != null && (
                                <>
                                  ,{' '}
                                  <span
                                    className={
                                      Math.abs(s.comparison.pace_delta_s) <= 10
                                        ? 'text-ats-green'
                                        : s.comparison.pace_delta_s > 0
                                          ? 'text-ats-orange'
                                          : 'text-ats-blue'
                                    }
                                  >
                                    {s.comparison.pace_delta_s > 0 ? '+' : ''}
                                    {Math.round(s.comparison.pace_delta_s)} s/km
                                  </span>
                                </>
                              )}
                              )
                            </span>
                          </>
                        )}
                        {s.comparison.avg_hr && <> · FC moy {s.comparison.avg_hr} bpm</>}
                      </p>
                    )}
                    {s.activity_metrics && (() => {
                      const m = s.activity_metrics;
                      const parts: string[] = [];
                      if (m.distance_m) parts.push(`${(m.distance_m / 1000).toFixed(2)} km`);
                      if (m.avg_pace_s_per_km)
                        parts.push(
                          `${Math.floor(m.avg_pace_s_per_km / 60)}:${String(m.avg_pace_s_per_km % 60).padStart(2, '0')}/km`
                        );
                      if (m.elevation_gain_m) parts.push(`D+${m.elevation_gain_m} m`);
                      if (m.avg_cadence_spm) parts.push(`${m.avg_cadence_spm} spm`);
                      if (m.calories) parts.push(`${m.calories} kcal`);
                      if (m.training_effect_aerobic) parts.push(`TE ${m.training_effect_aerobic}`);
                      return parts.length ? (
                        <p className="metric mt-0.5 text-[11px] text-ats-gray">{parts.join(' · ')}</p>
                      ) : null;
                    })()}
                  </div>
                  {trimpDelta != null && (
                    <span
                      className={`metric shrink-0 text-[11px] font-medium ${
                        Math.abs(trimpDelta) <= 10
                          ? 'text-ats-green'
                          : trimpDelta > 0
                            ? 'text-ats-orange'
                            : 'text-ats-muted'
                      }`}
                    >
                      {trimpDelta > 0 ? '+' : ''}
                      {trimpDelta}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
