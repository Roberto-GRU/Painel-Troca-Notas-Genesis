import { NextResponse } from 'next/server';
import { getDistribuicaoStatus } from '@/lib/queries';

export async function GET() {
  try {
    const data = await getDistribuicaoStatus();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[API distribuicao]', err);
    return NextResponse.json([], { status: 200 });
  }
}
