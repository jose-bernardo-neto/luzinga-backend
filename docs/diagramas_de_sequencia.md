# Diagramas de sequência

Os diagramas abaixo separam fluxos atuais de fluxos-alvo. Respostas e componentes
pendentes são identificados explicitamente.

## 1. Cadastro e sessão — fluxo atual

```mermaid
sequenceDiagram
    autonumber
    actor Cliente
    participant API as API Elysia
    participant Auth as Better Auth
    participant DB as PostgreSQL/Prisma

    Cliente->>API: POST /api/auth/sign-up/email<br/>{name, email, password, role}
    API->>Auth: handler(request)
    Auth->>Auth: validar role<br/>CITIZEN ou INSTITUTION_ADMIN
    Auth->>DB: criar User e Account
    DB-->>Auth: registros persistidos
    Auth->>DB: criar Session
    DB-->>Auth: sessão
    Auth-->>Cliente: 200 + cookie HttpOnly + usuário

    Cliente->>API: GET /auth/me + cookie
    API->>Auth: getSession(headers)
    Auth->>DB: consultar sessão e usuário
    DB-->>Auth: sessão válida
    Auth-->>API: user + session
    API-->>Cliente: 200 {user, session}
```

O fluxo atual aceita o valor `INSTITUTION_ADMIN`, mas não cria automaticamente
uma linha em `Institution` nem executa verificação administrativa.

## 2. Criação e atualização de relatório — fluxo atual

```mermaid
sequenceDiagram
    autonumber
    actor Cidadao as Cidadão
    participant API as Reports Routes
    participant Auth as Auth Plugin
    participant UC as Caso de uso
    participant Repo as Repositório Prisma
    participant DB as PostgreSQL

    Cidadao->>API: POST /reports/missing + cookie
    API->>Auth: validar sessão
    Auth-->>API: user
    API->>UC: execute(reporterId, dados)
    UC->>UC: normalizar e validar<br/>status inicial ACTIVE
    UC->>Repo: create(novo relatório)
    Repo->>DB: INSERT missing_person_report
    DB-->>Repo: relatório persistido
    Repo-->>UC: objeto de domínio
    UC-->>API: relatório
    API-->>Cidadao: 200 {report}

    Cidadao->>API: PATCH /reports/missing/:id/status
    API->>Auth: validar sessão
    Auth-->>API: user
    API->>UC: execute(id, status, actorId)
    UC->>Repo: findById(id)
    Repo->>DB: SELECT
    DB-->>Repo: relatório
    alt ator é o autor
        UC->>Repo: updateStatus(id, status)
        Repo->>DB: UPDATE
        DB-->>Repo: relatório atualizado
        API-->>Cidadao: 200 {report}
    else ator diferente
        UC-->>API: ForbiddenError
        API-->>Cidadao: 403 FORBIDDEN
    end
```

## 3. Busca textual — fluxo atual

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Usuário autenticado
    participant API as Reports Routes
    participant UC as ListMissingPersonReports
    participant Repo as Repositório Prisma
    participant DB as PostgreSQL

    Usuario->>API: GET /reports/missing?q=...&status=...&limit=...&offset=...
    API->>UC: execute(query, status, limit, offset)
    UC->>UC: trim query<br/>limitar página a 1..100
    UC->>Repo: search(filtros)
    Repo->>DB: SELECT + COUNT em transação
    Note over Repo,DB: contains case-insensitive em campos escalares;<br/>has exato no array parentNames
    DB-->>Repo: registros + total
    Repo-->>UC: itens paginados
    UC-->>API: resultado
    API-->>Usuario: 200 {items, total, limit, offset}
```

Esse fluxo ainda não implementa toda a busca avançada do RF-06: idade/faixa
etária e tolerância geral a variações de grafia permanecem pendentes.

## 4. Detecção e matching — integração atual

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Usuário autenticado
    participant API as API Elysia
    participant UC as Caso de uso Matching
    participant Client as AiServiceFaceMatchingClient
    participant AI as FastAPI
    participant Engine as InsightFaceEngine

    Usuario->>API: POST /matching/detect ou /matching/search<br/>multipart image
    API->>API: validar sessão, tipo e tamanho
    alt arquivo inválido
        API-->>Usuario: 422 VALIDATION_ERROR
    else arquivo aceito
        API->>UC: execute(FaceImage, opções)
        UC->>UC: limitar limit e threshold
        UC->>Client: detect() ou match()
        Client->>AI: POST /detect-face ou /match?limit&threshold
        AI->>Engine: detect(bytes) ou match(bytes, opções)
        Engine-->>AI: NotImplementedError
        AI-->>Client: 501 Not Implemented
        Client-->>UC: ServiceUnavailableError
        UC-->>API: erro propagado
        API-->>Usuario: 503 SERVICE_UNAVAILABLE<br/>com status remoto 501
    end
```

## 5. Matching — fluxo-alvo dos requisitos

Este fluxo representa RF-05, RF-07 e RF-08 e **ainda não está implementado**.

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant API as API TypeScript
    participant AI as Serviço biométrico
    participant Engine as Motor facial
    participant VectorDB as PostgreSQL/pgvector

    Usuario->>API: enviar imagem válida
    API->>AI: imagem + limit + threshold
    AI->>Engine: detectar face e extrair embedding
    alt face ausente ou imagem inadequada
        Engine-->>AI: diagnóstico de rejeição
        AI-->>API: feedback detalhado
        API-->>Usuario: imagem rejeitada
    else embedding extraído
        Engine-->>AI: vetor de 512 dimensões
        AI->>VectorDB: busca vetorial por similaridade
        VectorDB-->>AI: candidatos e distâncias
        AI->>AI: filtrar threshold e ordenar decrescente
        AI-->>API: candidatos + similaridade + tempo
        API-->>Usuario: lista ordenada
    end
```

## 6. Recuperação de senha — fluxo atual e limite operacional

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant API as Better Auth Handler
    participant Auth as Better Auth
    participant DB as PostgreSQL
    participant Mailer as ConsoleMailer

    Usuario->>API: POST /api/auth/request-password-reset
    API->>Auth: solicitar recuperação
    Auth->>DB: criar verificação/token
    Auth->>Mailer: send(to, subject, link)
    Mailer-->>Auth: link registrado no log
    Auth-->>Usuario: solicitação aceita

    Usuario->>API: POST /api/auth/reset-password<br/>token + nova senha
    API->>Auth: validar token e redefinir
    Auth->>DB: atualizar credencial
    Auth->>DB: revogar sessões do usuário
    Auth-->>Usuario: redefinição concluída
```

O fluxo lógico existe, mas `ConsoleMailer` não entrega mensagens reais. A
duração exata de 30 minutos citada na US-02 não está configurada explicitamente
no código do projeto.
