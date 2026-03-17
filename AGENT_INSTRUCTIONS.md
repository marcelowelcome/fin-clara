# AGENT_INSTRUCTIONS.md — Clara - Conciliacao

> Regras permanentes para o agente de IA durante o desenvolvimento deste projeto.
> Estas instrucoes tem prioridade sobre qualquer sugestao generica do modelo.
> Copie este conteudo tambem no `.cursorrules` para uso automatico no Cursor/Windsurf.

---

## REGRA 1 — Leia a arquitetura antes de agir

Antes de criar ou editar qualquer arquivo, leia `ARCHITECTURE.md` para confirmar:
- Em qual modulo a tarefa se encaixa
- Quais arquivos existentes devem ser modificados vs. criados do zero
- Se a mudanca impacta outros modulos (verificar dependencias na tabela de modulos)

**Nunca criar um novo arquivo sem primeiro verificar se ja existe um equivalente na estrutura.**

---

## REGRA 2 — Um modulo, uma responsabilidade

Cada modulo tem fronteiras definidas. Nao vazar logica entre modulos:

```
✅ M3 (Conciliacao) chama a API route de M2 para buscar uma transacao
❌ M3 acessa a tabela `transactions` diretamente sem passar por lib/
✅ M7 (Dashboard) usa lib/metrics.ts para calcular KPIs
❌ M7 faz queries SQL inline no componente React
```

Se uma tarefa parece exigir logica de dois modulos, crie uma funcao em `lib/` e importe onde necessario.

---

## REGRA 3 — Tipos em schemas.ts, sempre

Qualquer novo tipo de dado (interface, type, enum) vai em `lib/schemas.ts`. Nunca declarar tipos inline em componentes ou API routes (exceto tipos locais de componente como props).

Usar Zod para validacao de inputs de API.

---

## REGRA 4 — Auth via lib/api-auth.ts

Toda API route DEVE usar o helper de autenticacao:

```typescript
// Para rotas que qualquer usuario autenticado pode acessar:
import { authenticateRequest } from '@/lib/api-auth'
const [auth, error] = await authenticateRequest()
if (error) return error
const { supabase, userId, role } = auth

// Para rotas admin-only:
import { requireAdmin } from '@/lib/api-auth'
const [auth, error] = await requireAdmin()
if (error) return error
const { supabase, userId } = auth
```

**NUNCA** repetir o boilerplate de auth/admin check manualmente. **NUNCA** instanciar `createServerSupabaseClient()` diretamente nas routes.

---

## REGRA 5 — Supabase apenas via lib/

- Browser: `import { createClient } from '@/lib/supabase'`
- Server: usar `supabase` retornado pelo helper de auth (REGRA 4)
- Service role: `import { createServiceRoleClient } from '@/lib/supabase-server'` (apenas para operacoes admin como criar usuarios)

**NUNCA** importar `@supabase/supabase-js` diretamente. A `SUPABASE_SERVICE_ROLE_KEY` so pode ser usada server-side.

---

## REGRA 6 — Deduplicacao somente por auth_code

O modulo de upload (M1) deduplica APENAS por `auth_code` para transacoes autorizadas. Transacoes recusadas/pendentes NUNCA sao deduplicadas — cada linha do CSV e um evento distinto.

```typescript
// Chave de dedup:
// Autorizadas: UNIQUE(transaction_date, auth_code, amount_brl)
// Recusadas/Pendentes: sem dedup (todas sao inseridas)
```

---

## REGRA 7 — Status de conciliacao segue a maquina de estados

```
Pendente    → Conciliado    ✅
Pendente    → Recorrente    ✅
Conciliado  → Pendente      ✅ (reversao com justificativa obrigatoria)
Recorrente  → Conciliado    ✅
N/A         → qualquer      ❌ (imutavel)
```

Toda mudanca de status DEVE gerar registro em `reconciliation_log`.

---

## REGRA 8 — RLS e responsabilidade do banco

A filtragem por titular e feita via Row Level Security no Supabase, nao via `WHERE` no codigo. O codigo pode adicionar filtros de UX, mas nunca deve ser a unica barreira de acesso.

---

## REGRA 9 — Formatacao pt-BR em toda a UI

Datas: `DD/MM/YYYY` na UI, `YYYY-MM-DD` no banco. Valores: `R$ 1.234,56`. Usar `formatCurrency()` e `formatDate()` de `lib/utils.ts`.

---

## REGRA 10 — Erros de API sempre no formato padrao

```typescript
{ data: result, error: null }              // sucesso
{ data: null, error: { message, code? } }  // erro
```

Nunca lancar excecoes nao capturadas em API routes. Usar try/catch.

---

## REGRA 11 — Toda API route e force-dynamic

```typescript
export const dynamic = 'force-dynamic'
```

Obrigatorio em TODA API route e layouts que usam cookies/Supabase. Sem isso, o Vercel tenta pre-renderizar e falha.

---

## REGRA 12 — Clients externos sao lazy-initialized

Nunca instanciar clients de servicos externos (Resend, etc.) no top-level do modulo:

```typescript
// ❌ Errado — quebra o build do Vercel
const resend = new Resend(process.env.RESEND_API_KEY)

// ✅ Correto — so instancia quando chamado em runtime
function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY)
}
```

---

## REGRA 13 — Performance: evitar N+1

Nunca fazer queries individuais em loop. Usar `.in()` para batch:

```typescript
// ❌ N+1
for (const id of ids) {
  await supabase.from('table').select().eq('id', id)
}

// ✅ Batch
await supabase.from('table').select().in('id', ids)
```

Batch inserts e updates sempre que possivel.

---

## Checklist antes de entregar qualquer codigo

- [ ] O arquivo esta no diretorio correto conforme `ARCHITECTURE.md`?
- [ ] Novos tipos foram adicionados a `lib/schemas.ts`?
- [ ] A logica de negocio esta em `lib/`, nao no componente ou na route?
- [ ] Auth usa `authenticateRequest()` ou `requireAdmin()` de `lib/api-auth.ts`?
- [ ] Se alterou fluxo de upload, a dedup foi preservada?
- [ ] Se alterou status de conciliacao, o log foi registrado?
- [ ] Valores e datas estao formatados em pt-BR na UI?
- [ ] A API route retorna `{ data, error }` e tem `force-dynamic`?
- [ ] Nenhum segredo/chave esta hardcoded no codigo?
- [ ] Queries em loop foram substituidas por batch operations?
