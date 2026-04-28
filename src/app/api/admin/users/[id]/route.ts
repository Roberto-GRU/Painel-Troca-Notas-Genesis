import { NextRequest, NextResponse } from 'next/server';
import { updateUser, deleteUser } from '@/lib/users';

function requireAdmin(req: NextRequest) {
  if (req.headers.get('x-role') !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json() as { displayName?: string; password?: string; role?: string; active?: boolean };
    updateUser(params.id, {
      displayName: body.displayName,
      password:    body.password,
      role:        body.role as 'admin' | 'user' | undefined,
      active:      body.active,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar usuário';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    deleteUser(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao remover usuário';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
