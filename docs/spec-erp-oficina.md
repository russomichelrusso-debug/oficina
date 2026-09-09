# Especificação Técnica — ERP Operacional de Oficina Mecânica

**Versão:** 1.0
**Autor:** Michel (visão original) — detalhamento técnico elaborado a partir do documento `arquitetura-original.md`
**Status:** Rascunho para início de desenvolvimento (Fase 1)

## 1. Visão geral

O sistema é um **ERP operacional de oficina mecânica**, não um simples cadastro. O núcleo do sistema é a **Ordem de Serviço (OS)**, que percorre o fluxo:

`Recepção → Diagnóstico → Orçamento → Aprovação → Execução → Cronômetro → Peças → Controle de Qualidade → Pagamento → Entrega → Pós-venda`

A arquitetura nasce pronta para uma única oficina, mas preparada desde o primeiro schema para evoluir para um produto multiempresa (SaaS), sem necessidade de reescrita.

### 1.1 Objetivos de negócio

- Substituir controles manuais/planilhas por um fluxo único, auditável, do agendamento à pós-venda.
- Dar visibilidade em tempo real do status de cada veículo/OS para recepção, gerência e cliente.
- Rastrear com precisão o tempo produtivo de cada mecânico por serviço executado.
- Garantir rastreabilidade total de estoque (nunca decremento simples) e do financeiro (receitas por OS, pagamentos, contas a receber).
- Funcionar mesmo sem internet na bancada (offline-first no app do mecânico).

### 1.2 Fora de escopo da Fase 1

Emissão fiscal, gateway de pagamento, integração WhatsApp, app do cliente dedicado, IA de diagnóstico, multiempresa ativa (o campo `tenant_id` existe desde o início, mas a segmentação por tenant só é ativada quando houver a 2ª oficina). Esses itens estão detalhados na seção 10 (Evolução futura) e no roadmap (seção 11).

## 2. Arquitetura técnica

```
                         INTERNET
                             │
                ┌────────────┴────────────┐
                │                         │
           CLIENTE                    EQUIPE
          WhatsApp/Link             PWA / Android
                └──────────┬──────────────┘
                           ▼
                  ┌─────────────────┐
                  │    FRONT-END    │  React + TypeScript + Vite (PWA)
                  └────────┬────────┘
                           │ HTTPS (REST) + WSS (WebSocket)
                           ▼
                  ┌─────────────────┐
                  │     BACKEND     │  Node.js + NestJS
                  └───────┬─────────┘
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │ PostgreSQL  │ │ Object      │ │  Workers    │
   │             │ │ Storage(S3) │ │(fila/notif.)│
   └─────────────┘ └─────────────┘ └─────────────┘
```

**Stack confirmada:**

| Camada | Tecnologia |
|---|---|
| Front-end web | React 18 + TypeScript + Vite, PWA (service worker, manifest, cache, fila de sincronização) |
| App mobile | Capacitor sobre o mesmo front-end React (Android prioritário) |
| Backend | Node.js + NestJS (REST versionado `/api/v1` + Gateway WebSocket) |
| Banco de dados | PostgreSQL |
| ORM / migrations | Drizzle ORM (schema TypeScript único em `database/schema.ts`, migrations SQL versionadas em `database/migrations/`, driver `pg` puro — sem binário nativo a baixar, roda em qualquer CI/container) |
| Armazenamento de mídia | Object Storage compatível S3 (ex.: Cloudflare R2), nunca binário no Postgres |
| Filas/Notificações | Worker dedicado (BullMQ/Redis ou similar) |
| Autenticação | JWT (access + refresh token), hash de senha com Argon2 |
| Hospedagem sugerida | Front-end: Vercel · Backend: Railway (ou similar) · DNS/CDN: Cloudflare |
| Offline | IndexedDB no cliente + fila de sincronização com o backend |

### 2.1 Estrutura de monorepo

