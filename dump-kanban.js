const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (!m) return;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  v = v.replace(/\\\$/g, '$');
  process.env[m[1].trim()] = v;
});

// Roda as 3 partes separadas e une em JS (evita conflito de collation no UNION ALL)
const q1 = `
  SELECT f.ID AS id, TRIM(CAST(f.OS AS CHAR)) AS os, COALESCE(f.CLIENTE,'') AS cliente,
    '' AS supervisao, 'OS Marcada' AS status,
    COALESCE(DATE_FORMAT(f.DT_CLASSIFICACAO,'%d/%m/%Y'),DATE_FORMAT(f.DATA_HORA,'%d/%m/%Y'),DATE_FORMAT(NOW(),'%d/%m/%Y')) AS data,
    COALESCE(f.LAUDO,'') AS laudo, NULL AS updated_at, NULL AS data_emissao_laudo,
    f.PDA AS pda, NULL AS cd_sequence_pda, f.PLACA AS placa, NULL AS peso_liquido,
    NULL AS chave_nfe, NULL AS numero_nf, NULL AS data_hora_doc, NULL AS tempo_decorrido_min,
    NULL AS ultimo_erro, NULL AS ultimo_erro_app, NULL AS ultimo_erro_em
  FROM vw_fila_rpa f LEFT JOIN ordem_servico os ON os.id = f.ID
  WHERE f.MANIFESTADO = 'N'
    AND NOT EXISTS (SELECT 1 FROM log_genesis WHERE id_genesis = f.ID)
    AND (os.id IS NULL OR os.status NOT IN ('Erro','Pendente PDA','Finalizado','Enviado'))`;

const q2 = `
  SELECT f.ID AS id, TRIM(CAST(f.OS AS CHAR)) AS os, COALESCE(f.CLIENTE,'') AS cliente,
    '' AS supervisao, 'Pendente PDA' AS status,
    COALESCE(DATE_FORMAT(f.DT_CLASSIFICACAO,'%d/%m/%Y'),DATE_FORMAT(f.DATA_HORA,'%d/%m/%Y'),DATE_FORMAT(NOW(),'%d/%m/%Y')) AS data,
    COALESCE(f.LAUDO,'') AS laudo, NULL AS updated_at, NULL AS data_emissao_laudo,
    f.PDA AS pda, NULL AS cd_sequence_pda, f.PLACA AS placa, NULL AS peso_liquido,
    NULL AS chave_nfe, NULL AS numero_nf, NULL AS data_hora_doc, NULL AS tempo_decorrido_min,
    NULL AS ultimo_erro, NULL AS ultimo_erro_app, NULL AS ultimo_erro_em
  FROM vw_fila_rpa f LEFT JOIN ordem_servico os ON os.id = f.ID
  WHERE f.MANIFESTADO = 'N'
    AND EXISTS (SELECT 1 FROM log_genesis WHERE id_genesis = f.ID)
    AND (os.id IS NULL OR os.status NOT IN ('Erro','Pendente PDA','Finalizado','Enviado'))`;

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
  LEFT JOIN (
    SELECT ordem_servico_id, placa, peso_liquido, chave_nf, nota_fiscal,
           ROW_NUMBER() OVER (PARTITION BY ordem_servico_id ORDER BY id DESC) AS rn
    FROM informacao_carga
  ) ic ON ic.ordem_servico_id = os.id AND ic.rn = 1
  LEFT JOIN (
    SELECT id_genesis, status, aplicacao, created_at,
           ROW_NUMBER() OVER (PARTITION BY id_genesis ORDER BY created_at DESC) AS rn
    FROM log_genesis WHERE status IS NOT NULL
  ) lg ON lg.id_genesis = os.id AND lg.rn = 1
  WHERE os.status IN ('Erro','Pendente PDA','Finalizado','Enviado')
    AND os.data >= DATE_FORMAT(CURDATE(),'%Y-%m-01')
  ORDER BY os.data DESC LIMIT 500`;

mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  connectTimeout: 30000,
}).then(async conn => {
  await conn.query("SET NAMES utf8mb4");
  const run = async (label, sql) => {
    try { const [r] = await conn.query(sql); console.log(`OK [${label}] ${r.length} linhas`); return r; }
    catch(e) { console.error(`ERR [${label}]`, e.message); return []; }
  };

  const r1 = await run('q1-OS_Marcadas', q1);
  const r2 = await run('q2-Processando', q2);
  const r3 = await run('q3-Terminais',   q3);
  const all = [...r1, ...r2, ...r3].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 500);

  const outdir = path.join(__dirname, 'offline-data');
  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);
  fs.writeFileSync(path.join(outdir, 'kanban.json'), JSON.stringify(all, null, 2));

  console.log(`OK — OS Marcadas: ${r1.length} | Processando: ${r2.length} | Terminais: ${r3.length} | Total: ${all.length}`);
  await conn.end();
}).catch(e => { console.error('ERRO:', e.message); process.exit(1); });
