/**
 * Rate limiter em memória com janela fixa por chave (geralmente IP).
 *
 * Limitação: store vive no processo Node.js — reseta ao reiniciar e não
 * funciona em deploys multi-instância. Para escala horizontal, usar Redis.
 *
 * Uso:
 *   rateLimit(`login:${getClientIp(req)}`, 5, 60_000)
 */
import type { NextRequest } from 'next/server';

interface Entry { count: number; reset: number }
const store = new Map<string, Entry>();

// Remove entradas expiradas a cada 10 minutos para evitar crescimento ilimitado
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now > entry.reset) store.delete(key);
  });
}, 10 * 60 * 1000);

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now   = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/**
 * Extrai o IP real do cliente de forma resistente a spoofing.
 *
 * Em produção atrás de um proxy confiável (Traefik/nginx), o proxy sobrescreve
 * x-forwarded-for e o cliente não consegue forjá-lo. Em desenvolvimento direto,
 * usamos o socket remoto via x-real-ip ou fallback para 'unknown'.
 *
 * IMPORTANTE: configure o proxy para não repassar x-forwarded-for do cliente —
 * apenas o próprio proxy deve setar esse header.
 */
export function getClientIp(req: NextRequest): string {
  // x-real-ip é setado por Traefik/nginx com o IP real — não é repassado do cliente
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // x-forwarded-for pode ter múltiplos IPs: "client, proxy1, proxy2"
  // O último é adicionado pelo proxy mais próximo — mais confiável que o primeiro
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(s => s.trim());
    return ips[ips.length - 1];
  }

  return 'unknown';
}
