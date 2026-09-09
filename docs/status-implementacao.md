# Status de implementação — ERP Oficina

**Última atualização:** 09/09/2026

## O que existe

Um monorepo funcional (pnpm workspaces) implementando a **Fase 1 — Fundação** do roadmap definido em `spec-erp-oficina.md`:

- Login/JWT (access + refresh), RBAC completo (ADMIN, GERENTE, RECEPCAO, MECANICO, ESTOQUE, FINANCEIRO, CLIENTE).
- CRUD de clientes e veículos.
- Dashboard com contadores reais.
- Banco de dados (PostgreSQL + Drizzle ORM) com o **schema completo de todas as 7 fases** do roadmap (32 tabelas), não só da Fase 1 — evita migrations destrutivas ao avançar de fase.
- Front-end React + TypeScript + Vite (PWA), com a estrutura de pastas de todas as features futuras já criada (como placeholders "em breve").
- `apps/mobile` com Capacitor configurado (sem o projeto Android nativo gerado — isso é um passo local de quem for empacotar o app).

## Decisão técnica: Drizzle ORM em vez de Prisma

A spec original recomendava Prisma. Na prática, o Prisma Client precisa baixar um binário de engine nativo de `binaries.prisma.sh` a cada `generate`/`migrate` — em ambientes com egress restrito (containers de CI, sandboxes) isso falha. Trocamos para **Drizzle ORM** (schema 100% TypeScript, driver `pg` puro, sem binário nativo), o que permitiu gerar migrations, aplicá-las num Postgres real e testar a API de ponta a ponta dentro deste ambiente de desenvolvimento. `docs/spec-erp-oficina.md` já reflete essa escolha.

## Verificação feita

Todo o fluxo foi testado de verdade (não só compilado): migration gerada e aplicada, seed rodado, login, RBAC (permitido e negado), CRUD de clientes/veículos com relacionamento, dashboard agregando dados reais, e build de produção do front-end servindo corretamente. Detalhes em `README.md` na raiz do projeto.

## Próximo passo sugerido

Fase 2 do roadmap (Recepção, Checklist, Fotos, Ordem de Serviço, Orçamento, Aprovação) — ver `spec-erp-oficina.md` §5, §6, §7, §8 para a máquina de estados da OS e os fluxos que essa fase precisa implementar. O schema do banco para essas tabelas já existe (`service_orders`, `quotes`, `service_order_status_history` etc.).

## Onde está o código

O código completo do monorepo foi entregue ao usuário como arquivo compactado (`oficina-erp.zip`) nesta conversa — não está anexado a este projeto claude.ai (que guarda apenas documentos de texto).
