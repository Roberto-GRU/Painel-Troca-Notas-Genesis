import { NextRequest, NextResponse } from 'next/server';
import { getErrosOS } from '@/lib/queries';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  try {
    const erros = await getErrosOS(id);
    return NextResponse.json(erros);
  } catch (err) {
    console.error('[API erros]', err);
    return NextResponse.json({ error: 'Erro ao carregar erros' }, { status: 500 });
  }
}