```
/oficina
├── apps/
│   ├── web/      # React + TS + Vite (PWA)
│   ├── api/      # NestJS
│   └── mobile/   # Capacitor (wrapper do web)
├── packages/
│   ├── types/       # Tipos TS compartilhados (DTOs, enums)
│   ├── ui/          # Componentes visuais compartilhados
│   ├── validation/  # Schemas de validação (zod) compartilhados
│   └── config/       # tsconfig/eslint/prettier compartilhados
├── database/
│   ├── schema.prisma
│   ├── migrations/
│   └── seeds/
├── docs/
└── docker-compose.yml
```

O compartilhamento de tipos entre front e back via `packages/types` evita divergência de contrato de API.

## 3. Perfis de usuário e permissões (RBAC)

RBAC implementado desde a Fase 1 (tabelas `roles`, `permissions`, `user_roles`, mais um enum de papéis-base para simplificar o MVP).

| Papel | Acesso |
|---|---|
| **ADMIN** | Total — todos os módulos, configurações da oficina, usuários. |
| **GERENTE** | Clientes, Veículos, Orçamentos, OS, Estoque, Financeiro, Relatórios. |
| **RECEPCAO** (Consultor) | Clientes, Veículos, Orçamentos, OS, Aprovação, Entrega. |
| **MECANICO** | Apenas suas OS atribuídas: checklist, diagnóstico, fotos, vídeos, cronômetro, serviços, solicitação de peças, finalização. Não vê financeiro nem OS de outros mecânicos. |
| **ESTOQUE** | Estoque, entradas, saídas, compras, fornecedores. |
| **FINANCEIRO** | Pagamentos, contas a receber, fechamento, relatórios financeiros. |
| **CLIENTE** | Somente leitura do próprio veículo/OS, via link seguro com token de acesso (sem senha tradicional). |

**Regra de negócio:** todo endpoint de escrita valida papel + posse do recurso (ex.: mecânico só edita OS onde `mechanic_id = user.id`). Toda validação de permissão é feita no backend (guards), nunca apenas no front.

## 4. Modelo de dados

O schema completo (todas as tabelas abaixo) é modelado desde a Fase 1 no Drizzle ORM (`database/schema.ts`), mesmo que os módulos de negócio correspondentes só sejam implementados em fases posteriores — isso evita migrações destrutivas depois. Todas as tabelas de domínio principal recebem `tenant_id` (nullable/default `'default'` por enquanto) para permitir multiempresa futura sem reescrever schema.

### 4.1 Identidade e acesso
- **users** — id, tenant_id, name, email (único), password_hash, phone, active, created_at, updated_at.
- **roles** — id, name (ADMIN, GERENTE, RECEPCAO, MECANICO, ESTOQUE, FINANCEIRO, CLIENTE).
- **permissions** — id, code (ex.: `service_orders.update_status`), description.
- **role_permissions** — role_id, permission_id.
- **user_roles** — user_id, role_id.

### 4.2 Clientes e veículos
- **customers** — id, tenant_id, name, document (CPF/CNPJ), phone, email, address, created_at.
- **vehicles** — id, tenant_id, customer_id, plate, brand, model, year, color, mileage_km, created_at.

### 4.3 Agendamento
- **appointments** — id, tenant_id, customer_id, vehicle_id, scheduled_at, status, notes.

### 4.4 Orçamento e aprovação
- **quotes** — id, tenant_id, service_order_id, subtotal, discount, tax, total, status, created_at.
- **quote_items** — id, quote_id, type (SERVICE|PART), reference_id, description, quantity, unit_price, total.
- **quote_approvals** — id, quote_id, customer_id, approved_at, ip, device, approved_items (json), signature_hash.

### 4.5 Ordem de serviço
- **service_orders** — id, tenant_id, number, customer_id, vehicle_id, status (enum — ver §5), mechanic_id (nullable), received_at, started_at, finished_at, delivered_at, created_by, created_at, updated_at.
- **service_order_items** — id, service_order_id, type (SERVICE|PART), reference_id, quantity, unit_price, total, status.
- **service_order_status_history** — id, service_order_id, from_status, to_status, changed_by, changed_at, note.

