/**
 * Modo offline — lê/grava em offline-data/kanban.json em vez do MySQL.
 *
 * Ativado por: DB_OFFLINE=true no .env.local
 *
 * O arquivo kanban.json é gerado pelo script dump-kanban.js, que exporta
 * um snapshot do banco para uso sem VPN ou em ambientes sem acesso ao MySQL.
 * Todos os cálculos (KPIs, por-dia, distribuição) são refeitos em JS
 * a partir desse snapshot — não há queries reais.
 *
 * Datas no kanban.json estão no formato dd/MM/yyyy (como vêm do banco),
 * por isso parseBR() converte antes de comparar com os filtros de data
 * que chegam no formato ISO yyyy-MM-dd (padrão do input type="date").
 */
import fs from 'fs';
import path from 'path';
import { mapStatusToKanban } from '@/types';
import type { FiltrosDash } from './queries';

export const OFFLINE = process.env.DB_OFFLINE === 'true';

function load<T>(nome: string): T {
  const p = path.join(process.cwd(), 'offline-data', `${nome}.json`);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) as T; }
  catch { return [] as unknown as T; }
}

// Converte dd/MM/yyyy → Date para comparação com filtros ISO (yyyy-MM-dd)
function parseBR(s?: string | null): Date | null {
  const m = s?.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`) : null;
}

type Row = Record<string, unknown>;

function filterRows(rows: Row[], filtros?: FiltrosDash): Row[] {
  const ini = filtros?.data_inicio ? new Date(filtros.data_inicio) : null;
  const fim = filtros?.data_fim    ? new Date(filtros.data_fim)    : null;
  return rows.filter(r => {
    if (filtros?.cliente && !String(r.cliente ?? '').includes(filtros.cliente)) return false;
    if (ini || fim) {
      const d = parseBR(String(r.data ?? ''));
      if (d) {
        if (ini && d < ini) return false;
        if (fim && d > fim) return false;
      }
    }
    return true;
  });
}

export function offlineKanban() {
  const rows = load<Row[]>('kanban');
  // kanban_status não está no JSON — é calculado em runtime a partir de status
  return rows.map(r => ({ ...r, kanban_status: mapStatusToKanban(String(r.status ?? '')) }));
}

export function offlineKpis(filtros?: FiltrosDash) {
  const rows = filterRows(load<Row[]>('kanban'), filtros);
  const total       = rows.length;
  const finalizados = rows.filter(r => r.status === 'Finalizado').length;
  const erros       = rows.filter(r => r.status === 'Erro').length;
  const pendentes   = rows.filter(r => String(r.status ?? '').includes('Pendente') || r.status === 'Enviado').length;
  const os_marcadas = total - finalizados - erros - pendentes;

  const fin = rows.filter(r => r.status === 'Finalizado' && r.data_emissao_laudo && r.data);
  const tempo_medio_horas = fin.length
    ? fin.reduce((acc, r) => {
        const d1 = parseBR(String(r.data));
        const d2 = parseBR(String(r.data_emissao_laudo));
        return d1 && d2 ? acc + (d2.getTime() - d1.getTime()) / 3600000 : acc;
      }, 0) / fin.length
    : null;

  return { total, finalizados, erros, pendentes, os_marcadas, tempo_medio_horas };
}

export function offlinePorDia(filtros?: FiltrosDash) {
  const rows = filterRows(load<Row[]>('kanban'), filtros);
  const map: Record<string, { dia: string; total: number; finalizados: number; erros: number }> = {};
  for (const r of rows) {
    const dia = String(r.data ?? '').slice(0, 5); // extrai dd/MM do campo dd/MM/yyyy
    if (!dia) continue;
    if (!map[dia]) map[dia] = { dia, total: 0, finalizados: 0, erros: 0 };
    map[dia].total++;
    if (r.status === 'Finalizado') map[dia].finalizados++;
    if (r.status === 'Erro')       map[dia].erros++;
  }
  return Object.values(map).sort((a, b) => a.dia.localeCompare(b.dia));
}

export function offlineDistribuicao(filtros?: FiltrosDash) {
  const rows = filterRows(load<Row[]>('kanban'), filtros);
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const s = String(r.status ?? '');
    counts[s] = (counts[s] || 0) + 1;
  }
  const total = rows.length;
  const corMap: Record<string, string> = {
    Finalizado:     '#22c55e', Erro: '#ef4444',
    'Pendente PDA': '#f97316', Enviado: '#8b5cf6',
  };
  const labelMap: Record<string, string> = {
    Finalizado: 'Concluídos', Erro: 'Erros',
    'Pendente PDA': 'Processando', Enviado: 'Lançados',
  };
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, quantidade], i) => ({
      status, label: labelMap[status] ?? status, quantidade,
      percentual: total > 0 ? Math.round((quantidade / total) * 1000) / 10 : 0,
      cor: corMap[status] ?? ['#3b82f6', '#06b6d4', '#84cc16', '#f59e0b'][i % 4],
    }));
}

export function offlineErrosFrequentes(filtros?: FiltrosDash) {
  const rows = filterRows(load<Row[]>('kanban'), filtros);
  const erros = rows.filter(r => r.status === 'Erro' && r.ultimo_erro);
  const counts: Record<string, number> = {};
  for (const r of erros) {
    const k = String(r.ultimo_erro ?? '');
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([status, quantidade]) => ({ status, aplicacao: 'GENESIS', quantidade }));
}

export function offlineClientes() {
  const rows = load<{ cliente: string }[]>('clientes');
  return rows.map(r => r.cliente);
}
