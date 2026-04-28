import { NextRequest, NextResponse } from 'next/server';
import { listUsers, createUser } from '@/lib/users';

function requireAdmin(req: NextRequest) {
  if (req.headers.get('x-role') !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }
  return null;
}

export function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json(listUsers());
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json() as { username?: string; displayName?: string; password?: string; role?: string };
    if (!body.username || !body.displayName || !body.password || !body.role) {
      return NextResponse.json({ error: 'Campos obrigatórios: username, displayName, password, role' }, { status: 400 });
    }
    if (body.role !== 'admin' && body.role !== 'user') {
      return NextResponse.json({ error: 'role deve ser "admin" ou "user"' }, { status: 400 });
    }
    const user = createUser({
      username: body.username,
      displayName: body.displayName,
      password: body.password,
      role: body.role,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar usuário';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
