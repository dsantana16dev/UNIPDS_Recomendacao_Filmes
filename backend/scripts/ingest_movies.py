"""
Sprint 2 — Ingestão do dataset (The Movies Dataset) para o PostgreSQL.

Lê os CSVs de ../archive, limpa e unifica (metadata + credits + keywords),
mapeia as avaliações via links e popula as tabelas `movies` e `ratings`.

Uso (a partir do host, com o Postgres do compose no ar):
    cd backend
    python -m scripts.ingest_movies

Variáveis de ambiente:
    DATABASE_URL   (default: postgresql+psycopg://movies:movies@localhost:5432/movies)
    DATA_DIR       (default: ../archive relativo à raiz do projeto)
"""

from __future__ import annotations

import ast
import os
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, delete, insert, text

# Permite rodar como script solto ou como módulo (python -m scripts.ingest_movies)
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.db.session import Base  # noqa: E402
from app.domain.movie import Movie, Rating  # noqa: E402

# --------------------------------------------------------------------------- #
# Configuração
# --------------------------------------------------------------------------- #
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg://movies:movies@localhost:5432/movies"
)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("DATA_DIR", PROJECT_ROOT / "archive"))

TOP_CAST = 10        # nº de atores principais mantidos por filme
CHUNK = 1000         # tamanho do lote de insert


# --------------------------------------------------------------------------- #
# Helpers de parsing
# --------------------------------------------------------------------------- #
def parse_names(value) -> list[str]:
    """Converte um campo tipo "[{'id':.., 'name':'X'}, ...]" em ['X', ...]."""
    if not isinstance(value, str) or not value.strip().startswith("["):
        return []
    try:
        items = ast.literal_eval(value)
    except (ValueError, SyntaxError):
        return []
    return [i["name"] for i in items if isinstance(i, dict) and i.get("name")]


def parse_cast(value) -> list[str]:
    """Top-N atores ordenados por 'order' (ordem de bilhetagem)."""
    if not isinstance(value, str) or not value.strip().startswith("["):
        return []
    try:
        items = ast.literal_eval(value)
    except (ValueError, SyntaxError):
        return []
    items = [i for i in items if isinstance(i, dict) and i.get("name")]
    items.sort(key=lambda i: i.get("order", 9999))
    return [i["name"] for i in items[:TOP_CAST]]


def parse_director(value) -> str | None:
    """Extrai o diretor do campo crew (primeiro job == 'Director')."""
    if not isinstance(value, str) or not value.strip().startswith("["):
        return None
    try:
        items = ast.literal_eval(value)
    except (ValueError, SyntaxError):
        return None
    for i in items:
        if isinstance(i, dict) and i.get("job") == "Director":
            return i.get("name")
    return None


def none_if_nan(value):
    return None if pd.isna(value) else value


