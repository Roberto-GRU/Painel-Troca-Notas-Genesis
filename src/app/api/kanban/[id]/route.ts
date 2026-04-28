/**
 * API de leitura e correção de uma OS individual.
 *
 * PATCH — fluxo de correção:
 *   1. Valida `campo` contra CAMPOS_PERMITIDOS (whitelist explícita)
 *   2. Chama updateOSCorrecao() que atualiza o dado e muda status → 'Pendente PDA'
 *   3. O RPA detecta o status Pendente PDA e reprocessa a OS automaticamente
 *
 * Em modo offline (DB_OFFLINE=true):
 *   - Lê/grava offline-data/kanban.json
 *   - Não valida campo nem salva o valor — apenas move o status para pendente
 *     para que o card saia de Erros e vá para Processando no kanban
 */
import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getOSById, updateOSCorrecao } from '@/lib/queries';
import { OFFLINE } from '@/lib/offline';
import { rateLimit } from '@/lib/ratelimit';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const os = await getOSById(Number(params.id));
    if (!os) return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 });
    return NextResponse.json(os);
  } catch (err) {
    console.error('[API os/:id]', err);
    return NextResponse.json({ error: 'Erro ao carregar OS' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!rateLimit(`patch:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Muitas requisições' }, { status: 429 });
  }
  if (OFFLINE) {
    const osId   = Number(params.id);
    const offDir = path.join(process.cwd(), 'offline-data');

    // Atualiza kanban.json para o card se mover no board
    try {
      const kanbanPath = path.join(offDir, 'kanban.json');
      const data: Record<string, unknown>[] = JSON.parse(fs.readFileSync(kanbanPath, 'utf8'));
      const updated = data.map(r =>
        Number(r.id) === osId
          ? { ...r, status: 'Pendente PDA', kanban_status: 'pendente' }
          : r
      );
      fs.writeFileSync(kanbanPath, JSON.stringify(updated, null, 2));
    } catch { /* ignora falha de leitura do JSON */ }

    // Persiste a correção em pending.json para sync posterior com o banco
    try {
      const body   = await req.json() as { campo?: string; valor?: string };
      const pendingPath = path.join(offDir, 'pending.json');
      const existing: unknown[] = fs.existsSync(pendingPath)
        ? JSON.parse(fs.readFileSync(pendingPath, 'utf8'))
        : [];
      existing.push({
        id:        osId,
        campo:     body.campo ?? '',
        valor:     body.valor ?? '',
        usuario:   req.headers.get('x-user') ?? 'sistema',
        timestamp: new Date().toISOString(),
      });
      fs.writeFileSync(pendingPath, JSON.stringify(existing, null, 2));
    } catch { /* ignora falha ao gravar pending */ }

    return NextResponse.json({ success: true });
  }
  try {
    const { campo, valor } = await req.json() as { campo: string; valor: string };
    if (!campo) return NextResponse.json({ error: 'campo obrigatório' }, { status: 400 });

    // Whitelist explícita — deve espelhar as chaves de CAMPO_MAP em queries.ts
    // e o campo_correcao dos ERRO_TIPOS em types/index.ts
    const CAMPOS_PERMITIDOS = new Set([
      'placa_correta', 'peso_liquido', 'chave_nfe', 'numero_contrato',
      'obs_correcao', 'zerar_tentativas',
      'arquivo_nf', 'arquivo_tp', 'arquivo_dt', 'arquivo_ticket', 'arquivo_cte', 'arquivo_doc',
    ]);
    if (!CAMPOS_PERMITIDOS.has(campo)) {
      return NextResponse.json({ error: 'campo não permitido' }, { status: 400 });
    }

    const usuario = req.headers.get('x-user') ?? 'sistema';
    await updateOSCorrecao(Number(params.id), campo, valor ?? '', usuario);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API PATCH os/:id]', err);
    return NextResponse.json({ error: 'Erro ao salvar correção' }, { status: 500 });
  }
}
