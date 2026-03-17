# AGENT_INSTRUCTIONS.md — Clara Card Manager

> Regras permanentes para o agente de IA durante o desenvolvimento deste projeto.
> Estas instruções têm prioridade sobre qualquer sugestão genérica do modelo.
> Copie este conteúdo também no `.cursorrules` para uso automático no Cursor/Windsurf.

---

## REGRA 1 — Leia a arquitetura antes de agir

Antes de criar ou editar qualquer arquivo, leia `ARCHITECTURE.md` para confirmar:
- Em qual módulo a tarefa se encaixa
- Quais arquivos existentes devem ser modificados vs. criados do zero
- Se a mudança impacta outros módulos (verificar dependências na tabela de módulos)

**Nunca criar um novo arquivo sem primeiro verificar se já existe um equivalente na estrutura.**

---

## REGRA 2 — Um módulo, uma responsabilidade

Cada módulo tem fronteiras definidas. Não vazar lógica entre módulos:

```
✅ M3 (Conciliação) chama a API route de M2 para buscar uma transação
❌ M3 acessa a tabela `transactions` diretamente sem passar por lib/
✅ M7 (Dashboard) usa lib/metrics.ts para calcular KPIs
❌ M7 faz queries SQL inline no componente React
```

Se uma tarefa parece exigir lógica de dois módulos, crie uma função em `lib/` e importe onde necessário.

---

## REGRA 3 — Tipos em schemas.ts, sempre

Qualquer novo tipo de dado (interface, type, enum) vai em `lib/schemas.ts`. Nunca declarar tipos inline em componentes ou API routes.

```typescript
// ✅ Correto
import { Transaction, ReconciliationStatus } from '@/lib/schemas'

// ❌ Errado
const transaction: { id: string; amount: number } = ...
```

Usar Zod para validação de inputs de API (especialmente o payload do upload do CSV).

---

## REGRA 4 — Supabase apenas via lib/supabase.ts

O cliente Supabase é instanciado uma única vez em `lib/supabase.ts` (client-side) e `lib/supabase-server.ts` (server-side com cookies). Nunca chamar `createClient()` em outro lugar.

```typescript
// ✅ Correto — em API routes e server components
import { createServerClient } from '@/lib/supabase-server'

// ✅ Correto — em client components
import { supabase } from '@/lib/supabase'

// ❌ Errado
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key) // direto no componente
```

A `SUPABASE_SERVICE_ROLE_KEY` só pode ser usada em API routes server-side. Nunca em código que roda no browser.

---

## REGRA 5 — Deduplicação é sagrada

O módulo de upload (M1) nunca deve sobrescrever registros existentes. A lógica de dedup vive em `lib/dedup.ts` e deve ser chamada antes de qualquer `INSERT`.

```typescript
// Fluxo obrigatório no upload:
const rows = parseCSV(file)           // lib/csv-parser.ts
const newRows = await dedup(rows)     // lib/dedup.ts — remove já existentes
await insertTransactions(newRows)     // inserção só dos novos
await logUpload(stats)                // registra na tabela uploads
```

Qualquer alteração neste fluxo deve ser discutida explicitamente — não modificar silenciosamente.

---

## REGRA 6 — Status de conciliação segue a máquina de estados

Transições de status de conciliação têm regras:

```
Pendente    → Conciliado    ✅ (ação do gestor)
Pendente    → Recorrente    ✅ (M6 automático ou gestor)
Conciliado  → Pendente      ✅ (reversão com justificativa obrigatória)
N/A         → qualquer      ❌ (imutável — setado automaticamente para Recusadas)
Recorrente  → Conciliado    ✅ (se necessário marcar individualmente)
```

Toda mudança de status deve gerar um registro em `reconciliation_log`. Nunca atualizar `reconciliations` sem registrar no log.

---

## REGRA 7 — RLS é responsabilidade do banco, não do código

A filtragem por titular deve ser feita via Row Level Security no Supabase, não via `WHERE` no código da aplicação. O código pode adicionar filtros extras de UX, mas nunca deve ser a única barreira de acesso.

Ao criar queries que retornam dados de transações, confiar no RLS para limitar o escopo. Documentar qualquer exceção explicitamente.

---

## REGRA 8 — Formatação pt-BR em toda a UI

Datas e valores monetários sempre formatados para o usuário brasileiro:

```typescript
// Datas
format(date, 'dd/MM/yyyy', { locale: ptBR })

// Valores monetários
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// No banco: datas em ISO (YYYY-MM-DD), valores como NUMERIC — nunca string
```

---

## REGRA 9 — Erros de API sempre no formato padrão

Todas as API routes devem retornar no formato:

```typescript
// Sucesso
return NextResponse.json({ data: result, error: null })

// Erro
return NextResponse.json({ data: null, error: { message: string, code?: string } }, { status: 4xx | 5xx })
```

Nunca lançar exceções não capturadas em API routes. Usar try/catch em todas as rotas.

---

## REGRA 10 — Commits atômicos por módulo

Ao finalizar uma tarefa, o commit deve referenciar o módulo:

```
feat(M1): implementa parser CSV com suporte a encoding ISO-8859-1
fix(M3): corrige reversão de status sem log no reconciliation_log
feat(M7): adiciona gráfico de distribuição por titular no dashboard
```

Nunca misturar mudanças de módulos diferentes em um único commit.

---

## Checklist antes de entregar qualquer código

- [ ] O arquivo está no diretório correto conforme `ARCHITECTURE.md`?
- [ ] Novos tipos foram adicionados a `lib/schemas.ts`?
- [ ] A lógica de negócio está em `lib/`, não no componente ou na route?
- [ ] O cliente Supabase foi importado de `lib/supabase.ts`?
- [ ] Se alterou fluxo de upload, a dedup foi preservada?
- [ ] Se alterou status de conciliação, o log foi registrado?
- [ ] Valores e datas estão formatados em pt-BR na UI?
- [ ] A API route retorna `{ data, error }`?
- [ ] Nenhum segredo/chave está hardcoded no código?
