# Arquitetura Original — ERP Oficina (rascunho enviado pelo usuário)

> Documento-fonte enviado por Michel (ideiaOficina.MD), preservado aqui como referência histórica do projeto. A versão elaborada e detalhada está em `spec-erp-oficina.md`.

Para esse projeto, a arquitetura seria SaaS-ready, mas começando simples o suficiente para uma única oficina. A prioridade: OS, orçamento, aprovação do cliente, execução do mecânico, controle de tempo, estoque e financeiro.

## 1. Arquitetura geral

```
                         INTERNET
                             │
                ┌────────────┴────────────┐
                │                         │
           CLIENTE                    EQUIPE
                │                         │
          WhatsApp/Link             PWA / Android
                │                         │
                └──────────┬──────────────┘
                           ▼
                  ┌─────────────────┐
                  │    FRONT-END    │
                  │ React + TS/PWA  │
                  │     Vite        │
                  └────────┬────────┘
                           │ HTTPS
                           ▼
                  ┌─────────────────┐
                  │     BACKEND     │
                  │ Node.js/NestJS  │
                  │ REST + WebSocket│
                  └───────┬─────────┘
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │ PostgreSQL  │ │   Storage   │ │   Workers   │
   │   Dados     │ │ Fotos/Vídeo │ │ Notificações│
   └─────────────┘ └─────────────┘ └─────────────┘
```

## 2. Front-end

React + TypeScript + Vite.

```
/frontend
  /src
    /components
    /pages
    /layouts
    /features
      /auth
      /clientes
      /veiculos
      /orcamentos
      /ordens-servico
      /mecanicos
      /estoque
      /financeiro
      /relatorios
    /services
    /hooks
    /store
    /types
    /utils
    /offline
```

### PWA

Instalável no Android, tablet ou computador. Terá: cache dos arquivos principais, funcionamento offline, fila de sincronização, notificações, armazenamento local, atualização automática. Para o app Android, Capacitor, reaproveitando o front-end.

## 3. Perfis de usuário (RBAC desde o começo)

- **Administrador** — acesso total.
- **Gerente** — clientes, veículos, orçamentos, OS, estoque, financeiro, relatórios.
- **Consultor/Recepção** — clientes, veículos, orçamentos, OS, aprovação, entrega.
- **Mecânico** — somente: suas OS, checklist, diagnóstico, fotos, vídeos, cronômetro, serviços, solicitação de peças, finalização.
- **Estoquista** — estoque, entrada, saída, compras, fornecedores.
- **Cliente** — acesso somente às informações do próprio veículo/OS via link seguro.

## 4. Banco de dados

Núcleo: PostgreSQL. Principais tabelas:

```
users, roles, permissions, user_roles
customers, vehicles
appointments
service_orders, service_order_items, service_order_status_history
quotes, quote_items, quote_approvals
services, service_categories
parts, part_categories, suppliers, stock_movements
mechanics, work_sessions
diagnostics, diagnostic_items
media, checklists
payments, payment_methods, accounts_receivable
notifications, audit_logs
```

## 5. Relacionamento principal

```
CLIENTE
   │
   └──► VEÍCULOS
           │
           └──► ORÇAMENTOS
                    │
                    └──► APROVAÇÃO
                            │
                            ▼
                    ORDEM DE SERVIÇO
                       │    │    │
             ┌─────────┘    │    └──────────┐
             ▼              ▼               ▼
          SERVIÇOS       PEÇAS          MECÂNICO
             │              │               │
             └──────────────┼───────────────┘
                            ▼
                       HORAS/EXECUÇÃO
                            │
                            ▼
                       QUALIDADE
                            │
                            ▼
                         ENTREGA
                            │
                            ▼
                        PÓS-VENDA
```

## 6. Ordem de Serviço

A OS é o objeto central do sistema. Exemplo:

```
OS #000152
Cliente: João da Silva
Veículo: Toyota Corolla / ABC-1D23 / 124.520 km
Status: EM EXECUÇÃO
Mecânico: Carlos
Entrada: 08:32
Início: 09:14
```

Dentro dela: Resumo, Diagnóstico, Orçamento, Serviços, Peças, Fotos, Vídeos, Checklist, Tempo, Histórico, Pagamentos, Documentos.

## 7. Máquina de estados da OS

O status não é um campo editável simples — é uma máquina de estados:

```
AGENDADO → RECEBIDO → DIAGNÓSTICO → ORÇAMENTO → AGUARDANDO APROVAÇÃO
→ APROVADO → EM EXECUÇÃO ⇄ AGUARDANDO PEÇA → CONTROLE DE QUALIDADE
→ PRONTO → ENTREGUE → ENCERRADO
```

Toda mudança fica registrada.

## 8. Orçamento

```
ORÇAMENTO
Serviços: Troca de pastilhas / Troca de discos / Mão de obra
Peças: Pastilha Bosch / Disco Bosch
Subtotal / Desconto / Impostos / Total
Ações: APROVAR / RECUSAR / APROVAR PARCIALMENTE
```

A aprovação gera registro em `quote_approvals`: id, quote_id, cliente, data, hora, IP, dispositivo, itens_aprovados, assinatura/hash.

## 9. Mecânico e controle de tempo

O mecânico não clica "iniciar OS" de forma genérica — ele inicia uma atividade específica (Diagnóstico, Freios, Suspensão, Troca de óleo, Teste de rodagem...). Ao clicar **INICIAR**, o sistema registra `start_at`, `mechanic_id`, `service_id`, `device_id`. Ao finalizar: `end_at`, `duration`. Isso permite calcular horas produtivas por mecânico.

## 10. Fotos e vídeos

