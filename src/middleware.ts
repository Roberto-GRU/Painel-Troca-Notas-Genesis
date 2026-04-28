/**
 * Middleware de autenticação — executado no Edge antes de qualquer rota.
 *
 * Rotas públicas: /login, /api/auth/*, /_next/*, /uploads/*
 *
 * Para rotas autenticadas:
 *   - Valida o cookie de sessão HMAC
 *   - Injeta x-user e x-role nos headers da requisição
 *   - Os route handlers lêem req.headers.get('x-user') para saber quem está agindo
 *
 * Rotas /admin/* requerem role='admin' — verificado nos API handlers individuais.
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon');

  if (isPublic) return NextResponse.next();

  const session = await validateSession(req.headers.get('cookie'));

  if (!session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Propaga username e role para os route handlers via headers
  const headers = new Headers(req.headers);
  headers.set('x-user', session.username);
  headers.set('x-role', session.role);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
