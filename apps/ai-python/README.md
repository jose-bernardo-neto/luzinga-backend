# Luzinga AI Service

Serviço FastAPI responsável por detecção facial, extração de embeddings e face matching.

## Estado atual

Esqueleto hexagonal com:

- `GET /health`
- `POST /detect-face` — resposta `501` até o pipeline ser implementado
- `POST /match` — resposta `501` até o pipeline ser implementado

## Executar

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

## Próximos passos

1. Implementar `InsightFaceEngine` com OpenCV/InsightFace.
2. Extrair embeddings de 512 dimensões e persistir em `biometric_record.embedding` (pgvector).
3. Implementar busca por distância de cosseno com índice HNSW.
4. Retornar candidatos ordenados por similaridade percentual.
