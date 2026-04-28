import mysql from 'mysql2/promise';

// Cria conexão individual por chamada — garante que process.env já está carregado
// e evita problema de pool com credenciais especiais
async function getConn() {
  return mysql.createConnection({
    host:            process.env.DB_HOST     ?? 'mysql.geneslab.com.br',
    port:            Number(process.env.DB_PORT) || 3306,
    database:        process.env.DB_NAME     ?? 'geld_rpa',
    user:            process.env.DB_USER     ?? 'gg_rpa',
    password:        process.env.DB_PASSWORD,
    connectTimeout:  15000,
    timezone:        '-03:00',
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = unknown>(sql: string, params?: any[]): Promise<T[]> {
  const conn = await getConn();
  try {
    await conn.query("SET NAMES utf8mb4");
    const [rows] = await conn.execute(sql, params);
    return rows as T[];
  } finally {
    await conn.end();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryOne<T = unknown>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
