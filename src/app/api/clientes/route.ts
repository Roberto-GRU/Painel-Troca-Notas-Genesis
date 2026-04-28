import { NextResponse } from 'next/server';
import { getClientesDistintos } from '@/lib/queries';
import { OFFLINE, offlineClientes } from '@/lib/offline';

export async function GET() {
  if (OFFLINE) return NextResponse.json(offlineClientes());
  try {
    return NextResponse.json(await getClientesDistintos());
  } catch (err) {
    console.error('[API clientes]', err);
    return NextResponse.json([], { status: 200 });
  }
}
