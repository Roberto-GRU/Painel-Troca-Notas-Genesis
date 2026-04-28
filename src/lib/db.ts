/**
 * Camada de acesso ao MySQL.
 *
 * Usa um Pool de conexões (mysql2) em vez de criar/fechar uma conexão por query.
 * O pool é criado na primeira chamada e reutilizado pelo processo Node.js inteiro.
 * connectionLimit=10 evita saturar o servidor MySQL remoto (geneslab).
 *
 * withTransaction() garante que múltiplas queries sejam atômicas:
 * se qualquer uma falhar, todas são revertidas (ROLLBACK automático).
 */
import mysql from 'mysql2/promise';

let _pool: mysql.Pool | null = null;

function pool(): mysql.Pool {
  if (!_pool) {
    _pool = mysql.createPool({
      host:             process.env.DB_HOST     ?? 'mysql.geneslab.com.br',
      port:             Number(process.env.DB_PORT) || 3306,
      database:         process.env.DB_NAME     ?? 'geld_rpa',
      user:             process.env.DB_USER     ?? 'gg_rpa',
      password:         process.env.DB_PASSWORD,
      connectTimeout:   15000,
      timezone:         '-03:00',
      connectionLimit:  10,
      waitForConnections: true,
    });
  }
  return _pool;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = unknown>(sql: string, params?: any[]): Promise<T[]> {
  const conn = await pool().getConnection();
  try {
    await conn.query('SET NAMES utf8mb4');
    const [rows] = await conn.execute(sql, params);
    return rows as T[];
  } finally {
    conn.release(); // devolve ao pool, não fecha a conexão
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryOne<T = unknown>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Exec = <T = unknown>(sql: string, params?: any[]) => Promise<T[]>;

/**
 * Executa múltiplas queries numa transação atômica.
 * O callback recebe `exec` — função que usa a mesma conexão (mesma transação).
 *
 * @example
 * await withTransaction(async (exec) => {
 *   await exec('UPDATE ...', [...]);
 *   await exec('INSERT ...', [...]);
 * });
 */
export async function withTransaction(fn: (exec: Exec) => Promise<void>): Promise<void> {
  const conn = await pool().getConnection();
  await conn.query('SET NAMES utf8mb4');
  await conn.beginTransaction();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exec: Exec = async <T = unknown>(sql: string, params?: any[]) => {
      const [rows] = await conn.execute(sql, params);
      return rows as T[];
    };
    await fn(exec);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
