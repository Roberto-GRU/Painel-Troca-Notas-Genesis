import { describe, it, expect } from 'vitest';
import { mapStatusToKanban, getTipoErro, formatTempo, getTempoColor } from '@/types';

// ── mapStatusToKanban ──────────────────────────────────────────────────────────

describe('mapStatusToKanban', () => {
  it('Finalizado → concluido', () => {
    expect(mapStatusToKanban('Finalizado')).toBe('concluido');
  });
  it('Erro → erro', () => {
    expect(mapStatusToKanban('Erro')).toBe('erro');
  });
  it('Pendente PDA → pendente', () => {
    expect(mapStatusToKanban('Pendente PDA')).toBe('pendente');
  });
  it('qualquer string com "Pendente" → pendente', () => {
    expect(mapStatusToKanban('Pendente XYZ')).toBe('pendente');
  });
  it('Enviado → lancado', () => {
    expect(mapStatusToKanban('Enviado')).toBe('lancado');
  });
  it('string vazia → os_marcada', () => {
    expect(mapStatusToKanban('')).toBe('os_marcada');
  });
  it('status desconhecido → os_marcada', () => {
    expect(mapStatusToKanban('Status Inexistente')).toBe('os_marcada');
  });
  it('é case-insensitive — finalizado minúsculo', () => {
    expect(mapStatusToKanban('finalizado')).toBe('concluido');
  });
  it('é case-insensitive — ERRO maiúsculo', () => {
    expect(mapStatusToKanban('ERRO')).toBe('erro');
  });
  it('remove espaços antes de comparar', () => {
    expect(mapStatusToKanban('  Finalizado  ')).toBe('concluido');
  });
});

// ── getTipoErro ────────────────────────────────────────────────────────────────

describe('getTipoErro', () => {
  it('identifica Chave NF Vazia', () => {
    const tipo = getTipoErro('Chave NF Vazia detectada pelo sistema');
    expect(tipo?.codigo).toBe('CHAVE_NF_VAZIA');
    expect(tipo?.campo_correcao).toBe('chave_nfe');
    expect(tipo?.requer_documento).toBe(false);
  });

  it('identifica divergência de placa (com acento e maiúsculas)', () => {
    const tipo = getTipoErro('Divergência de placa no cte encontrada');
    expect(tipo?.codigo).toBe('PLACA_DIVERGENTE_CTE');
  });

  it('identifica divergência de peso líquido (com acento)', () => {
    const tipo = getTipoErro('Divergência de peso líquido no CTE');
    expect(tipo?.codigo).toBe('PESO_DIVERGENTE_CTE');
  });

  it('identifica documento NF não anexado', () => {
    const tipo = getTipoErro('Documento nf nao esta anexado');
    expect(tipo?.codigo).toBe('DOC_NF_AUSENTE');
    expect(tipo?.requer_documento).toBe(true);
  });

  it('identifica erro Bunge SAP com mensagem variada', () => {
    const tipo = getTipoErro('Erro Bunge SAP: timeout na conexão');
    expect(tipo?.codigo).toBe('ERRO_BUNGE_SAP');
    expect(tipo?.campo_correcao).toBe('obs_correcao');
  });

  it('retorna null para mensagem de erro completamente desconhecida', () => {
    expect(getTipoErro('Mensagem totalmente desconhecida xyz 999')).toBeNull();
  });

  it('identifica máximo de tentativas', () => {
    const tipo = getTipoErro('Atingido maximo de tentativas de processamento');
    expect(tipo?.codigo).toBe('MAX_TENTATIVAS');
  });

  it('identifica placa não encontrada', () => {
    const tipo = getTipoErro('Placa nao encontrada no banco de dados');
    expect(tipo?.codigo).toBe('PLACA_NAO_ENCONTRADA');
  });
});

// ── formatTempo ────────────────────────────────────────────────────────────────

describe('formatTempo', () => {
  it('0 minutos → "0m"', () => {
    expect(formatTempo(0)).toBe('0m');
  });
  it('45 minutos → "45m"', () => {
    expect(formatTempo(45)).toBe('45m');
  });
  it('59 minutos → "59m"', () => {
    expect(formatTempo(59)).toBe('59m');
  });
  it('60 minutos → "1h 0m"', () => {
    expect(formatTempo(60)).toBe('1h 0m');
  });
  it('90 minutos → "1h 30m"', () => {
    expect(formatTempo(90)).toBe('1h 30m');
  });
  it('150 minutos → "2h 30m"', () => {
    expect(formatTempo(150)).toBe('2h 30m');
  });
  it('24h exatas → "1d 0h"', () => {
    expect(formatTempo(24 * 60)).toBe('1d 0h');
  });
  it('25h → "1d 1h"', () => {
    expect(formatTempo(25 * 60)).toBe('1d 1h');
  });
  it('48h + 30min → "2d 0h"', () => {
    expect(formatTempo(48 * 60 + 30)).toBe('2d 0h');
  });
});

// ── getTempoColor ──────────────────────────────────────────────────────────────

describe('getTempoColor', () => {
  it('0 min → verde', () => {
    expect(getTempoColor(0)).toContain('green');
  });
  it('59 min → verde', () => {
    expect(getTempoColor(59)).toContain('green');
  });
  it('60 min → amarelo', () => {
    expect(getTempoColor(60)).toContain('yellow');
  });
  it('239 min → amarelo', () => {
    expect(getTempoColor(239)).toContain('yellow');
  });
  it('240 min → vermelho', () => {
    expect(getTempoColor(240)).toContain('red');
  });
  it('9999 min → vermelho', () => {
    expect(getTempoColor(9999)).toContain('red');
  });
});
