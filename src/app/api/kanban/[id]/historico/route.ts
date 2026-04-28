import { NextRequest, NextResponse } from 'next/server';
import { getHistoricoOS } from '@/lib/queries';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hist = await getHistoricoOS(Number(params.id));
    return NextResponse.json(hist);
  } catch (err) {
    console.error('[API historico]', err);
    return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 });
  }
}
