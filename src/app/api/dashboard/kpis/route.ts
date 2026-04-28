import { NextResponse } from 'next/server';
import { getKPIs } from '@/lib/queries';

export async function GET() {
  try {
    const kpis = await getKPIs();
    return NextResponse.json(kpis);
  } catch (err) {
    console.error('[API kpis]', err);
    return NextResponse.json({ error: 'Erro ao carregar KPIs' }, { status: 500 });
  }
}
