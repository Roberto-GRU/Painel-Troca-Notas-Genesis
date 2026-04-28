import { NextRequest, NextResponse } from 'next/server';
import { getKPIs } from '@/lib/queries';
import { OFFLINE, offlineKpis } from '@/lib/offline';

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
  if (OFFLINE) return NextResponse.json(offlineKpis(filtros));
  try {
    return NextResponse.json(await getKPIs(filtros));
  } catch (err) {
    console.error('[API kpis]', err);
    return NextResponse.json({ error: 'Erro ao carregar KPIs' }, { status: 500 });
  }
}
