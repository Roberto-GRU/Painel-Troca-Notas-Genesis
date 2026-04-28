import { NextRequest, NextResponse } from 'next/server';
import { getOSKanban } from '@/lib/queries';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const os = await getOSKanban({
      cliente: sp.get('cliente') ?? undefined,
      data_inicio: sp.get('data_inicio') ?? undefined,
      data_fim: sp.get('data_fim') ?? undefined,
      search: sp.get('search') ?? undefined,
    });
    return NextResponse.json(os);
  } catch (err) {
    console.error('[API kanban]', err);
    return NextResponse.json({ error: 'Erro ao carregar OS' }, { status: 500 });
  }
}
