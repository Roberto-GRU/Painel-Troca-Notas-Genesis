/**
 * Middleware de autenticação — executado no Edge antes de qualquer rota.
 *
 * Rotas públicas (sem login):
 *   /login, /api/auth/* — necessários para o próprio fluxo de login
 *   /_next/*            — assets do Next.js (JS, CSS, HMR)
 *   /uploads/*          — arquivos enviados pelos usuários (PDFs, XMLs)
 *                         precisam ser acessíveis para o navegador renderizar
 *
 * Todas as demais rotas (dashboard, kanban, APIs de dados) exigem cookie
 * de sessão válido; caso contrário redireciona para /login.
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/uploads/');

  if (isPublic) return NextResponse.next();

  const cookie = req.headers.get('cookie');
  const user = validateSession(cookie);

  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Exclui _next/static e _next/image do matcher para não interceptar
  // assets estáticos e otimização de imagens do Next.js
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
