'use client';

/**
 * Gráfico de área — OS por dia (Total, Concluídas, Erros).
 *
 * serieFiltro: quando um status está selecionado no cross-filter do dashboard,
 * recebe o nome da série correspondente ('finalizados', 'erros') para escurecer
 * as demais séries via strokeOpacity/fillOpacity.
 *
 * STATUS_TO_SERIE é exportado para o dashboard poder converter
 * o status de negócio ('Finalizado') → chave da série ('finalizados').
 */
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { OSPorDia } from '@/types';

// mapa de status do negócio → série do gráfico
export const STATUS_TO_SERIE: Record<string, string> = {
  Finalizado:     'finalizados',
  Erro:           'erros',
};

interface Props {
  data: OSPorDia[];
  serieFiltro?: string | null; // 'total' | 'finalizados' | 'erros' | null
}

const SERIES = [
  { key: 'total',      name: 'Total',      stroke: '#22c55e', grad: 'gradTotal' },
  { key: 'finalizados',name: 'Concluídos', stroke: '#3b82f6', grad: 'gradFin' },
  { key: 'erros',      name: 'Erros',      stroke: '#ef4444', grad: 'gradErr' },
];

export default function ChartOSporDia({ data, serieFiltro }: Props) {
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">OS por Dia — Total vs Concluídas vs Erros</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {SERIES.map(s => (
              <linearGradient key={s.grad} id={s.grad} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={s.stroke} stopOpacity={0.3} />
                <stop offset="95%" stopColor={s.stroke} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
          <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
          <Tooltip
            contentStyle={{ background: '#12141c', border: '1px solid #2a2d3e', borderRadius: 10, fontSize: 12 }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
          {SERIES.map(s => {
            // dim: série que não corresponde ao filtro ativo fica quase invisível
            const dim = serieFiltro && s.key !== serieFiltro;
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.stroke}
                fill={`url(#${s.grad})`}
                strokeWidth={dim ? 1 : 2}
                strokeOpacity={dim ? 0.15 : 1}
                fillOpacity={dim ? 0.03 : 1}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
