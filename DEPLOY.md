# 🚀 Deploy & Operação — UNIPDS Movie Recommendation

Guia para subir a stack do zero e reproduzir o MVP. Toda a aplicação roda em
**Docker Compose**; não há dependência de nuvem.

## Visão geral

Cinco serviços (ver [`docker-compose.yml`](./docker-compose.yml)):

| Serviço      | Porta (host) | Papel                                   | Estado persistente     |
|--------------|--------------|-----------------------------------------|------------------------|
| `frontend`   | 5173         | SPA React (Vite)                        | —                      |
| `backend`    | 8000         | API FastAPI (`/docs` = Swagger)         | —                      |
| `ml-service` | 3011 → 3001  | TensorFlow.js (embeddings + recomendação) | volume `mlmodels`    |
| `postgres`   | 5432         | Catálogo de filmes + usuários/histórico | volume `pgdata`        |
| `qdrant`     | 6333/6334    | Índice vetorial (busca por similaridade)| volume `qdrantdata`    |

`backend` e `ml-service` têm **healthchecks**; `postgres` também. Os dados
ingeridos/indexados/treinados vivem em volumes Docker e **sobrevivem a
`docker compose up/down`** (só somem com `down -v`).

## Pré-requisitos

- Docker + Docker Compose
- Para a ingestão inicial (uma vez): Python 3.12 + `pandas`, e o dataset
  [The Movies Dataset](https://www.kaggle.com/datasets/rounakbanik/the-movies-dataset)
  descompactado em `archive/` (`movies_metadata.csv`, `credits.csv`,
  `keywords.csv`, `ratings.csv`, `links.csv`). O dataset (~900 MB) **não** é
  versionado.

## 1. Configuração

```bash
cp .env.example .env      # ajuste se necessário (portas, credenciais)
```

Variáveis relevantes já têm defaults sensatos em `.env.example`. Para o browser,
`VITE_API_URL` aponta para `http://localhost:8000`.

## 2. Subir a stack

```bash
docker compose up -d --build
```

Verifique a saúde:

```bash
docker compose ps                        # todos "healthy"/"running"
curl http://localhost:8000/health        # {"status":"ok","database":"up"}
curl http://localhost:3011/health        # {"model_trained": ...}
```

## 3. Bootstrap dos dados (stack nova)

Numa base vazia é preciso rodar o pipeline **uma vez**, em ordem:

### 3.1 Ingestão do catálogo → Postgres  *(no host)*

A ingestão usa `pandas` e lê os CSVs de `archive/`. Rode a partir do host com o
Postgres do compose no ar:

```bash
cd backend
pip install -r requirements.txt -r scripts/requirements-ingest.txt
DATABASE_URL=postgresql+psycopg://movies:movies@localhost:5432/movies \
  python -m scripts.ingest_movies
cd ..
```

Resultado: ~45.433 filmes + ~99.810 avaliações. É idempotente.

### 3.2 Indexação vetorial → Qdrant  *(no container)*

```bash
docker compose exec ml-service npm run index
```

### 3.3 Treino do modelo → volume `mlmodels`  *(no container)*

```bash
docker compose exec ml-service npm run train
```

> Atalho: `sh scripts/bootstrap-data.sh` roda 3.2 e 3.3 (e avisa se falta a
> ingestão 3.1).

## 4. Verificar o MVP ponta-a-ponta

Abra **http://localhost:5173** e: cadastre-se → pesquise um filme → marque
alguns como assistidos → veja as **Recomendações**. Ou via API:

```bash
# cria usuário
curl -s -X POST localhost:8000/users -H 'Content-Type: application/json' \
  -d '{"name":"Demo","email":"demo@test.pt"}'
# marca assistido (id 603 = The Matrix) e pede recomendações
curl -s -X POST localhost:8000/users/1/watched -H 'Content-Type: application/json' \
  -d '{"movie_id":603}'
curl -s "localhost:8000/users/1/recommendations?limit=5"
```

## 5. Testes

Testes de API do backend (pytest, sem depender de DB/ml-service — usam fakes):

```bash
docker compose exec backend sh -c "pip install -q -r requirements-dev.txt && pytest"
```

Frontend — type-check + build + lint:

```bash
cd frontend && npm ci && npm run build && npm run lint
```

## 6. Operação

```bash
docker compose logs -f backend          # logs de um serviço
docker compose restart ml-service       # reiniciar
docker compose down                     # derrubar (mantém volumes/dados)
docker compose down -v                  # derrubar e APAGAR dados (recomeça do zero)
```

## 7. Notas de produção

Este é um MVP acadêmico rodando em modo desenvolvimento. Para um deploy real:

- **CORS**: hoje `allow_origins=["*"]` (`backend/app/main.py`) — restrinja ao
  domínio do frontend.
- **Frontend**: hoje serve via `vite dev`. Em produção, use `npm run build` +
  um servidor estático (Nginx) ou `vite preview`.
- **Backend**: remova `--reload` e rode com múltiplos workers
  (`uvicorn ... --workers N`) atrás de um proxy.
- **Segredos**: mova credenciais para um gestor de segredos; não use os defaults
  do `.env.example`.
- **Auth**: hoje é "leve" (só e-mail, sem senha) — adequado só para o MVP.

## Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| `/health` → `database: down` | Postgres ainda subindo | aguarde o healthcheck; `docker compose ps` |
| Recomendações → **503** | modelo não treinado | rode `docker compose exec ml-service npm run train` |
| `/movies/{id}/similar` → **503** | índice vetorial vazio | rode `docker compose exec ml-service npm run index` |
| Catálogo vazio no frontend | ingestão não rodou | passo 3.1 |
| Frontend não fala com a API | `VITE_API_URL` errado | ajuste no `.env` e recrie o `frontend` |
