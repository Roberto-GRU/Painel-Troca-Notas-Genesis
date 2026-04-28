/**
 * Gera offline-data/kanban.json a partir do banco de produção.
 *
 * Execução: node dump-kanban.js
 * Resultado: offline-data/kanban.json (usado quando DB_OFFLINE=true)
 *
 * Por que 3 queries separadas em vez de uma só com UNION?
 * vw_fila_rpa usa collation utf8mb4_unicode_ci e ordem_servico usa
 * utf8mb4_general_ci. Um JOIN de texto entre elas gera erro MySQL 1267
 * "Illegal mix of collations". Separando as queries evitamos qualquer
 * comparação cross-table em campos de texto.
 *
 * Após rodar q3 (estados terminais), filtramos q1/q2 em JS para excluir
 * IDs que já aparecem em q3 — evita duplicatas no resultado final.
 */
'use strict';
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

// Lê .env.local manualmente pois este script roda fora do Next.js
fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (!m) return;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  v = v.replace(/\\\$/g, '$');
  process.env[m[1].trim()] = v;
});

// q1/q2 — SEM join com ordem_servico para evitar conflito de collation
// (vw_fila_rpa usa utf8mb4_unicode_ci, ordem_servico usa utf8mb4_general_ci)
// A filtragem de terminais é feita em JS após q3.
// CAST(id_genesis AS UNSIGNED) = CAST(f.ID AS UNSIGNED) evita comparação
// string-a-string entre collations diferentes no NOT/EXISTS.
const q1 = `
  SELECT f.ID AS id, TRIM(CAST(f.OS AS CHAR)) AS os, COALESCE(f.CLIENTE,'') AS cliente,
    '' AS supervisao, 'OS Marcada' AS status,
    COALESCE(DATE_FORMAT(f.DT_CLASSIFICACAO,'%d/%m/%Y'),DATE_FORMAT(f.DATA_HORA,'%d/%m/%Y'),DATE_FORMAT(NOW(),'%d/%m/%Y')) AS data,
    COALESCE(f.LAUDO,'') AS laudo, NULL AS updated_at, NULL AS data_emissao_laudo,
    f.PDA AS pda, NULL AS cd_sequence_pda, f.PLACA AS placa, NULL AS peso_liquido,
    NULL AS chave_nfe, NULL AS numero_nf, NULL AS data_hora_doc, NULL AS tempo_decorrido_min,
    NULL AS ultimo_erro, NULL AS ultimo_erro_app, NULL AS ultimo_erro_em
  FROM vw_fila_rpa f
  WHERE f.MANIFESTADO = 'N'
    AND NOT EXISTS (
      SELECT 1 FROM log_genesis
      WHERE CAST(id_genesis AS UNSIGNED) = CAST(f.ID AS UNSIGNED)
    )`;

const q2 = `
  SELECT f.ID AS id, TRIM(CAST(f.OS AS CHAR)) AS os, COALESCE(f.CLIENTE,'') AS cliente,
    '' AS supervisao, 'Pendente PDA' AS status,
    COALESCE(DATE_FORMAT(f.DT_CLASSIFICACAO,'%d/%m/%Y'),DATE_FORMAT(f.DATA_HORA,'%d/%m/%Y'),DATE_FORMAT(NOW(),'%d/%m/%Y')) AS data,
    COALESCE(f.LAUDO,'') AS laudo, NULL AS updated_at, NULL AS data_emissao_laudo,
    f.PDA AS pda, NULL AS cd_sequence_pda, f.PLACA AS placa, NULL AS peso_liquido,
    NULL AS chave_nfe, NULL AS numero_nf, NULL AS data_hora_doc, NULL AS tempo_decorrido_min,
    NULL AS ultimo_erro, NULL AS ultimo_erro_app, NULL AS ultimo_erro_em
  FROM vw_fila_rpa f
  WHERE f.MANIFESTADO = 'N'
    AND EXISTS (
      SELECT 1 FROM log_genesis
      WHERE CAST(id_genesis AS UNSIGNED) = CAST(f.ID AS UNSIGNED)
    )`;

const q3 = `
  SELECT os.id, TRIM(os.os) AS os, os.cliente, os.supervisao, os.status,
    DATE_FORMAT(os.data,'%d/%m/%Y') AS data, os.laudo,
    DATE_FORMAT(os.updated_at,'%d/%m/%Y %H:%i') AS updated_at,
    DATE_FORMAT(os.data_emissao_laudo,'%d/%m/%Y %H:%i') AS data_emissao_laudo,
    os.pda, os.cd_sequence_pda, ic.placa, ic.peso_liquido,
    ic.chave_nf AS chave_nfe, ic.nota_fiscal AS numero_nf,
    NULL AS data_hora_doc,
    TIMESTAMPDIFF(MINUTE, os.data, NOW()) AS tempo_decorrido_min,
    lg.status AS ultimo_erro, lg.aplicacao AS ultimo_erro_app,
    DATE_FORMAT(lg.created_at,'%d/%m/%Y %H:%i') AS ultimo_erro_em
  FROM ordem_servico os
  LEFT JOIN informacao_carga ic ON ic.ordem_servico_id = os.id
  LEFT JOIN (
    SELECT id_genesis, status, aplicacao, created_at,
           ROW_NUMBER() OVER (PARTITION BY id_genesis ORDER BY created_at DESC) AS rn
    FROM log_genesis WHERE status IS NOT NULL
  ) lg ON lg.id_genesis = os.id AND lg.rn = 1
  WHERE os.status IN ('Erro','Pendente PDA','Finalizado','Enviado')
    AND os.data >= DATE_FORMAT(CURDATE(),'%Y-%m-01')
  ORDER BY os.updated_at DESC LIMIT 500`;

mysql.createConnection({
  host:           process.env.DB_HOST,
  port:           Number(process.env.DB_PORT) || 3306,
  database:       process.env.DB_NAME,
  user:           process.env.DB_USER,
  password:       process.env.DB_PASSWORD,
  connectTimeout: 30000,
  charset:        'utf8mb4',
}).then(async conn => {
  await conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_general_ci");

  const run = async (label, sql) => {
    try {
      const [r] = await conn.query(sql);
      console.log(`OK [${label}] ${r.length} linhas`);
      return r;
    } catch(e) {
      console.error(`ERR [${label}]`, e.message);
      return [];
    }
  };

  const r3 = await run('q3-Terminais',   q3);

  // IDs já cobertos por estados terminais — excluir de q1/q2
  const terminalIds = new Set(r3.map(r => Number(r.id)));

  const r1raw = await run('q1-OS_Marcadas', q1);
  const r2raw = await run('q2-Processando', q2);

  const r1 = r1raw.filter(r => !terminalIds.has(Number(r.id)));
  const r2 = r2raw.filter(r => !terminalIds.has(Number(r.id)));

  const all = [...r1, ...r2, ...r3].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 500);

  const outdir = path.join(__dirname, 'offline-data');
  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);
  fs.writeFileSync(path.join(outdir, 'kanban.json'), JSON.stringify(all, null, 2));

  console.log(`OK — OS Marcadas: ${r1.length} | Processando: ${r2.length} | Terminais: ${r3.length} | Total: ${all.length}`);
  await conn.end();
}).catch(e => { console.error('ERRO:', e.message); process.exit(1); });
