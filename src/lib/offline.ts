import fs from 'fs';
import path from 'path';

export const OFFLINE = process.env.DB_OFFLINE === 'true';

function load<T>(nome: string): T {
  const p = path.join(process.cwd(), 'offline-data', `${nome}.json`);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return [] as unknown as T;
  }
}

export function offlineKanban()          { return load<object[]>('kanban'); }
export function offlineKpis()            { return load<object[]>('kpis')[0] ?? {}; }
export function offlinePorDia()          { return load<object[]>('porDia'); }
export function offlineDistribuicao()    { return load<object[]>('distribuicao'); }
export function offlineErrosFrequentes() { return load<object[]>('errosFrequentes'); }
export function offlineClientes()        {
  const rows = load<{ cliente: string }[]>('clientes');
  return rows.map(r => r.cliente);
}
