/**
 * Autenticação baseada em cookie HMAC-SHA256 assinado — sem banco de dados.
 *
 * Formato do token: `user:timestamp_unix.HMAC_hex`
 *   - "user" é o nome do usuário (sempre "admin" neste sistema single-user)
 *   - "timestamp_unix" permite checar expiração sem consulta ao banco
 *   - O HMAC garante que o browser não pode forjar nem alterar o token
 *
 * Para trocar a senha ou invalidar todas as sessões ativas:
 *   - Mude ADMIN_PASSWORD ou SESSION_SECRET no .env.local e reinicie o servidor
 */
import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.SESSION_SECRET ?? 'changeme-set-SESSION_SECRET-in-env';
const COOKIE_NAME = 'sess';
const MAX_AGE_SEC = 8 * 60 * 60; // 8 horas — equivale a um turno de trabalho

function sign(payload: string): string {
  const mac = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${mac}`;
}

function verify(token: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const expected = sign(payload);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(token);
    // timingSafeEqual evita timing attacks onde um atacante mede diferenças
    // de tempo entre comparações char-a-char para adivinhar o HMAC correto
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const parts = payload.split(':');
  const ts = Number(parts[1]);
  if (Date.now() / 1000 - ts > MAX_AGE_SEC) return null;
  return parts[0]; // retorna o nome do usuário
}

export function createSessionCookie(user: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const token = sign(`${user}:${ts}`);
  // HttpOnly: inacessível via JS no browser (mitiga XSS)
  // SameSite=Strict: não enviado em requisições cross-site (mitiga CSRF)
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SEC}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

export function validateSession(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verify(match[1]);
}

export function validatePassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  // Nega acesso se ADMIN_PASSWORD não está definido no .env.local
  if (!expected) return false;
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(password);
    // timingSafeEqual aqui também — evita descobrir a senha por timing
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
