export type KanbanStatus =
  | 'os_marcada'
  | 'pendente'
  | 'lancado'
  | 'erro'
  | 'concluido';

export interface OrdemServico {
  id: number;
  os: string;
  cliente: string;
  supervisao: string;
  status: string;
  kanban_status: KanbanStatus;
  data: string;
  laudo: string;
  updated_at: string;
  data_emissao_laudo: string | null;
  pda: number | null;
  cd_sequence_pda: number | null;
  // joined
  placa?: string;
  peso_liquido?: string;
  peso_bruto?: string;
  chave_nfe?: string;
  numero_nf?: string;
  data_hora_doc?: string;
  data_hora_manifestado?: string;
  uf?: string;
  tempo_decorrido_min?: number;
  ultimo_erro?: string;
  ultimo_erro_app?: string;
  ultimo_erro_em?: string;
}

export interface ErroOS {
  id: number;
  os_id: number;
  laudo: string;
  cliente: string;
  aplicacao: string;
  status: string;
  created_at: string;
}

export interface TipoErro {
  codigo: string;
  descricao: string;
  requer_documento: boolean;
  campo_correcao: string;
  label_campo: string;
  tipo_campo: 'text' | 'number' | 'date' | 'file' | 'select';
}

export interface KPIData {
  total: number;
  finalizados: number;
  erros: number;
  pendentes: number;
  os_marcadas: number;
  lancados: number;
  tempo_medio_horas: number | null;
}

export interface OSPorDia {
  dia: string;
  total: number;
  finalizados: number;
  erros: number;
}

export interface DistribuicaoStatus {
  status: string;
  label: string;
  quantidade: number;
  percentual: number;
  cor: string;
}

export interface ErroFrequente {
  status: string;
  aplicacao: string;
  quantidade: number;
}

export interface UploadResponse {
  success: boolean;
  path?: string;
  nome?: string;
  error?: string;
}

export const KANBAN_COLUMNS: {
  id: KanbanStatus;
  label: string;
  cor: string;
  bgHeader: string;
  borderColor: string;
  icon: string;
}[] = [
  {
    id: 'os_marcada',
    label: 'OS Marcadas',
    cor: 'text-blue-400',
    bgHeader: 'bg-blue-900/40 border-blue-700',
    borderColor: 'border-l-blue-500',
    icon: 'ClipboardList',
  },
  {
    id: 'pendente',
    label: 'Processando',
    cor: 'text-orange-400',
    bgHeader: 'bg-orange-900/40 border-orange-700',
    borderColor: 'border-l-orange-500',
    icon: 'Clock',
  },
  {
    id: 'lancado',
    label: 'Lançados',
    cor: 'text-purple-400',
    bgHeader: 'bg-purple-900/40 border-purple-700',
    borderColor: 'border-l-purple-500',
    icon: 'RefreshCw',
  },
  {
    id: 'erro',
    label: 'Erros',
    cor: 'text-red-400',
    bgHeader: 'bg-red-900/40 border-red-700',
    borderColor: 'border-l-red-500',
    icon: 'AlertTriangle',
  },
  {
    id: 'concluido',
    label: 'Concluídos',
    cor: 'text-green-400',
    bgHeader: 'bg-green-900/40 border-green-700',
    borderColor: 'border-l-green-500',
    icon: 'CheckCircle',
  },
];

export const ERRO_TIPOS: Record<string, TipoErro> = {
  'Chave NF Vazia': {
    codigo: 'CHAVE_NF_VAZIA',
    descricao: 'Chave de acesso NF-e está vazia',
    requer_documento: false,
    campo_correcao: 'chave_nfe',
    label_campo: 'Nova Chave de Acesso NF-e (44 dígitos)',
    tipo_campo: 'text',
  },
  'Divergencia de peso liquido no cte': {
    codigo: 'PESO_DIVERGENTE_CTE',
    descricao: 'Divergência de peso líquido no CT-e',
    requer_documento: false,
    campo_correcao: 'peso_liquido',
    label_campo: 'Peso Líquido Correto (kg)',
    tipo_campo: 'number',
  },
  'Divergencia de placa no cte': {
    codigo: 'PLACA_DIVERGENTE_CTE',
    descricao: 'Divergência de placa no CT-e',
    requer_documento: false,
    campo_correcao: 'placa_correta',
    label_campo: 'Placa Correta do Veículo',
    tipo_campo: 'text',
  },
  'Documento nf nao esta anexado': {
    codigo: 'DOC_NF_AUSENTE',
    descricao: 'Documento NF não está anexado',
    requer_documento: true,
    campo_correcao: 'arquivo_nf',
    label_campo: 'Upload da Nota Fiscal (PDF/XML)',
    tipo_campo: 'file',
  },
  'Documento tp nao esta anexado': {
    codigo: 'DOC_TP_AUSENTE',
    descricao: 'Documento de Transporte não está anexado',
    requer_documento: true,
    campo_correcao: 'arquivo_tp',
    label_campo: 'Upload do CT-e / Romaneio (PDF/XML)',
    tipo_campo: 'file',
  },
  'Documento dt nao esta anexado': {
    codigo: 'DOC_DT_AUSENTE',
    descricao: 'Documento de Ticket não está anexado',
    requer_documento: true,
    campo_correcao: 'arquivo_dt',
    label_campo: 'Upload do Ticket de Pesagem (PDF)',
    tipo_campo: 'file',
  },
  'Documentacao nao anexada': {
    codigo: 'DOCS_AUSENTES',
    descricao: 'Documentação completa não anexada',
    requer_documento: true,
    campo_correcao: 'arquivo_doc',
    label_campo: 'Upload da Documentação Completa',
    tipo_campo: 'file',
  },
  'contrato incorreto': {
    codigo: 'CONTRATO_INCORRETO',
    descricao: 'Número de contrato incorreto',
    requer_documento: false,
    campo_correcao: 'numero_contrato',
    label_campo: 'Número de Contrato Correto',
    tipo_campo: 'text',
  },
};

export function mapStatusToKanban(status: string): KanbanStatus {
  const s = (status || '').toLowerCase().trim();
  if (s === 'finalizado') return 'concluido';
  if (s === 'erro') return 'erro';
  // "Pendente PDA" → coluna Processando
  if (s.includes('pendente')) return 'pendente';
  // "Enviado" → coluna Lançados
  if (s === 'enviado' || s.includes('lançado') || s.includes('lancado')) return 'lancado';
  // Qualquer outro status (teste, bloqueado, etc.) → OS Marcadas
  return 'os_marcada';
}

export function getTipoErro(erroStr: string): TipoErro | null {
  for (const [key, val] of Object.entries(ERRO_TIPOS)) {
    if (erroStr.toLowerCase().includes(key.toLowerCase())) return val;
  }
  if (erroStr.toLowerCase().includes('erro bunge')) {
    return {
      codigo: 'ERRO_BUNGE_SAP',
      descricao: erroStr,
      requer_documento: false,
      campo_correcao: 'obs_correcao',
      label_campo: 'Observação / Ação Manual Realizada',
      tipo_campo: 'text',
    };
  }
  return null;
}

export function formatTempo(minutos: number): string {
  if (minutos < 60) return `${Math.round(minutos)}m`;
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h < 24) return `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function getTempoColor(minutos: number): string {
  if (minutos < 60) return 'bg-green-600 text-green-100';
  if (minutos < 240) return 'bg-yellow-600 text-yellow-100';
  return 'bg-red-700 text-red-100';
}
