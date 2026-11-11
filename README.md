# Luzinga — Plataforma de Pessoas Desaparecidas

Monorepo da plataforma de localização de pessoas desaparecidas com reconhecimento biométrico facial.

Orientações específicas para agentes de código estão em
[`docs/README_CODE_AGENTS.md`](docs/README_CODE_AGENTS.md).

## Stack

| Camada | Tecnologia |
| --- | --- |
| Runtime | [Bun](https://bun.sh) |
| Framework HTTP | [ElysiaJS](https://elysiajs.com) |
| Autenticação | [Better Auth](https://better-auth.com) |
| ORM | [Prisma 7](https://www.prisma.io) (driver adapter `@prisma/adapter-pg`) |
| Banco | PostgreSQL + [pgvector](https://github.com/pgvector/pgvector) |
| Serviço de IA | Python + FastAPI + InsightFace + ONNX Runtime |

> Prisma 7 foi escolhido de propósito: o Prisma 8 ainda está em RC e o adapter oficial do Better Auth ainda não o suporta.

## Estrutura

```text
/
├── apps/
│   ├── api-ts/                     # Backend principal (Bun + Elysia + Better Auth + Prisma)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── init.sql            # Habilita vector, pg_trgm e unaccent
│   │   ├── prisma.config.ts
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.ts              # Composition root
│   │       ├── generated/prisma/   # Client gerado (gitignored)
│   │       ├── shared/
│   │       │   ├── config/
│   │       │   ├── database/
│   │       │   ├── errors/
│   │       │   ├── http/plugins/
│   │       │   └── logger.ts
│   │       └── modules/
│   │           ├── auth/
│   │           │   ├── domain/
│   │           │   ├── ports/
│   │           │   └── adapters/   # better-auth, e-mail e HTTP
│   │           ├── reports/
│   │           │   ├── domain/
│   │           │   ├── ports/
│   │           │   ├── application/ # Casos de uso
│   │           │   └── adapters/    # Prisma + rotas Elysia
│   │           └── matching/
│   │               ├── domain/
│   │               ├── ports/
│   │               ├── application/
│   │               └── adapters/    # Cliente HTTP do serviço Python + rotas
│   └── ai-python/                  # Detecção, embeddings e consulta vetorial
│       ├── pyproject.toml
│       └── src/
│           ├── domain/
│           ├── ports/
│           ├── adapters/
│           └── main.py
├── packages/
│   └── contracts/                  # Tipos e constantes compartilhados
├── client/                         # Cliente vanilla para testes manuais
├── docker-compose.yml              # PostgreSQL + pgvector
└── tsconfig.base.json
```

## Pré-requisitos

- Bun >= 1.4
- Podman + podman-compose ou Docker + Docker Compose (para o PostgreSQL)
- Python >= 3.11 (somente para o serviço de IA)

## Setup

```bash
# 1. Dependências do monorepo
bun install

# 2. Variáveis de ambiente da API
cp apps/api-ts/.env.example apps/api-ts/.env
# edite BETTER_AUTH_SECRET com um segredo aleatório de 32+ caracteres

# 3. Banco de dados (PostgreSQL + pgvector)
podman compose up -d
# alternativa: docker compose up -d

# 4. Gerar o Prisma Client
bun run db:generate

# 5. Criar as tabelas
bun run db:migrate
# ou, para prototipagem rápida:
bun run db:push

# 6. Subir a API em modo watch
bun run dev
```

A API sobe em `http://localhost:3000` e a documentação Swagger em `http://localhost:3000/docs`.

### Serviço de IA (opcional no momento)

```bash
cd apps/ai-python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

O serviço usa InsightFace `buffalo_l` em CPU. `/detect-face` detecta exatamente
um rosto e extrai um embedding de 512 dimensões; `/match` aceita até três fotos
e consulta o pgvector pela média das similaridades. Ainda falta o fluxo de
cadastro/persistência de novas referências biométricas.

## Scripts

| Comando | Descrição |
| --- | --- |
| `bun run dev` | API em modo watch |
| `bun run start` | API sem watch |
| `bun run build` | Build com Bun |
| `bun run typecheck` | Checagem de tipos com `tsc` |
| `bun run test` | Testes unitários da API com Bun |
| `bun run test:ai` | Testes do serviço Python (requer venv ativo) |
| `bun run check` | Typecheck seguido dos testes Bun |
| `bun run db:generate` | Gera o Prisma Client |
| `bun run db:migrate` | Cria/aplica migrações (`prisma migrate dev`) |
| `bun run db:deploy` | Aplica migrações em produção |
| `bun run db:push` | Sincroniza o schema sem migração |
| `bun run db:studio` | Abre o Prisma Studio |
| `bun run dev:ai` | Sobe o FastAPI (requer venv ativo) |
| `bun run dev:client` | Serve o cliente HTML/CSS/JS em `localhost:3001` |

## Endpoints principais

### Better Auth — `/api/auth/*`

- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-out`
- `POST /api/auth/request-password-reset`
- `POST /api/auth/reset-password`
- `GET /api/auth/get-session`

O cadastro aceita `CITIZEN`, `INSTITUTION_ADMIN` e `PLATFORM_ADMIN`. O último
só é permitido para e-mails configurados em `PLATFORM_ADMIN_EMAILS`; o valor é
validado por um `databaseHook`.

### Aplicação

- `GET /health`
- `GET /auth/me` — usuário e sessão atuais
- `POST /reports/missing` — cria ficha de desaparecido
- `GET /reports/missing` — lista/busca (`q`, `status`, `limit`, `offset`)
- `GET /reports/missing/:id`
- `PATCH /reports/missing/:id/status`
- `POST /matching/detect` — valida a foto e detecta rosto (multipart `image`)
- `POST /matching/search` — busca por similaridade facial (multipart `image`)
- `POST /matching/references/:ownerType/:ownerId` — cadastra de 1 a 3 referências biométricas
- `POST /institutions` / `GET|PATCH /institutions/me` — cadastro e gestão da própria instituição
- `GET /institutions/admin` — fila administrativa de instituições
- `PATCH /institutions/admin/:id/status` — verifica, rejeita ou suspende instituição
- `POST|GET /sheltered-people` — cria e lista acolhidos da instituição
- `GET|PATCH|DELETE /sheltered-people/:id` — consulta, atualiza ou arquiva acolhido
- `POST /sheltered-people/:id/restore` — restaura registro arquivado

## Cliente simples

Com banco, API e serviço Python em execução:

```bash
bun run dev:client
```

Acesse `http://localhost:3001`. O cliente em `client/` não usa framework nem
build e permite testar autenticação, relatórios, instituições, acolhidos e
biometria.

## Decisões de arquitetura

- **Hexagonal (Ports & Adapters)**: cada módulo tem `domain`, `ports`, `application` e `adapters`. Casos de uso não conhecem Elysia, Prisma nem HTTP.
- **Injeção explícita**: o `app.ts` é a composition root; repositórios e clientes são instanciados lá e injetados.
- **Better Auth como adapter**: o handler é montado no Elysia e o domínio só conhece `UserRole`.
- **E-mail por porta**: `Mailer` é uma porta; `ConsoleMailer` registra o link de recuperação no log em desenvolvimento.
- **Biometria fora do TS**: o serviço Python é acessado por um adapter HTTP (`FaceMatchingPort`), mantendo a API principal independente do modelo de IA.
- **pgvector**: `BiometricRecord.embedding` é `Unsupported("vector(512)")`; consultas vetoriais serão feitas via SQL no serviço de IA.
- **Referências biométricas**: imagens são armazenadas em disco local configurável e embeddings são persistidos no pgvector. O autor da ficha ou a instituição verificada responsável pode cadastrar até três fotos.
- **Administração da plataforma**: `PLATFORM_ADMIN` é reservado a e-mails em `PLATFORM_ADMIN_EMAILS` e pode revisar o status das instituições, sem operar acolhidos em nome delas.
- **LGPD**: exclusões em cascata existem para relações específicas, mas o termo/registro de consentimento do acolhido ainda não está modelado e deve ser implementado em etapa futura (US-06).

## Próximos passos sugeridos

1. Migrar o armazenamento local de imagens para object storage (S3/MinIO) antes de escalar horizontalmente.
2. Implementar remoção e substituição auditável de referências biométricas.
3. Evoluir a busca textual para `tsvector` + `pg_trgm`/`unaccent` (RF-06).
4. Implementar o cadastro institucional com CNPJ e fluxo de verificação (US-01).
5. Ampliar testes de integração para autenticação e persistência.
6. Implementar o termo de consentimento LGPD para acolhidos (US-06).
