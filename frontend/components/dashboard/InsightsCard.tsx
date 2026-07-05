/**
 * Analyse — le système explique ce qu'il voit et ce qu'il recommande.
 * v1 : moteur de règles déterministe (HRV, sommeil, rampe de charge, adhérence).
 */
import { AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import type { DashboardSummary } from '@/lib/engine';

const SEVERITY = {
  positive: { icon: CheckCircle2, color: '#00E676' },
  info: { icon: Info, color: '#3B82F6' },
  warning: { icon: AlertTriangle, color: '#F59E0B' },
} as const;

export default function InsightsCard({
  insights,
}: {
  insights: DashboardSummary['insights'];
}) {
  return (
    <div className="card relative overflow-hidden p-6">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-ats-violet to-transparent" />
      <div className="flex items-center gap-2 text-ats-muted">
        <Sparkles className="h-4 w-4 text-ats-violet" />
        <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Analyse</span>
      </div>

      {insights.length === 0 ? (
        <p className="mt-4 text-sm text-ats-muted">
          L&apos;analyse quotidienne démarre dès 14 jours de métriques : tendances HRV,
          sommeil, rampe de charge et recommandations chiffrées.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {insights.map((ins, i) => {
            const sev = SEVERITY[ins.severity] ?? SEVERITY.info;
            const Icon = sev.icon;
            return (
              <li key={i} className="flex gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: sev.color }} />
                <p className="text-[13px] leading-relaxed text-ats-text/85">{ins.text}</p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-5 border-t border-white/5 pt-3 text-[10px] text-ats-gray">
        Moteur d&apos;analyse déterministe — chaque conclusion est traçable à tes données.
      </p>
    </div>
  );
}
