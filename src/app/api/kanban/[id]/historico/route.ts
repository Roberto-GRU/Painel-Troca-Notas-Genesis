import { NextRequest, NextResponse } from 'next/server';
import { getHistoricoOS } from '@/lib/queries';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  try {
    const hist = await getHistoricoOS(id);
    return NextResponse.json(hist);
  } catch (err) {
    console.error('[API historico]', err);
    return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 });
  }
}
