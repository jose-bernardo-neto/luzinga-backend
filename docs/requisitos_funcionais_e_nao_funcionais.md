# Requisitos funcionais e não funcionais

Fonte primária: `Especificacao_de_Requisitos_Sistema_Pessoas_Desaparecidas.pdf`
e `User_Stories_Sistema_Pessoas_Desaparecidas.pdf`. A coluna de estado foi
avaliada contra o código atual; ela não altera o requisito original.

## Convenção de estado

- **Implementado**: comportamento principal disponível no código executável.
- **Parcial**: somente parte dos critérios está disponível.
- **Estruturado**: há schema, contrato ou adapter, sem fluxo funcional completo.
- **Pendente**: comportamento principal ausente.
- **Não verificado**: pode haver mecanismos relacionados, mas falta evidência/teste para afirmar conformidade.

## Requisitos funcionais

### IAM

| ID | Requisito | Critérios consolidados | Estado e evidência |
| --- | --- | --- | --- |
| RF-01 | Cadastro de usuários | Registrar cidadão ou usuário institucional; instituição informa registro legal e razão social e passa por validação. | **Parcial.** Better Auth aceita `CITIZEN` e `INSTITUTION_ADMIN`. `Institution` contém `legalName`, `document` e `verifiedStatus`, mas não há fluxo para criar ou verificar esses dados. |
| RF-02 | Autenticação de sessão | Login por e-mail/senha com sessão segura e persistente. | **Implementado.** Better Auth persiste `Session` e entrega cookie de sessão. O projeto não afirma que o token seja JWT; JWT é apenas exemplo no requisito. |
| RF-03 | Recuperação de credenciais | Token seguro por e-mail, sem 2FA; redefinição deve invalidar sessões. | **Parcial.** Better Auth implementa solicitação/redefinição e `revokeSessionsOnPasswordReset`; o adapter atual é `ConsoleMailer`, não um serviço real de e-mail. A expiração de 30 minutos da US-02 não está configurada explicitamente. |

### Ingestão e validação de mídia

| ID | Requisito | Critérios consolidados | Estado e evidência |
| --- | --- | --- | --- |
| RF-04 | Upload multiformato | Aceitar JPG, JPEG, PNG e PDF. | **Parcial.** Rotas aceitam JPEG, PNG e WebP até 10 MiB. PDF não é aceito; WebP é capacidade adicional não citada no requisito. |
| RF-05 | Pré-validação e feedback | Rejeitar formato/corrupção/ausência de face; aprovar e extrair embedding. | **Implementado para imagens.** Tipo, tamanho, decodificação, quantidade de rostos e embedding são validados. PDF continua pendente no RF-04. |

### Busca híbrida e reconhecimento facial

| ID | Requisito | Critérios consolidados | Estado e evidência |
| --- | --- | --- | --- |
| RF-06 | Busca textual avançada | Buscar nome, filiação, idade/faixa, naturalidade e endereço, tolerando variações de grafia. | **Parcial.** Busca atual cobre nome, naturalidade, endereço e filiação. Não filtra idade e não oferece full-text/fuzzy completo. |
| RF-07 | Motor de face matching | Comparar imagem com base vetorial. | **Implementado no backend.** InsightFace extrai embeddings, referências são persistidas e o adapter consulta pgvector. Calibração de precisão ainda é necessária. |
| RF-08 | Relatório ordenado de similaridade | Retornar candidatos em ordem decrescente com percentual e dados de contexto. | **Parcial.** Candidatos são ordenados pela média da similaridade entre até três ângulos. Enriquecimento com nome/instituição permanece pendente. |
| RF-09 | Busca combinada multimodal | Combinar texto e biometria ou usar somente imagem. | **Pendente.** Endpoints textual e facial são separados; não há orquestração combinada. |

### Gestão de ocorrências

