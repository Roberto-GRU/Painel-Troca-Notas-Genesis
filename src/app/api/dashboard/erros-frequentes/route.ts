import { NextResponse } from 'next/server';
import { getErrosMaisFrequentes } from '@/lib/queries';

export async function GET() {
  try {
    const data = await getErrosMaisFrequentes();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[API erros-frequentes]', err);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}
