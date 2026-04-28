/**
 * Autenticação com Web Crypto API — compatível com Edge runtime do Next.js middleware.
 *
 * O módulo Node.js 'crypto' (createHmac, timingSafeEqual) NÃO está disponível
 * no Edge runtime onde o middleware executa. Por isso usamos crypto.subtle
 * (Web Crypto API), que é async mas funciona tanto no Edge quanto no Node.js.
 *
 * Formato do token: `username:role:timestamp_unix.HMAC_hex`
 *   - HMAC-SHA256 assina o payload — timing-safe por spec do crypto.subtle.verify
 *   - timestamp permite checar expiração sem estado no servidor
 *
 * Para invalidar todas as sessões ativas: mude SESSION_SECRET e reinicie.
 */

const COOKIE_NAME = 'sess';
const MAX_AGE_SEC = 8 * 60 * 60; // 8 horas

export interface SessionData { username: string; role: string }

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === 'changeme-set-SESSION_SECRET-in-env') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET não configurado — defina no .env.local antes de iniciar em produção');
    }
    console.warn('[auth] SESSION_SECRET não configurado — usando chave insegura (apenas dev)');
  }
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret ?? 'changeme-set-SESSION_SECRET-in-env'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuf(hex: string): Uint8Array<ArrayBuffer> {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return arr;
}

async function sign(payload: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${payload}.${bufToHex(sig)}`;
}

async function verify(token: string): Promise<SessionData | null> {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;

  const payload = token.slice(0, dot);
  const sigHex  = token.slice(dot + 1);

  try {
    const key   = await getKey();
    // crypto.subtle.verify é timing-safe por spec — equivale ao timingSafeEqual
    const valid = await crypto.subtle.verify(
      'HMAC', key, hexToBuf(sigHex), new TextEncoder().encode(payload),
    );
    if (!valid) return null;
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

export async function createSessionCookie(username: string, role: string): Promise<string> {
  const ts    = Math.floor(Date.now() / 1000);
  const token = await sign(`${username}:${role}:${ts}`);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  // HttpOnly: inacessível via JS (mitiga XSS)  SameSite=Strict: mitiga CSRF  Secure: só HTTPS
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SEC}${secure}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

export async function validateSession(cookieHeader: string | null): Promise<SessionData | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verify(match[1]);
}

export { COOKIE_NAME };
