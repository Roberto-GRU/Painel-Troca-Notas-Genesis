-- =============================================
-- Painel Troca Notas - Empresa Genesis
-- Schema PostgreSQL (compatível com DBeaver)
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  razao_social VARCHAR(200) NOT NULL,
  cnpj VARCHAR(18),
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Filiais
CREATE TABLE IF NOT EXISTS filiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id),
  codigo VARCHAR(20) NOT NULL,
  nome VARCHAR(200) NOT NULL,
  cidade VARCHAR(100),
  estado CHAR(2),
  ativo BOOLEAN DEFAULT TRUE
);

-- Tipos de erro predefinidos
CREATE TABLE IF NOT EXISTS tipos_erro (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  descricao VARCHAR(200) NOT NULL,
  requer_documento BOOLEAN DEFAULT FALSE,
  campo_correcao VARCHAR(100),    -- nome do campo que precisa ser preenchido
  label_campo VARCHAR(200),        -- label amigável para exibir ao usuário
  tipo_campo VARCHAR(50) DEFAULT 'text'  -- text, number, date, file, select
);

-- Inserindo tipos de erro padrão Genesis
INSERT INTO tipos_erro (codigo, descricao, requer_documento, campo_correcao, label_campo, tipo_campo) VALUES
  ('CHAVE_NF_INVALIDA',   'Chave de acesso NF-e inválida',           FALSE, 'chave_nfe',        'Nova Chave de Acesso NF-e',        'text'),
  ('PESO_DIVERGENTE',     'Peso divergente entre NF e ticket',        FALSE, 'peso_correto_kg',  'Peso Correto (kg)',                 'number'),
  ('DOCUMENTO_ILEGIVEL',  'Documento ilegível ou corrompido',         TRUE,  'novo_documento',   'Upload do Novo Documento',          'file'),
  ('DOCUMENTO_ERRADO',    'Documento incorreto enviado',              TRUE,  'novo_documento',   'Upload do Documento Correto',       'file'),
  ('PLACA_INCORRETA',     'Placa do veículo incorreta',               FALSE, 'placa_correta',    'Placa Correta do Veículo',          'text'),
  ('CNPJ_INVALIDO',       'CNPJ do emitente inválido ou divergente', FALSE, 'cnpj_correto',     'CNPJ Correto',                      'text'),
  ('GMO_AUSENTE',         'Declaração GMO não informada',             FALSE, 'declaracao_gmo',   'Declaração GMO',                    'select'),
  ('UMIDADE_FORA',        '% Umidade fora do limite contratual',      FALSE, 'umidade_corrigida','% Umidade Corrigida',               'number'),
  ('FILIAL_NAO_ENCONTRADA','Filial de destino não localizada',        FALSE, 'codigo_filial',    'Código da Filial Correta',          'text'),
  ('XML_INVALIDO',        'XML da NF-e inválido ou mal-formado',      TRUE,  'novo_xml',         'Upload do Novo XML',                'file')
ON CONFLICT (codigo) DO NOTHING;

-- Ordens de Serviço (OS)
CREATE TABLE IF NOT EXISTS ordens_servico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_os VARCHAR(30) UNIQUE NOT NULL,            -- ex: GGJ-2G07
  cliente_id UUID REFERENCES clientes(id),
  filial_id UUID REFERENCES filiais(id),

  -- Status do Kanban
  status VARCHAR(50) NOT NULL DEFAULT 'os_marcada'
    CHECK (status IN ('os_marcada','pendente','lancado','erro','em_analise','concluido','cancelado')),

  -- Dados do veículo
  placa_veiculo VARCHAR(10),
  provider VARCHAR(100),
  fonte VARCHAR(50),                               -- whatsapp, email, portal, manual
  load_id VARCHAR(50),

  -- Pesos
  peso_tara_kg NUMERIC(10,2),
  peso_carga_kg NUMERIC(10,2),
  peso_bruto_kg NUMERIC(10,2),

  -- Classificação de grão
  pct_umidade NUMERIC(5,2),
  pct_esverdeado NUMERIC(5,2),
  pct_avariado NUMERIC(5,2),
  pct_impureza NUMERIC(5,2),
  declaracao_gmo VARCHAR(50),

  -- Nota Fiscal
  tipo_documento_fiscal VARCHAR(20) DEFAULT 'NF-e',
  chave_nfe VARCHAR(60),
  numero_nf VARCHAR(20),

  -- Controle de tempo
  marcada_em TIMESTAMPTZ DEFAULT NOW(),            -- entrada na coluna OS Marcadas
  pendente_em TIMESTAMPTZ,
  lancado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,

  -- Usuário responsável
  responsavel_id UUID,
  observacoes TEXT,

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Erros das OS
CREATE TABLE IF NOT EXISTS os_erros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo_erro_id INTEGER REFERENCES tipos_erro(id),
  descricao_erro TEXT NOT NULL,

  -- Correção do usuário
  valor_corrigido TEXT,                            -- valor textual do campo corrigido
  documento_corrigido_path VARCHAR(500),           -- caminho do arquivo se requer_documento=true
  documento_corrigido_nome VARCHAR(255),
  documento_corrigido_tipo VARCHAR(100),

  resolvido BOOLEAN DEFAULT FALSE,
  resolvido_em TIMESTAMPTZ,
  resolvido_por UUID,

  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Anexos das OS
