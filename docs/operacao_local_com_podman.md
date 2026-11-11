# Operação local com Podman

## Pré-requisitos

- Podman 4 ou superior;
- `podman-compose` disponível no `PATH`;
- Bun 1.4 ou superior;
- Python 3.11 ou superior para o serviço de IA.

Nesta máquina, `podman-compose` foi instalado no escopo do usuário:

```bash
python3 -m pip install --user --break-system-packages podman-compose
```

`$HOME/.local/bin` precisa estar no `PATH`. Abra um novo terminal após alterar
o perfil ou execute temporariamente:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Banco de dados

Validar a configuração resolvida:

```bash
podman compose config
```

Subir e conferir saúde:

```bash
podman compose up -d
podman compose ps
podman inspect --format '{{.State.Health.Status}}' sdp-postgres
```

O projeto Compose se chama `sdp`. Ele preserva:

- container `sdp-postgres`;
- banco, usuário e senha locais `sdp`;
- porta local `5432`;
- volume persistente `sdp_sdp-postgres-data`.

Aplicar migrations:

```bash
bun run db:generate
bun run db:deploy
```

Em desenvolvimento de uma migration nova, use `bun run db:migrate`. Em
ambientes que apenas consomem migrations versionadas, use `db:deploy`.

Confirmar extensões:

```bash
podman exec sdp-postgres \
  psql -U sdp -d sdp -c \
  "SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pg_trgm', 'unaccent');"
```

## API TypeScript

```bash
cp apps/api-ts/.env.example apps/api-ts/.env
# defina um BETTER_AUTH_SECRET local com 32+ caracteres
bun install --frozen-lockfile
bun run dev
```

URLs:

- API: `http://localhost:3000`;
- Swagger: `http://localhost:3000/docs`;
- health: `http://localhost:3000/health`.

## Serviço Python

```bash
cd apps/ai-python
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[test]'
uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

URLs:

- OpenAPI: `http://localhost:8000/docs`;
- health: `http://localhost:8000/health`.

Na primeira chamada biométrica, o InsightFace baixa o modelo `buffalo_l` para o
cache do usuário. `/detect-face` retorna os metadados da face e confirma 512
dimensões; `/match` aceita de uma a três partes multipart chamadas `file`.

Configure a mesma `AI_SERVICE_API_KEY` na API TypeScript e no serviço Python.
As imagens cadastradas ficam, por padrão, em
`apps/ai-python/data/biometric`, diretório ignorado pelo Git.

Cadastro pela API pública:

```bash
curl -X POST \
  'http://localhost:3000/matching/references/MISSING_PERSON/<uuid-da-ficha>' \
  --cookie cookies.txt \
  -F 'images=@frente.jpg' \
  -F 'images=@perfil.jpg'
```

## Verificação rápida

```bash
curl --fail-with-body http://localhost:3000/health
curl --fail-with-body http://localhost:8000/health
```

Para rotas privadas, cadastre uma conta em `/api/auth/sign-up/email`, salve o
cookie com `curl --cookie-jar` e reutilize-o com `curl --cookie`.

## Parada e diagnóstico

```bash
podman compose logs postgres
podman compose stop
podman compose down
```

`podman compose down` remove containers e rede, mas não deve remover o volume
sem uma decisão explícita. Não use `down -v` em um banco com dados que precisem
ser preservados.

Se `podman compose` informar que não encontrou provider, confirme:

```bash
command -v podman-compose
podman-compose --version
echo "$PATH"
```
