import { NextRequest, NextResponse } from 'next/server';
import { getOSById, updateOSCorrecao } from '@/lib/queries';
import { OFFLINE } from '@/lib/offline';

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
  if (OFFLINE) {
    return NextResponse.json({ success: true, offline: true });
  }
  try {
    const { campo, valor } = await req.json() as { campo: string; valor: string };
    if (!campo) return NextResponse.json({ error: 'campo obrigatório' }, { status: 400 });

    await updateOSCorrecao(Number(params.id), campo, valor ?? '');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API PATCH os/:id]', err);
    return NextResponse.json({ error: 'Erro ao salvar correção' }, { status: 500 });
  }
}
