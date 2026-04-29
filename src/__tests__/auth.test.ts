import { describe, it, expect, vi } from 'vitest';
import { createSessionCookie, validateSession, COOKIE_NAME } from '@/lib/auth';

// Extrai o valor bruto do token do header Set-Cookie completo
function extractToken(cookie: string): string {
  return cookie.split('=').slice(1).join('=').split(';')[0];
}

// ── createSessionCookie ────────────────────────────────────────────────────────

describe('createSessionCookie', () => {
  it('começa com o nome correto do cookie', async () => {
    const cookie = await createSessionCookie('roberto', 'admin');
    expect(cookie).toMatch(new RegExp(`^${COOKIE_NAME}=`));
  });

  it('contém os atributos de segurança obrigatórios', async () => {
    const cookie = await createSessionCookie('roberto', 'admin');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/');
  });

  it('expira em 8 horas (Max-Age=28800)', async () => {
    const cookie = await createSessionCookie('roberto', 'admin');
    expect(cookie).toContain('Max-Age=28800');
  });

  it('NÃO inclui flag Secure fora de produção (NODE_ENV=test)', async () => {
    const cookie = await createSessionCookie('roberto', 'admin');
    expect(cookie).not.toContain('Secure');
  });

  it('inclui flag Secure em NODE_ENV=production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const cookie = await createSessionCookie('roberto', 'admin');
    expect(cookie).toContain('Secure');
    vi.unstubAllEnvs();
    // Restaura para não afetar outros testes
    process.env.NODE_ENV = 'test';
  });

  it('o token tem formato payload.assinatura', async () => {
    const cookie = await createSessionCookie('roberto', 'admin');
    const token = extractToken(cookie);
    const parts = token.split('.');
    // Formato: "username:role:timestamp.HMACHex"
    expect(parts.length).toBe(2);
    expect(parts[1]).toMatch(/^[0-9a-f]+$/); // assinatura em hex
  });
});

// ── validateSession ────────────────────────────────────────────────────────────

describe('validateSession', () => {
  it('retorna SessionData correto para cookie válido', async () => {
    const cookie = await createSessionCookie('roberto', 'admin');
    const token = extractToken(cookie);
    const session = await validateSession(`${COOKIE_NAME}=${token}`);
    expect(session).toEqual({ username: 'roberto', role: 'admin' });
  });

  it('retorna SessionData correto para role user', async () => {
    const cookie = await createSessionCookie('operador', 'user');
    const token = extractToken(cookie);
    const session = await validateSession(`${COOKIE_NAME}=${token}`);
    expect(session).toEqual({ username: 'operador', role: 'user' });
  });

  it('preserva username com dois pontos (ex: dominio:usuario)', async () => {
    const cookie = await createSessionCookie('empresa:roberto', 'admin');
    const token = extractToken(cookie);
    const session = await validateSession(`${COOKIE_NAME}=${token}`);
    expect(session?.username).toBe('empresa:roberto');
    expect(session?.role).toBe('admin');
  });

  it('lê cookie corretamente quando há múltiplos cookies no header', async () => {
    const cookie = await createSessionCookie('roberto', 'admin');
    const token = extractToken(cookie);
    const header = `outro=valor; ${COOKIE_NAME}=${token}; mais=um`;
    const session = await validateSession(header);
    expect(session?.username).toBe('roberto');
  });

  it('retorna null para cookieHeader null', async () => {
    expect(await validateSession(null)).toBeNull();
  });

  it('retorna null para string vazia', async () => {
    expect(await validateSession('')).toBeNull();
  });

  it('retorna null quando cookie não está no header', async () => {
    expect(await validateSession('outro=qualquercoisa')).toBeNull();
  });

  it('retorna null para token sem separador de assinatura', async () => {
    const result = await validateSession(`${COOKIE_NAME}=roberto:admin:9999999999`);
    expect(result).toBeNull();
  });

  it('retorna null para assinatura inválida (token adulterado)', async () => {
    const result = await validateSession(`${COOKIE_NAME}=roberto:admin:9999999999.deadbeef00`);
    expect(result).toBeNull();
  });

  it('retorna null para token com assinatura hex inválida', async () => {
    const result = await validateSession(`${COOKIE_NAME}=roberto:admin:9999999999.XXXXXXXX`);
    expect(result).toBeNull();
  });

  it('retorna null para token expirado (criado 9h atrás)', async () => {
    // Mocka Date.now para criar cookie com timestamp antigo
    const noveHorasAtras = Date.now() - 9 * 60 * 60 * 1000;
    vi.spyOn(Date, 'now').mockReturnValueOnce(noveHorasAtras);
    const cookie = await createSessionCookie('roberto', 'admin');
    vi.restoreAllMocks();

    const token = extractToken(cookie);
    const session = await validateSession(`${COOKIE_NAME}=${token}`);
    expect(session).toBeNull();
  });

  it('token válido criado agora NÃO está expirado', async () => {
    const cookie = await createSessionCookie('roberto', 'admin');
    const token = extractToken(cookie);
    const session = await validateSession(`${COOKIE_NAME}=${token}`);
    expect(session).not.toBeNull();
  });

  it('tokens com SESSION_SECRET diferentes são inválidos', async () => {
    // Cria token com secret diferente
    const originalSecret = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = 'outro-secret-completamente-diferente-32ch!';
    const cookie = await createSessionCookie('roberto', 'admin');
    const token = extractToken(cookie);

    // Restaura secret original para validar
    process.env.SESSION_SECRET = originalSecret;
    const session = await validateSession(`${COOKIE_NAME}=${token}`);
    expect(session).toBeNull();
  });
});
