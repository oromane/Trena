'use client';

/**
 * Charge hebdomadaire — TRIMP prévu vs réalisé, semaine par semaine.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardSummary } from '@/lib/engine';

export default function LoadChart({
  weeklyLoad,
}: {
  weeklyLoad: DashboardSummary['weekly_load'];
}) {
  if (weeklyLoad.length === 0) {
    return (
      <p className="px-1 py-8 text-sm text-ats-muted">
        La charge hebdomadaire s&apos;affichera dès que le plan est généré.
      </p>
    );
  }

  const data = weeklyLoad.map((w) => ({
    week: new Date(w.week_start).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    }),
    prévu: w.planned_trimp,
    réalisé: w.actual_trimp,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={2}>
          <CartesianGrid stroke="#1A2238" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fill: '#94A3B8', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#1A2238' }}
          />
          <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{
              background: '#12192C',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: '#94A3B8' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
          <Bar dataKey="prévu" fill="#334155" radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Bar dataKey="réalisé" fill="#00E676" radius={[4, 4, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
