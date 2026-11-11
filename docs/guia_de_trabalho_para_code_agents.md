# Guia de trabalho para code agents

## 1. Antes de alterar

1. Leia `README_CODE_AGENTS.md` e o documento do componente afetado.
2. Verifique `git status --short` e preserve alterações que não foram produzidas por você.
3. Localize o fluxo completo: rota, caso de uso, porta, adapter, schema e testes.
4. Compare a solicitação com os PDFs de requisitos quando ela envolver regra de produto.
5. Se houver mais de uma interpretação plausível, peça confirmação antes de codificar ou documentar a escolha.

Exemplos que exigem confirmação:

- quem pode visualizar relatórios;
- se administradores institucionais podem alterar relatórios de cidadãos;
- política de retenção de imagens e embeddings;
- limiar oficial de similaridade facial;
- provedor de object storage;
- formato e validação de documentos institucionais.

Esses pontos não estão definidos de forma executável no código atual.

## 2. Como adicionar comportamento à API TypeScript

Siga o fluxo existente:

1. Tipos e invariantes puros em `modules/<módulo>/domain`.
2. Interfaces de dependências externas em `modules/<módulo>/ports`.
3. Orquestração em `modules/<módulo>/application`.
4. HTTP, Prisma, e-mail ou clientes remotos em `modules/<módulo>/adapters`.
5. Instanciação e injeção no composition root `apps/api-ts/src/app.ts`.
6. Testes unitários com fakes/mocks das portas em `apps/api-ts/tests`.

Casos de uso não devem importar Elysia, Prisma ou detalhes HTTP. Adapters podem
depender das portas e dos tipos de domínio, nunca o contrário.

## 3. Como adicionar comportamento ao serviço Python

- Modelos de entrada/saída pertencem a `src/domain`.
- Contratos do motor pertencem a `src/ports` como `Protocol`.
- Integrações concretas pertencem a `src/adapters`.
- `src/main.py` expõe FastAPI e traduz falhas para respostas HTTP.
- Enquanto o motor real não existir, mantenha respostas explícitas; não simule sucesso biométrico.

O adapter `InsightFaceEngine` atualmente lança `NotImplementedError`; os
endpoints `/detect-face` e `/match` convertem isso em HTTP 501.

## 4. Banco e migrations

- Altere `apps/api-ts/prisma/schema.prisma` para mudanças modeláveis pelo Prisma.
- Gere uma migration para qualquer alteração persistente versionada.
- Preserve SQL manual necessário a recursos PostgreSQL que o Prisma não expressa, como índices HNSW e GIN específicos.
- Não use `db:push` como substituto de migration em mudanças destinadas ao repositório.
- Não edite o Prisma Client em `src/generated/prisma`; ele é gerado e ignorado pelo Git.
- Preserve os identificadores `sdp` de banco, credenciais e volume, salvo decisão explícita em contrário.

## 5. Erros, validação e segurança HTTP

- Erros de negócio devem estender `AppError`.
- O corpo público segue `{ "error": { "code", "message", "details?" } }`.
- Validação Elysia usa HTTP 422; corpo não parseável usa 400.
- Dependência externa indisponível usa `ServiceUnavailableError`/HTTP 503.
- Não exponha stack trace na resposta.
- Preserve os plugins globais `errorHandler` e `securityHeaders`.
- Rotas privadas devem declarar `auth: true` ou `requireRole(...)` conforme a necessidade confirmada.
- Upload facial aceita apenas JPEG, PNG e WebP, com limite atual de 10 MiB.

## 6. Testes esperados

Para uma regra nova, cubra ao menos:

- caminho de sucesso;
- limite ou normalização relevante;
- autorização negada, quando aplicável;
- recurso inexistente;
- tradução de falha de adapter, quando houver integração externa.

Comandos de validação:

```bash
bun run check

cd apps/ai-python
source .venv/bin/activate
python -m pytest
```

O `check` executa typecheck e testes Bun. Testes de casos de uso devem preferir
portas falsas ou mocks e não depender do PostgreSQL. Testes HTTP/persistentes
podem usar o ambiente Podman descrito em `operacao_local_com_podman.md`.

## 7. Critério de conclusão

Antes de declarar a tarefa concluída:

1. execute typecheck e testes relacionados;
2. execute `git diff --check`;
3. valide migrations contra PostgreSQL quando houver mudança de banco;
4. teste endpoints alterados com requisições reais;
5. atualize documentação sem converter hipótese em fato;
6. informe limitações ou validações que não puderam ser executadas.
