# SESSION_STARTER.md — Clara - Conciliacao

> Template de prompt para iniciar cada nova sessão de vibecoding.
> Cole o bloco correspondente ao tipo de tarefa no início da conversa com o agente.

---

## 🔵 Sessão padrão — nova funcionalidade

```
Contexto do projeto: [COLE O CONTEÚDO COMPLETO DE PROMPT_CONTEXT.md AQUI]

---

Regras de desenvolvimento: [COLE O CONTEÚDO COMPLETO DE AGENT_INSTRUCTIONS.md AQUI]

---

Tarefa desta sessão:
Módulo: M[X] — [Nome do Módulo]
Objetivo: [descreva o que precisa ser construído ou corrigido]
Arquivos que provavelmente serão tocados: [liste se souber]
Critério de aceite: [como saber que está pronto]
```

---

## 🟡 Sessão de correção de bug

```
Contexto do projeto: [PROMPT_CONTEXT.md]

Regras: [AGENT_INSTRUCTIONS.md]

Bug reportado:
- Módulo afetado: M[X]
- Comportamento atual: [o que acontece]
- Comportamento esperado: [o que deveria acontecer]
- Arquivo(s) suspeito(s): [se souber]
- Como reproduzir: [passo a passo]
```

---

## 🟢 Sessão de revisão / refactor

```
Contexto do projeto: [PROMPT_CONTEXT.md]

Regras: [AGENT_INSTRUCTIONS.md]

Revisão solicitada:
- Arquivo(s) para revisar: [lista]
- Foco da revisão: [performance / legibilidade / segurança / conformidade com AGENT_INSTRUCTIONS]
- O que NÃO mudar: [se houver restrições]
```

---

## 🔴 Sessão de schema / banco de dados

```
Contexto do projeto: [PROMPT_CONTEXT.md]

Regras: [AGENT_INSTRUCTIONS.md]

Alteração de banco:
- Tabela(s) afetada(s): [lista]
- O que precisa mudar: [nova coluna, nova tabela, nova policy RLS...]
- Impacto nas queries existentes: [se souber]
- Lembre: gerar migration SQL em supabase/migrations/00X_descricao.sql
```

---

## Dicas para sessões produtivas

**Seja específico no objetivo.** "Implementar o upload" é vago. "Implementar a API route `app/api/upload/route.ts` que recebe um FormData com o arquivo CSV, chama `lib/csv-parser.ts` para parsear, `lib/dedup.ts` para filtrar duplicatas e insere no Supabase, retornando `{ data: { inserted, skipped }, error }`" é acionável.

**Entregue por partes.** Em cada sessão, foque em um módulo. Terminar M1 completamente antes de começar M2 evita interdependências não resolvidas.

**Valide com dados reais.** Use o CSV da Clara (`Clara-transactions-Mar_17__2026__10_14_41_AM.csv`) como fixture de teste desde o início. Ele tem 157 transações com encoding ISO-8859-1, status variados e transações internacionais em USD.

**Documente decisões no ARCHITECTURE.md.** Se o agente sugerir uma abordagem diferente da arquitetura original e fizer sentido adotar, atualize o ARCHITECTURE.md na mesma sessão para que futuras sessões não entrem em conflito.

**Peça testes.** Ao final de cada módulo, peça ao agente para gerar testes unitários para as funções em `lib/`. Especialmente para `csv-parser.ts` e `dedup.ts` — são críticos e fáceis de testar.
