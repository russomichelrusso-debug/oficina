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

## Consulta de placa (SINESP)

O campo "Placa" em Veículos ganhou um botão "Buscar" que consulta a base do SINESP Cidadão e pré-preenche marca/modelo/cor/ano. Implementado como port em TypeScript (`apps/api/src/vehicles/sinesp.service.ts`) do cliente Python não-oficial [victor-torres/sinesp-client](https://github.com/victor-torres/sinesp-client) (engenharia reversa do app móvel do SINESP, sem captcha).

**Riscos conhecidos, sem solução aplicável a partir deste ambiente:**
- O endpoint não é oficial/documentado e o projeto original está sem manutenção desde ~2018 — pode já estar fora do ar ou mudar sem aviso.
- O SINESP costuma bloquear requisições de fora do Brasil; a API roda no Render em Oregon (EUA), o que pode causar bloqueio geográfico mesmo com o endpoint funcionando.
- Por isso `SinespService.search()` nunca lança erro: qualquer falha retorna `null` e a tela cai para preenchimento manual — a funcionalidade nunca quebra o cadastro de veículo, só pode deixar de auto-preencher.
- Não foi possível testar a chamada real de ponta a ponta a partir deste ambiente de desenvolvimento (proxy de rede do sandbox bloqueia o domínio `sinesp.gov.br`). A lógica (geração do token HMAC, corpo XML/SOAP, parsing da resposta) foi portada linha a linha do Python original e o build/typecheck passam, mas o teste real só é possível a partir do Render (ou localmente na máquina do usuário).
- Alternativa mais confiável para o futuro, se esse endpoint se mostrar instável: trocar por uma API paga de consulta de placas (ex: WDAPI2, APIBrasil e similares) — o `SinespService` está isolado atrás de uma interface simples (`search(plate): Promise<PlateLookupResult | null>`), então trocar o provedor é só reimplementar esse serviço.

## Próximo passo sugerido

Fase 2 do roadmap (Recepção, Checklist, Fotos, Ordem de Serviço, Orçamento, Aprovação) — ver `spec-erp-oficina.md` §5, §6, §7, §8 para a máquina de estados da OS e os fluxos que essa fase precisa implementar. O schema do banco para essas tabelas já existe (`service_orders`, `quotes`, `service_order_status_history` etc.).

## Onde está o código

O código foi entregue como arquivo compactado (`oficina-erp.zip`) e depois enviado pelo usuário para o repositório GitHub `russomichelrusso-debug/oficina` (upload manual pelo navegador — dois arquivos "ponto" ficaram de fora do upload: `.gitignore` e `apps/api/.env.example`; nenhum dos dois afeta o deploy).

## Infraestrutura de produção (Supabase + Render)

- **Banco de dados**: projeto Supabase dedicado "oficina" (id `beeensycavspursljaqk`, região `sa-east-1`, Postgres 17). Migration completa aplicada (32 tabelas, 8 enums, FKs, índices) e seed rodado (tenant padrão, 7 papéis/permissões, usuário admin, 1 cliente/veículo de exemplo) — dados idênticos ao seed local.
- **API**: Render Web Service `oficina-api` (plano free) — https://oficina-api-9hgb.onrender.com/api/v1 — build a partir da raiz do monorepo via pnpm filters (`@oficina/types` → `@oficina/validation` → `@oficina/database` → `@oficina/api`), start com `node apps/api/dist/main.js`. Conecta no Supabase via connection pooler (`aws-0-sa-east-1.pooler.supabase.com:5432`).
- **Front-end**: Render Static Site `oficina-web` — https://oficina-web-5dgx.onrender.com — build via pnpm filters, publica `apps/web/dist`, com `VITE_API_URL` apontando para a API acima.
- **Login de teste em produção**: `admin@oficina.com` / `Admin@123` (mesma senha do ambiente local — recomendado trocar).
- Repositório não está autorizado para push a partir deste ambiente de desenvolvimento (git proxy do sandbox), então qualquer atualização de código precisa ser enviada pelo usuário; o deploy do Render já está configurado com auto-deploy ligado a partir do branch `main`.
