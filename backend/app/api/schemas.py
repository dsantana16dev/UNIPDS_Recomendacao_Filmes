from datetime import date, datetime

from pydantic import BaseModel


class MovieSummary(BaseModel):
    """Representação enxuta para listagens e busca."""

    id: int
    title: str
    release_year: int | None = None
    popularity: float | None = None
    vote_average: float | None = None
    poster_path: str | None = None
    genres: list[str] = []

    model_config = {"from_attributes": True}


class MovieDetail(MovieSummary):
    """Detalhe completo de um filme."""

    imdb_id: str | None = None
    original_title: str | None = None
    original_language: str | None = None
    overview: str | None = None
    tagline: str | None = None
    release_date: date | None = None
    runtime: float | None = None
    budget: int | None = None
    revenue: int | None = None
    vote_count: int | None = None
    status: str | None = None
    director: str | None = None
    cast: list[str] = []
    keywords: list[str] = []


class MovieList(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[MovieSummary]


class SimilarMovie(MovieSummary):
    """Filme similar, com o score de similaridade (cosseno) do Qdrant."""

    score: float


class SimilarList(BaseModel):
    movie_id: int
    items: list[SimilarMovie]


# --------------------------------------------------------------------------- #
# Sprint 5 — usuários, histórico e recomendações
# --------------------------------------------------------------------------- #
class UserCreate(BaseModel):
    name: str
    email: str


class UserLogin(BaseModel):
    email: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class WatchedCreate(BaseModel):
    movie_id: int


class WatchedList(BaseModel):
    user_id: int
    items: list[MovieSummary]


class RecommendedMovie(MovieSummary):
    """Filme recomendado, com o score (probabilidade de gostar) do modelo."""

    score: float


class RecommendationList(BaseModel):
    user_id: int
    items: list[RecommendedMovie]
