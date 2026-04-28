'use client';

import {
  ClipboardList, Clock, RefreshCw, AlertTriangle, CheckCircle
} from 'lucide-react';
import type { OrdemServico, KanbanStatus } from '@/types';
import { KANBAN_COLUMNS } from '@/types';
import { clsx } from 'clsx';
import OSCard from './OSCard';

const ICONS: Record<string, React.ElementType> = {
  ClipboardList, Clock, RefreshCw, AlertTriangle, CheckCircle,
};

interface Props {
  columnId: KanbanStatus;
  items: OrdemServico[];
}

export default function KanbanColumn({ columnId, items }: Props) {
  const col = KANBAN_COLUMNS.find(c => c.id === columnId)!;
  const Icon = ICONS[col.icon];

  return (
    <div className="flex flex-col min-w-[280px] max-w-[300px] w-[290px]">
      {/* Header */}
      <div className={clsx(
        'flex items-center justify-between px-3 py-2.5 rounded-xl mb-3 border',
        col.bgHeader
      )}>
        <div className={clsx('flex items-center gap-2', col.cor)}>
          <Icon size={15} />
          <span className="text-sm font-semibold">{col.label}</span>
        </div>
        <span className={clsx(
          'text-xs font-bold px-2 py-0.5 rounded-full',
          col.cor,
          'bg-black/30'
        )}>
          {items.length}
        </span>
      </div>

      {/* Cards */}
      <div className="kanban-column flex flex-col gap-3 pr-1">
        {items.length === 0 ? (
          <div className="text-center py-10 text-gray-600 text-xs">
            Nenhuma OS nesta coluna
          </div>
        ) : (
          items.map(os => <OSCard key={os.id} os={os} />)
        )}
      </div>
    </div>
  );
}
