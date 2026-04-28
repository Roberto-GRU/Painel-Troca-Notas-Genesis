'use client';

import useSWR from 'swr';
import {
  FileText, CheckCircle, AlertTriangle, Clock,
  ClipboardList, Timer, RefreshCw
} from 'lucide-react';
import Sidebar from '@/components/ui/Sidebar';
import KPICard from '@/components/dashboard/KPICard';
import ChartOSporDia from '@/components/dashboard/ChartOSporDia';
import ChartDistribuicao from '@/components/dashboard/ChartDistribuicao';
import ChartErrosMaisFrequentes from '@/components/dashboard/ChartErrosMaisFrequentes';
import type { KPIData, OSPorDia, DistribuicaoStatus, ErroFrequente } from '@/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DashboardPage() {
  const { data: kpis, isLoading: kLoading, mutate: refetchKpis } = useSWR<KPIData>('/api/dashboard/kpis', fetcher, { refreshInterval: 120000 });
  const { data: rawPorDia, mutate: refetchDia } = useSWR<OSPorDia[]>('/api/dashboard/por-dia', fetcher, { refreshInterval: 120000 });
  const { data: rawDistrib, mutate: refetchDistrib } = useSWR<DistribuicaoStatus[]>('/api/dashboard/distribuicao', fetcher);
  const { data: rawErros, mutate: refetchErros } = useSWR<ErroFrequente[]>('/api/dashboard/erros-frequentes', fetcher);

  const porDia   = Array.isArray(rawPorDia)  ? rawPorDia  : [];
  const distrib  = Array.isArray(rawDistrib) ? rawDistrib : [];
  const errosFreq = Array.isArray(rawErros)  ? rawErros   : [];

  const refresh = () => { refetchKpis(); refetchDia(); refetchDistrib(); refetchErros(); };

  const tempoMedio = kpis?.tempo_medio_horas != null
    ? `${Math.floor(kpis.tempo_medio_horas)}h ${Math.round((kpis.tempo_medio_horas % 1) * 60)}m`
    : '—';

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      <Sidebar />

      <main className="flex-1 ml-16 overflow-y-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard de Documentos</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Análise de tempo e performance — últimos 30 dias
            </p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1d27] hover:bg-[#1f2235] border border-[#2a2d3e] rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={14} className={kLoading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {/* KPIs row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <KPICard
            label="Total de OS"
            value={kpis?.total?.toLocaleString('pt-BR') ?? '—'}
            icon={FileText}
            variant="gray"
          />
          <KPICard
            label="Concluídas"
            value={kpis?.finalizados?.toLocaleString('pt-BR') ?? '—'}
            subLabel={kpis ? `${Math.round((kpis.finalizados / kpis.total) * 100)}% do total` : ''}
            icon={CheckCircle}
            variant="green"
          />
          <KPICard
            label="Pendentes"
            value={kpis?.pendentes?.toLocaleString('pt-BR') ?? '—'}
            icon={Clock}
            variant="orange"
          />
          <KPICard
            label="Com Erro"
            value={kpis?.erros?.toLocaleString('pt-BR') ?? '—'}
            icon={AlertTriangle}
            variant="red"
          />
          <KPICard
            label="OS Marcadas"
            value={kpis?.os_marcadas?.toLocaleString('pt-BR') ?? '—'}
            icon={ClipboardList}
            variant="blue"
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
            label="Total de Logs Processados"
            value="300K+"
            subLabel="Eventos registrados no log_genesis"
            icon={FileText}
            variant="gray"
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <ChartOSporDia data={porDia} />
          </div>
          <ChartDistribuicao data={distrib} />
        </div>

        {/* Charts row 2 */}
        <ChartErrosMaisFrequentes data={errosFreq} />
      </main>
    </div>
  );
}
