# Arquitetura, Estrutura de Pastas e Entidades do Sistema

> **Status: proposta arquitetural original.** Este texto inclui componentes e
> fluxos futuros que ainda não existem no código. Para o mapa do estado atual,
> consulte [`componentes_e_responsabilidades.md`](./componentes_e_responsabilidades.md)
> e [`README_CODE_AGENTS.md`](./README_CODE_AGENTS.md).

Este documento apresenta a proposta arquitetural para a plataforma de localização de pessoas desaparecidas e reconhecimento biométrico facial, utilizando uma estratégia de **Monorepo**, padrão **Hexagonal Architecture (Ports and Adapters)** e stack tecnológica baseada em **TypeScript (Better Auth)** e **Python (FastAPI / IA)**.

---

## 1. Estrutura de Pastas (Monorepo Hexagonal)

A estrutura separa a API principal em TypeScript (gestão, autenticação, regras de negócio e orquestração) do Serviço de IA em Python (processamento de imagem, extração de vetores e *face matching*).

```text
/
├── apps/
│   ├── api-ts/                      # Backend Principal (TypeScript / Node.js)
│   │   ├── src/
│   │   │   ├── modules/             # Organização por Domínios (Módulos de Negócio)
│   │   │   │   ├── auth/            # Integração com Better Auth & Perfis
│   │   │   │   │   ├── domain/      # Entidades e regras de usuário
│   │   │   │   │   ├── ports/       # Interfaces (Driven Repositories)
│   │   │   │   │   └── adapters/    # Controladores HTTP & Repositórios (Prisma/Drizzle)
│   │   │   │   │
│   │   │   │   ├── reports/         # Gestão de Desaparecidos e Acolhidos
│   │   │   │   │   ├── domain/      # Entidades (MissingPerson, ShelteredPerson)
│   │   │   │   │   ├── ports/       # Portas de entrada (Use Cases) e saída (Repos/AI Client)
│   │   │   │   │   └── adapters/    # Rotas Fastify/Express e Adaptador HTTP para o Serviço Python
│   │   │   │   │
│   │   │   │   └── matching/        # Orquestração de busca e auditoria de similaridade
│   │   │   ├── shared/              # Configurações globais, logger, conexão DB
│   │   │   └── main.ts              # Ponto de entrada da aplicação TS
│   │   └── package.json
│   │
│   └── ai-python/                   # Serviço de Visão Computacional e Face Matching (Python / FastAPI)
│       ├── src/
│       │   ├── domain/              # Modelos de domínio de IA (Embedding, MatchResult)
│       │   ├── ports/               # Portas para leitores de vetores e modelos de IA
│       │   ├── adapters/            # Adaptador OpenCV/InsightFace e Banco Vetorial (pgvector)
│       │   └── main.py              # FastAPI app endpoints (/detect-face, /match)
│       └── requirements.txt
│
├── packages/                        # Tipos compartilhados ou contratos (opcional)
└── docker-compose.yml
```

---

## 2. Entidades Iniciais e Domínio

As entidades centrais refletem os requisitos funcionais de cadastro de usuários, instituições, relatórios de desaparecidos e registros biométricos.

### 2.1. Diagrama Conceitual de Relacionamentos (ER)

```text
[User (Better Auth)] 1 ----- 0..1 [Institution]
[User] 1 ----- * [MissingPersonReport] (Cidadão reporta)
[Institution] 1 ----- * [ShelteredPerson] (Instituição cadastra acolhido)
[MissingPersonReport] 1 ----- 1 [BiometricRecord]
[ShelteredPerson] 1 ----- 1 [BiometricRecord]
```

---

## 3. Descrição das Entidades Iniciais

### 3.1. `User` (Gerenciado pelo Better Auth em TS)
* **Atributos:**
  * `id`: Identificador único (UUID)
  * `email`: E-mail de acesso (Único)
  * `emailVerified`: Estado de verificação de e-mail (BOOLEAN)
  * `name`: Nome do usuário
  * `role`: Papel no sistema (`CITIZEN` | `INSTITUTION_ADMIN`)
  * `createdAt`, `updatedAt`: Timestamps de auditoria
* **Relacionamento:** Um usuário do tipo `INSTITUTION_ADMIN` pode possuir um vínculo com uma entidade `Institution`.

### 3.2. `Institution` (Lares, Abrigos, Organizações)
* **Atributos:**
  * `id`: Identificador único (UUID)
  * `userId`: Chave estrangeira para o `User` gestor da instituição
  * `name`: Nome institucional do lar/abrigo
  * `address`: Endereço físico completo
  * `contactPhone`: Telefone institucional para contato
  * `verifiedStatus`: Status de validação legal (BOOLEAN)

### 3.3. `MissingPersonReport` (Desaparecidos cadastrados por cidadãos)
* **Atributos:**
  * `id`: Identificador único (UUID)
  * `reporterId`: Chave estrangeira para o `User` que criou o registro
  * `fullName`: Nome completo da pessoa desaparecida
  * `age`: Idade exata ou estimada
  * `birthPlace`: Naturalidade
  * `parentNames`: Nomes dos progenitores (filiação)
  * `lastSeenAddress`: Endereço/local onde foi visto pela última vez
  * `status`: Estado da ocorrência (`ACTIVE` | `FOUND` | `ARCHIVED`)
  * `createdAt`, `updatedAt`

### 3.4. `ShelteredPerson` (Pessoas encontradas/acolhidas por instituições)
* **Atributos:**
  * `id`: Identificador único (UUID)
  * `institutionId`: Chave estrangeira para a `Institution` responsável
  * `fullName`: Nome conhecido ou "Não identificado #ID"
  * `approxAge`: Faixa etária estimada
  * `foundLocation`: Local/endereço onde foi encontrada
  * `status`: Estado de tutoria (`UNCLAIMED` | `IDENTIFIED` | `REUNITED`)
  * `createdAt`, `updatedAt`

### 3.5. `BiometricRecord` (Registro Facial e Vetores)
* **Atributos:**
  * `id`: Identificador único (UUID)
  * `ownerType`: Origem do registro (`MISSING_PERSON` | `SHELTERED_PERSON`)
  * `ownerId`: Chave estrangeira polimórfica para a entidade proprietária
  * `imagePath`: URL/Caminho da foto original armazenada no Object Storage
  * `embedding`: Vetor de características faciais (tipo `vector` do PostgreSQL via extensão `pgvector`)
  * `createdAt`

---

## 4. Fluxo de Comunicação (Ports & Adapters)

1. **Upload & Validação:** O usuário envia a foto via API TypeScript (*Driving Adapter*).
2. **Orquestração:** O caso de uso em TS chama o serviço Python de IA via cliente HTTP/gRPC (*Driven Adapter* em TS / *Driving Adapter* em Python).
3. **Processamento de IA:** O serviço Python valida a presença de face, extrai o vetor de características faciais (InsightFace/OpenCV) e valida a qualidade da imagem, retornando diagnósticos claros em caso de erro.
4. **Busca e Matching:** Nas buscas, o serviço Python executa a busca por distância coseno/euclidiana no banco de dados vetorial (`pgvector`) e retorna os candidatos ordenados decrescidamente por porcentagem de similaridade.
