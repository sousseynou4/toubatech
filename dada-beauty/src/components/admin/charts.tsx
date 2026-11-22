'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatXOF } from '@/lib/format';

/** Palette catégorielle validée (contraste, daltonisme) — ordre fixe, jamais recyclé. */
export const SERIES = ['#B04E72', '#B08A2E', '#3D72B8', '#2E8C62', '#8A55B8', '#D0643A'] as const;
const AXIS = { fontSize: 11, fill: '#81747A' };
const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

function MoneyTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center justify-between gap-4 text-ink-soft">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: p.color }} />{p.name}</span>
          <span className="tabular-nums text-ink">{formatXOF(p.value)}</span>
        </p>
      ))}
      {payload.length > 1 && <p className="mt-1 flex justify-between border-t border-line pt-1 font-semibold text-ink"><span>Total</span><span className="tabular-nums">{formatXOF(total)}</span></p>}
    </div>
  );
}

export function RevenueChart({ data, height = 260 }: { data: { label: string; services: number; products: number }[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Évolution du chiffre d'affaires (prestations et produits)">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="#F1E7EA" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#EADFE2' }} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => compact.format(v)} width={44} />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: 'rgb(235 196 207 / 0.25)' }} />
          <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12, color: '#4A3F48', paddingTop: 8 }} />
          <Bar dataKey="services" name="Prestations" stackId="ca" fill={SERIES[0]} stroke="#fff" strokeWidth={1} />
          <Bar dataKey="products" name="Produits" stackId="ca" fill={SERIES[1]} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barres horizontales (classement) : une seule série, étiquettes directes. */
export function RankingBars({ data, valueLabel = 'CA', money = true, color = SERIES[0] }: { data: { label: string; value: number }[]; valueLabel?: string; money?: boolean; color?: string }) {
  const height = Math.max(120, data.length * 38 + 20);
  return (
    <div style={{ height }} role="img" aria-label={`Classement par ${valueLabel}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" tick={{ ...AXIS, fill: '#4A3F48' }} tickLine={false} axisLine={false} width={130} />
          <Tooltip cursor={{ fill: 'rgb(235 196 207 / 0.25)' }} formatter={(v) => [money ? formatXOF(Number(v)) : String(v), valueLabel]}
            contentStyle={{ borderRadius: 12, border: '1px solid #EADFE2', fontSize: 12 }} />
          <Bar dataKey="value" name={valueLabel} fill={color} radius={[0, 4, 4, 0]}
            label={{ position: 'right', fontSize: 11, fill: '#4A3F48', formatter: (v: unknown) => (money ? compact.format(Number(v)) : String(v)) }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