### 4.6 Catálogo de serviços
- **services** — id, tenant_id, category_id, name, estimated_minutes, base_price.
- **service_categories** — id, tenant_id, name.

### 4.7 Estoque
- **parts** — id, tenant_id, category_id, sku, name, unit_price, min_stock, current_stock (view/derivado, nunca a fonte de verdade).
- **part_categories** — id, tenant_id, name.
- **suppliers** — id, tenant_id, name, document, phone, email.
- **stock_movements** — id, tenant_id, part_id, type (ENTRADA|SAIDA|DEVOLUCAO|AJUSTE|TRANSFERENCIA), quantity, service_order_id (nullable), supplier_id (nullable), created_by, created_at. O saldo de `parts.current_stock` é sempre recalculado a partir da soma de `stock_movements` — nunca um `UPDATE parts SET stock = stock - 1`.

### 4.8 Mecânico e tempo
- **mechanics** — id, tenant_id, user_id, specialty, active.
- **work_sessions** — id, service_order_id, mechanic_id, service_id, device_id, start_at, end_at, duration_seconds. Cada sessão representa uma atividade específica (não "a OS inteira").

### 4.9 Diagnóstico e checklist
- **diagnostics** — id, service_order_id, created_by, created_at, summary.
- **diagnostic_items** — id, diagnostic_id, description, severity, recommendation.
- **checklists** — id, service_order_id, template_name, items (json), completed_by, completed_at.

### 4.10 Mídia
- **media** — id, tenant_id, service_order_id, vehicle_id, type (PHOTO|VIDEO), stage (ENTRADA|DIAGNOSTICO|EXECUCAO|FINALIZACAO), storage_key, mime_type, created_at, created_by. Arquivo físico em `/oficina/os/{id}/{stage}/` no object storage — nunca binário no Postgres.

### 4.11 Financeiro
- **payments** — id, tenant_id, service_order_id, method (PIX|DINHEIRO|DEBITO|CREDITO|BOLETO), amount, paid_at, installment_number, installment_total.
- **payment_methods** — id, tenant_id, name, active.
- **accounts_receivable** — id, tenant_id, service_order_id, customer_id, due_date, amount, status (PENDENTE|PAGO|ATRASADO).

### 4.12 Sistema
- **notifications** — id, tenant_id, user_id, channel, title, body, read_at, created_at.
- **audit_logs** — id, tenant_id, user_id, action, entity, entity_id, old_value (json), new_value (json), ip, device, created_at.

## 5. Máquina de estados da Ordem de Serviço

O campo `status` da OS **nunca** é editável livremente — é controlado por uma máquina de estados no backend, e toda transição gera uma linha em `service_order_status_history`.

```
AGENDADO → RECEBIDO → DIAGNOSTICO → ORCAMENTO → AGUARDANDO_APROVACAO
   → APROVADO → EM_EXECUCAO ⇄ AGUARDANDO_PECA
   → CONTROLE_QUALIDADE → PRONTO → ENTREGUE → ENCERRADO
```

**Regras de transição:**
- Só é possível avançar para `ORCAMENTO` se houver ao menos um `quote` vinculado.
- `AGUARDANDO_APROVACAO → APROVADO` exige um registro em `quote_approvals`.
- `EM_EXECUCAO → AGUARDANDO_PECA` e o retorno são permitidos livremente (ida e volta), mas cada transição é logada.
- `PRONTO → ENTREGUE` exige que não haja `accounts_receivable` pendente vinculada (configurável: a oficina pode permitir entrega com pendência financeira mediante alçada de gerente).
- `ENCERRADO` é terminal — nenhuma edição de itens é permitida após esse estado (somente leitura + eventuais registros de pós-venda).
- Toda transição inválida retorna erro 409 (conflito de estado) e não é silenciosamente ignorada.

## 6. Fluxos principais

