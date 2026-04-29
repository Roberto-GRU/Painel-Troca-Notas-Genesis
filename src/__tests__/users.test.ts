import { vi, describe, it, expect } from 'vitest';

/**
 * vi.hoisted garante que fsState seja inicializado ANTES que vi.mock seja processado.
 * Necessário porque vi.mock é içado (hoisted) ao topo do arquivo pelo Vitest,
 * e a factory do mock precisa fechar sobre uma variável já inicializada.
 */
const fsState = vi.hoisted(() => ({ content: null as string | null }));

vi.mock('fs', () => ({
  default: {
    existsSync:    () => fsState.content !== null,
    readFileSync:  () => {
      if (fsState.content === null) throw new Error('ENOENT: no such file');
      return fsState.content;
    },
    writeFileSync: (_: unknown, data: string) => { fsState.content = data; },
    mkdirSync:     () => {},
  },
}));

// Importa após o mock — garante que init() usa o fs mockado
import { validateCredentials, createUser, updateUser } from '@/lib/users';

// ── createUser — validação de username ────────────────────────────────────────

describe('createUser — username', () => {
  it('rejeita username com menos de 3 caracteres', () => {
    expect(() => createUser({ username: 'ab', displayName: 'X', password: 'senha1234', role: 'user' }))
      .toThrow(/3.50/);
  });

  it('rejeita username com mais de 50 caracteres', () => {
    const longo = 'a'.repeat(51);
    expect(() => createUser({ username: longo, displayName: 'X', password: 'senha1234', role: 'user' }))
      .toThrow();
  });

  it('rejeita username com espaço', () => {
    expect(() => createUser({ username: 'nome invalido', displayName: 'X', password: 'senha1234', role: 'user' }))
      .toThrow();
  });

  it('rejeita username com @', () => {
    expect(() => createUser({ username: 'nome@email', displayName: 'X', password: 'senha1234', role: 'user' }))
      .toThrow();
  });

  it('rejeita username com barra', () => {
    expect(() => createUser({ username: 'nome/sobrenome', displayName: 'X', password: 'senha1234', role: 'user' }))
      .toThrow();
  });

  it('aceita username com ponto, hífen e underscore', () => {
    // Não deve lançar erro de validação de username
    // (pode lançar duplicata se já existir, mas não erro de formato)
    try {
      createUser({ username: 'joao.silva_dev-1', displayName: 'X', password: 'senha1234', role: 'user' });
    } catch (e) {
      expect((e as Error).message).not.toMatch(/3.50|caracteres/i);
    }
  });
});

// ── createUser — validação de senha ───────────────────────────────────────────

describe('createUser — senha', () => {
  it('rejeita senha com menos de 8 caracteres', () => {
    expect(() => createUser({ username: 'usuario99', displayName: 'X', password: '1234567', role: 'user' }))
      .toThrow(/8 caracteres/);
  });

  it('rejeita senha com 0 caracteres', () => {
    expect(() => createUser({ username: 'usuario99', displayName: 'X', password: '', role: 'user' }))
      .toThrow(/8 caracteres/);
  });

  it('aceita senha com exatamente 8 caracteres', () => {
    try {
      createUser({ username: 'usuario8chars', displayName: 'X', password: '12345678', role: 'user' });
    } catch (e) {
      expect((e as Error).message).not.toMatch(/8 caracteres/);
    }
  });
});

// ── updateUser — validação de senha ───────────────────────────────────────────

describe('updateUser — senha', () => {
  it('rejeita nova senha com menos de 8 caracteres', () => {
    expect(() => updateUser('qualquer-id', { password: 'curta12' }))
      .toThrow(/8 caracteres/);
  });

  it('aceita senha vazia no update (significa "não alterar")', () => {
    // Senha vazia não dispara validação — depois lança "não encontrado"
    expect(() => updateUser('id-inexistente', { password: '' }))
      .not.toThrow(/8 caracteres/);
  });

  it('update sem campo senha não lança erro de senha', () => {
    expect(() => updateUser('id-inexistente', { displayName: 'Novo Nome' }))
      .not.toThrow(/8 caracteres/);
  });

  it('lança "não encontrado" para ID inexistente (não de senha)', () => {
    expect(() => updateUser('id-que-nao-existe', { displayName: 'X' }))
      .toThrow(/não encontrado/);
  });
});

// ── validateCredentials ────────────────────────────────────────────────────────
// init() cria admin/admin123 e operador/genesis123 ao importar o módulo

describe('validateCredentials — usuários padrão', () => {
  it('admin / admin123 → retorna o usuário', () => {
    const user = validateCredentials('admin', 'admin123');
    expect(user).not.toBeNull();
    expect(user?.username).toBe('admin');
    expect(user?.role).toBe('admin');
    expect(user?.active).toBe(true);
  });

  it('operador / genesis123 → retorna o usuário', () => {
    const user = validateCredentials('operador', 'genesis123');
    expect(user?.username).toBe('operador');
    expect(user?.role).toBe('user');
  });

  it('senha errada → null', () => {
    expect(validateCredentials('admin', 'senhaerrada123')).toBeNull();
  });

  it('senha vazia → null', () => {
    expect(validateCredentials('admin', '')).toBeNull();
  });

  it('usuário inexistente → null', () => {
    expect(validateCredentials('fantasma', 'qualquercoisa')).toBeNull();
  });

  it('usuário vazio → null', () => {
    expect(validateCredentials('', 'admin123')).toBeNull();
  });
});

// ── createUser + validateCredentials — roundtrip ──────────────────────────────

describe('createUser + validateCredentials — roundtrip', () => {
  it('cria usuário e valida credenciais com sucesso', () => {
    createUser({ username: 'novousr', displayName: 'Novo', password: 'minhasenha99', role: 'user' });
    const user = validateCredentials('novousr', 'minhasenha99');
    expect(user?.username).toBe('novousr');
    expect(user?.role).toBe('user');
    expect(user?.active).toBe(true);
  });

  it('cria usuário admin e valida role', () => {
    createUser({ username: 'novoadmin', displayName: 'Admin2', password: 'admin-senha99', role: 'admin' });
    const user = validateCredentials('novoadmin', 'admin-senha99');
    expect(user?.role).toBe('admin');
  });

  it('rejeita senha errada para usuário recém-criado', () => {
    expect(validateCredentials('novousr', 'senhaerrada')).toBeNull();
  });

  it('rejeita username duplicado', () => {
    expect(() => createUser({ username: 'admin', displayName: 'Dup', password: 'minhasenha99', role: 'user' }))
      .toThrow(/já existe/);
  });

  it('usuário inativo não autentica mesmo com senha correta', () => {
    // Cria usuário ativo
    createUser({ username: 'parainativar', displayName: 'Inativo', password: 'senha-inativo-1', role: 'user' });

    // Inativa via updateUser
    const users: Array<{ username: string; id: string }> = JSON.parse(fsState.content!);
    const u = users.find(u => u.username === 'parainativar');
    updateUser(u!.id, { active: false });

    // Credenciais corretas mas usuário inativo → null
    expect(validateCredentials('parainativar', 'senha-inativo-1')).toBeNull();
  });

  it('reativar usuário permite autenticar novamente', () => {
    const users: Array<{ username: string; id: string }> = JSON.parse(fsState.content!);
    const u = users.find(u => u.username === 'parainativar');
    updateUser(u!.id, { active: true });
    expect(validateCredentials('parainativar', 'senha-inativo-1')).not.toBeNull();
  });
});