| ID | Requisito | Critérios consolidados | Estado e evidência |
| --- | --- | --- | --- |
| RF-10 | Registro de desaparecidos | Cidadão submete e gerencia ficha com dados biográficos e fotografias. | **Parcial.** CRUD de ficha e cadastro de até três referências biométricas pelo autor existem; remoção/substituição de fotos ainda não. |
| RF-11 | Gestão de acolhidos | Instituição publica, atualiza e remove pessoas sob sua tutela em painel dedicado. | **Parcial.** Instituição verificada pode cadastrar biometria de acolhido existente; CRUD/painel de acolhidos ainda não existe. |

## Requisitos não funcionais

| ID | Requisito | Especificação | Estado e lacunas |
| --- | --- | --- | --- |
| RNF-01 | Privacidade e proteção de dados (LGPD) | Consentimento explícito para biometria, retenção clara, anonimização e direito de exclusão. | **Pendente/Parcial na infraestrutura.** Existem cascatas em algumas relações, mas não há consentimento, política de retenção, anonimização ou endpoint de exercício de direitos. |
| RNF-02 | Segurança / OWASP Top 10 | Mitigar injeção, XSS, CSRF; aplicar HSTS/CSP e RBAC. | **Parcial.** Prisma reduz composição manual de SQL; há CSP, HSTS em produção, outros cabeçalhos, autenticação e macros de papel. Não há evidência suficiente para declarar conformidade integral OWASP ou cobertura completa de RBAC/CSRF. |
| RNF-03 | Desempenho e latência | P95 inferior a 700 ms sob carga nominal para consultas textuais e rotinas. | **Não verificado.** Não existem teste de carga, definição de carga nominal ou coleta de percentil P95 no repositório. |
| RNF-04 | Processamento biométrico escalonável | Usar índice vetorial eficiente ou processamento assíncrono sem bloquear API principal. | **Estruturado.** Há PostgreSQL/pgvector, `vector(512)`, índice HNSW e serviço Python separado. O matching real e processamento assíncrono não existem. |
| RNF-05 | Resiliência e auditoria | Logs estruturados de auditoria e erros tratados sem expor infraestrutura. | **Parcial.** A API produz logs JSON e respostas de erro padronizadas. Não há trilha de auditoria persistente para ações sensíveis; alguns detalhes controlados de falha remota são retornados pelo adapter. |

## Capacidades implementadas além da redação original

Estas capacidades existem, mas não recebem novos IDs neste documento para não
alterar unilateralmente a especificação:

- health checks da API e do serviço Python;
- documentação Swagger da API;
- consulta de relatório por ID;
- status `ACTIVE`, `FOUND` e `ARCHIVED`;
- paginação por `limit` e `offset`;
- formato WebP em upload facial;
- restrição atual de atualização de status ao autor da ficha.

## Matriz histórias × requisitos

| História | Requisitos relacionados | Estado resumido |
| --- | --- | --- |
| US-01 — Cadastro diferenciado | RF-01 | Parcial |
| US-02 — Recuperação de senha | RF-03 | Parcial |
| US-03 — Upload e diagnóstico | RF-04, RF-05 | Parcial |
| US-04 — Face matching ordenado | RF-07, RF-08, RNF-03 | Parcial / não verificado |
| US-05 — Busca multimodal | RF-06, RF-09 | Parcial / pendente |
| US-06 — Registro de acolhido | RF-11, RNF-01 | Estruturado / pendente |

## Decisões ainda necessárias

Antes de implementar as lacunas, é necessário confirmar com o responsável de
produto, no mínimo:

1. ator e regras da verificação institucional;
2. tratamento de PDF: extração de páginas, limites e formatos resultantes;
3. política de consentimento, retenção, anonimização e exclusão biométrica;
4. limiar e métrica oficiais de similaridade;
5. definição de “carga nominal” para RNF-03;
6. estratégia síncrona, assíncrona ou híbrida para matching;
7. comportamento e ordenação da busca multimodal;
8. dados que podem ser exibidos em resultados biométricos.