### 6.1 Recepção → Orçamento → Aprovação
1. Recepção cria/localiza cliente e veículo, abre OS (`AGENDADO` ou `RECEBIDO` direto no balcão).
2. Consultor ou mecânico registra diagnóstico (`diagnostics`, `diagnostic_items`).
3. Sistema monta orçamento (`quotes`/`quote_items`) a partir do diagnóstico + catálogo de serviços/peças.
4. Cliente recebe link seguro, visualiza orçamento, pode **aprovar total, recusar ou aprovar parcialmente** item a item.
5. Aprovação grava `quote_approvals` com IP, dispositivo, hash/assinatura, e a OS avança automaticamente para `APROVADO`.

### 6.2 Execução e controle de tempo
1. Mecânico abre sua lista de OS atribuídas (somente as dele).
2. Para cada atividade (ex.: "Freios", "Troca de óleo"), clica **INICIAR** → grava `work_sessions.start_at` + `mechanic_id` + `service_id` + `device_id`.
3. Ao concluir, clica **FINALIZAR** → grava `end_at` e `duration_seconds`.
4. Painel da recepção recebe atualização via WebSocket em tempo real (sem reload) mostrando cronômetro ao vivo.
5. Se faltar peça, mecânico sinaliza solicitação → OS pode mover para `AGUARDANDO_PECA`.

### 6.3 Estoque
1. Toda entrada/saída de peça gera um `stock_movement` (nunca update direto de contador).
2. Saldo de uma peça = soma de todos os `stock_movements` daquele `part_id`.
3. Peça abaixo de `min_stock` gera notificação para o papel ESTOQUE.

### 6.4 Financeiro
1. OS aprovada gera receita esperada (soma de `quote_items` aprovados).
2. Pagamentos (parciais ou totais) são registrados em `payments`, vinculados à OS.
3. Pendências geram `accounts_receivable`, com fechamento diário e relatório por período.

### 6.5 Entrega e pós-venda
1. Após `CONTROLE_QUALIDADE` aprovado, OS vai para `PRONTO` → notificação ao cliente.
2. Entrega registra assinatura/confirmação → `ENTREGUE`.
3. Pós-venda (Fase 6): follow-up automático, histórico completo do veículo acessível pelo cliente via link.

## 7. Comunicação em tempo real

WebSocket (NestJS Gateway) para eventos como:
- Mudança de status de OS → atualização instantânea do painel da recepção.
- Início/fim de `work_session` → cronômetro ao vivo por mecânico ("Carlos — trabalhando na OS 152 — 01:37:22").
- Novas notificações (estoque mínimo, aprovação de orçamento recebida).

## 8. Offline-first (app do mecânico)

- Front-end mantém fila de mutações pendentes em IndexedDB quando offline.
- Ao reconectar, sincroniza automaticamente ("3 alterações pendentes → SINCRONIZAR").
- Conflitos são resolvidos no backend com timestamp + `changed_by`; em caso de conflito real (ex.: dois usuários finalizando a mesma `work_session`), o backend rejeita a segunda escrita e retorna o estado atual para o cliente reconciliar.
- Esse comportamento é planejado desde a Fase 1 na estrutura de pastas (`/offline`), mas a sincronização completa só é implementada na Fase 3.

## 9. API REST

Toda a API é versionada sob `/api/v1`, permitindo introduzir `/api/v2` sem quebrar clientes existentes.

```
/api/v1
  /auth                          (login, refresh, logout, forgot-password)
  /users
  /customers
  /vehicles
  /appointments
  /quotes                        /quotes/:id/approve
  /service-orders                /service-orders/:id/status
  /services
  /mechanics                     /work-sessions
  /diagnostics                   /checklists
  /parts  /stock  /suppliers
  /payments  /financial
  /media
  /notifications
  /reports
```

## 10. Requisitos não funcionais

