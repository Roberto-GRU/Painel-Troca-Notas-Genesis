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
    const actor = req.headers.get('x-user') ?? 'desconhecido';
    const changes = Object.keys(body).filter(k => body[k as keyof typeof body] !== undefined).join(', ');
    console.info(`[admin] ${actor} editou usuário id=${params.id} (campos: ${changes})`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Erros de validação (usuário não encontrado, senha curta, etc.) são seguros de expor
    // Outros erros de sistema: log interno, mensagem genérica pro cliente
    const isValidation = err instanceof Error && err.message.length < 120;
    console.error('[admin PATCH user]', err);
    const msg = isValidation ? (err as Error).message : 'Erro ao atualizar usuário';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    deleteUser(params.id);
    const actor = req.headers.get('x-user') ?? 'desconhecido';
    console.info(`[admin] ${actor} removeu usuário id=${params.id}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const isValidation = err instanceof Error && err.message.length < 120;
    console.error('[admin DELETE user]', err);
    const msg = isValidation ? (err as Error).message : 'Erro ao remover usuário';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
