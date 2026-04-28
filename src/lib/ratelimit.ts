/**
 * Rate limiter em memória com janela fixa por chave (geralmente IP).
 *
 * Limitação importante: este store vive no processo Node.js, então:
 *   - Reseta quando o servidor reinicia (aceitável para uso interno)
 *   - NÃO funciona em deploys multi-instância (ex: múltiplos workers PM2)
 *   - Se escalar horizontalmente, substituir por Redis (ex: @upstash/ratelimit)
 *
 * Uso:
 *   rateLimit(`upload:${ip}`, 20, 60_000)  → 20 req/minuto por IP
 */
interface Window { count: number; reset: number }
const store = new Map<string, Window>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  // Cria nova janela se não existe ou a janela anterior já expirou
  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
