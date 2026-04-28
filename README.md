# Painel Troca Notas — Genesis

Painel interno da GRU Solutions para gestão de Ordens de Serviço (OS) de troca de notas fiscais da empresa Genesis. Desenvolvido em Next.js 14 com backend MySQL e autenticação própria baseada em HMAC.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Stack Técnica](#stack-técnica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Executando o Projeto](#executando-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Sistema de Autenticação](#sistema-de-autenticação)
- [Banco de Dados](#banco-de-dados)
- [Modo Offline](#modo-offline)
- [Upload de Documentos](#upload-de-documentos)
- [Segurança](#segurança)
- [Deploy em Produção](#deploy-em-produção)
- [Scripts Utilitários](#scripts-utilitários)

---

## Visão Geral

O painel permite que a equipe Genesis acompanhe e corrija OS em tempo real, sem depender do sistema legado Tarq. O fluxo de trabalho é:

```
OS Marcada → Processando → Concluída
                        ↘ Erro ← operador corrige → Processando
```

O RPA (robô) processa as OS automaticamente. Quando falha, grava um erro no banco e o operador usa o painel para corrigir o dado (placa, chave NF-e, peso, etc.) e recolocar a OS na fila.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS |
| Banco de dados | MySQL 8 (mysql2/promise) |
| Autenticação | HMAC-SHA256 cookie próprio (Web Crypto API) |
| Senhas | scrypt + salt (Node.js crypto) |
| Drag & Drop | @dnd-kit/core |
| Gráficos | Recharts |
| Dados remotos | SWR (stale-while-revalidate) |
| Ícones | Lucide React |
| Toasts | react-hot-toast |

---

## Estrutura do Projeto

```
painel-troca-notas-genesis/
├── src/
│   ├── app/
│   │   ├── login/              # Página de login
│   │   ├── dashboard/          # Dashboard com KPIs e gráficos
│   │   ├── kanban/             # Board Kanban de OS
│   │   ├── admin/
│   │   │   └── usuarios/       # Gestão de usuários (admin only)
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/      # POST: autenticação
│   │       │   ├── logout/     # POST: encerrar sessão
│   │       │   └── me/         # GET: usuário logado
│   │       ├── kanban/
│   │       │   ├── route.ts    # GET: lista de OS
│   │       │   └── [id]/
│   │       │       ├── route.ts        # GET: OS | PATCH: corrigir
│   │       │       ├── erros/          # GET: erros da OS
│   │       │       └── historico/      # GET: histórico completo
│   │       ├── dashboard/
│   │       │   ├── kpis/               # GET: KPIs (total, erros, etc.)
│   │       │   ├── por-dia/            # GET: OS por dia (gráfico área)
│   │       │   ├── distribuicao/       # GET: distribuição por status (donut)
│   │       │   └── erros-frequentes/   # GET: top 10 erros (barras)
│   │       ├── admin/
│   │       │   └── users/              # GET list | POST create | PATCH | DELETE
│   │       ├── upload/                 # POST: upload de documentos
│   │       └── clientes/               # GET: lista de clientes distintos
│   ├── components/
│   │   ├── ui/
│   │   │   └── Sidebar.tsx     # Navegação lateral
│   │   ├── dashboard/          # KPICard, ChartOSporDia, ChartDistribuicao, etc.
│   │   └── kanban/             # OSCard, KanbanColumn, ModalCorrecao, etc.
│   ├── lib/
│   │   ├── auth.ts             # HMAC cookie — compatível com Edge runtime
│   │   ├── db.ts               # Pool MySQL + withTransaction()
│   │   ├── queries.ts          # Todas as queries SQL do sistema
│   │   ├── users.ts            # CRUD de usuários (scrypt + users.json)
│   │   ├── offline.ts          # Modo offline (lê JSON local em vez do banco)
│   │   └── ratelimit.ts        # Rate limiter em memória
│   ├── hooks/
│   │   └── useNewErrorNotification.ts  # Notificação de novos erros
│   ├── middleware.ts            # Auth guard — Edge runtime
│   └── types/
│       └── index.ts            # Tipos, mapeamentos e constantes
├── data/
│   └── users.json              # Usuários (gitignored — gerado automaticamente)
├── offline-data/
│   ├── kanban.json             # Snapshot do banco para modo offline
│   └── pending.json            # Correções pendentes de sync (gitignored)
├── public/
│   └── uploads/                # Documentos enviados (gitignored)
├── sync-offline.js             # Script: aplica pending.json ao banco
├── next.config.mjs
└── .env.local                  # Variáveis de ambiente (gitignored)
```

---

## Pré-requisitos

- Node.js 18+ (recomendado: 20 ou 24)
- Acesso ao MySQL `mysql.geneslab.com.br` (VPN ou rede interna Genesis)
- npm, pnpm ou yarn

---

## Configuração do Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
# Banco de Dados MySQL
DB_HOST=mysql.geneslab.com.br
DB_PORT=3306
DB_NAME=geld_rpa
DB_USER=gg_rpa
DB_PASSWORD=sua_senha_aqui

# Autenticação — OBRIGATÓRIO em produção
# Gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=gere-um-valor-aleatorio-aqui

# Upload de documentos
MAX_FILE_SIZE_MB=10

# Modo offline (true = usa offline-data/*.json em vez do MySQL)
DB_OFFLINE=false

# Metadados da aplicação
NEXT_PUBLIC_APP_NAME="Painel Troca Notas - Genesis"
NEXT_PUBLIC_EMPRESA=Genesis
```

> **Atenção:** `.env.local` está no `.gitignore` e nunca vai para o repositório.  
> Nunca compartilhe este arquivo — ele contém credenciais do banco.

---

## Executando o Projeto

```bash
# Instalar dependências
npm install

# Desenvolvimento (hot reload)
npm run dev

# Build de produção
npm run build
npm start

# Verificar tipos TypeScript
npx tsc --noEmit
```

O painel estará disponível em [http://localhost:3000](http://localhost:3000).

---

## Funcionalidades

### Dashboard

- **KPIs em tempo real:** Total de OS, Concluídas, Pendentes, Com Erro
- **Gráfico de área:** OS abertas por dia com séries separadas por status
- **Donut de distribuição:** proporção de cada status no período
- **Barras de erros frequentes:** top 10 mensagens de erro do RPA
- **Cross-filter estilo PowerBI:** clicar em um KPI ou fatia filtra todos os gráficos
- **Filtros de data e cliente:** combinam com o cross-filter
- **Auto-refresh:** dados atualizados a cada 2 minutos

### Kanban

- **4 colunas:** OS Marcadas → Processando → Erros → Concluídas
- **Drag & drop** entre colunas para mover OS manualmente
- **Cards com contexto completo:** OS, laudo, cliente, placa, tempo decorrido
- **Badge de erro animado** nas OS com problema
- **Modal de correção:** identifica o tipo de erro e exibe o campo correto para corrigir (placa, chave NF-e, peso líquido, documentos, etc.)
- **Upload de documentos** diretamente no modal
- **Histórico completo** de eventos do RPA por OS
- **Notificação de novos erros:** alerta do browser + badge no título da aba
- **Busca e filtros** por cliente, data e texto

### Gestão de Usuários (Admin)

- **Listagem** de todos os usuários com status e perfil
- **Criação** com senha sugerida aleatória visível
- **Edição inline:** nome, senha e perfil
- **Ativação/desativação** de contas
- **Remoção** (exceto o usuário `admin` principal)
- **Acesso restrito:** somente usuários com `role: admin`

---

## Sistema de Autenticação

### Fluxo

```
1. POST /api/auth/login  →  valida credenciais (scrypt)
2. Resposta seta cookie HttpOnly: sess=<token>
3. Toda requisição passa pelo middleware (Edge runtime)
4. Middleware valida HMAC do token e injeta x-user/x-role nos headers
5. Route handlers leem req.headers.get('x-user') para rastreabilidade
```

### Token de Sessão

Formato: `username:role:timestamp_unix.HMAC-SHA256_hex`

- Assinado com `SESSION_SECRET` via Web Crypto API (timing-safe)
- Expiração: 8 horas
- Cookie: `HttpOnly; SameSite=Strict; Secure` (Secure apenas em produção)

### Usuários

Armazenados em `data/users.json` (gitignored). Senhas com `scrypt` + salt aleatório de 16 bytes.

**Usuários criados automaticamente no primeiro uso:**

| Username | Senha padrão | Perfil |
|---|---|---|
| admin | admin123 | Administrador |
| operador | genesis123 | Operador |

> **Importante:** Troque as senhas padrão imediatamente em `/admin/usuarios` após o primeiro login.

### Papéis (roles)

| Role | Acesso |
|---|---|
| `admin` | Tudo, incluindo gestão de usuários |
| `user` | Dashboard, Kanban e correção de OS |

---

## Banco de Dados

### Tabelas principais

| Tabela | Uso |
|---|---|
| `ordem_servico` | OS com status, datas, laudo, PDA |
| `informacao_carga` | Placa, peso, chave NF-e, nota fiscal |
| `log_genesis` | Histórico de eventos e erros do RPA |
| `vw_fila_rpa` | View com OS na fila aguardando processamento |
| `datahora_documentos` | Data/hora dos documentos por laudo |
| `nota_fiscal` | Dados da NF-e |
| `ticket_pesagem` | Ticket de pesagem |
| `motorista` | Dados do motorista |

### Pool de Conexões

`src/lib/db.ts` usa um pool MySQL com `connectionLimit: 10`. Conexões são reutilizadas entre requisições — não abre/fecha a cada query.

### Transações

`withTransaction(fn)` garante atomicidade: se qualquer query dentro falhar, todas são revertidas via `ROLLBACK`.

```ts
await withTransaction(async (exec) => {
  await exec('UPDATE informacao_carga SET placa = ? WHERE ...', [novaPlaca, osId]);
  await exec('INSERT INTO log_genesis ...', [...]);
  await exec('UPDATE ordem_servico SET status = "Pendente PDA" WHERE ...', [osId]);
});
```

### Rastreabilidade

Toda correção feita pelo painel é gravada em `log_genesis` com:
```
aplicacao = 'PAINEL:username_do_operador'
```

---

## Modo Offline

Quando `DB_OFFLINE=true` no `.env.local`, o sistema usa snapshots locais em vez do MySQL:

```
offline-data/
├── kanban.json    # Snapshot das OS (gerado por dump-kanban.js)
└── pending.json   # Correções feitas offline (aplicadas depois pelo sync)
```

**Quando usar:** desenvolvimento sem VPN, ou para demonstrações.

**Para sincronizar correções offline com o banco:**

```bash
node sync-offline.js
```

O script lê `pending.json`, aplica cada correção no MySQL e move o arquivo para `pending-applied.json`.

---

## Upload de Documentos

Documentos são salvos em `public/uploads/{osId}/{tipo}_{timestamp}.{ext}` e servidos pelo Next.js. O acesso exige autenticação (cookie válido).

**Tipos permitidos:** PDF, XML, JPG, PNG  
**Tamanho máximo:** configurado em `MAX_FILE_SIZE_MB` (padrão: 10 MB)  
**Rate limit:** 20 uploads por minuto por IP

---

## Segurança

| Medida | Implementação |
|---|---|
| Autenticação | HMAC-SHA256 cookie, timing-safe, expira em 8h |
| Senhas | scrypt + salt 16 bytes por usuário |
| SQL Injection | Queries 100% parametrizadas (mysql2 execute) |
| XSS | CSP via headers, HttpOnly cookie |
| CSRF | SameSite=Strict no cookie |
| Path Traversal | sanitização de `osId` no upload (regex `[a-zA-Z0-9_-]`) |
| Campo Whitelist | `CAMPOS_PERMITIDOS` valida campo antes de qualquer UPDATE |
| Rate Limit | Login: 5/min · Upload: 20/min · PATCH: 60/min |
| Headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS |
| Cookie Secure | Ativo automaticamente em `NODE_ENV=production` |
| SESSION_SECRET | Obrigatório em produção — lança erro se ausente/padrão |

---

## Deploy em Produção

1. Configurar `.env.local` com `SESSION_SECRET` gerado aleatoriamente:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Garantir `DB_OFFLINE=false` e `NODE_ENV=production`

3. Build e start:
   ```bash
   npm run build
   npm start
   ```

4. Recomendado: usar Traefik ou nginx como reverse proxy com TLS para que o cookie `Secure` funcione corretamente.

5. Trocar senhas padrão (`admin123` / `genesis123`) em `/admin/usuarios` no primeiro acesso.

---

## Scripts Utilitários

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Build de produção otimizado |
| `npm start` | Inicia o servidor de produção |
| `npx tsc --noEmit` | Verificação de tipos TypeScript sem compilar |
| `node sync-offline.js` | Aplica correções do `pending.json` ao banco MySQL |

---

## Licença

Uso interno — GRU Solutions / Genesis. Não distribuir.
