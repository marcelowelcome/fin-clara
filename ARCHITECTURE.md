# ARCHITECTURE.md — Clara - Conciliacao

> Documento de referencia estrutural do projeto. Leia este arquivo antes de qualquer sessao de desenvolvimento.

---

## Visao Geral

**Clara - Conciliacao** e uma aplicacao web modular para gestao e conciliacao de lancamentos do cartao corporativo Clara (Welcome Group).

- **Stack**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase · Vercel
- **Metodologia**: Vibecoding modular — cada modulo tem responsabilidade unica e interface bem definida
- **Repositorio**: https://github.com/marcelowelcome/fin-clara
- **Deploy**: Vercel (auto-deploy on push to main)

---

## Estrutura de Diretorios

```
fin-clara/
│
├── app/                              # Rotas Next.js (App Router)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx                # force-dynamic para evitar pre-render
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Layout autenticado com Sidebar
│   │   ├── dashboard/page.tsx        # Dashboard principal (M7)
│   │   ├── transactions/page.tsx     # Listagem de transacoes (M2)
│   │   ├── upload/page.tsx           # Upload de CSV (M1)
│   │   ├── holders/page.tsx          # Cadastro de titulares (M4) + notificacoes (M5)
│   │   ├── recurrence/page.tsx       # Gestao de recorrencias (M6)
│   │   └── users/page.tsx            # Gestao de usuarios (M9)
│   └── api/
│       ├── upload/route.ts           # M1: ingestao, dedup, historico, exclusao
│       ├── transactions/route.ts     # M2: listagem com filtros e paginacao
│       ├── transactions/filters/     # M2: valores distintos para dropdowns
│       ├── reconcile/route.ts        # M3: conciliacao individual e em lote
│       ├── reconcile/history/        # M3: historico de mudancas
│       ├── holders/route.ts          # M4: CRUD de titulares
│       ├── notify/route.ts           # M5: disparo de notificacoes
│       ├── recurrence/route.ts       # M6: deteccao e gestao de padroes
│       ├── dashboard/route.ts        # M7: KPIs e metricas
│       └── users/route.ts            # M9: CRUD de usuarios
│
├── components/
│   ├── Upload/
│   │   ├── UploadZone.tsx            # Drag-and-drop + preview antes de confirmar
│   │   ├── UploadSummary.tsx         # Resumo pos-upload (inseridas/ignoradas)
│   │   └── UploadHistory.tsx         # Historico de uploads com exclusao
│   ├── Transactions/
│   │   ├── TransactionTable.tsx      # Tabela paginada + export CSV
│   │   └── TransactionFilters.tsx    # Filtros (fatura, titular, status, categoria, busca)
│   ├── Reconciliation/
│   │   ├── ReconcileButton.tsx       # Botao de conciliacao individual
│   │   ├── BulkReconcile.tsx         # Acao em lote
│   │   └── ReconcileHistory.tsx      # Historico de mudancas
│   ├── Dashboard/
│   │   ├── KpiCards.tsx              # Cards de KPI com barras de progresso
│   │   ├── HolderTable.tsx           # Ranking de titulares por % conciliacao
│   │   ├── InvoiceChart.tsx          # Grafico por categoria (disponivel, nao usado)
│   │   └── MonthlyChart.tsx          # Grafico evolucao mensal (disponivel, nao usado)
│   ├── Holders/
│   │   ├── HolderForm.tsx            # Formulario CRUD + vinculo a usuario
│   │   └── HolderList.tsx            # Listagem + botao notificar individual
│   ├── Users/
│   │   ├── UserForm.tsx              # Criar usuario (email, senha, perfil)
│   │   └── UserList.tsx              # Listagem + trocar perfil + exclusao dupla
│   ├── Sidebar.tsx                   # Navegacao lateral recolhivel
│   └── ui/                           # shadcn/ui (componentes primitivos)
│
├── lib/
│   ├── api-auth.ts                   # Helper de auth: authenticateRequest(), requireAdmin()
│   ├── csv-parser.ts                 # Parser CSV (ISO-8859-1 → UTF-8) + mapeamento de campos
│   ├── dedup.ts                      # Deduplicacao por auth_code (somente autorizadas)
│   ├── recurrence.ts                 # Deteccao de padroes recorrentes (batch)
│   ├── notify.ts                     # Composicao e envio de e-mails via Resend
│   ├── metrics.ts                    # Calculo de KPIs e agregacoes
│   ├── supabase.ts                   # Cliente browser (createBrowserClient)
│   ├── supabase-server.ts            # Cliente server-side (cookies) + service role
│   ├── schemas.ts                    # Tipos TypeScript + Zod schemas + maquina de estados
│   └── utils.ts                      # Formatadores pt-BR (moeda, data, datetime)
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql    # Todas as tabelas + trigger de profile
│   │   └── 002_rls_policies.sql      # RLS para todas as tabelas
│   └── seed.sql                      # Instrucoes para seed
│
├── middleware.ts                      # Refresh de sessao + redirect para /login
├── ARCHITECTURE.md                    # ← este arquivo
├── PROMPT_CONTEXT.md                  # Contexto de negocios para sessoes de IA
├── AGENT_INSTRUCTIONS.md              # Regras obrigatorias para o agente de codigo
├── .cursorrules                       # Alias de AGENT_INSTRUCTIONS para Cursor/Windsurf
└── .env.local.example                 # Variaveis de ambiente necessarias
```

