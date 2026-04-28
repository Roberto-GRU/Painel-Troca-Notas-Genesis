'use client';

/**
 * Dashboard de KPIs e gráficos.
 *
 * Cross-filter estilo PowerBI:
 *   - Clicar em um KPI card, fatia do donut ou barra de erro define statusFiltro
 *     ou erroFiltro (mutuamente exclusivos — um zera o outro)
 *   - Componentes recebem `selected` + `dimmed`/`active` para diminuir
 *     opacidade dos elementos não selecionados
 *   - serieFiltro converte o status de negócio → nome da série do gráfico de área
 *     (ex: 'Finalizado' → 'finalizados') via STATUS_TO_SERIE
 *
 * Filtros de data/cliente:
 *   - Compõem a query string `qs` que é incluída nas chaves SWR
 *   - Mudando `qs`, o SWR busca novamente todos os endpoints do dashboard
 */
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  FileText, CheckCircle, AlertTriangle, Clock,
  ClipboardList, Timer, RefreshCw, Search, X,
} from 'lucide-react';
import Sidebar from '@/components/ui/Sidebar';
import KPICard from '@/components/dashboard/KPICard';
import ChartOSporDia, { STATUS_TO_SERIE } from '@/components/dashboard/ChartOSporDia';
import ChartDistribuicao from '@/components/dashboard/ChartDistribuicao';
import ChartErrosMaisFrequentes from '@/components/dashboard/ChartErrosMaisFrequentes';
import type { KPIData, OSPorDia, DistribuicaoStatus, ErroFrequente } from '@/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Mapeamento status negócio → variant/label dos KPICards clicáveis
const KPI_STATUS: { status: string; variant: 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'gray' }[] = [
  { status: 'Finalizado',   variant: 'green' },
  { status: 'Erro',         variant: 'red' },
  { status: 'Pendente PDA', variant: 'orange' },
  { status: 'Enviado',      variant: 'blue' },
];

