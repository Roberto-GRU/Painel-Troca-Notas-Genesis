import { NextRequest, NextResponse } from 'next/server';
import { getOSById } from '@/lib/queries';

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
