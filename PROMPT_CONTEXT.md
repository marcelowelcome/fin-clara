# PROMPT_CONTEXT.md — Clara - Conciliacao

> Cole este arquivo inteiro no inicio de cada nova sessao com o agente de IA (Cursor, Windsurf, Claude, ChatGPT etc.).
> Ele garante que o agente entenda o projeto sem precisar de explicacoes repetidas.

---

## O que e este projeto

**Clara - Conciliacao** e uma aplicacao web para gestao e conciliacao de lancamentos do cartao corporativo Clara da Welcome Group.

O problema que resolve: a empresa importa manualmente um CSV da plataforma Clara com todos os lancamentos do cartao (por multiplos titulares). Hoje a conciliacao e feita em planilhas, sem controle de duplicidade, sem visibilidade por titular e sem notificacoes automaticas.

A aplicacao substitui esse processo com: upload periodico do CSV → preview → deduplicacao automatica → conciliacao assistida → notificacoes por e-mail → dashboard gerencial com ranking por titular.

---

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes com `lib/api-auth.ts` para autenticacao
- **Banco**: Supabase (PostgreSQL) com Row Level Security
- **Auth**: Supabase Auth (admin + holder + viewer)
- **E-mail**: Resend API (lazy-initialized)
- **Deploy**: Vercel (auto-deploy on push to main)
- **Repo**: https://github.com/marcelowelcome/fin-clara

---

## Estrutura modular

O projeto tem 9 modulos. Cada modulo tem responsabilidade unica:

| Modulo | O que faz | Arquivos-chave |
|--------|-----------|----------------|
| M1 — Upload | Importa CSV com preview, deduplica por auth_code, historico com exclusao | `api/upload/`, `lib/csv-parser.ts`, `lib/dedup.ts` |
| M2 — Transacoes | Lista, filtra, pagina, exporta CSV | `api/transactions/`, `components/Transactions/` |
| M3 — Conciliacao | Individual e em lote (batch), historico, maquina de estados | `api/reconcile/`, `components/Reconciliation/` |
| M4 — Titulares | CRUD + vinculo a usuario + config de notificacao | `api/holders/`, `components/Holders/` |
| M5 — Notificacoes | Envia digest de pendencias (individual ou em massa) | `api/notify/`, `lib/notify.ts` |
| M6 — Recorrencias | Detecta padroes, gestao com ativar/desativar | `api/recurrence/`, `lib/recurrence.ts` |
| M7 — Dashboard | KPIs com barras, ranking por titular com medalhas | `dashboard/page.tsx`, `components/Dashboard/` |
| M8 — Auth | Login, perfis admin/titular/viewer, RLS, middleware | `app/(auth)/`, `middleware.ts` |
| M9 — Usuarios | CRUD de usuarios, troca de perfil (admin/titular/visualizador), exclusao com dupla validacao | `api/users/`, `components/Users/` |

---

## Banco de dados — tabelas principais

```sql
profiles              -- Perfis (admin/holder/viewer), auto-criado via trigger (default: viewer)
transactions          -- Tabela central: uma linha por transacao do CSV
uploads               -- Log de cada importacao (cascade delete)
reconciliations       -- Status de conciliacao por transacao (1:1)
reconciliation_log    -- Historico de mudancas de status
holders               -- Titulares com e-mail, user_id, config notificacao
recurrence_patterns   -- Padroes de recorrencia identificados
```

---

## Deduplicacao — regras

```
Autorizadas (com auth_code): UNIQUE(transaction_date, auth_code, amount_brl)
Recusadas/Pendentes: SEM DEDUP — cada linha do CSV e um evento distinto
```

**IMPORTANTE**: Nunca deduplicar transacoes sem auth_code.

---

## Status de conciliacao

| Status | Significado | Transicoes permitidas |
|--------|-------------|----------------------|
| `Pendente` | Autorizada nao tratada | → Conciliado, → Recorrente |
| `Conciliado` | Revisada e aprovada | → Pendente (com justificativa) |
| `Recorrente` | Parte de serie conhecida | → Conciliado |
| `N/A` | Recusada (imutavel) | Nenhuma |

---

## Convencoes tecnicas obrigatorias

1. **Auth**: usar `authenticateRequest()`, `requireAdmin()` ou `requireWriteAccess()` de `lib/api-auth.ts`
2. **Dynamic**: toda API route DEVE ter `export const dynamic = 'force-dynamic'`
3. **Tipos**: todos em `lib/schemas.ts` (Zod + TypeScript)
4. **Supabase**: browser via `lib/supabase.ts`, server via auth helper
5. **Lazy-init**: clients externos (Resend) nunca no top-level
6. **Performance**: `.in()` para batch, nunca queries em loop
7. **Formato**: pt-BR na UI (DD/MM/YYYY, R$ 1.234,56)
8. **API**: retorna `{ data, error }` via `ApiResponse<T>`

---

## Contexto de negocio

- A empresa e a **Welcome Group** (casamentos de destino, Curitiba, Brasil)
- O cartao tem **multiplos titulares** — cada um com um `card_alias` distinto
- A grande maioria dos gastos e em **Publicidade Digital** (Google Ads + Facebook Ads)
- O CSV da Clara usa **datas ISO** (YYYY-MM-DD) e **ponto decimal** (2000.0)
- Transacoes **recusadas** nao exigem conciliacao (status automatico `N/A`)
- Dashboard sem graficos — foco em KPIs + ranking de conciliacao por titular
- Tres perfis de acesso: **admin** (acesso total), **titular/holder** (le apenas proprias transacoes), **visualizador/viewer** (le tudo, nao altera nada)

---

## O que NAO fazer

- Nao criar logica de negocio dentro de componentes React — usar `lib/`
- Nao instanciar Supabase fora de `lib/supabase.ts` ou `lib/supabase-server.ts`
- Nao repetir boilerplate de auth — usar `lib/api-auth.ts`
- Nao expor `SUPABASE_SERVICE_ROLE_KEY` ao client-side
- Nao sobrescrever registros existentes no upload — apenas inserir novos
- Nao deduplicar transacoes sem auth_code
- Nao instanciar clients externos no top-level do modulo
- Nao fazer queries individuais em loop (N+1)
