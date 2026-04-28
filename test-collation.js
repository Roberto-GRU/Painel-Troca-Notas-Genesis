const mysql = require('mysql2/promise');
const fs    = require('fs');

fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (!m) return;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  v = v.replace(/\\\$/g, '$');
  process.env[m[1].trim()] = v;
});

async function run(label, sql, conn) {
  try {
    const [r] = await conn.query(sql);
    console.log(`OK  [${label}] — ${Array.isArray(r) ? r.length : 1} linhas`);
  } catch(e) {
    console.log(`ERR [${label}] — ${e.message}`);
  }
}

mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT)||3306,
  database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  connectTimeout: 15000,
}).then(async conn => {
  await run('SET NAMES', "SET NAMES utf8mb4", conn);
  await run('fila simples',  "SELECT ID,OS,MANIFESTADO FROM vw_fila_rpa LIMIT 3", conn);
  await run('fila WHERE',    "SELECT ID FROM vw_fila_rpa WHERE MANIFESTADO='N' LIMIT 3", conn);
  await run('os simples',    "SELECT id,status FROM ordem_servico LIMIT 3", conn);
  await run('join id',       "SELECT f.ID FROM vw_fila_rpa f LEFT JOIN ordem_servico os ON os.id=f.ID WHERE f.MANIFESTADO='N' LIMIT 3", conn);
  await run('join status',   "SELECT f.ID FROM vw_fila_rpa f LEFT JOIN ordem_servico os ON os.id=f.ID WHERE f.MANIFESTADO='N' AND (os.id IS NULL OR os.status NOT IN ('Erro','Pendente PDA')) LIMIT 3", conn);
  await run('exists',        "SELECT f.ID FROM vw_fila_rpa f WHERE f.MANIFESTADO='N' AND NOT EXISTS(SELECT 1 FROM log_genesis lg WHERE lg.id_genesis=f.ID) LIMIT 3", conn);
  await conn.end();
});
