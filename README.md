# Clara - Conciliacao

Plataforma de gestao e conciliacao de lancamentos do cartao corporativo Clara para a Welcome Group.

## Funcionalidades

- **Upload CSV** com preview antes de processar e deduplicacao automatica por codigo de autorizacao
- **Listagem de transacoes** com filtros (fatura, titular, status, categoria), busca e exportacao CSV
- **Conciliacao** individual ou em lote, com historico completo de alteracoes
- **Cadastro de titulares** com vinculo a usuario e configuracao de notificacoes
- **Notificacoes por e-mail** (manual, individual ou em massa) via Resend
- **Deteccao de recorrencias** (Google Ads, Facebook Ads, etc.) com gestao de padroes
- **Dashboard** com KPIs e ranking de conciliacao por titular
- **Gestao de usuarios** com perfis admin/titular/visualizador e dupla validacao para exclusao
- **Autenticacao** via Supabase Auth com Row Level Security e controle de acesso por perfil

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase · Vercel · Resend

## Setup

```bash
# Instalar dependencias
npm install

# Copiar variaveis de ambiente
cp .env.local.example .env.local
# Preencher com suas credenciais do Supabase e Resend

# Executar migrations no Supabase SQL Editor:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_rls_policies.sql
# 3. supabase/migrations/003_add_viewer_role.sql  (rodar sozinho primeiro!)
# 4. supabase/migrations/004_viewer_policies.sql  (rodar depois do 003)

# Criar usuario admin:
# 1. Supabase Dashboard → Authentication → Users → Add user
# 2. SQL Editor: UPDATE profiles SET role = 'admin' WHERE id = '<uuid>';

# Iniciar desenvolvimento
npm run dev
```

## Documentacao

- [ARCHITECTURE.md](ARCHITECTURE.md) — Estrutura, modulos, banco de dados, convencoes
- [AGENT_INSTRUCTIONS.md](AGENT_INSTRUCTIONS.md) — Regras para desenvolvimento com IA
- [PROMPT_CONTEXT.md](PROMPT_CONTEXT.md) — Contexto para sessoes com agentes de codigo
- [SESSION_STARTER.md](SESSION_STARTER.md) — Templates para iniciar sessoes de desenvolvimento

## Licenca

Projeto privado — Welcome Group.
