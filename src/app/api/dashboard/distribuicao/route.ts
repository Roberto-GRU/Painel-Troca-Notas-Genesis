import { NextRequest, NextResponse } from 'next/server';
import { getDistribuicaoStatus } from '@/lib/queries';
import { OFFLINE, offlineDistribuicao } from '@/lib/offline';

function getFiltros(req: NextRequest) {
  const s = req.nextUrl.searchParams;
  return {
    data_inicio: s.get('data_inicio') ?? undefined,
    data_fim:    s.get('data_fim')    ?? undefined,
    cliente:     s.get('cliente')     ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  const filtros = getFiltros(req);
  if (OFFLINE) return NextResponse.json(offlineDistribuicao(filtros));
  try {
    return NextResponse.json(await getDistribuicaoStatus(filtros));
  } catch (err) {
    console.error('[API distribuicao]', err);
    return NextResponse.json([], { status: 200 });
  }
}
