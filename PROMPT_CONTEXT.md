# PROMPT_CONTEXT.md — Clara Card Manager

> Cole este arquivo inteiro no início de cada nova sessão com o agente de IA (Cursor, Windsurf, Claude, ChatGPT etc.).
> Ele garante que o agente entenda o projeto sem precisar de explicações repetidas.

---

## O que é este projeto

**Clara Card Manager** é uma aplicação web para gestão e conciliação de lançamentos do cartão corporativo Clara da Welcome Weddings.

O problema que resolve: a empresa importa manualmente um CSV da plataforma Clara com todos os lançamentos do cartão (por múltiplos titulares). Hoje a conciliação é feita em planilhas, sem controle de duplicidade, sem visibilidade por titular e sem notificações automáticas.

A aplicação substitui esse processo com: upload periódico do CSV → deduplicação automática → conciliação assistida → notificações por e-mail para titulares com pendências → dashboard gerencial.

---

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (server actions)
- **Banco**: Supabase (PostgreSQL) com Row Level Security
- **Auth**: Supabase Auth
- **E-mail**: Resend API
- **Deploy**: Vercel

---

## Estrutura modular

O projeto tem 8 módulos. Cada módulo tem responsabilidade única:

| Módulo | O que faz | Arquivos-chave |
|--------|-----------|----------------|
| M1 — Upload | Importa CSV, deduplica, registra log | `app/api/upload/route.ts`, `lib/csv-parser.ts`, `lib/dedup.ts` |
| M2 — Transações | Lista e filtra transações | `app/api/transactions/route.ts`, `components/Transactions/` |
| M3 — Conciliação | Marca/desmarca conciliação, histórico | `app/api/reconcile/route.ts`, `components/Reconciliation/` |
| M4 — Titulares | CRUD de titulares + config de notificação | `app/api/holders/route.ts`, `components/Holders/` |
| M5 — Notificações | Envia digest de pendências por e-mail | `app/api/notify/route.ts`, `lib/notify.ts` |
| M6 — Recorrências | Detecta e marca transações recorrentes | `app/api/recurrence/route.ts`, `lib/recurrence.ts` |
| M7 — Dashboard | KPIs, gráficos por fatura e titular | `app/(dashboard)/page.tsx`, `components/Dashboard/` |
| M8 — Auth | Login, perfis admin/titular, RLS | `app/(auth)/`, `lib/supabase-server.ts` |

---

## Banco de dados — tabelas principais

```sql
-- transactions: tabela central
id                  uuid PRIMARY KEY
transaction_date    date
billing_period      text          -- "09 Mar 2026 - 08 Apr 2026"
merchant_name       text
amount_brl          numeric(10,2)
original_amount     numeric(10,2)
original_currency   text          -- "BRL" ou "USD"
card_last4          text          -- "1773"
card_alias          text          -- "Marcelo Aveiro - Weddings"
status              text          -- "Autorizada" | "Recusada" | "Pendente"
auth_code           text          -- código de autorização (nulo para recusadas)
category            text
holder_name         text
upload_id           uuid REFERENCES uploads(id)
created_at          timestamptz

-- uploads: log de cada importação
id, created_at, filename, uploaded_by, total_rows, inserted_rows, skipped_rows

-- reconciliations: status de conciliação (1:1 com transactions)
id, transaction_id, status, note, reconciled_by, reconciled_at,
is_recurring, recurrence_pattern_id

-- reconciliation_log: histórico
id, transaction_id, old_status, new_status, changed_by, changed_at, note

-- holders: titulares cadastrados
id, name, card_alias, card_last4, email, notify_enabled,
notify_frequency, user_id

-- recurrence_patterns: padrões detectados
id, merchant_pattern, avg_amount, tolerance_pct, active, created_by
```

---

## Status de conciliação

| Status | Significado | Setado por |
|--------|-------------|-----------|
| `Pendente` | Transação autorizada ainda não tratada | Automático no upload |
| `Conciliado` | Revisada e aprovada | Ação do gestor |
| `N/A` | Recusada ou não aplicável | Automático para Recusadas |
| `Recorrente` | Parte de série conhecida | M6 automático ou manual |

---

## Deduplicação — regras

```typescript
// Transações com auth_code (autorizadas):
UNIQUE(transaction_date, auth_code, amount_brl)

// Sem auth_code (recusadas / pendentes):
UNIQUE(transaction_date, merchant_name, amount_brl, status)
```

Ao fazer upload, checar essas chaves antes de inserir. Registros que já existem são ignorados (não sobrescritos). O `upload_id` registra qual importação trouxe cada transação.

---

## Matching titular ↔ CSV

O campo `card_alias` do CSV (ex.: `"Marcelo Aveiro - Weddings"`) deve ser usado para vincular automaticamente transações ao titular cadastrado na tabela `holders`. Se não houver match, `holder_id` fica nulo para resolução manual.

---

## Permissões (RLS)

- **admin**: acesso total
- **holder**: lê apenas registros onde `transactions.card_alias = holders.card_alias` do seu próprio perfil. Não pode fazer upload nem ver dados de outros titulares.

---

## Contexto de negócio importante

- A empresa é a **Welcome Weddings**, divisão de casamentos de destino da Welcome Trips (Curitiba, Brasil).
- O cartão tem **múltiplos titulares** — cada um com um `card_alias` distinto.
- A grande maioria dos gastos é em **Publicidade Digital** (Google Ads + Facebook Ads) — transações recorrentes a cada ~3 dias.
- O CSV é exportado da plataforma **Clara** em formato ISO-8859-1.
- Todas as datas e valores monetários devem ser exibidos no formato **pt-BR**.
- Transações **recusadas** não exigem conciliação (status automático `N/A`).

---

## O que NÃO fazer

- Não criar lógica de negócio dentro de componentes React — usar `lib/` para isso.
- Não instanciar o cliente Supabase fora de `lib/supabase.ts` ou `lib/supabase-server.ts`.
- Não expor `SUPABASE_SERVICE_ROLE_KEY` ao client-side.
- Não sobrescrever registros existentes no upload — apenas inserir novos.
- Não misturar responsabilidades de módulos — se um módulo precisar de dado de outro, usar a API route do módulo correspondente.
