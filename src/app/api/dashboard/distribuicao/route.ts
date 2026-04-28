import { NextResponse } from 'next/server';
import { getDistribuicaoStatus } from '@/lib/queries';
import { OFFLINE, offlineDistribuicao } from '@/lib/offline';

export async function GET() {
  if (OFFLINE) return NextResponse.json(offlineDistribuicao());
  try {
    return NextResponse.json(await getDistribuicaoStatus());
  } catch (err) {
    console.error('[API distribuicao]', err);
    return NextResponse.json([], { status: 200 });
  }
}
