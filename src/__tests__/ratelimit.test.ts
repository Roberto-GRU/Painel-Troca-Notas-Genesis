import { describe, it, expect, vi } from 'vitest';
import { rateLimit, getClientIp } from '@/lib/ratelimit';
import type { NextRequest } from 'next/server';

// Cria um NextRequest mínimo com headers controlados
function makeReq(headers: Record<string, string>): NextRequest {
  return {
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

// ── rateLimit ─────────────────────────────────────────────────────────────────

describe('rateLimit', () => {
  it('permite requisições dentro do limite', () => {
    expect(rateLimit('rl:allow-1', 3, 60_000)).toBe(true);
    expect(rateLimit('rl:allow-1', 3, 60_000)).toBe(true);
    expect(rateLimit('rl:allow-1', 3, 60_000)).toBe(true);
  });

  it('bloqueia ao atingir o limite', () => {
    rateLimit('rl:block-1', 2, 60_000);
    rateLimit('rl:block-1', 2, 60_000);
    expect(rateLimit('rl:block-1', 2, 60_000)).toBe(false);
  });

  it('continua bloqueando após o limite', () => {
    rateLimit('rl:block-2', 1, 60_000);
    expect(rateLimit('rl:block-2', 1, 60_000)).toBe(false);
    expect(rateLimit('rl:block-2', 1, 60_000)).toBe(false);
  });

  it('chaves diferentes não interferem entre si', () => {
    rateLimit('rl:chave-a', 1, 60_000);
    expect(rateLimit('rl:chave-a', 1, 60_000)).toBe(false);
    expect(rateLimit('rl:chave-b', 1, 60_000)).toBe(true); // chave diferente
  });

  it('libera nova janela após o tempo expirar', () => {
    vi.useFakeTimers();

    const key = 'rl:expire-1';
    rateLimit(key, 1, 1_000); // janela de 1 segundo
    expect(rateLimit(key, 1, 1_000)).toBe(false); // bloqueado

    vi.advanceTimersByTime(1_100); // passa a janela
    expect(rateLimit(key, 1, 1_000)).toBe(true); // nova janela

    vi.useRealTimers();
  });

  it('limite 1 permite exatamente 1 requisição', () => {
    const key = 'rl:limit-1';
    expect(rateLimit(key, 1, 60_000)).toBe(true);
    expect(rateLimit(key, 1, 60_000)).toBe(false);
  });
});

// ── getClientIp ───────────────────────────────────────────────────────────────

describe('getClientIp', () => {
  it('usa x-real-ip quando disponível (header do proxy)', () => {
    const req = makeReq({ 'x-real-ip': '192.168.1.100' });
    expect(getClientIp(req)).toBe('192.168.1.100');
  });

  it('x-real-ip tem prioridade sobre x-forwarded-for', () => {
    const req = makeReq({
      'x-real-ip': '192.168.1.1',
      'x-forwarded-for': '10.0.0.1, 10.0.0.2',
    });
    expect(getClientIp(req)).toBe('192.168.1.1');
  });

  it('remove espaços do x-real-ip', () => {
    const req = makeReq({ 'x-real-ip': '  10.0.0.1  ' });
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('usa o ÚLTIMO IP do x-forwarded-for (adicionado pelo proxy mais próximo)', () => {
    // "client, proxy1, proxy2" — último é o mais confiável (posto pelo proxy)
    const req = makeReq({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1, 172.16.0.1' });
    expect(getClientIp(req)).toBe('172.16.0.1');
  });

  it('usa IP único do x-forwarded-for quando só há um', () => {
    const req = makeReq({ 'x-forwarded-for': '203.0.113.42' });
    expect(getClientIp(req)).toBe('203.0.113.42');
  });

  it('retorna "unknown" quando nenhum header de IP está presente', () => {
    const req = makeReq({});
    expect(getClientIp(req)).toBe('unknown');
  });

  it('ignora outros headers e retorna "unknown"', () => {
    const req = makeReq({ 'user-agent': 'Mozilla/5.0', 'accept': 'application/json' });
    expect(getClientIp(req)).toBe('unknown');
  });
});
