# Padrões e princípios confirmados

Este documento registra padrões observados no código atual. Ele não cria novas
regras de produto.

## Arquitetura

### Monorepo

- `apps/api-ts`: API principal e regras de aplicação.
- `apps/ai-python`: serviço de visão computacional.
- `packages/contracts`: constantes e tipos estáveis compartilhados.

Os pacotes usam o namespace `@luzinga/*`. Imports internos da API usam o alias
`@/`, configurado em `apps/api-ts/tsconfig.json`.

### Ports and Adapters

Os módulos TypeScript são organizados em:

- `domain`: tipos e invariantes sem framework;
- `ports`: interfaces para dependências externas;
- `application`: casos de uso;
- `adapters`: HTTP, persistência e integrações.

`apps/api-ts/src/app.ts` é o composition root: cria adapters e os injeta nos
casos de uso. Esse é o local correto para ligar novas implementações concretas.

## TypeScript

- TypeScript está em modo `strict` e usa alvo ES2023.
- Use `import type` quando a importação existir apenas no sistema de tipos.
- Prefira tipos de domínio próprios aos registros do ORM na fronteira da aplicação.
- Adapters Prisma convertem registros persistentes para objetos de domínio.
- Normalização e invariantes devem ser testáveis sem banco ou HTTP.
- Constantes de enum compartilhadas ficam em `@luzinga/contracts`; mantenha contratos e schema Prisma sincronizados.

## Elysia e contratos HTTP

- Schemas de rota usam `t.Object`, `t.String`, `t.Numeric`, `t.File` e demais tipos do Elysia.
- As rotas convertem nomes HTTP para nomes da aplicação quando necessário; por exemplo, `q` vira `query`.
- A autenticação Better Auth é montada em `/api/auth/*`.
- `authPlugin` resolve usuário/sessão e oferece as macros `auth` e `requireRole`.
- Swagger fica em `/docs`; o health check da API fica em `/health`.
- CORS, erros e cabeçalhos de segurança são plugins compartilhados.

### Erros públicos

| Situação | HTTP | Código atual |
| --- | ---: | --- |
| Requisição de domínio inválida | 400 | `BAD_REQUEST` |
| Sem sessão | 401 | `UNAUTHORIZED` |
| Sem permissão | 403 | `FORBIDDEN` |
| Recurso inexistente | 404 | `NOT_FOUND` |
| Conflito | 409 | `CONFLICT` |
| Schema ou tipo de arquivo inválido | 422 | `VALIDATION_ERROR` |
| Serviço externo falhou | 503 | `SERVICE_UNAVAILABLE` |

## Autenticação

- Better Auth persiste usuários, contas, sessões e verificações via Prisma.
- Perfis aceitos: `CITIZEN` e `INSTITUTION_ADMIN`.
- Perfil padrão: `CITIZEN`.
- O perfil é validado no hook de criação.
- O hook de atualização remove tentativas de alteração de `role` pelo endpoint genérico de usuário.
- Sessões duram sete dias e têm atualização configurada para um dia.
- Redefinição de senha revoga sessões existentes.
- O adapter de e-mail atual é `ConsoleMailer`; não há provedor de e-mail de produção configurado.

## Persistência

- Prisma 7 usa `@prisma/adapter-pg`.
- O cliente gerado usa runtime Bun e saída em `src/generated/prisma`.
- Em desenvolvimento, a instância Prisma é reutilizada em `globalThis`.
- Migrations habilitam `vector`, `pg_trgm` e `unaccent`.
- `BiometricRecord.embedding` é `vector(512)` e possui índice HNSW com distância cosseno.
- O índice trigram atual cobre `MissingPersonReport.fullName`.
- Relações de usuário, sessão, conta e relatório usam exclusão em cascata conforme a migration.

## Serviço Python

- FastAPI expõe `/health`, `/detect-face` e `/match`.
- Modelos de resposta usam Pydantic.
- `FaceEngine` é uma porta `Protocol`.
- `InsightFaceEngine` é o adapter reservado para a implementação concreta.
- O motor usa InsightFace `buffalo_l` em CPU, exige exatamente um rosto por foto e extrai embeddings normalizados de 512 dimensões.
- A busca aceita até três fotos e ordena candidatos pela média das similaridades de cosseno consultadas no pgvector.
- O cadastro aceita até três referências por proprietário e exige autoria da ficha ou instituição verificada responsável.
- Imagens usam armazenamento local com permissão `0600`; embeddings ficam no pgvector.
- A comunicação de escrita com o serviço Python usa uma chave interna compartilhada.

## Observabilidade e encerramento

- O logger TypeScript escreve uma linha JSON por evento.
- Níveis aceitos: `debug`, `info`, `warn` e `error`.
- A API trata `SIGINT` e `SIGTERM`, para o servidor e desconecta o Prisma.
- Não registre segredos, tokens de sessão, senhas, imagens ou embeddings em logs.

## Testes

- TypeScript usa `bun:test`.
- Python usa Pytest e `FastAPI TestClient`.
- Casos de uso TypeScript são testados com mocks das portas.
- Plugins HTTP são testados por `app.handle(new Request(...))`.
- O cliente do serviço de IA é testado substituindo `fetch` e restaurando-o após cada teste.
