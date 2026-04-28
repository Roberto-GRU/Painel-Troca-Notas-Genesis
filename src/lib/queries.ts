import { query, queryOne } from './db';
import type { OrdemServico, KPIData, OSPorDia, DistribuicaoStatus, ErroFrequente, ErroOS } from '@/types';
import { mapStatusToKanban } from '@/types';

export async function getOSKanban(filtros?: {
  cliente?: string;
  data_inicio?: string;
  data_fim?: string;
  search?: string;
}): Promise<OrdemServico[]> {
  const conditions: string[] = ['1=1'];
  const params: string[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (filtros?.cliente) {
    conditions.push('os.cliente LIKE ?');
    params.push(`%${filtros.cliente}%`);
  }
  if (filtros?.data_inicio) {
    conditions.push('os.data >= ?');
    params.push(filtros.data_inicio);
  }
  if (filtros?.data_fim) {
    conditions.push('os.data <= ?');
    params.push(filtros.data_fim);
  }
  if (filtros?.search) {
    conditions.push('(os.os LIKE ? OR os.laudo LIKE ? OR ic.placa LIKE ?)');
    params.push(`%${filtros.search}%`, `%${filtros.search}%`, `%${filtros.search}%`);
  }

  const sql = `
    SELECT
      os.id,
      TRIM(os.os) AS os,
      os.cliente,
      os.supervisao,
      os.status,
      DATE_FORMAT(os.data, '%Y-%m-%d') AS data,
      os.laudo,
      DATE_FORMAT(os.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
      DATE_FORMAT(os.data_emissao_laudo, '%Y-%m-%d %H:%i:%s') AS data_emissao_laudo,
      os.pda,
      os.cd_sequence_pda,
      ic.placa,
      ic.peso_liquido,
      ic.chave_nf AS chave_nfe,
      ic.nota_fiscal AS numero_nf,
      DATE_FORMAT(dh.data_hora_documento, '%Y-%m-%d %H:%i:%s') AS data_hora_doc,
      TIMESTAMPDIFF(MINUTE, os.data, NOW()) AS tempo_decorrido_min,
      lg.status AS ultimo_erro,
      lg.aplicacao AS ultimo_erro_app,
      DATE_FORMAT(lg.created_at, '%Y-%m-%d %H:%i:%s') AS ultimo_erro_em
    FROM ordem_servico os
    LEFT JOIN informacao_carga ic ON ic.ordem_servico_id = os.id
    LEFT JOIN datahora_documentos dh ON dh.laudo = os.laudo
    LEFT JOIN (
      SELECT id_genesis, status, aplicacao, created_at,
             ROW_NUMBER() OVER (PARTITION BY id_genesis ORDER BY created_at DESC) AS rn
      FROM log_genesis
      WHERE status IS NOT NULL
    ) lg ON lg.id_genesis = os.id AND lg.rn = 1
    WHERE ${conditions.join(' AND ')}
      AND os.data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    ORDER BY os.data DESC, os.updated_at DESC
    LIMIT 500
  `;

  const rows = await query<OrdemServico>(sql, params);

  return rows.map(r => ({
    ...r,
    kanban_status: mapStatusToKanban(r.status),
  }));
}

export async function getOSById(id: number): Promise<OrdemServico | null> {
  const sql = `
    SELECT
      os.*,
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
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
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
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
     FROM log_genesis
     WHERE id_genesis = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [osId]
  );
}

export async function getKPIs(): Promise<KPIData> {
  const sql = `
    SELECT
      COUNT(*)                                          AS total,
      SUM(status = 'Finalizado')                        AS finalizados,
      SUM(status = 'Erro')                              AS erros,
      SUM(status LIKE '%Pendente%')                     AS pendentes,
      SUM(status NOT IN ('Finalizado','Erro') AND status NOT LIKE '%Pendente%') AS os_marcadas,
      0                                                 AS lancados,
      ROUND(AVG(TIMESTAMPDIFF(MINUTE, data, data_emissao_laudo) / 60)
        FILTER WHERE status = 'Finalizado', 2)          AS tempo_medio_horas
    FROM ordem_servico
    WHERE data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  `;

  // MySQL não suporta FILTER WHERE — usar CASE
  const sql2 = `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Finalizado' THEN 1 ELSE 0 END) AS finalizados,
      SUM(CASE WHEN status = 'Erro' THEN 1 ELSE 0 END) AS erros,
      SUM(CASE WHEN status LIKE '%Pendente%' THEN 1 ELSE 0 END) AS pendentes,
      SUM(CASE WHEN status NOT IN ('Finalizado','Erro') AND status NOT LIKE '%Pendente%' THEN 1 ELSE 0 END) AS os_marcadas,
      0 AS lancados,
      ROUND(AVG(CASE WHEN status = 'Finalizado' AND data_emissao_laudo IS NOT NULL
                     THEN TIMESTAMPDIFF(MINUTE, data, data_emissao_laudo) / 60
                     ELSE NULL END), 2) AS tempo_medio_horas
    FROM ordem_servico
    WHERE data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  `;

  const row = await queryOne<KPIData>(sql2);
  return row ?? { total: 0, finalizados: 0, erros: 0, pendentes: 0, os_marcadas: 0, lancados: 0, tempo_medio_horas: null };
}

export async function getOSPorDia(): Promise<OSPorDia[]> {
  return query<OSPorDia>(`
    SELECT
      DATE_FORMAT(data, '%Y-%m-%d') AS dia,
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Finalizado' THEN 1 ELSE 0 END) AS finalizados,
      SUM(CASE WHEN status = 'Erro' THEN 1 ELSE 0 END) AS erros
    FROM ordem_servico
    WHERE data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE_FORMAT(data, '%Y-%m-%d')
    ORDER BY dia
  `);
}

export async function getDistribuicaoStatus(): Promise<DistribuicaoStatus[]> {
  const rows = await query<{ status: string; quantidade: number }>(`
    SELECT status, COUNT(*) AS quantidade
    FROM ordem_servico
    WHERE data >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY status
    ORDER BY quantidade DESC
  `);

  const total = rows.reduce((acc, r) => acc + Number(r.quantidade), 0);

  const corMap: Record<string, string> = {
    Finalizado: '#22c55e',
    Erro: '#ef4444',
    'Pendente PDA': '#f97316',
  };

  const labelMap: Record<string, string> = {
    Finalizado: 'Concluídos',
    Erro: 'Erros',
    'Pendente PDA': 'Processando',
    Enviado: 'Lançados',
  };

  return rows.map((r, i) => ({
    status: r.status,
    label: labelMap[r.status] ?? r.status,
    quantidade: Number(r.quantidade),
    percentual: total > 0 ? Math.round((Number(r.quantidade) / total) * 1000) / 10 : 0,
    cor: corMap[r.status] ?? ['#8b5cf6', '#3b82f6', '#06b6d4', '#84cc16'][i % 4],
  }));
}

export async function getErrosMaisFrequentes(): Promise<ErroFrequente[]> {
  return query<ErroFrequente>(`
    SELECT
      status,
      aplicacao,
      COUNT(*) AS quantidade
    FROM log_genesis
    WHERE status NOT IN ('Enviado','Envio finalizado','Anexo ja existente')
      AND (status LIKE '%Erro%' OR status LIKE '%Divergencia%' OR status LIKE '%nao%')
    GROUP BY status, aplicacao
    ORDER BY quantidade DESC
    LIMIT 10
  `);
}

export async function getClientesDistintos(): Promise<string[]> {
  const rows = await query<{ cliente: string }>(`
    SELECT DISTINCT cliente FROM ordem_servico WHERE cliente != '' ORDER BY cliente
  `);
  return rows.map(r => r.cliente);
}
