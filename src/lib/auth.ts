/**
 * Autenticação baseada em cookie HMAC-SHA256 assinado — sem banco de dados.
 *
 * Formato do token: `username:role:timestamp_unix.HMAC_hex`
 *   - username + role: disponíveis sem consulta ao banco
 *   - timestamp: permite checar expiração sem estado no servidor
 *   - HMAC: garante que o browser não pode forjar nem alterar o token
 *
 * Para invalidar todas as sessões ativas:
 *   - Mude SESSION_SECRET no .env.local e reinicie o servidor
 */
import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.SESSION_SECRET ?? 'changeme-set-SESSION_SECRET-in-env';
const COOKIE_NAME = 'sess';
const MAX_AGE_SEC = 8 * 60 * 60; // 8 horas — equivale a um turno de trabalho

export interface SessionData { username: string; role: string }

function sign(payload: string): string {
  const mac = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${mac}`;
}

function verify(token: string): SessionData | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const expected = sign(payload);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(token);
    // timingSafeEqual evita timing attacks onde um atacante mede tempo de comparação
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch { return null; }

  // payload = "username:role:timestamp"
  const parts = payload.split(':');
  if (parts.length < 3) return null;
  const ts = Number(parts[parts.length - 1]);
  if (Date.now() / 1000 - ts > MAX_AGE_SEC) return null;
  const role     = parts[parts.length - 2];
  const username = parts.slice(0, parts.length - 2).join(':');
  return { username, role };
}

export function createSessionCookie(username: string, role: string): string {
  const ts    = Math.floor(Date.now() / 1000);
  const token = sign(`${username}:${role}:${ts}`);
  // HttpOnly: inacessível via JS no browser (mitiga XSS)
  // SameSite=Strict: não enviado em requisições cross-site (mitiga CSRF)
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SEC}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

export function validateSession(cookieHeader: string | null): SessionData | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verify(match[1]);
}

export { COOKIE_NAME };
