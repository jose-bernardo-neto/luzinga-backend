# Diagrama de casos de uso

O diagrama combina os casos exigidos pelos PDFs com o estado atual. A cor não
altera o requisito; apenas indica cobertura pela implementação existente.

```mermaid
flowchart LR
    V[Visitante]
    U[Usuário autenticado]
    C[Cidadão]
    I[Representante institucional]
    A[Administrador da plataforma]

    C -. "especializa" .-> U
    I -. "especializa" .-> U

    subgraph Luzinga
        UC01((Cadastrar conta e escolher perfil))
        UC02((Entrar e manter sessão))
        UC03((Recuperar senha))
        UC04((Completar cadastro institucional))
        UC05((Verificar conta institucional))
        UC06((Criar ficha de desaparecido))
        UC07((Consultar e buscar fichas))
        UC08((Atualizar status da própria ficha))
        UC09((Enviar e validar mídia facial))
        UC10((Buscar por similaridade facial))
        UC11((Combinar busca textual e facial))
        UC12((Gerenciar pessoas acolhidas))
        UC13((Registrar consentimento biométrico))
    end

    V --> UC01
    V --> UC02
    V --> UC03

    C --> UC06
    C --> UC07
    C --> UC08
    C --> UC09
    C --> UC10
    C --> UC11

    I --> UC04
    I --> UC07
    I --> UC09
    I --> UC10
    I --> UC11
    I --> UC12
    I --> UC13

    A --> UC05
    UC04 -. "requer" .-> UC05
    UC10 -. "inclui" .-> UC09
    UC11 -. "inclui" .-> UC07
    UC11 -. "inclui" .-> UC10
    UC12 -. "inclui" .-> UC13

    classDef implemented fill:#d5f5e3,stroke:#1e8449,color:#17202a
    classDef partial fill:#fcf3cf,stroke:#b7950b,color:#17202a
    classDef pending fill:#fadbd8,stroke:#922b21,color:#17202a

    class UC02,UC07,UC08 implemented
    class UC01,UC03,UC06,UC09 partial
    class UC11,UC13 pending
    class UC04,UC05,UC12 implemented
    class UC10 partial
```

## Legenda e rastreabilidade

| Caso de uso | Requisitos | Estado | Observação |
| --- | --- | --- | --- |
| Cadastrar conta e escolher perfil | RF-01 / US-01 | Parcial | Perfis existem; dados e aprovação institucional não. |
| Entrar e manter sessão | RF-02 | Implementado | Better Auth com sessão persistida. |
| Recuperar senha | RF-03 / US-02 | Parcial | Fluxo existe, mas o adapter atual registra e-mail no console. |
| Completar cadastro institucional | RF-01 / US-01 | Implementado | Representante cria e edita a instituição; dados legais alterados voltam a `PENDING`. |
| Verificar conta institucional | RF-01 / US-01 | Implementado | `PLATFORM_ADMIN` verifica, rejeita ou suspende. |
| Criar ficha de desaparecido | RF-10 | Parcial | Dados biográficos existem; fotografia vinculada à ficha ainda não. |
| Consultar e buscar fichas | RF-06 / RF-10 | Implementado parcialmente em relação ao RF-06 | CRUD de consulta existe; full-text tolerante a grafia não. |
| Atualizar status da própria ficha | RF-10 | Implementado | Apenas o autor pode alterar `ACTIVE`, `FOUND`, `ARCHIVED`. |
| Enviar e validar mídia facial | RF-04 / RF-05 / US-03 | Parcial | Formato/tamanho são validados; motor e PDF estão pendentes. |
| Buscar por similaridade facial | RF-07 / RF-08 / US-04 | Parcial | Detecção, embeddings e consulta multiângulo funcionam; cadastro de referências e enriquecimento dos candidatos ainda não. |
| Combinar busca textual e facial | RF-09 / US-05 | Pendente | Existem endpoints separados, não uma busca combinada. |
| Gerenciar pessoas acolhidas | RF-11 / US-06 | Implementado | CRUD restrito à instituição verificada, com arquivamento lógico e restauração. |
| Registrar consentimento biométrico | RNF-01 / US-06 | Pendente | Não existe entidade nem endpoint de consentimento. |

O ator `PLATFORM_ADMIN` verifica, rejeita e suspende instituições. A decisão
confirmada impede que ele opere acolhidos em nome de uma instituição.
