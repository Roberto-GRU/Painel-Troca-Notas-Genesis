import { NextRequest, NextResponse } from 'next/server';
import { getOSKanban } from '@/lib/queries';
import { OFFLINE, offlineKanban } from '@/lib/offline';

export async function GET(req: NextRequest) {
  // ── MODO OFFLINE: serve snapshot local ──────────────────────────────────
  if (OFFLINE) return NextResponse.json(offlineKanban());
  // ── MODO ONLINE ──────────────────────────────────────────────────────────
  try {
    const sp = req.nextUrl.searchParams;
    const os = await getOSKanban({
      cliente:     sp.get('cliente')     ?? undefined,
      data_inicio: sp.get('data_inicio') ?? undefined,
      data_fim:    sp.get('data_fim')    ?? undefined,
      search:      sp.get('search')      ?? undefined,
    });
    return NextResponse.json(os);
  } catch (err) {
    console.error('[API kanban]', err);
    return NextResponse.json([], { status: 200 });
  }
}