export default function DashboardPage() {
  // ── filtros de data / cliente ────────────────────────────────────────────
  const [dataInicio,    setDataInicio]    = useState('');
  const [dataFim,       setDataFim]       = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('');

  // ── cross-filter estilo PowerBI ──────────────────────────────────────────
  // statusFiltro e erroFiltro são mutuamente exclusivos:
  //   toggleStatus limpa erroFiltro, toggleErro limpa statusFiltro
  const [statusFiltro, setStatusFiltro] = useState<string | null>(null);
  const [erroFiltro,   setErroFiltro]   = useState<string | null>(null);

  const hasActive = !!(statusFiltro || erroFiltro);

  function toggleStatus(s: string) {
    setStatusFiltro(p => p === s ? null : s);
    setErroFiltro(null);
  }
  function toggleErro(s: string) {
    setErroFiltro(p => p === s ? null : s);
    setStatusFiltro(null);
  }
  function clearAll() { setStatusFiltro(null); setErroFiltro(null); }

  // ── SWR keys com params de data/cliente ─────────────────────────────────
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (dataInicio)    p.set('data_inicio', dataInicio);
    if (dataFim)       p.set('data_fim',    dataFim);
    if (clienteFiltro) p.set('cliente',     clienteFiltro);
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [dataInicio, dataFim, clienteFiltro]);

  const { data: kpis,      isLoading: kLoading, mutate: mKpis }   = useSWR<KPIData>(`/api/dashboard/kpis${qs}`,               fetcher, { refreshInterval: 120000 });
  const { data: rawPorDia, mutate: mDia }                           = useSWR<OSPorDia[]>(`/api/dashboard/por-dia${qs}`,          fetcher, { refreshInterval: 120000 });
  const { data: rawDistrib,mutate: mDistrib }                       = useSWR<DistribuicaoStatus[]>(`/api/dashboard/distribuicao${qs}`, fetcher);
  const { data: rawErros,  mutate: mErros }                         = useSWR<ErroFrequente[]>(`/api/dashboard/erros-frequentes${qs}`, fetcher);
  const { data: rawClientes }                                        = useSWR<string[]>('/api/clientes', fetcher);

  const porDia    = Array.isArray(rawPorDia)   ? rawPorDia   : [];
  const distrib   = Array.isArray(rawDistrib)  ? rawDistrib  : [];
  const errosFreq = Array.isArray(rawErros)    ? rawErros    : [];
  const clientes  = Array.isArray(rawClientes) ? rawClientes : [];

  const refresh = () => { mKpis(); mDia(); mDistrib(); mErros(); };

  const tempoMedio = kpis?.tempo_medio_horas != null
    ? `${Math.floor(kpis.tempo_medio_horas)}h ${Math.round((kpis.tempo_medio_horas % 1) * 60)}m`
    : '—';

  // Converte status de negócio → chave da série no gráfico de área
  // para escurecer as séries não selecionadas quando há cross-filter ativo
  const serieFiltro = statusFiltro ? (STATUS_TO_SERIE[statusFiltro] ?? null) : null;

  // KPI dimming: se statusFiltro ativo, só o card correspondente fica aceso
  function kpiState(status: string): { active: boolean; dimmed: boolean } {
    if (!statusFiltro) return { active: false, dimmed: false };
    return { active: statusFiltro === status, dimmed: statusFiltro !== status };
  }

  const hasFilters = !!(dataInicio || dataFim || clienteFiltro);

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      <Sidebar />

      <main className="flex-1 ml-16 overflow-y-auto px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard de Documentos</h1>
            <p className="text-sm text-gray-500 mt-0.5">Análise de tempo e performance</p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1d27] hover:bg-[#1f2235] border border-[#2a2d3e] rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={14} className={kLoading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {/* ── Barra de filtros ─────────────────────────────────────────── */}
        <div className="flex gap-3 flex-wrap items-center bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl px-4 py-3">
          {/* Cliente */}
          <div className="relative min-w-[180px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <select
              value={clienteFiltro}
              onChange={e => setClienteFiltro(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#12141c] border border-[#2a2d3e] rounded-lg text-sm text-gray-300 focus:outline-none focus:border-green-600"
            >
              <option value="">Todos os clientes</option>
              {clientes.map(c => (
                <option key={c} value={c}>{c.split(' ')[0]}</option>
              ))}
            </select>
          </div>

          <input
            type="date"
            lang="pt-BR"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            className="px-3 py-1.5 bg-[#12141c] border border-[#2a2d3e] rounded-lg text-sm text-gray-300 focus:outline-none focus:border-green-600"
          />
          <input
            type="date"
            lang="pt-BR"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            className="px-3 py-1.5 bg-[#12141c] border border-[#2a2d3e] rounded-lg text-sm text-gray-300 focus:outline-none focus:border-green-600"
          />

          {hasFilters && (
            <button
              onClick={() => { setDataInicio(''); setDataFim(''); setClienteFiltro(''); }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 border border-red-900/40 rounded-lg hover:text-red-300 transition-colors"
            >
              <X size={12} /> Limpar filtros
            </button>
          )}

          {/* Chip de cross-filter ativo */}
          {hasActive && (
            <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 border border-green-700 rounded-lg text-xs text-green-300">
              <span>Filtro: {statusFiltro ?? erroFiltro}</span>
              <button onClick={clearAll} className="hover:text-white">
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* KPIs row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <KPICard
            label="Total de OS"
            value={kpis?.total?.toLocaleString('pt-BR') ?? '—'}
            icon={FileText}
            variant="gray"
            onClick={hasActive ? clearAll : undefined}
            dimmed={!!statusFiltro}
          />
          <KPICard
            label="Concluídas"
            value={kpis?.finalizados?.toLocaleString('pt-BR') ?? '—'}
            subLabel={kpis && kpis.total ? `${Math.round((kpis.finalizados / kpis.total) * 100)}% do total` : ''}
            icon={CheckCircle}
            variant="green"
            onClick={() => toggleStatus('Finalizado')}
            {...kpiState('Finalizado')}
          />
          <KPICard
            label="Pendentes"
            value={kpis?.pendentes?.toLocaleString('pt-BR') ?? '—'}
            icon={Clock}
            variant="orange"
            onClick={() => toggleStatus('Pendente PDA')}
            {...kpiState('Pendente PDA')}
          />
          <KPICard
            label="Com Erro"
            value={kpis?.erros?.toLocaleString('pt-BR') ?? '—'}
            icon={AlertTriangle}
            variant="red"
            onClick={() => toggleStatus('Erro')}
            {...kpiState('Erro')}
          />
          <KPICard
            label="Lançados"
            value={kpis?.lancados?.toLocaleString('pt-BR') ?? '—'}
            icon={ClipboardList}
            variant="blue"
            onClick={() => toggleStatus('Enviado')}
            {...kpiState('Enviado')}
          />
        </div>

        {/* KPIs row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KPICard
            label="Tempo Médio (Finalizadas)"
            value={tempoMedio}
            subLabel="Desde abertura até conclusão"
            icon={Timer}
            variant="purple"
          />
          <KPICard
            label="Taxa de Erro"
            value={kpis && kpis.total ? `${Math.round((kpis.erros / kpis.total) * 100)}%` : '—'}
            subLabel={kpis ? `${kpis.erros} de ${kpis.total} OS com falha` : 'Percentual de OS com erro'}
            icon={AlertTriangle}
            variant={kpis && kpis.total && (kpis.erros / kpis.total) > 0.1 ? 'red' : 'orange'}
            onClick={() => toggleStatus('Erro')}
            {...kpiState('Erro')}
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <ChartOSporDia data={porDia} serieFiltro={serieFiltro} />
          </div>
          <ChartDistribuicao
            data={distrib}
            selected={statusFiltro}
            onSelect={toggleStatus}
          />
        </div>

        {/* Charts row 2 */}
        <ChartErrosMaisFrequentes
          data={errosFreq}
          selected={erroFiltro}
          onSelect={toggleErro}
        />
      </main>
    </div>
  );
}
