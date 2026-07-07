'use client';

/**
 * Tendances 90 jours : métrique sélectionnable, données daily_metrics
 * + garmin_wellness (poids, pas, VO2max, Body Battery, calories...).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { createSupabaseBrowser } from '@/lib/supabase/client';

type Source = 'metrics' | 'wellness';

const METRICS: {
  key: string;
  label: string;
  unit: string;
  source: Source;
  color: string;
  transform?: (v: number) => number;
}[] = [
  { key: 'hrv_ms', label: 'HRV', unit: 'ms', source: 'metrics', color: '#00E676' },
  { key: 'resting_heart_rate', label: 'FC repos', unit: 'bpm', source: 'metrics', color: '#EF4444' },
  { key: 'sleep_minutes', label: 'Sommeil', unit: 'h', source: 'metrics', color: '#3B82F6', transform: (v) => Math.round((v / 60) * 10) / 10 },
  { key: 'weight_kg', label: 'Poids', unit: 'kg', source: 'wellness', color: '#8B5CF6' },
  { key: 'vo2max', label: 'VO2max', unit: '', source: 'wellness', color: '#F59E0B' },
  { key: 'steps', label: 'Pas', unit: '', source: 'wellness', color: '#00C853' },
  { key: 'body_battery_high', label: 'Body Battery (max)', unit: '', source: 'wellness', color: '#3B82F6' },
  { key: 'calories_total', label: 'Calories', unit: 'kcal', source: 'wellness', color: '#F59E0B' },
];

export default function TrendsChart() {
  const [selected, setSelected] = useState(METRICS[0]);
  const [metrics, setMetrics] = useState<Record<string, unknown>[]>([]);
  const [wellness, setWellness] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    supabase
      .from('daily_metrics')
      .select('recorded_date,hrv_ms,resting_heart_rate,sleep_minutes')
      .gte('recorded_date', since)
      .order('recorded_date')
      .then(({ data }) => setMetrics(data ?? []));
    supabase
      .from('garmin_wellness')
      .select('*')
      .gte('recorded_date', since)
      .order('recorded_date')
      .then(({ data }) => setWellness(data ?? []));
  }, []);

  const data = useMemo(() => {
    const rows = selected.source === 'metrics' ? metrics : wellness;
    return rows
      .filter((r) => r[selected.key] != null)
      .map((r) => ({
        date: String(r.recorded_date).slice(5),
        value: selected.transform
          ? selected.transform(Number(r[selected.key]))
          : Number(r[selected.key]),
      }));
  }, [selected, metrics, wellness]);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setSelected(m)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
              selected.key === m.key
                ? 'bg-ats-card2 text-ats-text'
                : 'text-ats-muted hover:text-ats-text'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {data.length < 2 ? (
        <p className="py-10 text-center text-sm text-ats-muted">
          Pas encore assez de données pour « {selected.label} ».
          {selected.source === 'wellness' &&
            ' Lance une synchronisation Garmin pour alimenter cette métrique.'}
        </p>
      ) : (
        <div className="mt-3 h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <defs>
                <linearGradient id="gTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={selected.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={selected.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1A2238" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }}
                     tickLine={false} axisLine={{ stroke: '#1A2238' }} minTickGap={30} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} tickLine={false}
                     axisLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  background: '#12192C',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#94A3B8' }}
                formatter={(v: number) => [`${v} ${selected.unit}`, selected.label]}
              />
              <Area type="monotone" dataKey="value" stroke={selected.color}
                    strokeWidth={2} fill="url(#gTrend)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
