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

## Dataset

[The Movies Dataset](https://www.kaggle.com/datasets/rounakbanik/the-movies-dataset) —
colocar os CSVs em `archive/` (já presente localmente, não versionado por ser ~900 MB):
`movies_metadata.csv`, `credits.csv`, `keywords.csv`, `ratings.csv`, `links.csv`.

## Roadmap (sprints)

- **Sprint 0** — Planejamento ✅
- **Sprint 1** — Infraestrutura *(atual)*
- **Sprint 2** — Ingestão de dados
- **Sprint 3** — Banco vetorial (embeddings)
- **Sprint 4** — Machine Learning (treino)
- **Sprint 5** — Backend (API completa)
- **Sprint 6** — Frontend
- **Sprint 7** — MVP
