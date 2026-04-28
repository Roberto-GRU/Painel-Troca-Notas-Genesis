import { query, queryOne } from './db';
import type { OrdemServico, KPIData, OSPorDia, DistribuicaoStatus, ErroFrequente, ErroOS } from '@/types';
import { mapStatusToKanban } from '@/types';

// Início do mês corrente no MySQL
const INICIO_MES = "DATE_FORMAT(CURDATE(), '%Y-%m-01')";

export async function getOSKanban(filtros?: {
  cliente?: string;
  data_inicio?: string;
  data_fim?: string;
  search?: string;
}): Promise<OrdemServico[]> {
  const STATUS_TERMINAIS = `('Erro','Pendente PDA','Finalizado','Enviado')`;

  // ── Part 1: OS Marcadas — na fila, sem nenhum log ainda ─────────────────
  const cond1: string[] = [
    `f.MANIFESTADO = 'N'`,
    `NOT EXISTS (SELECT 1 FROM log_genesis WHERE id_genesis = f.ID)`,
    `(os.id IS NULL OR os.status NOT IN ${STATUS_TERMINAIS})`,
  ];
  const params1: (string | number)[] = [];

  if (filtros?.cliente) {
    cond1.push('f.CLIENTE LIKE ?');
    params1.push(`%${filtros.cliente}%`);
  }
  if (filtros?.search) {
    cond1.push('(CAST(f.OS AS CHAR) LIKE ? OR f.LAUDO LIKE ? OR f.PLACA LIKE ?)');
    params1.push(`%${filtros.search}%`, `%${filtros.search}%`, `%${filtros.search}%`);
  }

  // ── Part 2: Processando via fila — na fila e já tem log ─────────────────
  const cond2: string[] = [
    `f.MANIFESTADO = 'N'`,
    `EXISTS (SELECT 1 FROM log_genesis WHERE id_genesis = f.ID)`,
    `(os.id IS NULL OR os.status NOT IN ${STATUS_TERMINAIS})`,
  ];
  const params2: (string | number)[] = [];

  if (filtros?.cliente) {
    cond2.push('f.CLIENTE LIKE ?');
    params2.push(`%${filtros.cliente}%`);
  }
  if (filtros?.search) {
    cond2.push('(CAST(f.OS AS CHAR) LIKE ? OR f.LAUDO LIKE ? OR f.PLACA LIKE ?)');
    params2.push(`%${filtros.search}%`, `%${filtros.search}%`, `%${filtros.search}%`);
  }

  // ── Part 3: Estados terminais — Pendente PDA, Erro, Lançado, Finalizado ─
  const cond3: string[] = [`os.status IN ${STATUS_TERMINAIS}`];
  const params3: (string | number)[] = [];

  if (filtros?.cliente) {
    cond3.push('os.cliente LIKE ?');
    params3.push(`%${filtros.cliente}%`);
  }

  const inicio = filtros?.data_inicio ?? null;
  const fim    = filtros?.data_fim    ?? null;

  if (inicio) {
    cond3.push('COALESCE(DATE(dh.data_hora_documento), os.data) >= ?');
    params3.push(inicio);
  } else {
    cond3.push(`COALESCE(DATE(dh.data_hora_documento), os.data) >= ${INICIO_MES}`);
  }
  if (fim) {
    cond3.push('COALESCE(DATE(dh.data_hora_documento), os.data) <= ?');
    params3.push(fim);
  }

  if (filtros?.search) {
    cond3.push('(TRIM(os.os) LIKE ? OR os.laudo LIKE ? OR ic.placa LIKE ?)');
    params3.push(`%${filtros.search}%`, `%${filtros.search}%`, `%${filtros.search}%`);
  }

  const sql = `
    (
      SELECT
        f.ID                                                          AS id,
        TRIM(CAST(f.OS AS CHAR))                                      AS os,
        COALESCE(f.CLIENTE, '')                                        AS cliente,
        ''                                                             AS supervisao,
        'OS Marcada'                                                   AS status,
        COALESCE(DATE_FORMAT(f.DT_CLASSIFICACAO, '%d/%m/%Y'),
                 DATE_FORMAT(f.DATA_HORA, '%d/%m/%Y'),
                 DATE_FORMAT(NOW(), '%d/%m/%Y'))                       AS data,
        COALESCE(f.LAUDO, '')                                          AS laudo,
        NULL                                                           AS updated_at,
        NULL                                                           AS data_emissao_laudo,
        f.PDA                                                          AS pda,
        NULL                                                           AS cd_sequence_pda,
        f.PLACA                                                        AS placa,
        NULL                                                           AS peso_liquido,
        NULL                                                           AS chave_nfe,
        NULL                                                           AS numero_nf,
        NULL                                                           AS data_hora_doc,
        NULL                                                           AS tempo_decorrido_min,
        NULL                                                           AS ultimo_erro,
        NULL                                                           AS ultimo_erro_app,
        NULL                                                           AS ultimo_erro_em
      FROM vw_fila_rpa f
      LEFT JOIN ordem_servico os ON os.id = f.ID
      WHERE ${cond1.join(' AND ')}
    )
    UNION ALL
    (
      SELECT
        f.ID                                                          AS id,
        TRIM(CAST(f.OS AS CHAR))                                      AS os,
        COALESCE(f.CLIENTE, '')                                        AS cliente,
        ''                                                             AS supervisao,
        'Pendente PDA'                                                 AS status,
        COALESCE(DATE_FORMAT(f.DT_CLASSIFICACAO, '%d/%m/%Y'),
                 DATE_FORMAT(f.DATA_HORA, '%d/%m/%Y'),
                 DATE_FORMAT(NOW(), '%d/%m/%Y'))                       AS data,
        COALESCE(f.LAUDO, '')                                          AS laudo,
        NULL                                                           AS updated_at,
        NULL                                                           AS data_emissao_laudo,
        f.PDA                                                          AS pda,
        NULL                                                           AS cd_sequence_pda,
        f.PLACA                                                        AS placa,
        NULL                                                           AS peso_liquido,
        NULL                                                           AS chave_nfe,
        NULL                                                           AS numero_nf,
        NULL                                                           AS data_hora_doc,
        NULL                                                           AS tempo_decorrido_min,
        NULL                                                           AS ultimo_erro,
        NULL                                                           AS ultimo_erro_app,
        NULL                                                           AS ultimo_erro_em
      FROM vw_fila_rpa f
      LEFT JOIN ordem_servico os ON os.id = f.ID
      WHERE ${cond2.join(' AND ')}
    )
    UNION ALL
    (
      SELECT
        os.id,
        TRIM(os.os)                                                    AS os,
        os.cliente,
        os.supervisao,
        os.status,
        DATE_FORMAT(os.data, '%d/%m/%Y')                              AS data,
        os.laudo,
        DATE_FORMAT(os.updated_at, '%d/%m/%Y %H:%i')                  AS updated_at,
        DATE_FORMAT(os.data_emissao_laudo, '%d/%m/%Y %H:%i')          AS data_emissao_laudo,
        os.pda,
        os.cd_sequence_pda,
        ic.placa,
        ic.peso_liquido,
        ic.chave_nf                                                    AS chave_nfe,
        ic.nota_fiscal                                                  AS numero_nf,
        DATE_FORMAT(dh.data_hora_documento, '%d/%m/%Y %H:%i')         AS data_hora_doc,
        TIMESTAMPDIFF(MINUTE, os.data, NOW())                         AS tempo_decorrido_min,
        lg.status                                                       AS ultimo_erro,
        lg.aplicacao                                                    AS ultimo_erro_app,
        DATE_FORMAT(lg.created_at, '%d/%m/%Y %H:%i')                  AS ultimo_erro_em
      FROM ordem_servico os
      LEFT JOIN informacao_carga ic ON ic.ordem_servico_id = os.id
      LEFT JOIN datahora_documentos dh ON dh.laudo = os.laudo
      LEFT JOIN (
        SELECT id_genesis, status, aplicacao, created_at,
               ROW_NUMBER() OVER (PARTITION BY id_genesis ORDER BY created_at DESC) AS rn
        FROM log_genesis
        WHERE status IS NOT NULL
      ) lg ON lg.id_genesis = os.id AND lg.rn = 1
      WHERE ${cond3.join(' AND ')}
    )
    ORDER BY id DESC
    LIMIT 500
  `;

  const params = [...params1, ...params2, ...params3];
  const rows = await query<OrdemServico>(sql, params);
  return rows.map(r => ({ ...r, kanban_status: mapStatusToKanban(r.status) }));
}

