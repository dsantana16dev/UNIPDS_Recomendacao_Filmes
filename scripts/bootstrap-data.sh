#!/usr/bin/env sh
# ---------------------------------------------------------------------------
# Bootstrap dos dados — roda o pipeline que popula os bancos numa stack nova.
#
#   1. Ingestão (Postgres)     — feita no HOST (precisa de Python + pandas +
#                                dataset em archive/). Ver observação abaixo.
#   2. Indexação vetorial      — dentro do container ml-service (Qdrant)
#   3. Treino do modelo        — dentro do container ml-service (volume mlmodels)
#
# Uso (com a stack no ar: `docker compose up -d`):
#   sh scripts/bootstrap-data.sh
#
# Idempotente: pode rodar de novo sem duplicar dados.
# ---------------------------------------------------------------------------
set -e
cd "$(dirname "$0")/.."

echo "==> 1/3  Ingestão do catálogo (Postgres)"
if docker compose exec -T postgres psql -U "${POSTGRES_USER:-movies}" -d "${POSTGRES_DB:-movies}" \
     -tAc "SELECT to_regclass('public.movies') IS NOT NULL AND count(*) > 0 FROM movies" 2>/dev/null | grep -q t; then
  echo "    catálogo já populado — pulando ingestão."
else
  echo "    catálogo vazio. Rode a ingestão no host (uma vez):"
  echo "      cd backend"
  echo "      pip install -r requirements.txt -r scripts/requirements-ingest.txt"
  echo "      DATABASE_URL=postgresql+psycopg://movies:movies@localhost:5432/movies \\"
  echo "        python -m scripts.ingest_movies"
  echo "    (precisa dos CSVs em archive/ — ver README)"
fi

echo "==> 2/3  Indexação vetorial (Qdrant)"
docker compose exec -T ml-service npm run index

echo "==> 3/3  Treino do modelo (TensorFlow.js)"
docker compose exec -T ml-service npm run train

echo "==> Pronto. Verifique: curl http://localhost:3011/health  (model_trained: true)"
