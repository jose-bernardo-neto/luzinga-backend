# Guia de entrada para code agents

Este índice orienta agentes que alterem o Luzinga. Ele descreve o estado
observável do repositório em 11 de novembro de 2026 e não substitui os
requisitos de produto presentes nos PDFs desta pasta.

## Leitura recomendada

1. [`guia_de_trabalho_para_code_agents.md`](./guia_de_trabalho_para_code_agents.md): fluxo seguro de análise, alteração e validação.
2. [`padroes_e_principios_confirmados.md`](./padroes_e_principios_confirmados.md): padrões já materializados no código.
3. [`componentes_e_responsabilidades.md`](./componentes_e_responsabilidades.md): mapa dos componentes e do que está ou não implementado.
4. [`operacao_local_com_podman.md`](./operacao_local_com_podman.md): banco, migrations, serviços e diagnóstico local.
5. [`diagrama_er.md`](./diagrama_er.md): modelo físico atual e referência biométrica polimórfica.
6. [`diagrama_de_casos_de_uso.md`](./diagrama_de_casos_de_uso.md): atores, casos e cobertura atual.
7. [`diagramas_de_sequencia.md`](./diagramas_de_sequencia.md): fluxos atuais e fluxo-alvo biométrico.
8. [`requisitos_funcionais_e_nao_funcionais.md`](./requisitos_funcionais_e_nao_funcionais.md): RF/RNF, rastreabilidade e lacunas.
9. [`arquitetura_e_entidades_do_sistema.md`](./arquitetura_e_entidades_do_sistema.md): proposta arquitetural original.

## Fontes e como tratar divergências

- Os PDFs de requisitos e histórias de usuário descrevem o comportamento de produto desejado.
- `apps/**`, `packages/**`, o schema Prisma e as migrations mostram o comportamento atualmente implementado.
- O `README.md` contém a visão geral e os comandos públicos do projeto.
- `arquitetura_e_entidades_do_sistema.md` é uma proposta anterior e contém referências genéricas ou futuras. Não assuma que um item desse documento já existe sem conferir o código.

Quando requisitos, documentação e implementação divergirem, não escolha uma
interpretação silenciosamente. Registre a divergência e peça confirmação ao
responsável antes de transformar uma hipótese em regra de negócio, schema ou
decisão arquitetural.

## Estado resumido confirmado

- Monorepo Bun com workspaces em `apps/*` e `packages/*`.
- API principal em Bun/Elysia, autenticação Better Auth e persistência Prisma/PostgreSQL.
- Serviço FastAPI separado para biometria.
- PostgreSQL 17 com `vector`, `pg_trgm` e `unaccent`.
- Relatórios de desaparecidos possuem criação, listagem/busca, consulta e atualização de status.
- Detecção, embeddings, referências, busca multiângulo, verificação institucional e gestão de acolhidos estão implementados no backend; consentimento LGPD e lifecycle de exclusão/substituição biométrica ainda não.
- A suíte atual possui testes Bun e Pytest; execute-os antes de concluir uma alteração.

## Regra contra suposições

Use um destes rótulos ao atualizar documentação técnica:

- **Implementado**: há código executável e, de preferência, teste correspondente.
- **Estruturado**: há schema, contrato ou porta, mas falta o fluxo completo.
- **Pendente**: não existe implementação funcional.
- **Proposta**: ideia dos requisitos/documentos, ainda sem decisão confirmada no código.

Não apresente itens **estruturados**, **pendentes** ou **propostos** como se já
estivessem implementados.