export async function getOSById(id: number): Promise<OrdemServico | null> {
  const sql = `
    SELECT
      os.*,
      DATE_FORMAT(os.data, '%d/%m/%Y')                      AS data_fmt,
      DATE_FORMAT(os.data_emissao_laudo, '%d/%m/%Y %H:%i')  AS data_emissao_fmt,
      ic.placa, ic.peso_liquido, ic.peso_bruto, ic.peso_tara,
      ic.chave_nf AS chave_nfe, ic.nota_fiscal AS numero_nf,
      ic.contrato, ic.destino, ic.cfop, ic.valor_total,
      nf.chave_acesso, nf.valor_nota,
      dt.numero_contrato AS contrato_cte,
      tp.tara, tp.peso_liquido AS ticket_peso_liquido, tp.peso_bruto AS ticket_peso_bruto,
      m.nome AS motorista_nome, m.cpf AS motorista_cpf, m.cnh AS motorista_cnh,
      cls.umidade, cls.total_avarias, cls.esverdeados, cls.mofado,
      cls.impurezas, cls.temperatura, cls.tipo_do_produto
    FROM ordem_servico os
    LEFT JOIN informacao_carga ic ON ic.ordem_servico_id = os.id
    LEFT JOIN nota_fiscal nf ON nf.ordem_servico_id = os.id
    LEFT JOIN documento_transporte dt ON dt.ordem_servico_id = os.id
    LEFT JOIN ticket_pesagem tp ON tp.ordem_servico_id = os.id
    LEFT JOIN motorista m ON m.ordem_servico_id = os.id
    LEFT JOIN ordem_servico_infos_carga_classificacao cls ON cls.ordem_servico_id = os.id
    WHERE os.id = ?
    LIMIT 1
  `;
  const row = await queryOne<OrdemServico>(sql, [id]);
  if (!row) return null;
  return { ...row, kanban_status: mapStatusToKanban(row.status) };
}