CREATE TABLE IF NOT EXISTS os_anexos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,                       -- danfe, xml, pda, cte, outro
  nome_original VARCHAR(255) NOT NULL,
  caminho_arquivo VARCHAR(500) NOT NULL,
  tamanho_bytes BIGINT,
  mime_type VARCHAR(100),
  enviado_por VARCHAR(100),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de movimentações
CREATE TABLE IF NOT EXISTS os_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  status_anterior VARCHAR(50),
  status_novo VARCHAR(50) NOT NULL,
  descricao TEXT,
  usuario VARCHAR(100),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_cliente ON ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_os_marcada_em ON ordens_servico(marcada_em DESC);
CREATE INDEX IF NOT EXISTS idx_os_erros_os ON os_erros(os_id);
CREATE INDEX IF NOT EXISTS idx_os_erros_resolvido ON os_erros(resolvido);
CREATE INDEX IF NOT EXISTS idx_historico_os ON os_historico(os_id);

-- Trigger: atualiza atualizado_em automaticamente
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_os_atualizado_em
  BEFORE UPDATE ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Trigger: registra histórico automaticamente ao mudar status
CREATE OR REPLACE FUNCTION registrar_historico_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO os_historico (os_id, status_anterior, status_novo, descricao)
    VALUES (NEW.id, OLD.status, NEW.status,
      'Status alterado de ' || OLD.status || ' para ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_os_historico_status
  AFTER UPDATE ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION registrar_historico_status();

-- View: KPIs do dashboard
CREATE OR REPLACE VIEW vw_kpis_dashboard AS
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'concluido') AS concluidos,
  COUNT(*) FILTER (WHERE status NOT IN ('concluido','cancelado')) AS pendentes,
  COUNT(*) FILTER (WHERE status = 'erro') AS com_erro,
  COUNT(*) FILTER (WHERE status = 'os_marcada') AS os_marcadas,
  COUNT(*) FILTER (WHERE status = 'lancado') AS lancados,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (concluido_em - marcada_em))/3600) FILTER (WHERE status = 'concluido'),
    2
  ) AS tempo_medio_horas,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (NOW() - marcada_em))/3600) FILTER (WHERE status NOT IN ('concluido','cancelado')),
    2
  ) AS tempo_medio_abertos_horas
FROM ordens_servico
WHERE marcada_em >= NOW() - INTERVAL '30 days';

-- View: OS por dia (para gráfico de linha)
CREATE OR REPLACE VIEW vw_os_por_dia AS
SELECT
  DATE(marcada_em) AS dia,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'concluido') AS concluidos,
  COUNT(*) FILTER (WHERE status = 'erro') AS com_erro
FROM ordens_servico
WHERE marcada_em >= NOW() - INTERVAL '30 days'
GROUP BY DATE(marcada_em)
ORDER BY dia;

-- View: distribuição por status
CREATE OR REPLACE VIEW vw_distribuicao_status AS
SELECT
  status,
  COUNT(*) AS quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentual
FROM ordens_servico
WHERE marcada_em >= NOW() - INTERVAL '30 days'
GROUP BY status;
