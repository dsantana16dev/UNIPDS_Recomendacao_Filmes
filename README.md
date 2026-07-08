# 🎬 UNIPDS — Sistema de Recomendação de Filmes

MVP de um sistema de recomendação de filmes construído sobre a arquitetura
`makeContext() → encodeMovie() → encodeUser() → createTrainingData() → model.fit() → predict()`,
estendida com **embeddings semânticos** armazenados em um banco vetorial.

> Projeto acadêmico — Pós AI Engineer. Ver [`Movie_Recommendation_DDD.md`](./Movie_Recommendation_DDD.md)
> para o design detalhado e [`MEMORIA.md`](./MEMORIA.md) para o backlog por sprint.

## Arquitetura (monorepo)

```
┌───────────┐     ┌───────────┐     ┌──────────────┐
│  frontend │────▶│  backend  │────▶│  ml-service  │
│ React+Vite│     │  FastAPI  │     │ TensorFlow.js │
└───────────┘     └─────┬─────┘     └──────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        ┌───────────┐       ┌───────────┐
        │ PostgreSQL│       │  Qdrant   │
        │ (catálogo)│       │ (vetores) │
        └───────────┘       └───────────┘
```

| Serviço      | Stack                          | Porta  |
|--------------|--------------------------------|--------|
| `frontend`   | React + Vite + TS + Tailwind   | 5173   |
| `backend`    | FastAPI + SQLAlchemy           | 8000   |
| `ml-service` | Node + TensorFlow.js           | 3011   |
| `postgres`   | PostgreSQL 16                  | 5432   |
| `qdrant`     | Qdrant                         | 6333   |

## Estrutura de pastas

```
.
├── frontend/            # SPA React (Vite + Tailwind)
├── backend/             # API FastAPI (arquitetura DDD)
│   └── app/
│       ├── api/         # rotas HTTP
│       ├── core/        # config, settings
│       ├── db/          # sessão SQLAlchemy
│       ├── domain/      # entidades e regras de negócio
│       └── infrastructure/  # repositórios, integrações
├── ml-service/          # microserviço TensorFlow.js (Node)
├── archive/             # dataset The Movies Dataset (NÃO versionado)
├── docker-compose.yml
├── .env.example
└── README.md
```

## Como rodar (local)

Pré-requisitos: **Docker** + **Docker Compose**.

```bash
# 1. Configurar variáveis de ambiente
cp .env.example .env

# 2. Subir toda a stack
docker compose up --build

# 3. Acessar
#   Frontend    → http://localhost:5173
#   Backend     → http://localhost:8000/docs   (Swagger)
#   ML service  → http://localhost:3011/health
#   Qdrant      → http://localhost:6333/dashboard
```

Para derrubar: `docker compose down` (adicione `-v` para apagar os volumes).

> **Base nova?** É preciso rodar o pipeline de dados uma vez (ingestão →
> indexação → treino). Passo a passo completo em **[`DEPLOY.md`](./DEPLOY.md)**;
> atalho: `sh scripts/bootstrap-data.sh`.

## O MVP

Fluxo entregue (ver [Definição de MVP](./MEMORIA.md#definição-de-mvp)):

1. **Pesquisar** filmes no catálogo (`?q=`, ~45 mil títulos).
2. **Marcar como assistidos** (histórico = sinal de gosto).
3. **Treinar** o modelo (TensorFlow.js, no `ml-service`).
4. Receber **recomendações personalizadas** (classificação "vai gostar?"),
   além de **similaridade semântica** por filme (Qdrant).

Cadastro/login é leve (só e-mail, sem senha) e favoritos ficam locais ao
navegador. Abra http://localhost:5173 e siga o fluxo, ou explore a API em
http://localhost:8000/docs.

## Testes

API do backend (pytest + FastAPI TestClient, com repositórios fake — não precisa
de Postgres nem do ml-service):

```bash
docker compose exec backend sh -c "pip install -q -r requirements-dev.txt && pytest"
```

Frontend (type-check + build + lint):

```bash
cd frontend && npm ci && npm run build && npm run lint
```

## Dataset

[The Movies Dataset](https://www.kaggle.com/datasets/rounakbanik/the-movies-dataset) —
colocar os CSVs em `archive/` (já presente localmente, não versionado por ser ~900 MB):
`movies_metadata.csv`, `credits.csv`, `keywords.csv`, `ratings.csv`, `links.csv`.

## Roadmap (sprints)

- **Sprint 0** — Planejamento ✅
- **Sprint 1** — Infraestrutura ✅
- **Sprint 2** — Ingestão de dados ✅
- **Sprint 3** — Banco vetorial (embeddings) ✅
- **Sprint 4** — Machine Learning (treino) ✅
- **Sprint 5** — Backend (API completa) ✅
- **Sprint 6** — Frontend ✅
- **Sprint 7** — MVP ✅

Detalhes por sprint em [`MEMORIA.md`](./MEMORIA.md).