# --------------------------------------------------------------------------- #
# Etapas de ingestão
# --------------------------------------------------------------------------- #
def load_movies() -> pd.DataFrame:
    print("→ Lendo movies_metadata.csv …")
    df = pd.read_csv(DATA_DIR / "movies_metadata.csv", low_memory=False)

    # 'id' precisa ser numérico — descarta as linhas malformadas do dataset
    df["id"] = pd.to_numeric(df["id"], errors="coerce")
    df = df.dropna(subset=["id"])
    df["id"] = df["id"].astype("int64")
    df = df.drop_duplicates(subset=["id"], keep="first")
    print(f"  {len(df):,} filmes válidos (após limpar ids e duplicatas)")

    # Numéricos
    for col in ["budget", "revenue", "vote_count"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype("int64")
    for col in ["popularity", "runtime", "vote_average"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Datas
    df["release_date"] = pd.to_datetime(df["release_date"], errors="coerce")
    df["release_year"] = df["release_date"].dt.year

    # Booleano
    df["adult"] = df["adult"].map({"True": True, "False": False}).fillna(False)

    # Gêneros
    df["genres"] = df["genres"].apply(parse_names)

    return df


def merge_credits_keywords(movies: pd.DataFrame) -> pd.DataFrame:
    print("→ Lendo credits.csv (cast + director) …")
    credits = pd.read_csv(DATA_DIR / "credits.csv")
    credits["id"] = pd.to_numeric(credits["id"], errors="coerce")
    credits = credits.dropna(subset=["id"]).drop_duplicates(subset=["id"])
    credits["id"] = credits["id"].astype("int64")
    credits["cast_names"] = credits["cast"].apply(parse_cast)
    credits["director"] = credits["crew"].apply(parse_director)

    print("→ Lendo keywords.csv …")
    keywords = pd.read_csv(DATA_DIR / "keywords.csv")
    keywords["id"] = pd.to_numeric(keywords["id"], errors="coerce")
    keywords = keywords.dropna(subset=["id"]).drop_duplicates(subset=["id"])
    keywords["id"] = keywords["id"].astype("int64")
    keywords["keyword_names"] = keywords["keywords"].apply(parse_names)

    merged = movies.merge(
        credits[["id", "cast_names", "director"]], on="id", how="left"
    ).merge(keywords[["id", "keyword_names"]], on="id", how="left")
    return merged


def movie_rows(df: pd.DataFrame):
    """Gera dicts prontos para insert em `movies`."""
    for r in df.itertuples(index=False):
        title = none_if_nan(r.title) or none_if_nan(r.original_title)
        if not title:
            continue  # sem título não entra no catálogo
        yield {
            "id": int(r.id),
            "imdb_id": none_if_nan(r.imdb_id),
            "title": str(title)[:500],
            "original_title": (str(r.original_title)[:500] if pd.notna(r.original_title) else None),
            "original_language": none_if_nan(r.original_language),
            "overview": none_if_nan(r.overview),
            "tagline": none_if_nan(r.tagline),
            "release_date": (r.release_date.date() if pd.notna(r.release_date) else None),
            "release_year": (int(r.release_year) if pd.notna(r.release_year) else None),
            "runtime": none_if_nan(r.runtime),
            "budget": int(r.budget),
            "revenue": int(r.revenue),
            "popularity": none_if_nan(r.popularity),
            "vote_average": none_if_nan(r.vote_average),
            "vote_count": int(r.vote_count),
            "status": none_if_nan(r.status),
            "poster_path": none_if_nan(r.poster_path),
            "adult": bool(r.adult),
            "genres": list(r.genres) if isinstance(r.genres, list) else [],
            "director": none_if_nan(r.director),
            "cast": list(r.cast_names) if isinstance(r.cast_names, list) else [],
            "keywords": list(r.keyword_names) if isinstance(r.keyword_names, list) else [],
        }


def load_ratings(valid_ids: set[int]) -> list[dict]:
    print("→ Lendo links.csv + ratings_small.csv …")
    links = pd.read_csv(DATA_DIR / "links.csv")
    links["tmdbId"] = pd.to_numeric(links["tmdbId"], errors="coerce")
    links = links.dropna(subset=["tmdbId"])
    movielens_to_tmdb = dict(zip(links["movieId"].astype("int64"), links["tmdbId"].astype("int64")))

    ratings = pd.read_csv(DATA_DIR / "ratings_small.csv")
    ratings["tmdb"] = ratings["movieId"].map(movielens_to_tmdb)
    ratings = ratings.dropna(subset=["tmdb"])
    ratings["tmdb"] = ratings["tmdb"].astype("int64")
    ratings = ratings[ratings["tmdb"].isin(valid_ids)]

    rows = [
        {
            "user_id": int(r.userId),
            "movie_id": int(r.tmdb),
            "rating": float(r.rating),
            "rated_at": datetime.fromtimestamp(int(r.timestamp), tz=timezone.utc),
        }
        for r in ratings.itertuples(index=False)
    ]
    print(f"  {len(rows):,} avaliações mapeadas para filmes existentes")
    return rows


def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main() -> None:
    print(f"Dataset: {DATA_DIR}")
    print(f"Banco:   {DATABASE_URL}\n")
    engine = create_engine(DATABASE_URL, future=True)

    print("→ Criando tabelas (create_all) …")
    Base.metadata.create_all(engine)

    movies = merge_credits_keywords(load_movies())
    rows = list(movie_rows(movies))
    valid_ids = {r["id"] for r in rows}
    print(f"\n→ Inserindo {len(rows):,} filmes …")

    with engine.begin() as conn:
        # idempotente: limpa antes de repovoar
        conn.execute(delete(Rating))
        conn.execute(delete(Movie))
        for batch in chunked(rows, CHUNK):
            conn.execute(insert(Movie), batch)

    rating_rows = load_ratings(valid_ids)
    print(f"→ Inserindo {len(rating_rows):,} avaliações …")
    with engine.begin() as conn:
        for batch in chunked(rating_rows, CHUNK):
            conn.execute(insert(Rating), batch)

    with engine.connect() as conn:
        n_movies = conn.execute(text("SELECT COUNT(*) FROM movies")).scalar()
        n_ratings = conn.execute(text("SELECT COUNT(*) FROM ratings")).scalar()

    print("\n✅ Ingestão concluída")
    print(f"   movies : {n_movies:,}")
    print(f"   ratings: {n_ratings:,}")


if __name__ == "__main__":
    main()