Não ficam no PostgreSQL. Tabela `media`: id, os_id, vehicle_id, type, storage_key, mime_type, created_at, created_by. Arquivo físico em object storage, organizado por OS e etapa (`/storage/oficina/os/152/{entrada,diagnostico,execucao,finalizacao}/`).

## 11. Estoque

Toda movimentação é registrada em `stock_movements` (ENTRADA, SAÍDA, DEVOLUÇÃO, AJUSTE, TRANSFERÊNCIA) — nunca um simples decremento de contador. Isso cria rastreabilidade completa.

## 12. Financeiro

Separado da OS, mas integrado. Uma OS pode gerar receita de peças, mão de obra, serviços e outros; pagamentos via PIX, dinheiro, débito, crédito, boleto. Possibilita contas a receber, pagamentos parciais, descontos, parcelamentos, fechamento diário, faturamento por período.

## 13. Dashboard da oficina

```
┌─────────────────────────────────────────┐
│             OFICINA — HOJE              │
├────────────┬────────────┬───────────────┤
│ 12         │ 5          │ R$ 8.420      │
│ veículos   │ em serviço │ faturamento   │
├────────────┴────────────┴───────────────┤
│  OS 152   Corolla       Carlos  🔧      │
│  OS 153   Onix          João    ⏳      │
│  OS 154   Civic         Pedro   ⚠️      │
│  OS 155   HB20          —       💰      │
└─────────────────────────────────────────┘
```

## 14. API

```
/api/v1
  /auth
  /users
  /customers
  /vehicles
  /appointments
  /quotes, /quotes/:id/approve
  /service-orders, /service-orders/:id/status
  /services
  /mechanics
  /work-sessions
  /diagnostics
  /checklists
  /parts, /stock, /suppliers
  /payments, /financial
  /media
  /notifications
  /reports
```

Tudo versionado sob `/api/v1`, permitindo `/api/v2` futuramente sem quebrar o app atual.

## 15. Comunicação em tempo real

WebSocket para eventos como "Mecânico iniciou OS 152" atualizando o painel da recepção instantaneamente (sem refresh), e exibindo cronômetro ao vivo por mecânico/OS.

## 16. Offline

Ponto importante do projeto. No dispositivo do mecânico: IndexedDB armazena alterações locais; quando a internet retorna, a fila de alterações pendentes é sincronizada com o backend.

## 17. Segurança

- **Autenticação**: senha, sessão, refresh token, recuperação de senha, 2FA opcional para administradores.
- **Autorização (RBAC)**: ADMIN, GERENTE, RECEPCAO, MECANICO, ESTOQUE, FINANCEIRO, CLIENTE.
- **Segurança geral**: HTTPS, hash de senha com Argon2/bcrypt, rate limiting, validação de entrada, proteção contra SQL injection, logs, auditoria, backups, controle de sessão.

## 18. Auditoria

Tabela `audit_logs` registrando usuário, data/hora, ação, registro, valor anterior, valor novo, IP, dispositivo. Exemplo: "João alterou o valor da OS 152 de R$ 1.850 para R$ 1.650."

## 19. Hospedagem

```
                 CLOUDFLARE
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       FRONT                  DNS/CDN
       Vercel
          │
          ▼
       BACKEND
       Railway
          │
     ┌────┼───────────┐
     ▼    ▼           ▼
   DB   STORAGE     WORKERS
 Postgres  R2
```

Domínio sob Cloudflare.

## 20. Estrutura do projeto (monorepo)

```
/oficina
│
├── apps/
│   ├── web/
│   ├── api/
│   └── mobile/
│
├── packages/
│   ├── types/
│   ├── ui/
│   ├── validation/
│   └── config/
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── docs/
│
└── docker-compose.yml
```

Isso permite compartilhar tipos entre frontend e backend.

## 21. Evolução futura

Arquitetura preparada desde o início para multiempresa (OFICINA A, B, C...) via `tenant_id` nas tabelas necessárias — o sistema pode virar produto comercial sem ser refeito. Também: múltiplas filiais, comissão de mecânicos, integração WhatsApp, emissão fiscal, gateway de pagamento, assinatura digital, scanner OBD, catálogo de peças, fornecedores, BI, aplicativo do cliente, IA para análise de diagnóstico, histórico completo do veículo.

## 22. Roadmap recomendado

- **Fase 1 — Fundação**: Login, Usuários, Clientes, Veículos, Permissões, Banco, Dashboard.
- **Fase 2 — Oficina**: Recepção, Checklist, Fotos, OS, Orçamento, Aprovação.
- **Fase 3 — Mecânico**: OS do mecânico, Cronômetro, Serviços, Diagnóstico, Fotos/vídeos, Status, Offline.
- **Fase 4 — Estoque**: Peças, Fornecedores, Entradas, Saídas, Estoque mínimo, Compras.
- **Fase 5 — Financeiro**: Contas a receber, Pagamentos, Fechamento, Relatórios, Margem.
- **Fase 6 — Cliente**: Link da OS, Aprovação, Acompanhamento, Histórico, Pós-venda.
- **Fase 7 — Inteligência**: Indicadores, Produtividade, Tempo médio, Rentabilidade por serviço/mecânico, Previsão de entrega.

## Recomendação final

Não um simples cadastro de oficina — um **ERP operacional de oficina**, com a Ordem de Serviço como núcleo:

`Recepção → Diagnóstico → Orçamento → Aprovação → Execução → Cronômetro → Peças → Controle de qualidade → Pagamento → Entrega → Pós-venda`

Stack: **React + TypeScript + PWA + Capacitor + NestJS + PostgreSQL + Object Storage + WebSocket + arquitetura offline-first.**
