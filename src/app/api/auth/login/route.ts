import { NextRequest, NextResponse } from 'next/server';
import { validatePassword, createSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password?: string };

  if (!validatePassword(password ?? '')) {
    await new Promise(r => setTimeout(r, 500)); // delay brute-force
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', createSessionCookie('admin'));
  return res;
}
