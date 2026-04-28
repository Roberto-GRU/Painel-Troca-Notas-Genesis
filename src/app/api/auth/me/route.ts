import { NextRequest, NextResponse } from 'next/server';

// Retorna dados do usuário logado — lidos dos headers injetados pelo middleware
export function GET(req: NextRequest) {
  const username    = req.headers.get('x-user') ?? '';
  const role        = req.headers.get('x-role') ?? '';
  return NextResponse.json({ username, role });
}
