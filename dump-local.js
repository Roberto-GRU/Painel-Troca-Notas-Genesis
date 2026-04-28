#!/usr/bin/env node
/**
 * Exporta snapshot das queries principais para arquivos JSON em offline-data/.
 * Uso: node dump-local.js
 */

const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

// Carrega .env.local manualmente
const envFile = path.join(__dirname, '.env.local');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) return;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    val = val.replace(/\\\$/g, '$');
    process.env[m[1].trim()] = val;
  });
}

const DB = {
  host:           process.env.DB_HOST     || 'mysql.geneslab.com.br',
  port:           Number(process.env.DB_PORT) || 3306,
  database:       process.env.DB_NAME     || 'geld_rpa',
  user:           process.env.DB_USER     || 'gg_rpa',
  password:       process.env.DB_PASSWORD,
  connectTimeout: 30000,
};

const OUTDIR = path.join(__dirname, 'offline-data');
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR);

const INICIO_MES = "DATE_FORMAT(CURDATE(), '%Y-%m-01')";

const QUERIES = {
  kanban: `
    (
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
        AND (os.id IS NULL OR os.status NOT IN ('Erro','Pendente PDA','Finalizado','Enviado'))
    )
    UNION ALL
    (
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
        AND (os.id IS NULL OR os.status NOT IN ('Erro','Pendente PDA','Finalizado','Enviado'))
    )
    UNION ALL
    (
      SELECT os.id, TRIM(os.os) AS os, os.cliente, os.supervisao, os.status,
        DATE_FORMAT(os.data,'%d/%m/%Y') AS data, os.laudo,
        DATE_FORMAT(os.updated_at,'%d/%m/%Y %H:%i') AS updated_at,
        DATE_FORMAT(os.data_emissao_laudo,'%d/%m/%Y %H:%i') AS data_emissao_laudo,
        os.pda, os.cd_sequence_pda, ic.placa, ic.peso_liquido,
        ic.chave_nf AS chave_nfe, ic.nota_fiscal AS numero_nf,
        DATE_FORMAT(dh.data_hora_documento,'%d/%m/%Y %H:%i') AS data_hora_doc,
        TIMESTAMPDIFF(MINUTE, os.data, NOW()) AS tempo_decorrido_min,
        lg.status AS ultimo_erro, lg.aplicacao AS ultimo_erro_app,
        DATE_FORMAT(lg.created_at,'%d/%m/%Y %H:%i') AS ultimo_erro_em
      FROM ordem_servico os
      LEFT JOIN informacao_carga ic ON ic.ordem_servico_id = os.id
      LEFT JOIN datahora_documentos dh ON dh.laudo = os.laudo
      LEFT JOIN (
        SELECT id_genesis, status, aplicacao, created_at,
               ROW_NUMBER() OVER (PARTITION BY id_genesis ORDER BY created_at DESC) AS rn
        FROM log_genesis WHERE status IS NOT NULL
      ) lg ON lg.id_genesis = os.id AND lg.rn = 1
      WHERE os.status IN ('Erro','Pendente PDA','Finalizado','Enviado')
        AND os.data >= ${INICIO_MES}
    )
    ORDER BY id DESC LIMIT 500`,

  kpis: `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='Finalizado' THEN 1 ELSE 0 END) AS finalizados,
      SUM(CASE WHEN status='Erro' THEN 1 ELSE 0 END) AS erros,
      SUM(CASE WHEN status LIKE '%Pendente%' THEN 1 ELSE 0 END) AS pendentes,
      SUM(CASE WHEN status='Enviado' THEN 1 ELSE 0 END) AS lancados,
      SUM(CASE WHEN status NOT IN ('Finalizado','Erro','Enviado') AND status NOT LIKE '%Pendente%' THEN 1 ELSE 0 END) AS os_marcadas,
      ROUND(AVG(CASE WHEN status='Finalizado' AND data_emissao_laudo IS NOT NULL
        THEN TIMESTAMPDIFF(MINUTE, data, data_emissao_laudo)/60 ELSE NULL END),2) AS tempo_medio_horas
    FROM ordem_servico WHERE data >= ${INICIO_MES}`,

  porDia: `
    SELECT DATE_FORMAT(data,'%d/%m') AS dia, COUNT(*) AS total,
      SUM(CASE WHEN status='Finalizado' THEN 1 ELSE 0 END) AS finalizados,
      SUM(CASE WHEN status='Erro' THEN 1 ELSE 0 END) AS erros
    FROM ordem_servico WHERE data >= ${INICIO_MES}
    GROUP BY DATE_FORMAT(data,'%d/%m'), DATE(data) ORDER BY DATE(data)`,

  distribuicao: `
    SELECT status, COUNT(*) AS quantidade
    FROM ordem_servico WHERE data >= ${INICIO_MES}
    GROUP BY status ORDER BY quantidade DESC`,

  errosFrequentes: `
    SELECT status, aplicacao, COUNT(*) AS quantidade
    FROM log_genesis
    WHERE created_at >= ${INICIO_MES}
      AND status NOT IN ('Enviado','Envio finalizado','Anexo ja existente')
      AND (status LIKE '%Erro%' OR status LIKE '%Divergencia%' OR status LIKE '%nao%')
    GROUP BY status, aplicacao ORDER BY quantidade DESC LIMIT 10`,

  clientes: `
    SELECT DISTINCT cliente FROM ordem_servico
    WHERE cliente != '' AND data >= ${INICIO_MES} ORDER BY cliente`,
};

async function main() {
  console.log('Conectando ao banco remoto...');
  const conn = await mysql.createConnection(DB);

  for (const [nome, sql] of Object.entries(QUERIES)) {
    process.stdout.write(`Exportando ${nome}... `);
    try {
      const [rows] = await conn.query(sql);
      const arr = Array.isArray(rows) ? rows : [rows];
      fs.writeFileSync(path.join(OUTDIR, `${nome}.json`), JSON.stringify(arr, null, 2));
      console.log(`${arr.length} registros`);
    } catch (e) {
      console.log(`ERRO: ${e.message}`);
      fs.writeFileSync(path.join(OUTDIR, `${nome}.json`), '[]');
    }
  }

  await conn.end();
  console.log(`\nSnapshot salvo em: ${OUTDIR}/`);
  console.log('Agora adicione DB_OFFLINE=true no .env.local para rodar offline.');
}

main().catch(err => {
  console.error('ERRO FATAL:', err.message);
  process.exit(1);
});
