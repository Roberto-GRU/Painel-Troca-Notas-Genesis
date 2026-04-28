import { NextResponse } from 'next/server';
import { getErrosMaisFrequentes } from '@/lib/queries';
import { OFFLINE, offlineErrosFrequentes } from '@/lib/offline';

export async function GET() {
  if (OFFLINE) return NextResponse.json(offlineErrosFrequentes());
  try {
    return NextResponse.json(await getErrosMaisFrequentes());
  } catch (err) {
    console.error('[API erros-frequentes]', err);
    return NextResponse.json([], { status: 200 });
  }
}