---

## Modulos e Responsabilidades

| ID | Modulo | Arquivo(s) principal(is) | Depende de | Status |
|----|--------|--------------------------|------------|--------|
| M1 | Upload e Ingestao | `api/upload/`, `lib/csv-parser.ts`, `lib/dedup.ts` | Supabase, schemas | Completo |
| M2 | Listagem de Transacoes | `api/transactions/`, `components/Transactions/` | Supabase, schemas | Completo |
| M3 | Conciliacao | `api/reconcile/`, `components/Reconciliation/` | M2, Supabase | Completo |
| M4 | Titulares | `api/holders/`, `components/Holders/` | Supabase, Auth | Completo |
| M5 | Notificacoes | `api/notify/`, `lib/notify.ts` | M3, M4 | Completo (manual) |
| M6 | Recorrencias | `api/recurrence/`, `lib/recurrence.ts` | M2, M3 | Completo (manual) |
| M7 | Dashboard | `dashboard/page.tsx`, `components/Dashboard/` | M2, M3, lib/metrics | Completo |
| M8 | Autenticacao | `app/(auth)/`, `middleware.ts`, `lib/supabase-server.ts` | Supabase Auth | Completo |
| M9 | Usuarios | `api/users/`, `components/Users/` | Supabase Auth (admin API) | Completo |

---

## Banco de Dados (Supabase)

### Tabelas

```
profiles              — Perfis de usuario (admin/holder), criado automaticamente via trigger
transactions          — Tabela central: uma linha por transacao do CSV
uploads               — Log de cada arquivo importado (com cascade delete)
reconciliations       — Status de conciliacao por transacao (1:1)
reconciliation_log    — Historico de mudancas de status
holders               — Titulares cadastrados com e-mail, vinculo a usuario, config de notificacao
recurrence_patterns   — Padroes de recorrencia identificados
```

### Chave de Deduplicacao

```
Autorizadas (com auth_code) → UNIQUE(transaction_date, auth_code, amount_brl)
Recusadas/Pendentes         → Sem dedup (cada linha do CSV e um evento distinto)
```

> **IMPORTANTE**: Nunca deduplicar transacoes sem auth_code. Cada recusada e uma tentativa separada.

### RLS (Row Level Security)

- `admin`: acesso total a todas as tabelas
- `holder`: le apenas `transactions` e `reconciliations` onde `card_alias` corresponde ao seu cadastro
- Policies definidas em `supabase/migrations/002_rls_policies.sql`
- Helper functions: `is_admin()`, `my_card_aliases()`

---

## Fluxo de Dados

```
CSV Clara (ISO date, dot decimal)
    ↓
lib/csv-parser.ts       → mapeia colunas, normaliza encoding
    ↓
Preview no browser      → usuario confirma antes de processar
    ↓
lib/dedup.ts            → verifica duplicatas por auth_code no Supabase
    ↓
Supabase: transactions  → insere apenas registros novos
    ↓
Supabase: uploads       → registra log do upload
    ↓
reconciliations         → cria "Pendente" para Autorizadas, "N/A" para Recusadas
    ↓
lib/recurrence.ts       → deteccao manual: batch insert patterns + batch update recons
```

---

## Variaveis de Ambiente

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Apenas server-side (nunca expor ao client)

# E-mail (Resend) — lazy-initialized, nao quebra build sem a key
RESEND_API_KEY=
NOTIFY_FROM_EMAIL=noreply@welcomegroup.com.br
NOTIFY_FROM_NAME=Welcome Group

# App
NEXT_PUBLIC_APP_URL=https://fin-clara.vercel.app
```

---

## Convencoes de Codigo

- **Auth em API routes**: usar `authenticateRequest()` ou `requireAdmin()` de `lib/api-auth.ts` — nunca repetir boilerplate
- **Dynamic routes**: toda API route DEVE ter `export const dynamic = 'force-dynamic'`
- **Tipos**: todos os tipos de dados em `lib/schemas.ts` (TypeScript + Zod)
- **Queries Supabase**: sempre via `lib/supabase.ts` (browser) ou `lib/supabase-server.ts` (server)
- **Resend/clients externos**: sempre lazy-init (funcao, nunca top-level const)
- **API Routes**: retornam `{ data, error }` via `ApiResponse<T>` — nunca lancar excecoes sem capturar
- **Componentes**: um componente por arquivo, exportacao nomeada
- **Formatacao**: datas em `DD/MM/YYYY` na UI, `YYYY-MM-DD` no banco; valores em `R$ 1.234,56`
- **Performance**: evitar N+1 queries (usar `.in()` para batch), batch inserts/updates quando possivel

---

## Pendencias (v1.1)

- Notificacoes automaticas via cron (Vercel Cron ou Supabase Edge Functions)
- Deteccao automatica de recorrencia no upload
- Deep links com filtros na URL
- Mobile responsivo
