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
-   [x] Modelo treinado
-   [x] MVP concluído

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

## Sprint 4 --- Machine Learning ✅

-   [x] makeContext()
-   [x] encodeMovie()
-   [x] encodeUser()
-   [x] createTrainingData()
-   [x] trainModel()
-   [x] recommend()

Entrega: **modelo treinado** — classificação binária "gostou/não gostou".

### Resultado

-   Pipeline em TensorFlow.js no `ml-service` (módulos `src/context.js`,
    `encode.js`, `data.js`, `model.js`, `recommender.js`):
    -   `makeContext()` — z-score dos numéricos + vocabulário de 20 gêneros e
        15 idiomas (`movieDim=552`, `inputDim=1104`).
    -   `encodeMovie()` — numéricos + gêneros multi-hot + idioma one-hot +
        **embedding USE 512d** (vindo do Qdrant).
    -   `encodeUser()` — média dos filmes curtidos (cold-start = zeros).
    -   `createTrainingData()` — `concat(userVec, movieVec)`; perfil exclui o
        próprio filme (anti-leakage). Sinal: ratings MovieLens (>=4 = gostou).
-   Rede `Dense(128)→64→32→1 sigmoid`, BCE + Adam, 151.809 params.
    Treino via `tf.data` em streaming (evita OOM).
-   Script `ml-service/scripts/train_model.js` — rodar:
    `docker compose exec ml-service npm run train`.
    99.810 exemplos (51.446 pos / 48.364 neg) → **val_acc ≈ 0.70** em 10 épocas.
-   Modelo persistido no volume Docker `mlmodels` (`/app/models/recommender`).
-   Endpoint `POST /recommend` no ml-service (`{userId, limit}`): monta o perfil,
    pontua pool de candidatos (top-3000 populares) e devolve top-N sem repetir
    vistos. Validado: user 1 (curte clássicos: Tron, Cinema Paradiso) →
    recomenda Yojimbo, M, Metropolis, North by Northwest, Night and Fog.

------------------------------------------------------------------------

## Sprint 5 --- Backend (fatia MVP) ✅

-   [x] API de filmes *(feito nos Sprints 2/3: /movies, /movies/{id}, /similar)*
-   [x] Usuários / autenticação (leve, sem senha)
-   [x] Histórico (assistidos)
-   [x] API de recomendações (backend → ml-service)
-   [x] Swagger *(automático em /docs)*
-   [ ] Favoritos *(2ª leva)*
-   [ ] Avaliações *(2ª leva)*

Entrega: **caminho crítico do MVP no backend** — pesquisar → marcar
assistido → recomendar (o treino é o Sprint 4).

### Resultado

-   Entidades `User` e `Watched` (`app/domain/user.py`); tabelas criadas no
    startup via `Base.metadata.create_all` (lifespan) — sem Alembic, idempotente.
-   Auth leve (sem senha, decisão do usuário): `POST /users` (cadastro, 409 se
    e-mail repetido), `POST /users/login` (seleção por e-mail), `GET /users`,
    `GET /users/{id}`.
-   Histórico: `POST /users/{id}/watched` (idempotente), `GET /users/{id}/watched`,
    `DELETE /users/{id}/watched/{movie_id}`.
-   Recomendações: `GET /users/{id}/recommendations` — junta os assistidos e
    delega ao ml-service (`MLClient`, httpx). **Integração desacoplada**: o
    `/recommend` do ml-service foi estendido para aceitar
    `{ likedMovieIds, seenMovieIds, limit }` (não acopla ao storage de usuários;
    mantém o caminho por `userId` p/ testes MovieLens). Backend hidrata os
    detalhes do Postgres preservando ordem/score.
-   Validado ponta-a-ponta: histórico sci-fi (Alien, Blade Runner, Matrix,
    Star Wars, Inception, Terminator) → recomenda Empire Strikes Back (0.98),
    Return of the Jedi, Terminator 2, Guardians of the Galaxy… sem repetir vistos.
-   Sem deps novas no backend (usa httpx já presente); backend recarrega sozinho
    (volume + --reload). ml-service precisa de rebuild (sem bind-mount).

------------------------------------------------------------------------

## Sprint 6 --- Frontend ✅

-   [x] Login
-   [x] Home
-   [x] Pesquisa
-   [x] Página do filme
-   [x] Recomendações
-   [x] Favoritos *(client-side / localStorage — sem endpoint no backend)*
-   [x] Histórico

