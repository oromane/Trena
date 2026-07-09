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

export default function HistoryTimeline({
  history,
  today,
}: {
  history: DashboardSummary['history'];
  today: string;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 text-ats-muted">
        <History className="h-4 w-4" />
        <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Historique</span>
      </div>

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