- **Segurança:** HTTPS obrigatório; hash de senha com Argon2; JWT access+refresh; rate limiting nos endpoints de autenticação; validação de entrada (DTOs com class-validator/zod); proteção contra SQL injection (ORM parametrizado); 2FA opcional para ADMIN.
- **Auditoria:** toda alteração relevante (troca de valor de orçamento, mudança de status de OS, exclusão de registros) grava linha em `audit_logs` com valor anterior/novo, IP e dispositivo.
- **Disponibilidade/offline:** app do mecânico deve continuar operável sem internet; nenhuma perda de dado local até sincronizar.
- **Performance:** listagens paginadas; índices em `service_orders.status`, `vehicles.plate`, `stock_movements.part_id`.
- **Observabilidade:** logs estruturados no backend; correlação de request-id.
- **Backups:** backup diário automatizado do PostgreSQL e do object storage.
- **Multiempresa (preparação):** toda tabela de domínio carrega `tenant_id`; nenhuma query de negócio deve ser escrita sem filtro de tenant (mesmo com tenant único hoje), para não exigir refatoração ao ativar o segundo cliente.
- **Internacionalização:** não é requisito da Fase 1 (sistema em pt-BR fixo).

## 11. Critérios de aceite — Fase 1 (Fundação)

| Item | Critério de aceite |
|---|---|
| Login | Usuário autentica com email/senha, recebe access+refresh token; token expirado é renovado via `/auth/refresh`; 5 tentativas inválidas bloqueiam temporariamente o login. |
| Usuários e permissões | ADMIN pode criar usuário e atribuir papel(éis); usuário sem papel não acessa nenhum módulo de negócio; tentativa de acesso fora do papel retorna 403. |
| Clientes | CRUD completo de clientes com validação de documento (CPF/CNPJ) e busca por nome/documento/telefone. |
| Veículos | CRUD completo vinculado a um cliente; busca por placa; um veículo sempre pertence a um cliente. |
| Banco de dados | Schema completo (todas as tabelas do §4) versionado em migrations reproduzíveis (`prisma migrate deploy` recria o banco do zero). |
| Dashboard | Tela inicial mostra contadores em tempo real de clientes, veículos e usuários ativos (métricas de OS/faturamento entram na Fase 2/5, quando essas tabelas passam a ter dados). |

Critérios de aceite das fases seguintes (OS, orçamento, estoque, financeiro, etc.) serão detalhados no início de cada fase, seguindo o mesmo padrão desta seção, à medida que os módulos forem implementados.

## 12. Roadmap

| Fase | Entregáveis |
|---|---|
| **1 — Fundação** | Login, Usuários, Clientes, Veículos, Permissões (RBAC), Banco (schema completo), Dashboard básico. |
| **2 — Oficina** | Recepção, Checklist, Fotos, Ordem de Serviço, Orçamento, Aprovação do cliente. |
| **3 — Mecânico** | OS do mecânico, Cronômetro (work sessions), Serviços, Diagnóstico, Fotos/vídeos, Máquina de status completa, Offline funcional. |
| **4 — Estoque** | Peças, Fornecedores, Entradas/Saídas, Estoque mínimo, Compras. |
| **5 — Financeiro** | Contas a receber, Pagamentos, Fechamento diário, Relatórios, Margem. |
| **6 — Cliente** | Link seguro da OS, Aprovação remota, Acompanhamento, Histórico, Pós-venda. |
| **7 — Inteligência** | Indicadores, Produtividade por mecânico, Tempo médio por serviço, Rentabilidade, Previsão de entrega. |

## 13. Evolução futura (fora do roadmap imediato)

Multiempresa/multifilial ativa, comissão de mecânicos, integração WhatsApp, emissão fiscal, gateway de pagamento, assinatura digital, scanner OBD, catálogo de peças de fornecedores externos, BI avançado, aplicativo dedicado do cliente, IA para análise de diagnóstico, histórico completo e vitalício do veículo entre oficinas da rede.

## 14. Glossário

- **OS** — Ordem de Serviço, o registro central de um atendimento.
- **Work session** — período cronometrado em que um mecânico executa uma atividade específica de uma OS.
- **Tenant** — uma oficina/empresa cliente do sistema (relevante quando o produto virar multiempresa).
- **Stock movement** — registro atômico de qualquer entrada/saída/ajuste de estoque, nunca um decremento direto.
