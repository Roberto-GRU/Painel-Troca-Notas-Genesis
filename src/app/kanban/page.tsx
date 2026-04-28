'use client';

/**
 * Página do Kanban (Torre de Controle).
 *
 * Os filtros (busca, cliente, datas) são aplicados CLIENT-SIDE no useMemo byColumn,
 * não como parâmetros da URL do SWR. Isso significa:
 *   - A filtragem acontece instantaneamente sem nova requisição ao servidor
 *   - Em modo offline é a única forma de filtrar (a API ignora os params)
 *   - O SWR carrega todos os dados uma vez e o memo redistribui nas colunas
 *
 * Datas vindas da API estão em dd/MM/yyyy; os inputs type="date" retornam
 * yyyy-MM-dd. parseBR() faz a conversão antes de comparar.
 */
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Search, RefreshCw } from 'lucide-react';
import Sidebar from '@/components/ui/Sidebar';
import KanbanColumn from '@/components/kanban/KanbanColumn';
import type { OrdemServico, KanbanStatus } from '@/types';
import { KANBAN_COLUMNS } from '@/types';
import { useNewErrorNotification } from '@/hooks/useNewErrorNotification';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function KanbanPage() {
  const [search, setSearch] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (clienteFiltro) params.set('cliente', clienteFiltro);
  if (dataInicio) params.set('data_inicio', dataInicio);
  if (dataFim) params.set('data_fim', dataFim);

  const { data: rawOS, isLoading, mutate } = useSWR<OrdemServico[]>(
    `/api/kanban?${params.toString()}`,
    fetcher,
    { refreshInterval: 60000 } // atualiza automaticamente a cada 1 minuto
  );
  const allOS = Array.isArray(rawOS) ? rawOS : [];

  const { data: rawClientes } = useSWR<string[]>('/api/clientes', fetcher);
  const clientes = Array.isArray(rawClientes) ? rawClientes : [];

  const byColumn = useMemo(() => {
    const map: Record<KanbanStatus, OrdemServico[]> = {
      os_marcada: [], pendente: [], lancado: [], erro: [], concluido: [],
    };

    const searchQ = search.toLowerCase().trim();

    // API retorna datas em dd/MM/yyyy; inputs type="date" usam yyyy-MM-dd
    const parseBR = (s?: string | null): Date | null => {
      const m = s?.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`) : null;
    };
    const inicio = dataInicio ? new Date(dataInicio) : null;
    const fim    = dataFim    ? new Date(dataFim)    : null;

    for (const os of allOS) {
      if (searchQ) {
        const haystack = `${os.os} ${os.laudo} ${os.placa ?? ''} ${os.chave_nfe ?? ''} ${os.numero_nf ?? ''}`.toLowerCase();
        if (!haystack.includes(searchQ)) continue;
      }

      if (clienteFiltro && !(os.cliente ?? '').includes(clienteFiltro)) continue;

      if (inicio || fim) {
        const d = parseBR(os.data);
        if (inicio && d && d < inicio) continue;
        if (fim    && d && d > fim)    continue;
      }

      const col = os.kanban_status ?? 'os_marcada';
      if (map[col]) map[col].push(os);
    }
    return map;
  }, [allOS, search, clienteFiltro, dataInicio, dataFim]);

  const totalErros = byColumn.erro.length;
  useNewErrorNotification(totalErros);

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      <Sidebar />

      <main className="flex-1 ml-16 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#2a2d3e] bg-[#0f1117]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">Torre de Controle</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Gerencie as OS e notas fiscais em tempo real
                {totalErros > 0 && (
                  <span className="ml-2 text-red-400 font-medium">
                    · {totalErros} OS com erro
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => mutate()}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1d27] hover:bg-[#1f2235] border border-[#2a2d3e] rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>

          {/* Filtros */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar OS, laudo, placa..."
                className="w-full pl-9 pr-3 py-2 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-600 transition-colors"
              />
            </div>

            <select
              value={clienteFiltro}
              onChange={e => setClienteFiltro(e.target.value)}
              className="px-3 py-2 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl text-sm text-gray-300 focus:outline-none focus:border-green-600 transition-colors min-w-[160px]"
            >
              <option value="">Todos os clientes</option>
              {clientes.map(c => (
                <option key={c} value={c}>{c.split(' ')[0]}</option>
              ))}
            </select>

            <input
              type="date"
              lang="pt-BR"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="px-3 py-2 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl text-sm text-gray-300 focus:outline-none focus:border-green-600 transition-colors"
            />
            <input
              type="date"
              lang="pt-BR"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="px-3 py-2 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl text-sm text-gray-300 focus:outline-none focus:border-green-600 transition-colors"
            />

            {(search || clienteFiltro || dataInicio || dataFim) && (
              <button
                onClick={() => { setSearch(''); setClienteFiltro(''); setDataInicio(''); setDataFim(''); }}
                className="px-3 py-2 text-xs text-red-400 hover:text-red-300 border border-red-900/40 rounded-xl transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              <RefreshCw size={16} className="animate-spin mr-2" />
              Carregando OS...
            </div>
          ) : (
            <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
              {KANBAN_COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  columnId={col.id}
                  items={byColumn[col.id]}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
