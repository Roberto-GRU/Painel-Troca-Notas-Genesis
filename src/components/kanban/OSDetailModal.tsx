'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, History } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ErrorCorrectionForm from './ErrorCorrectionForm';
import type { OrdemServico, ErroOS } from '@/types';
import { getTipoErro } from '@/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Props {
  os: OrdemServico;
  onClose: () => void;
}

type Tab = 'processo' | 'erros' | 'historico';

export default function OSDetailModal({ os, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(os.kanban_status === 'erro' ? 'erros' : 'processo');
  const { data: detalhe } = useSWR<OrdemServico>(`/api/kanban/${os.id}`, fetcher);
  const { data: erros } = useSWR<ErroOS[]>(`/api/kanban/${os.id}/erros`, fetcher);
  const { data: historico } = useSWR<ErroOS[]>(`/api/kanban/${os.id}/historico`, fetcher);

  const d = detalhe ?? os;

  return (
    <Modal open onClose={onClose} title={`OS ${os.os} — Troca de Notas`} size="xl">
      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 border-b border-[#2a2d3e]">
        {(['processo', 'erros', 'historico'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
              tab === t ? 'bg-[#12141c] text-white border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'processo' && 'Processo'}
            {t === 'erros' && (
              <span className="flex items-center gap-1">
                <AlertTriangle size={13} />
                Erros {erros?.length ? `(${erros.length})` : ''}
              </span>
            )}
            {t === 'historico' && (
              <span className="flex items-center gap-1">
                <History size={13} />Histórico
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-0">
        {/* Conteúdo principal */}
        <div className="flex-1 p-6 space-y-4">
          {tab === 'processo' && (
            <>
              <InfoRow label="Laudo" value={d.laudo} mono />
              <InfoRow label="Cliente" value={d.cliente} />
              <InfoRow label="Data" value={d.data ? d.data.slice(0, 10).split('-').reverse().join('/') : '-'} />
              <InfoRow label="Placa" value={(d as unknown as Record<string, string>).placa ?? '-'} />

              <div className="grid grid-cols-3 gap-3">
                <InfoCard label="Peso Líquido" value={formatPeso((d as unknown as Record<string, string>).peso_liquido)} />
                <InfoCard label="Peso Bruto" value={formatPeso((d as unknown as Record<string, string>).peso_bruto)} />
                <InfoCard label="Tara" value={formatPeso((d as unknown as Record<string, string>).tara)} />
              </div>

              {(d as unknown as Record<string, string>).umidade && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Classificação</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <InfoCard label="Umidade" value={pct((d as unknown as Record<string, string>).umidade)} />
                    <InfoCard label="Avarias" value={pct((d as unknown as Record<string, string>).total_avarias)} />
                    <InfoCard label="Esverdeados" value={pct((d as unknown as Record<string, string>).esverdeados)} />
                    <InfoCard label="Impurezas" value={pct((d as unknown as Record<string, string>).impurezas)} />
                  </div>
                </div>
              )}

              {(d as unknown as Record<string, string>).chave_nfe && (
                <InfoRow label="Chave NF-e" value={(d as unknown as Record<string, string>).chave_nfe} mono />
              )}
            </>
          )}

          {tab === 'erros' && (
            <div className="space-y-4">
              {!erros?.length ? (
                <p className="text-gray-500 text-sm">Nenhum erro registrado.</p>
              ) : (
                erros.map(erro => {
                  const tipo = getTipoErro(erro.status);
                  return (
                    <div key={erro.id} className="border border-red-900/40 rounded-xl bg-red-950/10 p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-red-300 font-medium">{erro.status}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {erro.aplicacao} · {erro.created_at}
                          </p>
                        </div>
                      </div>
                      {tipo && (
                        <div className="border-t border-red-900/30 pt-3">
                          <p className="text-xs text-gray-400 mb-2 font-medium">Correção necessária:</p>
                          <ErrorCorrectionForm os={os} tipoErro={tipo} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'historico' && (
            <div className="space-y-2">
              {!historico?.length ? (
                <p className="text-gray-500 text-sm">Sem histórico.</p>
              ) : (
                historico.map(h => (
                  <div key={h.id} className="flex items-start gap-3 py-2 border-b border-[#2a2d3e]">
                    <div className="w-2 h-2 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-300">{h.status}</p>
                      <p className="text-xs text-gray-600">{h.aplicacao} · {h.created_at}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Painel lateral */}
        <div className="w-52 border-l border-[#2a2d3e] p-4 space-y-3 bg-[#12141c]">
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <StatusBadge status={os.kanban_status} />
          </div>
          <InfoSide label="OS" value={os.os} />
          <InfoSide label="PDA" value={os.pda?.toString() ?? '-'} />
          <InfoSide label="Supervisão" value={os.supervisao || '-'} />
          <InfoSide label="Data emissão" value={d.data_emissao_laudo?.slice(0, 10) ?? '-'} />
        </div>
      </div>
    </Modal>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm text-gray-200 ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#12141c] rounded-lg p-2.5 border border-[#2a2d3e]">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}

function InfoSide({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-600">{label}</p>
      <p className="text-xs text-gray-300">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'green' | 'red' | 'orange' | 'purple' | 'blue'> = {
    concluido: 'green', erro: 'red', pendente: 'orange', lancado: 'purple', os_marcada: 'blue',
  };
  const labels: Record<string, string> = {
    concluido: 'Concluído', erro: 'Erro', pendente: 'Processando', lancado: 'Lançado', os_marcada: 'OS Marcada',
  };
  return <Badge variant={map[status] ?? 'gray'}>{labels[status] ?? status}</Badge>;
}

function formatPeso(v?: string | number): string {
  if (!v) return '—';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return `${n.toLocaleString('pt-BR')} kg`;
}

function pct(v?: string): string {
  if (!v) return '—';
  const n = parseFloat(v);
  return isNaN(n) ? v : `${n.toFixed(2)}%`;
}