Entrega: **SPA React completa** — login → explorar → detalhe → marcar
assistido → recomendações, com favoritos locais.

### Resultado

-   Stack: React 19 + Vite + **react-router-dom v7** + Tailwind v4.
    Roteamento em `src/App.tsx`; `BrowserRouter`+`AuthProvider` em `main.tsx`.
-   Camada de API tipada (`src/api/client.ts` + `types.ts`) espelhando os
    schemas do backend; `ApiError` carrega status + `detail` do FastAPI.
-   Auth leve: `AuthContext` guarda o usuário no `localStorage`; rotas
    protegidas via `ProtectedRoute` (redireciona p/ `/login`, layout+navbar).
-   Páginas (`src/pages/`): `Login` (entrar/cadastrar), `Home` (populares +
    "carregar mais"), `Search` (`?q=`), `MovieDetail` (detalhe + marcar
    assistido + favoritar + parecidos via `/similar`), `Recommendations`
    (trata 503 "modelo não treinado" e histórico vazio), `Favorites`
    (localStorage por usuário — `useFavorites`), `History` (assistidos, remover
    otimista).
-   Componentes reutilizáveis: `MovieCard` (poster TMDB via `lib/poster.ts`,
    heart de favorito, score badge, remover), `MovieGrid`, `Navbar` (busca +
    nav), estados `Spinner`/`Empty`/`Error`.
-   Pôsteres montados do CDN público da TMDB (`image.tmdb.org/t/p/...`).
-   Fix de build: `@tailwindcss/vite@4.3.2` publica `exports.types` para um
    `.d.mts` que não vem no pacote → `tsc -b` quebrava; destravado com
    `frontend/env.d.ts` (declaração ambiente) incluído no `tsconfig.node.json`.
-   Verificado: `npm run build` (tsc + vite) e `npm run lint` (oxlint) limpos;
    dev server sobe e serve a app (HTTP 200).
-   **Rodar:** `cd frontend && npm install && npm run dev` (ou `docker compose
    up frontend`). Requer backend no ar (`VITE_API_URL`, default
    `http://localhost:8000`). Favoritos/histórico precisam de usuário logado.

------------------------------------------------------------------------

## Sprint 7 --- MVP ✅

-   [x] Fluxo completo
-   [x] Testes
-   [x] Ajustes de UX
-   [x] Documentação
-   [x] Deploy

Entrega: **MVP fechado** — fluxo ponta-a-ponta validado, testes de API,
documentação e guia de deploy.

### Resultado

-   **Fluxo completo validado** contra a stack no ar: cadastrar → pesquisar →
    marcar assistidos (perfil sci-fi) → recomendações (Empire Strikes Back 0.98,
    Guardians, Terminator 2…), sem vazar filmes vistos. Os 4 critérios da
    Definição de MVP passam.
-   **Testes (pytest + FastAPI TestClient)**: `backend/tests/` com 24 testes
    cobrindo catálogo (lista/busca/detalhe/similar), usuários/auth, histórico e
    recomendações (hidratação, exclusão de vistos, 503 modelo-não-treinado,
    404s). Sem Postgres nem ml-service: repositórios fake via
    `dependency_overrides` + monkeypatch de `MLClient`/`VectorRepository` (os
    modelos ORM usam `ARRAY`, específico do Postgres → SQLite não serve).
    `requirements-dev.txt` + `pytest.ini`. Rodar:
    `docker compose exec backend sh -c "pip install -q -r requirements-dev.txt && pytest"`.
-   **UX**: `<title>`/`lang=pt-BR`/meta description no `index.html`; componente
    `ScrollToTop` (reseta scroll ao trocar de rota).
-   **Documentação**: `README.md` atualizado (roadmap ✅, seção MVP, testes) e
    novo **`DEPLOY.md`** (bring-up, pipeline de dados, verificação, operação,
    notas de produção, troubleshooting).
-   **Deploy** (Docker Compose): healthchecks em `backend` (python) e
    `ml-service` (node) — validados na stack viva; `scripts/bootstrap-data.sh`
    para o pipeline (ingestão → indexação → treino). Sem nuvem.
-   Verificado: `npm run build` + `npm run lint` limpos; 24/24 testes verdes;
    `docker compose config` válido.

## Definição de MVP

Um usuário consegue: 1. Pesquisar filmes. 2. Marcar filmes assistidos.
3. Treinar o modelo. 4. Receber recomendações personalizadas.
