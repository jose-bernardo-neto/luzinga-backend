# Luzinga AI Service

Serviço FastAPI responsável por detecção facial, extração de embeddings e face matching.

## Estado atual

Pipeline funcional com:

- `GET /health`
- `POST /detect-face` — detecta exatamente um rosto e extrai embedding de 512 dimensões
- `POST /match` — recebe de 1 a 3 fotos e consulta candidatos no pgvector
- `POST /enroll` — persiste fotos e embeddings, protegido por `X-API-Key`

O modelo inicial é InsightFace `buffalo_l` executado em CPU. Na primeira
inferência, o InsightFace baixa os arquivos do modelo para o cache do usuário.

A busca extrai um embedding normalizado de cada ângulo e classifica cada
candidato pela **média das similaridades de cosseno**. Fotos sem rosto ou com
mais de um rosto são rejeitadas.

O cadastro armazena as imagens em `BIOMETRIC_MEDIA_ROOT` com permissão `0600` e
grava os embeddings no PostgreSQL. O endpoint é interno; chamadas externas
devem passar pela API TypeScript, que valida a propriedade do registro.

## Executar

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[test]'
uvicorn src.main:app --reload --port 8000
```

Exemplo de busca com três ângulos:

```bash
curl -X POST 'http://localhost:8000/match?limit=20&threshold=0.5' \
  -F 'file=@frente.jpg' \
  -F 'file=@perfil-esquerdo.jpg' \
  -F 'file=@perfil-direito.jpg'
```

## Próximos passos

1. Migrar imagens locais para object storage.
2. Implementar exclusão e substituição auditável de referências.
3. Enriquecer candidatos com nome e instituição sem expor dados indevidos.
4. Calibrar o threshold com um conjunto de validação representativo.
