# Componentes e responsabilidades

## Visão de execução

```text
Cliente HTTP
    |
    v
API Bun/Elysia :3000
    |-- Better Auth --> Prisma --> PostgreSQL :5432
    |-- Reports ------> Prisma --> PostgreSQL :5432
    `-- Matching -----> FastAPI :8000 --> FaceEngine (pendente)
```

## `apps/api-ts`

### `src/main.ts`

Ponto de entrada. Cria a aplicação, escuta em `PORT`, registra inicialização e
faz encerramento gracioso em `SIGINT`/`SIGTERM`.

### `src/app.ts`

Composition root. Conecta:

- `PrismaMissingPersonReportRepository` aos casos de uso de relatórios;
- `AiServiceFaceMatchingClient` aos casos de uso de matching;
- plugins CORS, Swagger, erro, segurança e autenticação;
- rotas de autenticação, relatórios, matching e health check.

### `shared/config/env.ts`

Valida configuração no carregamento. `DATABASE_URL` e `BETTER_AUTH_SECRET` são
obrigatórios. Porta, URL do Better Auth, origens CORS, URL/timeout da IA e nível
de log têm valores padrão.

### `shared/database/prisma.ts`

Cria o `PrismaPg` com `DATABASE_URL` e o Prisma Client. Reutiliza a instância
fora de produção para evitar múltiplos clientes durante reload.

### `shared/errors` e `shared/http/plugins`

- `AppError` e subclasses representam falhas conhecidas.
- `errorHandler` traduz erros para o contrato público.
- `securityHeaders` aplica proteção de conteúdo, frame, referrer e permissões; HSTS é aplicado em produção.

### Módulo `auth`

**Implementado:**

- cadastro e login por e-mail/senha via Better Auth;
- sessões persistentes;
- perfis cidadão e administrador institucional;
- recuperação/redefinição de senha;
- `/auth/me` protegido;
- porta `Mailer` e adapter de console.

**Não implementado como fluxo próprio:**

- cadastro completo dos dados da instituição;
- verificação institucional;
- adapter real de envio de e-mail.

### Módulo `reports`

**Domínio:** `MissingPersonReport`, normalização de entrada e status.

**Casos de uso:**

- `CreateMissingPersonReport`;
- `GetMissingPersonReport`;
- `ListMissingPersonReports`;
- `UpdateMissingPersonReportStatus`.

**Porta:** `MissingPersonReportRepository`.

**Adapters:** rotas Elysia e repositório Prisma.

**Regras implementadas:**

- relatório novo começa em `ACTIVE`;
- idade inteira entre 0 e 130;
- nome entre 3 e 160 caracteres após normalização;
- paginação limitada a 100 itens;
- somente o autor atualiza o status;
- busca atual usa `contains` sem diferenciar maiúsculas/minúsculas para campos escalares e `has` para filiação.

**Pendente:** busca textual avançada usando efetivamente `tsvector`, trigram e `unaccent` em toda a consulta.

### Módulo `matching`

**Implementado:**

- validação HTTP de JPEG, PNG e WebP até 10 MiB;
- casos de uso para detectar e buscar;
- limites de `limit` entre 1 e 100 e `threshold` entre 0 e 1;
- cliente multipart para o FastAPI;
- conversão entre `snake_case` do Python e `camelCase` do TypeScript;
- tradução de falha remota para HTTP 503.

**Pendente:** resultado biométrico real, porque o motor Python responde 501.

## `apps/ai-python`

### `src/main.py`

Expõe a aplicação FastAPI e converte `NotImplementedError` do motor em 501.
Os parâmetros `limit` e `threshold` de `/match` pertencem à query string.

### `src/domain/models.py`

Define `BoundingBox`, `FaceDetection`, `MatchCandidate` e `MatchResponse`.
A similaridade de candidato é validada entre 0 e 1.

### `src/ports/face_engine.py`

Contrato do motor com operações `detect` e `match`.

### `src/adapters/insightface_engine.py`

Placeholder explícito. OpenCV, InsightFace, ONNX Runtime e acesso vetorial são
dependências opcionais previstas, não um pipeline funcional.

## `packages/contracts`

Publica listas e tipos de:

- `UserRole`;
- `ReportStatus`;
- `ShelterStatus`;
- `BiometricOwnerType`;
- formato base de erro da API.

Evite colocar nesse pacote tipos internos de adapter ou estruturas instáveis.

## PostgreSQL e Prisma

Entidades presentes:

- Better Auth: `User`, `Session`, `Account`, `Verification`;
- domínio: `MissingPersonReport`, `Institution`, `ShelteredPerson`, `BiometricRecord`.

`Institution`, `ShelteredPerson` e `BiometricRecord` estão **estruturados no
schema**, mas ainda não possuem módulos HTTP completos na API. O vínculo
polimórfico de `BiometricRecord.ownerId` não é uma foreign key Prisma para cada
tipo de proprietário; agentes não devem presumir integridade referencial que o
banco atualmente não impõe.

## Docker/Podman

O Compose atual sobe somente PostgreSQL/pgvector. API e serviço Python rodam no
host pelos scripts do projeto. Não há Dockerfiles de aplicação neste estado do
repositório.

A imagem `pgvector/pgvector` não publica tag Alpine para PostgreSQL 17; por isso
o Compose mantém `pg17`. Não troque para uma tag não publicada apenas para
cumprir preferência de distribuição base.
