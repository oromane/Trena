'use client';

/**
 * Trajectoire Banister — passé + projection jusqu'à l'objectif.
 * La zone après « aujourd'hui » est la simulation du plan restant.
 */
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardSummary } from '@/lib/engine';

export default function TrajectoryChart({
  trajectory,
  targetDate,
}: {
  trajectory: DashboardSummary['trajectory'];
  targetDate: string | null;
}) {
  const start = new Date(trajectory.start_date);
  const data = trajectory.form.map((_, i) => {
    const d = new Date(start.getTime() + i * 86400000);
    return {
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      fitness: trajectory.fitness[i],
      fatigue: trajectory.fatigue[i],
      form: trajectory.form[i],
    };
  });
  const todayLabel = data[trajectory.today_index]?.label;

  const ti = trajectory.today_index;
  const curFit = trajectory.fitness[ti] ?? 0;
  const curFat = trajectory.fatigue[ti] ?? 0;
  const curForm = trajectory.form[ti] ?? 0;
  const raceForm = data.length ? data[data.length - 1].form : 0;
  const formTone =
    curForm > 5
      ? { label: 'Frais (affûté)', color: '#2E8B57' }
      : curForm < -10
        ? { label: 'Charge lourde', color: '#FF4500' }
        : { label: 'Équilibré', color: '#BED0D0' };

  if (data.every((d) => d.fitness === 0)) {
    return (
      <p className="px-1 py-8 text-sm text-ats-muted">
        La trajectoire apparaîtra dès tes premières séances réalisées (TRIMP saisi).
        La partie droite projettera alors l&apos;effet du plan jusqu&apos;à l&apos;objectif.
      </p>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ats-muted">Forme (TSB)</p>
          <p className="metric text-2xl font-semibold leading-none">
            {curForm > 0 ? '+' : ''}
            {Math.round(curForm)}
            <span className="ml-2 text-xs font-normal" style={{ color: formTone.color }}>
              {formTone.label}
            </span>
          </p>
        </div>
        <div className="flex gap-4 text-[11px]">
          <span>
            <span className="text-ats-muted">Fitness </span>
            <span className="metric font-medium" style={{ color: '#2E8B57' }}>{Math.round(curFit)}</span>
          </span>
          <span>
            <span className="text-ats-muted">Fatigue </span>
            <span className="metric font-medium" style={{ color: '#FF4500' }}>{Math.round(curFat)}</span>
          </span>
        </div>
        {targetDate && (
          <span className="ml-auto text-[11px] text-ats-gray">
            Forme projetée jour J :{' '}
            <span className="metric font-medium text-ats-text">
              {raceForm > 0 ? '+' : ''}
              {Math.round(raceForm)}
            </span>
          </span>
        )}
      </div>
      <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="gFit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2E8B57" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2E8B57" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gForm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#CBD5E1" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#CBD5E1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#436D6D" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94A3B8', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#436D6D' }}
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: '#94A3B8', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#385E5E',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: '#94A3B8' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} iconType="plainline" />
          <Area
            type="monotone"
            dataKey="fitness"
            name="Fitness"
            stroke="#2E8B57"
            strokeWidth={1.8}
            fill="url(#gFit)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="fatigue"
            name="Fatigue"
            stroke="#FF4500"
            strokeWidth={1.4}
            fill="transparent"
            strokeDasharray="4 3"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="form"
            name="Forme"
            stroke="#CBD5E1"
            strokeWidth={2.2}
            fill="url(#gForm)"
            dot={false}
          />
          <ReferenceLine
            y={0}
            stroke="#94A3B8"
            strokeDasharray="2 4"
            strokeOpacity={0.4}
            label={{ value: 'frais', fill: '#94A3B8', fontSize: 9, position: 'insideBottomRight' }}
          />
          {todayLabel && (
            <ReferenceLine
              x={todayLabel}
              stroke="#F8FAFC"
              strokeDasharray="2 4"
              strokeOpacity={0.5}
              label={{
                value: "Aujourd'hui",
                fill: '#94A3B8',
                fontSize: 10,
                position: 'insideTopLeft',
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      </div>
      {targetDate && (
        <p className="mt-1 text-right text-[10px] text-ats-gray">
          Projection jusqu&apos;au{' '}
          {new Date(targetDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}{' '}
          : simulation du plan restant.
        </p>
      )}
    </div>
  );
}
