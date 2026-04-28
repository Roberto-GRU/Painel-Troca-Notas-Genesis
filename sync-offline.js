/**
 * Sincroniza correções feitas em modo offline com o banco de produção.
 *
 * Execução: node sync-offline.js
 *
 * Pré-requisito: DB_OFFLINE=false no .env.local (ou variável de ambiente)
 * e acesso ao MySQL (VPN ativa se necessário).
 *
 * Fluxo:
 *   1. Lê offline-data/pending.json
 *   2. Para cada correção, chama updateOSCorrecao() no banco real
 *   3. Salva offline-data/pending-applied.json com o histórico
 *   4. Limpa pending.json
 *
 * Se uma correção falhar, o script para e deixa o pending.json intacto
 * para reprocessamento manual.
 */
'use strict';

const mysql  = require('mysql2/promise');
const fs     = require('fs');
const path   = require('path');

// Carrega .env.local manualmente (fora do Next.js)
fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (!m) return;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  v = v.replace(/\\\$/g, '$');
  process.env[m[1].trim()] = v;
});

const PENDING_FILE = path.join(__dirname, 'offline-data', 'pending.json');
const APPLIED_FILE = path.join(__dirname, 'offline-data', 'pending-applied.json');

// Mapeamento campo → tabela/coluna (mesmo que queries.ts)
const CAMPO_MAP = {
  placa_correta:   { table: 'informacao_carga', col: 'placa' },
  peso_liquido:    { table: 'informacao_carga', col: 'peso_liquido' },
  chave_nfe:       { table: 'informacao_carga', col: 'chave_nf' },
  numero_contrato: { table: 'informacao_carga', col: 'numero_contrato' },
};

async function main() {
  if (!fs.existsSync(PENDING_FILE)) {
    console.log('Nenhuma correção pendente.');
    return;
  }

  const pending = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
  if (!pending.length) {
    console.log('pending.json vazio — nada a sincronizar.');
    return;
  }

  console.log(`Sincronizando ${pending.length} correção(ões)...`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, connectTimeout: 30000,
  });
  await conn.query("SET NAMES utf8mb4");

  const applied = [];

  for (const item of pending) {
    const { id, campo, valor, usuario, timestamp } = item;
    console.log(`  → OS ${id} | campo=${campo} | por=${usuario}`);

    await conn.beginTransaction();
    try {
      const target = CAMPO_MAP[campo];
      if (target) {
        await conn.execute(
          `UPDATE ${target.table} SET ${target.col} = ? WHERE ordem_servico_id = ?`,
          [valor, id]
        );
      } else if (campo === 'obs_correcao' && valor) {
        await conn.execute(
          `INSERT INTO log_genesis (id_genesis, status, aplicacao, created_at) VALUES (?, ?, ?, NOW())`,
          [id, valor, `CORRECAO_MANUAL:${usuario}`]
        );
      }
      if (campo !== 'obs_correcao') {
        await conn.execute(
          `INSERT INTO log_genesis (id_genesis, status, aplicacao, created_at) VALUES (?, ?, ?, NOW())`,
          [id, `Correcao: ${campo}`, `PAINEL:${usuario}`]
        );
      }
      await conn.execute(
        `UPDATE ordem_servico SET status = 'Pendente PDA', updated_at = NOW() WHERE id = ?`,
        [id]
      );
      await conn.commit();
      applied.push({ ...item, syncedAt: new Date().toISOString(), ok: true });
      console.log(`     ✓ OK`);
    } catch (err) {
      await conn.rollback();
      console.error(`     ✗ FALHOU: ${err.message}`);
      console.error('Sincronização interrompida. Corrija o erro e rode novamente.');
      await conn.end();
      process.exit(1);
    }
  }

  await conn.end();

  // Salva histórico de aplicados
  const prev = fs.existsSync(APPLIED_FILE) ? JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8')) : [];
  fs.writeFileSync(APPLIED_FILE, JSON.stringify([...prev, ...applied], null, 2));

  // Limpa o pending
  fs.writeFileSync(PENDING_FILE, JSON.stringify([], null, 2));

  console.log(`\n✓ ${applied.length} correção(ões) aplicada(s) com sucesso.`);
}

main().catch(err => { console.error('ERRO:', err.message); process.exit(1); });
