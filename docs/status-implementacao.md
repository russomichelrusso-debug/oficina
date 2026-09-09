# Status de implementação — ERP Oficina

**Última atualização:** 09/09/2026

## O que existe

Um monorepo funcional (pnpm workspaces) implementando as **Fases 1 a 7** do roadmap definido em `spec-erp-oficina.md`:

- **Fase 1 — Fundação**: Login/JWT (access + refresh), RBAC completo (ADMIN, GERENTE, RECEPCAO, MECANICO, ESTOQUE, FINANCEIRO, CLIENTE), CRUD de clientes e veículos, dashboard com contadores reais.
- **Fase 2 — Oficina**: Ordem de Serviço com máquina de estados completa (§5) validada no backend (transições inválidas retornam 409, histórico gravado em `service_order_status_history`), catálogo de serviços, orçamentos (`quotes`/`quote_items`) com aprovação total/parcial/recusa do cliente (`quote_approvals` com IP/dispositivo), diagnóstico e checklist de entrada.
- **Fase 3 — Mecânico**: painel "minhas OS" (a API restringe o mecânico a ver/agir só nas OS onde é o `mechanic_id`), cronômetro real (`work_sessions` com início/fim e duração calculada), upload de fotos/vídeo por etapa, gateway WebSocket (`/realtime`) emitindo eventos de mudança de status de OS e de cronômetro em tempo real.
- **Fase 4 — Estoque**: peças, categorias, fornecedores, movimentações de estoque (entrada/saída/devolução/ajuste/transferência) com saldo **sempre derivado da soma de `stock_movements`** (nunca um decremento direto), bloqueio de saída sem saldo suficiente, notificação automática ao papel ESTOQUE quando uma peça fica abaixo do mínimo.
- **Fase 5 — Financeiro**: registro de pagamentos por OS, conciliação automática de contas a receber (`accounts_receivable` marcada como PAGO quando os pagamentos cobrem o valor devido, ATRASADO quando vence sem pagamento), fechamento diário por forma de pagamento, relatório de receita por período (recebido vs. aprovado).
- **Fase 6 — Cliente**: portal público sem senha (`/portal/:token`, token opaco em `service_orders.public_token`) com acompanhamento do status e aprovação de orçamento pelo próprio cliente — a aprovação avança a OS automaticamente para `APROVADO` e copia os itens aprovados para a OS.
- **Fase 7 — Inteligência**: relatórios de produtividade por mecânico (tempo total trabalhado no período), tempo médio real por serviço vs. estimativa do catálogo, e previsão heurística de entrega das OS ativas.
- Front-end React + TypeScript + Vite (PWA) com todas as telas acima implementadas (listagens, formulários e o detalhe de OS com todas as seções — diagnóstico, orçamento, checklist, mídia, cronômetro, financeiro).
- Banco de dados (PostgreSQL + Drizzle ORM) com o schema completo de todas as 7 fases (32 tabelas + `public_token`/`complaint` em `service_orders`), migrations reproduzíveis.
- `apps/mobile` com Capacitor configurado (sem o projeto Android nativo gerado — passo local de quem for empacotar o app).

## Decisão técnica: Drizzle ORM em vez de Prisma

A spec original recomendava Prisma. Na prática, o Prisma Client precisa baixar um binário de engine nativo de `binaries.prisma.sh` a cada `generate`/`migrate` — em ambientes com egress restrito (containers de CI, sandboxes) isso falha. Trocamos para **Drizzle ORM** (schema 100% TypeScript, driver `pg` puro, sem binário nativo).

## Simplificações conscientes desta rodada (Fases 2-7)

- **Object storage de mídia**: a spec pede S3-compatível (Cloudflare R2). Este ambiente não tem um bucket configurado, então `StorageService` (`apps/api/src/media/storage.service.ts`) salva em disco local (`apps/api/uploads/`, servido em `/uploads`) atrás de uma interface mínima (`save`/`buildKey`/`publicUrl`) — trocar para R2/S3 é reimplementar só essa classe. Upload é feito em base64 via JSON (limite 25MB), não multipart.
- **Offline-first do app do mecânico**: a fila IndexedDB (`apps/web/src/offline/syncQueue.ts`) já existe desde a Fase 1 como scaffold, mas as mutações do mecânico (cronômetro, diagnóstico, mídia) ainda chamam a API diretamente — a sincronização completa (enfileirar quando offline, reconciliar conflitos por timestamp) não foi conectada nesta rodada.
- **Margem/rentabilidade (Fase 7)**: o schema não tem campo de custo de peça (só `unit_price`, preço de venda), então um relatório de margem real não é possível sem esse dado; não foi implementado um relatório aproximado para não sugerir um número financeiro incorreto.
- **Consulta de placa (SINESP)**: mantida como na Fase 1 — ver riscos conhecidos abaixo, inalterados.
- **RBAC do endpoint `/users`**: continua exclusivo de ADMIN (decisão da Fase 1); por isso a tela de Mecânicos só lista usuários candidatos quando logado como ADMIN.

