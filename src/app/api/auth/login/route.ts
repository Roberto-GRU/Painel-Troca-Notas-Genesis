import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials } from '@/lib/users';
import { createSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json() as { username?: string; password?: string };

  const user = validateCredentials(username ?? '', password ?? '');

  if (!user) {
    // Delay fixo evita inferir se o usuário existe via timing
    await new Promise(r => setTimeout(r, 500));
    return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, username: user.username, role: user.role, displayName: user.displayName });
  res.headers.set('Set-Cookie', createSessionCookie(user.username, user.role));
  return res;
}
