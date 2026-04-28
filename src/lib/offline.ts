import fs from 'fs';
import path from 'path';
import { mapStatusToKanban } from '@/types';

export const OFFLINE = process.env.DB_OFFLINE === 'true';

function load<T>(nome: string): T {
  const p = path.join(process.cwd(), 'offline-data', `${nome}.json`);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return [] as unknown as T;
  }
}

export function offlineKanban() {
  const rows = load<Record<string, unknown>[]>('kanban');
  return rows.map(r => ({ ...r, kanban_status: mapStatusToKanban(String(r.status ?? '')) }));
}

export function offlineKpis() {
  const rows = load<object[]>('kpis');
  return rows[0] ?? {};
}

export function offlinePorDia() {
  return load<object[]>('porDia');
}

export function offlineDistribuicao() {
  const rows = load<{ status: string; quantidade: number }[]>('distribuicao');
  const total = rows.reduce((acc, r) => acc + Number(r.quantidade), 0);

  const corMap: Record<string, string> = {
    Finalizado:     '#22c55e',
    Erro:           '#ef4444',
    'Pendente PDA': '#f97316',
    Enviado:        '#8b5cf6',
  };
  const labelMap: Record<string, string> = {
    Finalizado:     'Concluídos',
    Erro:           'Erros',
    'Pendente PDA': 'Processando',
    Enviado:        'Lançados',
  };

  return rows.map((r, i) => ({
    status:     r.status,
    label:      labelMap[r.status] ?? r.status,
    quantidade: Number(r.quantidade),
    percentual: total > 0 ? Math.round((Number(r.quantidade) / total) * 1000) / 10 : 0,
    cor:        corMap[r.status] ?? ['#3b82f6', '#06b6d4', '#84cc16', '#f59e0b'][i % 4],
  }));
}

export function offlineErrosFrequentes() {
  return load<object[]>('errosFrequentes');
}

export function offlineClientes() {
  const rows = load<{ cliente: string }[]>('clientes');
  return rows.map(r => r.cliente);
}