export async function getErrosOS(osId: number): Promise<ErroOS[]> {
  return query<ErroOS>(
    `SELECT id, id_genesis AS os_id, laudo, cliente, aplicacao, status,
            DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS created_at
     FROM log_genesis
     WHERE id_genesis = ?
       AND status NOT IN ('Enviado','Envio finalizado','Anexo ja existente')
     ORDER BY created_at DESC
     LIMIT 20`,
    [osId]
  );
}

export async function getHistoricoOS(osId: number): Promise<ErroOS[]> {
  return query<ErroOS>(
    `SELECT id, id_genesis AS os_id, laudo, cliente, aplicacao, status,
            DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS created_at
     FROM log_genesis
     WHERE id_genesis = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [osId]
  );
}

export async function getKPIs(): Promise<KPIData> {
  const row = await queryOne<KPIData>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Finalizado' THEN 1 ELSE 0 END)  AS finalizados,
      SUM(CASE WHEN status = 'Erro'       THEN 1 ELSE 0 END)  AS erros,
      SUM(CASE WHEN status LIKE '%Pendente%' THEN 1 ELSE 0 END) AS pendentes,
      SUM(CASE WHEN status = 'Enviado'    THEN 1 ELSE 0 END)  AS lancados,
      SUM(CASE WHEN status NOT IN ('Finalizado','Erro','Enviado')
               AND status NOT LIKE '%Pendente%' THEN 1 ELSE 0 END) AS os_marcadas,
      ROUND(AVG(
        CASE WHEN status = 'Finalizado' AND data_emissao_laudo IS NOT NULL
             THEN TIMESTAMPDIFF(MINUTE, data, data_emissao_laudo) / 60
             ELSE NULL END
      ), 2) AS tempo_medio_horas
    FROM ordem_servico
    WHERE data >= ${INICIO_MES}
  `);
  return row ?? { total: 0, finalizados: 0, erros: 0, pendentes: 0, os_marcadas: 0, lancados: 0, tempo_medio_horas: null };
}

