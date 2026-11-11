# Cliente de testes Luzinga

Interface propositalmente simples, sem framework ou etapa de build. Ela cobre:

- cadastro, login, sessão e logout;
- relatórios de desaparecidos;
- cadastro e consulta institucional;
- revisão por `PLATFORM_ADMIN`;
- CRUD e arquivamento de acolhidos;
- cadastro de referências biométricas;
- busca facial com até três fotos.

## Executar

Com API em `http://localhost:3000` e serviço Python em
`http://localhost:8000`:

```bash
python3 -m http.server 3001 --directory client
```

Acesse <http://localhost:3001>. A porta 3001 já é a origem CORS padrão da API.

Para criar uma conta `PLATFORM_ADMIN`, o e-mail precisa estar em
`PLATFORM_ADMIN_EMAILS` antes da API iniciar:

```bash
PLATFORM_ADMIN_EMAILS="admin@example.com" bun run dev
```

Este cliente é apenas para desenvolvimento e validação manual. Não implementa
design de produção, roteamento, gerenciamento avançado de estado nem política
completa de privacidade para dados biométricos.