## Verificação feita nesta rodada

Fluxo ponta a ponta testado de verdade nesta sessão (Postgres local, API rodando): criar OS → diagnóstico → orçamento → aprovação pelo link público do cliente (com avanço automático de status e cópia dos itens aprovados) → atribuição de mecânico → cronômetro (iniciar/finalizar com controle de posse) → movimentação de estoque (com bloqueio de saldo insuficiente e notificação de estoque mínimo) → pagamento com conciliação de conta a receber → relatórios de produtividade/tempo médio/previsão de entrega. Front-end validado em navegador real (Playwright/Chromium): login, lista e detalhe de OS com todas as seções, estoque, relatórios e portal público do cliente — screenshots conferidos manualmente nesta sessão. `pnpm run typecheck` e `pnpm run build` passam em `@oficina/types`, `@oficina/database`, `@oficina/api` e `@oficina/web`.

## Consulta de placa (SINESP)

O campo "Placa" em Veículos ganhou um botão "Buscar" que consulta a base do SINESP Cidadão e pré-preenche marca/modelo/cor/ano. Implementado como port em TypeScript (`apps/api/src/vehicles/sinesp.service.ts`) do cliente Python não-oficial [victor-torres/sinesp-client](https://github.com/victor-torres/sinesp-client) (engenharia reversa do app móvel do SINESP, sem captcha).

**Riscos conhecidos, sem solução aplicável a partir deste ambiente:**
- O endpoint não é oficial/documentado e o projeto original está sem manutenção desde ~2018 — pode já estar fora do ar ou mudar sem aviso.
- O SINESP costuma bloquear requisições de fora do Brasil; a API roda no Render em Oregon (EUA), o que pode causar bloqueio geográfico mesmo com o endpoint funcionando.
- Por isso `SinespService.search()` nunca lança erro: qualquer falha retorna `null` e a tela cai para preenchimento manual — a funcionalidade nunca quebra o cadastro de veículo, só pode deixar de auto-preencher.
- Alternativa mais confiável para o futuro, se esse endpoint se mostrar instável: trocar por uma API paga de consulta de placas (ex: WDAPI2, APIBrasil e similares).

## Próximo passo sugerido

Conectar a fila offline (`syncQueue.ts`) às mutações do app do mecânico para tornar a Fase 3 realmente utilizável sem internet na bancada, e trocar `StorageService` por um provedor S3-compatível real quando houver bucket disponível. Ver seção "Simplificações conscientes" acima para o restante do roadmap fino (§13 — evolução futura).

## Onde está o código

Repositório GitHub `russomichelrusso-debug/oficina`.

## Infraestrutura de produção (Supabase + Render)

- **Banco de dados**: projeto Supabase dedicado "oficina" (id `beeensycavspursljaqk`, região `sa-east-1`, Postgres 17). É necessário rodar a nova migration (`database/migrations/0001_fancy_human_torch.sql`, que adiciona `public_token` e `complaint` a `service_orders`) contra esse banco antes do deploy desta atualização — `pnpm --filter @oficina/database run migrate` com o `DATABASE_URL` do Supabase.
- **API**: Render Web Service `oficina-api` (plano free) — https://oficina-api-9hgb.onrender.com/api/v1 — build a partir da raiz do monorepo via pnpm filters. Conecta no Supabase via connection pooler (`aws-0-sa-east-1.pooler.supabase.com:5432`). O plano free do Render usa disco efêmero — uploads de mídia salvos localmente (`apps/api/uploads/`) **não persistem** entre deploys/restarts nesse plano; ver "Simplificações conscientes" acima sobre trocar para S3/R2 antes de depender de mídia em produção.
- **Front-end**: Render Static Site `oficina-web` — https://oficina-web-5dgx.onrender.com — build via pnpm filters, publica `apps/web/dist`, com `VITE_API_URL` apontando para a API acima.
- **Login de teste em produção**: `admin@oficina.com` / `Admin@123` (mesma senha do ambiente local — recomendado trocar).
- Repositório não está autorizado para push a partir deste ambiente de desenvolvimento (git proxy do sandbox), então qualquer atualização de código precisa ser enviada pelo usuário; o deploy do Render já está configurado com auto-deploy ligado a partir do branch `main`.