export async function getOSPorDia(): Promise<OSPorDia[]> {
  return query<OSPorDia>(`
    SELECT
      DATE_FORMAT(data, '%d/%m')                              AS dia,
      COUNT(*)                                                AS total,
      SUM(CASE WHEN status = 'Finalizado' THEN 1 ELSE 0 END) AS finalizados,
      SUM(CASE WHEN status = 'Erro'       THEN 1 ELSE 0 END) AS erros
    FROM ordem_servico
    WHERE data >= ${INICIO_MES}
    GROUP BY DATE_FORMAT(data, '%d/%m'), DATE(data)
    ORDER BY DATE(data)
  `);
}

export async function getDistribuicaoStatus(): Promise<DistribuicaoStatus[]> {
  const rows = await query<{ status: string; quantidade: number }>(`
    SELECT status, COUNT(*) AS quantidade
    FROM ordem_servico
    WHERE data >= ${INICIO_MES}
    GROUP BY status
    ORDER BY quantidade DESC
  `);

  const total = rows.reduce((acc, r) => acc + Number(r.quantidade), 0);

  const corMap: Record<string, string> = {
    Finalizado:    '#22c55e',
    Erro:          '#ef4444',
    'Pendente PDA': '#f97316',
    Enviado:       '#8b5cf6',
  };

  const labelMap: Record<string, string> = {
    Finalizado:    'Concluídos',
    Erro:          'Erros',
    'Pendente PDA': 'Processando',
    Enviado:       'Lançados',
  };

  return rows.map((r, i) => ({
    status:     r.status,
    label:      labelMap[r.status] ?? r.status,
    quantidade: Number(r.quantidade),
    percentual: total > 0 ? Math.round((Number(r.quantidade) / total) * 1000) / 10 : 0,
    cor:        corMap[r.status] ?? ['#3b82f6', '#06b6d4', '#84cc16', '#f59e0b'][i % 4],
  }));
}

export async function getErrosMaisFrequentes(): Promise<ErroFrequente[]> {
  return query<ErroFrequente>(`
    SELECT
      status,
      aplicacao,
      COUNT(*) AS quantidade
    FROM log_genesis
    WHERE created_at >= ${INICIO_MES}
      AND status NOT IN ('Enviado','Envio finalizado','Anexo ja existente')
      AND (status LIKE '%Erro%' OR status LIKE '%Divergencia%' OR status LIKE '%nao%')
    GROUP BY status, aplicacao
    ORDER BY quantidade DESC
    LIMIT 10
  `);
}

// Mapeamento campo_correcao → tabela/coluna no banco
const CAMPO_MAP: Record<string, { table: string; col: string } | null> = {
  placa_correta:    { table: 'informacao_carga', col: 'placa' },
  peso_liquido:     { table: 'informacao_carga', col: 'peso_liquido' },
  chave_nfe:        { table: 'informacao_carga', col: 'chave_nf' },
  numero_contrato:  { table: 'informacao_carga', col: 'numero_contrato' },
  obs_correcao:     null, // só registra no log_genesis
  zerar_tentativas: null, // só reseta o status, sem atualizar campo
  arquivo_nf:       null,
  arquivo_tp:       null,
  arquivo_dt:       null,
  arquivo_ticket:   null,
  arquivo_cte:      null,
  arquivo_doc:      null,
};

export async function updateOSCorrecao(
  osId: number,
  campo: string,
  valor: string,
): Promise<void> {
  const target = CAMPO_MAP[campo];

  if (target) {
    await query(
      `UPDATE ${target.table} SET ${target.col} = ? WHERE ordem_servico_id = ?`,
      [valor, osId],
    );
  } else if (campo === 'obs_correcao' && valor) {
    await query(
      `INSERT INTO log_genesis (id_genesis, status, aplicacao, created_at)
       VALUES (?, ?, 'CORRECAO_MANUAL', NOW())`,
      [osId, valor],
    );
  }

  // Sempre volta para Pendente PDA para reprocessamento
  await query(
    `UPDATE ordem_servico SET status = 'Pendente PDA', updated_at = NOW() WHERE id = ?`,
    [osId],
  );
}

export async function getClientesDistintos(): Promise<string[]> {
  const rows = await query<{ cliente: string }>(`
    SELECT DISTINCT cliente FROM ordem_servico
    WHERE cliente != '' AND data >= ${INICIO_MES}
    ORDER BY cliente
  `);
  return rows.map(r => r.cliente);
}
