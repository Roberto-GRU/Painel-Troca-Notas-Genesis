import { NextResponse } from 'next/server';
import { getKPIs } from '@/lib/queries';
import { OFFLINE, offlineKpis } from '@/lib/offline';

export async function GET() {
  // ── MODO OFFLINE ─────────────────────────────────────────────────────────
  if (OFFLINE) return NextResponse.json(offlineKpis());
  // ── MODO ONLINE ──────────────────────────────────────────────────────────
  try {
    return NextResponse.json(await getKPIs());
  } catch (err) {
    console.error('[API kpis]', err);
    return NextResponse.json({ error: 'Erro ao carregar KPIs' }, { status: 500 });
  }
}
