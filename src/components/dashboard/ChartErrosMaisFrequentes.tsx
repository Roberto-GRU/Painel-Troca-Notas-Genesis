'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ErroFrequente } from '@/types';

interface Props {
  data: ErroFrequente[];
}

export default function ChartErrosMaisFrequentes({ data }: Props) {
  const formatted = data.map(d => ({
    ...d,
    labelCurto: d.status.length > 30 ? d.status.slice(0, 28) + '…' : d.status,
  }));

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Erros Mais Frequentes</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted} layout="vertical" margin={{ left: 8, right: 20, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis
            type="category"
            dataKey="labelCurto"
            width={200}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <Tooltip
            contentStyle={{ background: '#12141c', border: '1px solid #2a2d3e', borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(v: number) => [`${v} ocorrências`, 'Qtde']}
          />
          <Bar dataKey="quantidade" fill="#ef4444" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
