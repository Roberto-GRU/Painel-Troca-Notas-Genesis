'use client';

/**
 * Gráfico de donut — distribuição de OS por status.
 *
 * Cross-filter: clicar em uma fatia chama onSelect(entry.status)
 * que sobe ao dashboard e propaga o filtro para os demais gráficos.
 * A fatia selecionada recebe opacidade 1 e stroke branco;
 * as demais ficam em opacidade 0.2.
 *
 * entry.status vem da API como o valor real do banco ('Finalizado', 'Erro', etc.)
 * enquanto entry.label é o nome legível para o usuário ('Concluídos', 'Erros').
 */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { clsx } from 'clsx';
import type { DistribuicaoStatus } from '@/types';

interface Props {
  data: DistribuicaoStatus[];
  selected?: string | null;
  onSelect?: (status: string) => void;
}

export default function ChartDistribuicao({ data, selected, onSelect }: Props) {
  const hasFilter = !!selected;

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-1">Distribuição por Status</h3>
      {onSelect && (
        <p className="text-xs text-gray-600 mb-3">Clique para filtrar</p>
      )}
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
            onClick={(entry) => onSelect?.(entry.status)}
            style={{ cursor: onSelect ? 'pointer' : undefined }}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.cor}
                opacity={hasFilter ? (entry.status === selected ? 1 : 0.2) : 1}
                stroke={entry.status === selected ? '#fff' : 'transparent'}
                strokeWidth={entry.status === selected ? 2 : 0}
              />
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
              const e = entry as { payload?: { percentual: number; status: string } };
              const isActive = !hasFilter || e?.payload?.status === selected;
              return (
                <span className={clsx('transition-opacity', !isActive && 'opacity-30')}>
                  {value} ({e?.payload?.percentual ?? 0}%)
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
