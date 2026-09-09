# Oficina — ERP operacional de oficina mecânica

Monorepo do ERP descrito em `docs/spec-erp-oficina.md` (spec completa: requisitos, modelo de dados, máquina de estados da OS, fluxos e critérios de aceite) e `docs/arquitetura-original.md` (rascunho original que deu origem ao projeto).

Este scaffold já implementa a **Fase 1 — Fundação** do roadmap: login/JWT, RBAC completo, CRUD de clientes e veículos, banco de dados com o schema completo de todas as fases futuras, e um dashboard básico. As fases seguintes (Ordem de Serviço, orçamento, estoque, financeiro...) têm a estrutura de pastas e o schema do banco prontos, mas ainda sem endpoints/telas — ver `docs/spec-erp-oficina.md` §12.

## Stack

- **Front-end**: React + TypeScript + Vite (PWA) — `apps/web`
- **Mobile**: Capacitor sobre o mesmo front-end — `apps/mobile`
- **Backend**: NestJS (REST `/api/v1`) — `apps/api`
- **Banco**: PostgreSQL + Drizzle ORM — `database/`
- **Monorepo**: pnpm workspaces

## Estrutura

```
/oficina
├── apps/
│   ├── web/      # React + TS + Vite (PWA)
│   ├── api/      # NestJS
│   └── mobile/   # Capacitor (wrapper do web) — ver apps/mobile/README.md
├── packages/
│   ├── types/       # Tipos TS compartilhados (DTOs, enums)
│   ├── ui/          # Componentes visuais compartilhados
│   ├── validation/  # Schemas zod compartilhados
│   └── config/      # tsconfig/eslint compartilhados
├── database/
│   ├── schema.ts     # Schema Drizzle (todas as tabelas do modelo de dados)
│   ├── migrations/   # SQL gerado pelo drizzle-kit
│   └── seeds/        # Seed com usuário admin + dados de exemplo
├── docs/
│   ├── spec-erp-oficina.md      # Spec técnica completa
│   └── arquitetura-original.md  # Documento original
└── docker-compose.yml  # Postgres + Adminer para desenvolvimento local
```

## Como rodar localmente

Pré-requisitos: Node 20+, pnpm (`corepack enable` já resolve), e um PostgreSQL acessível (local ou via Docker).

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir o Postgres (Docker) — ou aponte DATABASE_URL para um Postgres já existente
docker compose up -d

# 3. Configurar variáveis de ambiente da API
cp apps/api/.env.example apps/api/.env
# ajuste DATABASE_URL/segredos JWT se necessário

# 4. Gerar e aplicar as migrations
pnpm db:generate   # gera SQL em database/migrations a partir de database/schema.ts
pnpm db:migrate    # aplica as migrations no Postgres

# 5. Popular dados iniciais (tenant padrão, papéis/permissões, usuário admin, 1 cliente/veículo de exemplo)
pnpm db:seed
# login de teste: admin@oficina.com / Admin@123

# 6. Rodar em desenvolvimento (dois terminais)
pnpm dev:api   # http://localhost:3000/api/v1
pnpm dev:web   # http://localhost:5173
```

O front-end já sobe com proxy configurado para `/api` → `http://localhost:3000` (ver `apps/web/vite.config.ts`), então basta acessar `http://localhost:5173` e logar com o usuário admin acima.

### Build de produção

```bash
pnpm build       # builda types/validation/database/api/web em ordem topológica
cd apps/api && pnpm start   # node dist/main.js
```

> Nota sobre o dev server da API: usamos `ts-node-dev` (não `tsx`/esbuild) porque o NestJS depende de `emitDecoratorMetadata` para a injeção de dependência via reflection — o esbuild não implementa essa opção do TypeScript, então bibliotecas baseadas nele (como `tsx`) quebram a injeção de dependências do Nest. `ts-node-dev` usa o compilador TypeScript real e funciona corretamente.

### Comandos úteis

| Comando | Descrição |
|---|---|
| `pnpm dev:api` / `pnpm dev:web` | Sobe API/front em modo desenvolvimento |
| `pnpm build` | Builda todos os pacotes (ordem topológica) |
| `pnpm typecheck` | Typecheck de todos os pacotes |
| `pnpm db:generate` | Gera uma nova migration a partir de `database/schema.ts` |
| `pnpm db:migrate` | Aplica as migrations pendentes no Postgres |
| `pnpm db:seed` | Popula tenant padrão, papéis/permissões e usuário admin |

## O que já foi testado ponta a ponta

Neste scaffold, os seguintes fluxos foram validados de fato (não apenas compilados):

- Geração de migration a partir do schema Drizzle e aplicação em um Postgres real (32 tabelas, todas as FKs do modelo de dados da spec).
- Seed populando tenant, 7 papéis + permissões, usuário admin e cliente/veículo de exemplo.
- Login (`POST /auth/login`) retornando access+refresh token, e `GET /auth/me`.
- Rejeição de senha inválida (401) e de requisição sem token (401).
- RBAC: um usuário `MECANICO` recebe 403 ao tentar acessar `/customers` e `/users`; ADMIN acessa tudo.
- CRUD de clientes e veículos, incluindo o relacionamento veículo → cliente.
- Dashboard (`/reports/dashboard/summary`) agregando contagens reais do banco.
- Build de produção do front-end (Vite) servindo o HTML/JS/manifest PWA corretamente.

## Próximos passos (Fase 2 em diante)

Ver roadmap completo em `docs/spec-erp-oficina.md` §12. Resumo:

1. **Fase 2 — Oficina**: recepção, checklist, fotos, Ordem de Serviço, orçamento, aprovação do cliente.
2. **Fase 3 — Mecânico**: OS do mecânico, cronômetro (`work_sessions`), diagnóstico, offline-first de verdade (a fila em `apps/web/src/offline/syncQueue.ts` já existe como scaffold).
3. **Fase 4 — Estoque**, **Fase 5 — Financeiro**, **Fase 6 — Cliente** e **Fase 7 — Inteligência**, nessa ordem.

O schema do banco (`database/schema.ts`) já cobre as tabelas de todas essas fases — implementar cada fase é, em grande parte, escrever os módulos NestJS (service/controller/DTOs) e as telas React correspondentes sobre tabelas que já existem.
