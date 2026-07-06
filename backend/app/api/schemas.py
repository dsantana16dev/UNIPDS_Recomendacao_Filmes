from datetime import date

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
