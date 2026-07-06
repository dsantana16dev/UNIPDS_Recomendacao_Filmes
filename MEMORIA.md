# MEMORIA.md

# Projeto: Movie Recommendation System

## Objetivo

Construir um MVP de um sistema de recomendação de filmes reutilizando a
arquitetura do projeto de produtos:
`makeContext() -> encodeMovie() -> encodeUser() -> createTrainingData() -> TensorFlow.js -> predict()`

## Status Geral

-   [x] Ideia do projeto definida
-   [x] Dataset escolhido (The Movies Dataset)
-   [x] Arquitetura de alto nível definida
-   [x] Decisão de manter a arquitetura TensorFlow.js
-   [x] Decisão de utilizar banco vetorial (Qdrant)
-   [x] DDD inicial criado
-   [x] Repositório criado (GitHub: dsantana16dev/UNIPDS_Recomendacao_Filmes)
-   [x] Ambiente Docker
-   [x] Backend (scaffold FastAPI)
-   [x] Frontend (scaffold React+Vite+Tailwind)
-   [x] Banco PostgreSQL
-   [x] Banco Vetorial (Qdrant)
-   [ ] Modelo treinado
-   [ ] MVP concluído

------------------------------------------------------------------------

# Backlog por Sprint

## Sprint 0 --- Planejamento ✅

**Objetivo:** definir arquitetura.

### Concluído

-   [x] Escolha do domínio (filmes)
-   [x] Escolha do dataset
-   [x] Arquitetura geral
-   [x] Fluxo de ML
-   [x] Documento DDD

------------------------------------------------------------------------

## Sprint 1 --- Infraestrutura

**Meta:** projeto executando localmente.

### Decisões

-   Monorepo: `frontend/` (React+Vite+TS+Tailwind), `backend/` (FastAPI+SQLAlchemy,
    estrutura DDD), `ml-service/` (Node + TensorFlow.js).
-   ML mantido em **TensorFlow.js** conforme DDD → roda em microserviço Node
    separado (container `ml-service`), consumido pelo backend via HTTP.
-   Dataset (`archive/`, ~900MB) fora do versionamento (.gitignore).

### Tarefas

-   [x] Criar monorepo
-   [x] Configurar React + Vite
-   [x] Configurar FastAPI
-   [x] Docker Compose
-   [x] PostgreSQL
-   [x] Qdrant
-   [x] Estrutura de pastas
-   [x] README inicial
-   [x] Microserviço ml-service (TensorFlow.js)

------------------------------------------------------------------------

## Sprint 2 --- Ingestão de Dados ✅

-   [x] Importar dataset
-   [x] Limpar dados (ids inválidos, duplicatas, campos numéricos/datas)
-   [x] Unificar CSVs (metadata + credits + keywords; ratings via links)
-   [x] Criar MovieRepository
-   [x] Popular PostgreSQL

Entrega: **catálogo de filmes disponível** — 45.433 filmes + 99.810 avaliações.

### Resultado

-   Modelos ORM `Movie` e `Rating` (`app/domain/movie.py`), arrays de
    genres/cast/keywords.
-   Script `backend/scripts/ingest_movies.py` (idempotente): rodar com o
    Postgres do compose no ar → `cd backend && python -m scripts.ingest_movies`
    (requer pandas — ver `backend/scripts/requirements-ingest.txt`).
-   Endpoints: `GET /movies` (lista + busca `?q=`), `GET /movies/{id}` (detalhe).

------------------------------------------------------------------------

## Sprint 3 --- Banco Vetorial ✅

-   [x] Gerar embeddings (Universal Sentence Encoder, 512d, no ml-service)
-   [x] Criar coleção Qdrant (movies, 512d, Cosine)
-   [x] Indexar filmes (45.433 pontos)
-   [x] Busca por similaridade

Entrega: **pesquisa vetorial funcionando**.

### Resultado

-   Embeddings via TensorFlow.js Universal Sentence Encoder no `ml-service`
    (endpoint `POST /embed`; módulo `src/embedder.js`).
-   Script `ml-service/scripts/index_movies.js`: lê filmes do Postgres, embute
    em lote e faz upsert no Qdrant. Rodar: `docker compose exec ml-service npm run index`.
-   Backend: `VectorRepository` (qdrant-client) + `GET /movies/{id}/similar`
    (busca pelo ponto armazenado, hidrata detalhes do Postgres).
-   Validado: Toy Story → Toy Story 2/3; Matrix → Matrix Revolutions + sci-fi.

------------------------------------------------------------------------

## Sprint 4 --- Machine Learning

-   [ ] makeContext()
-   [ ] encodeMovie()
-   [ ] encodeUser()
-   [ ] createTrainingData()
-   [ ] trainModel()
-   [ ] recommend()

Entrega: modelo treinado.

------------------------------------------------------------------------

## Sprint 5 --- Backend

-   [ ] API de filmes
-   [ ] API de recomendações
-   [ ] Favoritos
-   [ ] Histórico
-   [ ] Avaliações
-   [ ] Swagger

------------------------------------------------------------------------

## Sprint 6 --- Frontend

-   [ ] Login
-   [ ] Home
-   [ ] Pesquisa
-   [ ] Página do filme
-   [ ] Recomendações
-   [ ] Favoritos
-   [ ] Histórico

------------------------------------------------------------------------

## Sprint 7 --- MVP

-   [ ] Fluxo completo
-   [ ] Testes
-   [ ] Ajustes de UX
-   [ ] Documentação
-   [ ] Deploy

## Definição de MVP

Um usuário consegue: 1. Pesquisar filmes. 2. Marcar filmes assistidos.
3. Treinar o modelo. 4. Receber recomendações personalizadas.
