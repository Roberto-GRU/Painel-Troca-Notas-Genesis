import { NextRequest, NextResponse } from 'next/server';
import { getErrosMaisFrequentes } from '@/lib/queries';
import { OFFLINE, offlineErrosFrequentes } from '@/lib/offline';

function getFiltros(req: NextRequest) {
  const s = req.nextUrl.searchParams;
  return {
    data_inicio: s.get('data_inicio') ?? undefined,
    data_fim:    s.get('data_fim')    ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  const filtros = getFiltros(req);
  if (OFFLINE) return NextResponse.json(offlineErrosFrequentes(filtros));
  try {
    return NextResponse.json(await getErrosMaisFrequentes(filtros));
  } catch (err) {
    console.error('[API erros-frequentes]', err);
    return NextResponse.json([], { status: 200 });
  }
}
