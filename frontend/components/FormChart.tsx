'use client';

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface FormPoint {
  date: string;
  fitness: number;
  fatigue: number;
  form: number;
}

export default function FormChart({ data }: { data: FormPoint[] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-slate-500">
        Pas encore assez de séances réalisées pour tracer la trajectoire.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
        <YAxis stroke="#64748b" fontSize={11} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line type="monotone" dataKey="fitness" stroke="#34d399" dot={false} name="Aptitude" />
        <Line type="monotone" dataKey="fatigue" stroke="#f87171" dot={false} name="Fatigue" />
        <Line type="monotone" dataKey="form" stroke="#60a5fa" dot={false} name="Forme" />
      </LineChart>
    </ResponsiveContainer>
  );
}
