import { NextResponse } from 'next/server';
import { getOSPorDia } from '@/lib/queries';

export async function GET() {
  try {
    const data = await getOSPorDia();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[API por-dia]', err);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}
