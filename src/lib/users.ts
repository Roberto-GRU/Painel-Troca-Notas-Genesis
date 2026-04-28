/**
 * Gerenciamento de usuários — armazenado em data/users.json.
 *
 * Senhas são derivadas com scrypt (resistente a brute-force por ser custoso)
 * com salt aleatório de 16 bytes por usuário. Nunca gravamos a senha em texto.
 *
 * Usuários padrão criados automaticamente na primeira execução:
 *   admin    / admin123   (role: admin)
 *   operador / genesis123 (role: user)
 * → Altere as senhas na tela de admin após o primeiro login.
 *
 * data/users.json está no .gitignore — nunca vai para o repositório.
 */
import fs from 'fs';
import path from 'path';
import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from 'crypto';

export type Role = 'admin' | 'user';

export interface User {
  id:           string;
  username:     string;
  displayName:  string;
  passwordHash: string; // formato: "salt_hex:hash_hex"
  role:         Role;
  createdAt:    string;
  active:       boolean;
}

export type PublicUser = Omit<User, 'passwordHash'>;

const DATA_FILE = path.join(process.cwd(), 'data', 'users.json');

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(storedHash, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

function read(): User[] {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function write(users: User[]): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

function init(): void {
  if (read().length > 0) return;
  write([
    {
      id: randomUUID(), username: 'admin', displayName: 'Administrador',
      passwordHash: hashPassword('admin123'), role: 'admin',
      createdAt: new Date().toISOString(), active: true,
    },
    {
      id: randomUUID(), username: 'operador', displayName: 'Operador',
      passwordHash: hashPassword('genesis123'), role: 'user',
      createdAt: new Date().toISOString(), active: true,
    },
  ]);
}

// Inicializa usuários padrão ao importar o módulo
init();

export function validateCredentials(username: string, password: string): User | null {
  const user = read().find(u => u.username === username && u.active);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export function listUsers(): PublicUser[] {
  return read().map(({ passwordHash: _p, ...u }) => u);
}

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,50}$/;

export function createUser(data: {
  username: string; displayName: string; password: string; role: Role;
}): PublicUser {
  if (!USERNAME_RE.test(data.username)) {
    throw new Error('Username deve ter 3–50 caracteres (letras, números, . _ -)');
  }
  if (data.password.length < 8) {
    throw new Error('Senha deve ter no mínimo 8 caracteres');
  }
  const users = read();
  if (users.find(u => u.username === data.username)) {
    throw new Error('Nome de usuário já existe');
  }
  const user: User = {
    id: randomUUID(), username: data.username, displayName: data.displayName,
    passwordHash: hashPassword(data.password), role: data.role,
    createdAt: new Date().toISOString(), active: true,
  };
  write([...users, user]);
  const { passwordHash: _p, ...pub } = user;
  return pub;
}

export function updateUser(id: string, data: {
  displayName?: string; password?: string; role?: Role; active?: boolean;
}): void {
  if (data.password !== undefined && data.password !== '' && data.password.length < 8) {
    throw new Error('Senha deve ter no mínimo 8 caracteres');
  }
  const users = read();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('Usuário não encontrado');
  if (data.displayName !== undefined) users[idx].displayName = data.displayName;
  if (data.role       !== undefined) users[idx].role         = data.role;
  if (data.active     !== undefined) users[idx].active       = data.active;
  if (data.password)                 users[idx].passwordHash = hashPassword(data.password);
  write(users);
}

export function deleteUser(id: string): void {
  const users = read();
  const user = users.find(u => u.id === id);
  if (!user) throw new Error('Usuário não encontrado');
  // Protege o admin principal para evitar bloqueio total do sistema
  if (user.username === 'admin') throw new Error('Não é possível remover o admin principal');
  write(users.filter(u => u.id !== id));
}
