import { NextRequest, NextResponse } from 'next/server';
import { getErrosOS } from '@/lib/queries';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const erros = await getErrosOS(Number(params.id));
    return NextResponse.json(erros);
  } catch (err) {
    console.error('[API erros]', err);
    return NextResponse.json({ error: 'Erro ao carregar erros' }, { status: 500 });
  }
}
