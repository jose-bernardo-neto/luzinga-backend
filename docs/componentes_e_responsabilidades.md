# Componentes e responsabilidades

## Visão de execução

```text
Cliente HTTP
    |
    v
API Bun/Elysia :3000
    |-- Better Auth --> Prisma --> PostgreSQL :5432
    |-- Reports ------> Prisma --> PostgreSQL :5432
    `-- Matching -----> FastAPI :8000 --> InsightFace + pgvector
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

**Instituições e administração:**

- representante cria e edita a própria instituição;
- status: `PENDING`, `VERIFIED`, `SUSPENDED`, `REJECTED`;
- alteração de documento ou razão social reinicia a verificação;
- `PLATFORM_ADMIN` lista e altera status, mas não opera acolhidos;
- criação de `PLATFORM_ADMIN` exige e-mail em `PLATFORM_ADMIN_EMAILS`;
- o adapter de e-mail continua sendo de console.

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

**Implementado no fluxo de busca:**

- detecção de exatamente um rosto por foto;
- extração de embeddings normalizados de 512 dimensões;
- busca com 1 a 3 ângulos;
- agregação pela média das similaridades de cosseno;
- consulta de candidatos em `biometric_record` pelo pgvector.

**Cadastro de referências implementado:**

- autor da ficha pode cadastrar biometria do desaparecido;
- administrador da instituição responsável pode cadastrar biometria do acolhido, desde que a instituição esteja verificada;
- limite de três referências por pessoa, protegido por lock transacional;
- imagens locais com permissão `0600` e embeddings no pgvector;
- autenticação interna por `X-API-Key` entre API e serviço Python;
- rollback dos arquivos caso a persistência falhe.

**Pendente:** migração das imagens para object storage e fluxos de exclusão ou
substituição auditável.

## `apps/ai-python`

### `src/main.py`

Expõe a aplicação FastAPI, valida os uploads e traduz erros conhecidos. Os
parâmetros `limit` e `threshold` de `/match` pertencem à query string.

### `src/domain/models.py`

Define `BoundingBox`, `FaceDetection`, `MatchCandidate` e `MatchResponse`.
A similaridade de candidato é validada entre 0 e 1.

### `src/ports/face_engine.py`

Contrato do motor com operações `detect` e `match`.

### `src/adapters/insightface_engine.py`

Implementa OpenCV + InsightFace `buffalo_l` em CPU. Rejeita imagem inválida,
ausência de rosto e múltiplos rostos, e retorna um embedding normalizado.

### `src/adapters/pgvector_biometric_repository.py`

Consulta os registros biométricos, calcula a similaridade de cosseno para cada
ângulo e ordena pela média das similaridades. Também persiste referências com
limite transacional por proprietário.

### `src/adapters/local_biometric_storage.py`

Armazena imagens em raiz configurável, separadas por tipo e UUID do
proprietário. É a decisão atual para desenvolvimento; não substitui object
storage em uma implantação distribuída.

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
schema** e agora possuem fluxos HTTP para instituição, acolhidos e referências
biométricas. O vínculo
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

## `client`

Cliente de desenvolvimento em HTML, CSS e JavaScript puros, servido na porta
3001. Exercita os principais fluxos da API com cookies e CORS, sem ser uma
interface de produção.

## Módulo `sheltered`

- CRUD de pessoas acolhidas restrito à própria instituição verificada;
- status `UNCLAIMED`, `IDENTIFIED`, `REUNITED`;
- remoção lógica por `archivedAt` e restauração explícita;
- registros arquivados não aparecem por padrão nem participam do matching;
- fotos entram em etapa separada pelo endpoint de referências biométricas.
