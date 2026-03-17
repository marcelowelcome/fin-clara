# ARCHITECTURE.md — Clara Card Manager

> Documento de referência estrutural do projeto. Leia este arquivo antes de qualquer sessão de desenvolvimento.

---

## Visão Geral

**Clara Card Manager** é uma aplicação web modular para gestão e conciliação de lançamentos do cartão corporativo Clara (Welcome Weddings).

- **Stack**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · Vercel
- **Metodologia**: Vibecoding modular — cada módulo tem responsabilidade única e interface bem definida
- **Repositório**: `/` (raiz do projeto)

---

## Estrutura de Diretórios

```
clara-card-manager/
│
├── app/                          # Rotas Next.js (App Router)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Layout autenticado
│   │   ├── page.tsx              # Dashboard principal (M7)
│   │   ├── transactions/
│   │   │   └── page.tsx          # Listagem de transações (M2)
│   │   ├── upload/
│   │   │   └── page.tsx          # Upload de CSV (M1)
│   │   ├── holders/
│   │   │   └── page.tsx          # Cadastro de titulares (M4)
│   │   └── settings/
│   │       └── page.tsx          # Configurações gerais
│   └── api/
│       ├── upload/route.ts       # M1: ingestão e dedup do CSV
│       ├── transactions/route.ts # M2: listagem com filtros
│       ├── reconcile/route.ts    # M3: conciliação de transações
│       ├── holders/route.ts      # M4: CRUD de titulares
│       ├── notify/route.ts       # M5: disparo de notificações
│       └── recurrence/route.ts   # M6: padrões de recorrência
│
├── components/
│   ├── Upload/
│   │   ├── UploadZone.tsx        # Drag-and-drop + seletor de arquivo
│   │   └── UploadSummary.tsx     # Resumo pós-upload (inseridas/ignoradas)
│   ├── Transactions/
│   │   ├── TransactionTable.tsx  # Tabela paginada de transações
│   │   ├── TransactionFilters.tsx # Filtros (fatura, titular, status)
│   │   └── TransactionRow.tsx    # Linha com ações inline
│   ├── Reconciliation/
│   │   ├── ReconcileButton.tsx   # Botão de conciliação individual
│   │   ├── BulkReconcile.tsx     # Ação em lote
│   │   └── ReconcileHistory.tsx  # Histórico de mudanças
│   ├── Dashboard/
│   │   ├── KpiCards.tsx          # Cards de KPI de topo
│   │   ├── InvoiceChart.tsx      # Gráfico por categoria/fatura
│   │   └── HolderTable.tsx       # Tabela de titulares com drill-down
│   ├── Holders/
│   │   ├── HolderForm.tsx        # Formulário CRUD de titular
│   │   └── HolderList.tsx        # Listagem de titulares cadastrados
│   └── ui/                       # Componentes primitivos reutilizáveis
│       ├── Button.tsx
│       ├── Badge.tsx
│       ├── Modal.tsx
│       └── Table.tsx
│
├── lib/
│   ├── csv-parser.ts             # Parser CSV + normalização de campos
│   ├── dedup.ts                  # Lógica de deduplicação de transações
│   ├── recurrence.ts             # Detecção de padrões recorrentes
│   ├── notify.ts                 # Composição e envio de e-mails
│   ├── supabase.ts               # Cliente Supabase (server + client)
│   ├── supabase-server.ts        # Cliente server-side (cookies)
│   ├── schemas.ts                # Tipos TypeScript e Zod schemas
│   ├── metrics.ts                # Cálculo de KPIs e agregações
│   └── utils.ts                  # Helpers genéricos (formatação, datas)
│
├── supabase/
│   ├── migrations/               # Migrations SQL versionadas
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_recurrence.sql
│   └── seed.sql                  # Dados de teste
│
├── ARCHITECTURE.md               # ← este arquivo
├── PROMPT_CONTEXT.md             # Contexto para sessões de IA
├── AGENT_INSTRUCTIONS.md         # Regras para o agente de código
├── .cursorrules                  # Alias de AGENT_INSTRUCTIONS para Cursor/Windsurf
└── .env.local.example            # Variáveis de ambiente necessárias
```

---

## Módulos e Responsabilidades

| ID | Módulo | Arquivo(s) principal(is) | Depende de |
|----|--------|--------------------------|------------|
| M1 | Upload e Ingestão | `api/upload/route.ts`, `lib/csv-parser.ts`, `lib/dedup.ts` | Supabase, schemas |
| M2 | Listagem de Transações | `api/transactions/route.ts`, `components/Transactions/` | Supabase, schemas |
| M3 | Conciliação | `api/reconcile/route.ts`, `components/Reconciliation/` | M2, Supabase |
| M4 | Titulares | `api/holders/route.ts`, `components/Holders/` | Supabase, Auth |
| M5 | Notificações | `api/notify/route.ts`, `lib/notify.ts` | M3, M4 |
| M6 | Recorrências | `api/recurrence/route.ts`, `lib/recurrence.ts` | M2, M3 |
| M7 | Dashboard | `app/(dashboard)/page.tsx`, `components/Dashboard/` | M2, M3, lib/metrics |
| M8 | Autenticação | `app/(auth)/`, `lib/supabase-server.ts` | Supabase Auth |

---

## Banco de Dados (Supabase)

### Tabelas

```sql
transactions          -- Tabela central: uma linha por transação do CSV
uploads               -- Log de cada arquivo importado
reconciliations       -- Status de conciliação por transação (1:1)
reconciliation_log    -- Histórico de mudanças de status
holders               -- Titulares cadastrados com e-mail e config de notificação
recurrence_patterns   -- Padrões de recorrência identificados
```

### Chave de Deduplicação

```
Autorizadas  → UNIQUE(transaction_date, auth_code, amount_brl)
Sem auth_code → UNIQUE(transaction_date, merchant_name, amount_brl, status)
```

### RLS (Row Level Security)

- `admin`: acesso total a todas as tabelas
- `holder`: lê apenas `transactions` e `reconciliations` onde `card_alias = seu alias cadastrado`
- Policies definidas em `supabase/migrations/002_rls_policies.sql`

---

## Fluxo de Dados

```
CSV Upload
    ↓
lib/csv-parser.ts       → normaliza encoding, mapeia campos
    ↓
lib/dedup.ts            → verifica duplicatas no Supabase
    ↓
Supabase: transactions  → insere apenas registros novos
    ↓
Supabase: uploads       → registra log do upload
    ↓
reconciliations         → cria entrada "Pendente" para cada Autorizada nova
    ↓
lib/recurrence.ts       → verifica se bate com padrão; se sim, marca automaticamente
```

---

## Variáveis de Ambiente

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Apenas server-side (nunca expor ao client)

# E-mail (Resend)
RESEND_API_KEY=
NOTIFY_FROM_EMAIL=noreply@welcomeweddings.com.br

# App
NEXT_PUBLIC_APP_URL=https://clara.welcomeweddings.com.br
```

---

## Convenções de Código

- **Tipos**: todos os tipos de dados em `lib/schemas.ts` (TypeScript + Zod)
- **Queries Supabase**: sempre via `lib/supabase.ts` — nunca instanciar o client diretamente em componentes
- **API Routes**: retornam `{ data, error }` — nunca lançar exceções sem capturar
- **Componentes**: um componente por arquivo, exportação nomeada
- **Formatação**: datas em `DD/MM/YYYY` na UI, `YYYY-MM-DD` no banco; valores sempre em `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
