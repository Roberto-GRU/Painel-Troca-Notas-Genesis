'use client';

import { useState } from 'react';
import {
  FileText, Car, AlertTriangle, Clock, MoreVertical,
  Eye, History, CheckCircle, Truck
} from 'lucide-react';
import { clsx } from 'clsx';
import type { OrdemServico } from '@/types';
import { getTempoColor, formatTempo, getTipoErro } from '@/types';
import Badge from '@/components/ui/Badge';
import OSDetailModal from './OSDetailModal';
import ErrorCorrectionForm from './ErrorCorrectionForm';

interface OSCardProps {
  os: OrdemServico;
}

export default function OSCard({ os }: OSCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const isErro = os.kanban_status === 'erro';
  const tipoErro = isErro && os.ultimo_erro ? getTipoErro(os.ultimo_erro) : null;

  return (
    <>
      <div
        className={clsx(
          'os-card bg-[#1a1d27] border border-[#2a2d3e] rounded-xl overflow-hidden',
          'border-l-4',
          isErro ? 'border-l-red-500' : os.kanban_status === 'concluido' ? 'border-l-green-500'
            : os.kanban_status === 'lancado' ? 'border-l-purple-500'
            : os.kanban_status === 'pendente' ? 'border-l-orange-500'
            : 'border-l-blue-500'
        )}
      >
        {/* Header */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="font-bold text-white text-sm">{os.os}</span>
              <Badge variant="gray" className="text-[10px]">
                {os.cliente.split(' ')[0]}
              </Badge>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <MoreVertical size={14} />
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 top-7 z-20 bg-[#12141c] border border-[#2a2d3e] rounded-xl shadow-2xl py-1 min-w-[180px]"
                  onMouseLeave={() => setShowMenu(false)}
                >
                  <MenuItem icon={Eye} label="Ver Detalhes" onClick={() => { setShowDetail(true); setShowMenu(false); }} />
                  <MenuItem icon={History} label="Histórico" onClick={() => { setShowDetail(true); setShowMenu(false); }} />
                  <MenuItem icon={Truck} label="Ver Laudo" onClick={() => window.open(`#laudo-${os.laudo}`, '_blank')} />
                  <MenuItem icon={CheckCircle} label="Marcar Concluído" onClick={() => {}} className="text-green-400" />
                </div>
              )}
            </div>
          </div>

          {/* Provider + PDA */}
          {os.pda && (
            <div className="flex items-center gap-1 mt-1.5 text-gray-400 text-xs">
              <Clock size={11} />
              <span>PDA {os.pda}</span>
            </div>
          )}

          {/* Placa */}
          {os.placa && (
            <div className="flex items-center gap-1 mt-0.5 text-gray-400 text-xs">
              <Car size={11} />
              <span>{os.placa}</span>
            </div>
          )}

          {/* Tempo decorrido */}
          {os.tempo_decorrido_min !== undefined && (
            <div className="mt-2">
              <span className={clsx('text-xs px-2 py-0.5 rounded-md font-medium', getTempoColor(os.tempo_decorrido_min))}>
                {formatTempo(os.tempo_decorrido_min)}
              </span>
            </div>
          )}
        </div>

        {/* Erro inline — só aparece na coluna Erros */}
        {isErro && os.ultimo_erro && (
          <div className="border-t border-red-900/40 bg-red-950/20 px-3 py-2">
            <div className="flex items-start gap-1.5 mb-2">
              <AlertTriangle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300 leading-tight">{os.ultimo_erro}</p>
            </div>
            <ErrorCorrectionForm os={os} tipoErro={tipoErro} compact />
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center gap-1.5 px-3 pb-3 pt-1 border-t border-[#2a2d3e]/50">
          <ActionBtn icon={FileText} tooltip="Ver documento" onClick={() => setShowDetail(true)} />
          <ActionBtn icon={Car} tooltip="Dados da placa" onClick={() => setShowDetail(true)} />
          <ActionBtn icon={History} tooltip="Histórico" onClick={() => setShowDetail(true)} />
        </div>
      </div>

      {showDetail && (
        <OSDetailModal os={os} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}

function MenuItem({ icon: Icon, label, onClick, className }: { icon: React.ElementType; label: string; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition-colors',
        className
      )}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function ActionBtn({ icon: Icon, tooltip, onClick }: { icon: React.ElementType; tooltip: string; onClick: () => void }) {
  return (
    <button
      title={tooltip}
      onClick={onClick}
      className="p-1.5 rounded-md text-gray-500 hover:text-green-400 hover:bg-green-900/20 transition-colors"
    >
      <Icon size={14} />
    </button>
  );
}
