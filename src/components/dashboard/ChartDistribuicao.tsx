'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DistribuicaoStatus } from '@/types';

interface Props {
  data: DistribuicaoStatus[];
}

export default function ChartDistribuicao({ data }: Props) {
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Distribuição por Status</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="quantidade"
            nameKey="label"
            cx="40%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.cor} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#12141c', border: '1px solid #2a2d3e', borderRadius: 10, fontSize: 12 }}
            formatter={(value: number, name: string) => [`${value} OS`, name]}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
            formatter={(value, entry: unknown) => {
              const e = entry as { payload?: { percentual: number } };
              return `${value} (${e?.payload?.percentual ?? 0}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
