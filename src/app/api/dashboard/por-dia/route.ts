import { NextResponse } from 'next/server';
import { getOSPorDia } from '@/lib/queries';
import { OFFLINE, offlinePorDia } from '@/lib/offline';

export async function GET() {
  if (OFFLINE) return NextResponse.json(offlinePorDia());
  try {
    return NextResponse.json(await getOSPorDia());
  } catch (err) {
    console.error('[API por-dia]', err);
    return NextResponse.json([], { status: 200 });
  }
}
