import { NextResponse } from 'next/server';
import { getClientesDistintos } from '@/lib/queries';

export async function GET() {
  try {
    const clientes = await getClientesDistintos();
    return NextResponse.json(clientes);
  } catch (err) {
    console.error('[API clientes]', err);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}
