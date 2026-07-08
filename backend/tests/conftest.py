"""Fixtures de teste da API.

Testamos a camada HTTP (rotas, validação, status, formato das respostas) sem
depender do Postgres nem do ml-service: substituímos os repositórios por fakes
em memória (via ``app.dependency_overrides``) e monkeypatchamos ``MLClient`` /
``VectorRepository`` (instanciados dentro das rotas).

Os modelos ORM usam ``ARRAY`` (específico do Postgres), então SQLite não serve —
daí os fakes em vez de um banco de teste.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.movies import get_repo as movies_get_repo
from app.api.users import get_movies, get_users
from app.infrastructure.ml_client import ModelNotTrainedError
from app.main import app


# --------------------------------------------------------------------------- #
# Fakes de domínio
# --------------------------------------------------------------------------- #
@dataclass
class FakeMovie:
    id: int
    title: str
    release_year: int | None = None
    popularity: float | None = None
    vote_average: float | None = None
    poster_path: str | None = None
    genres: list = field(default_factory=list)
    # campos de detalhe
    imdb_id: str | None = None
    original_title: str | None = None
    original_language: str | None = None
    overview: str | None = None
    tagline: str | None = None
    release_date=None
    runtime: float | None = None
    budget: int | None = None
    revenue: int | None = None
    vote_count: int | None = None
    status: str | None = None
    director: str | None = None
    cast: list = field(default_factory=list)
    keywords: list = field(default_factory=list)


@dataclass
class FakeUser:
    id: int
    name: str
    email: str
    created_at: datetime


# --------------------------------------------------------------------------- #
# Repositórios em memória
# --------------------------------------------------------------------------- #
class FakeMovieRepository:
    def __init__(self, movies: list[FakeMovie]):
        self._movies = {m.id: m for m in movies}

    def get_by_id(self, movie_id):
        return self._movies.get(movie_id)

    def get_by_ids(self, ids):
        return {i: self._movies[i] for i in ids if i in self._movies}

    def count(self):
        return len(self._movies)

    def list(self, *, limit=20, offset=0, order_by_popularity=True):
        items = sorted(
            self._movies.values(), key=lambda m: (m.popularity or 0), reverse=True
        )
        return items[offset : offset + limit]

    def search(self, query, *, limit=20, offset=0):
        q = query.lower()
        items = [m for m in self._movies.values() if q in m.title.lower()]
        items.sort(key=lambda m: (m.popularity or 0), reverse=True)
        return items[offset : offset + limit]


class FakeUserRepository:
    def __init__(self, movie_repo: FakeMovieRepository):
        self._movies = movie_repo
        self._users: dict[int, FakeUser] = {}
        self._watched: dict[int, list[int]] = {}
        self._seq = 0

    def create(self, name, email):
        self._seq += 1
        u = FakeUser(id=self._seq, name=name, email=email, created_at=datetime(2024, 1, 1))
        self._users[u.id] = u
        return u

    def get(self, user_id):
        return self._users.get(user_id)

    def get_by_email(self, email):
        return next((u for u in self._users.values() if u.email == email), None)

    def list(self, *, limit=100, offset=0):
        return list(self._users.values())[offset : offset + limit]

    def add_watched(self, user_id, movie_id):
        seen = self._watched.setdefault(user_id, [])
        if movie_id in seen:
            return False
        seen.append(movie_id)
        return True

    def remove_watched(self, user_id, movie_id):
        seen = self._watched.get(user_id, [])
        if movie_id in seen:
            seen.remove(movie_id)
            return True
        return False

    def watched_movie_ids(self, user_id):
        return list(self._watched.get(user_id, []))

    def list_watched_movies(self, user_id):
        # mais recentes primeiro (como o repo real ordena por watched_at desc)
        ids = reversed(self._watched.get(user_id, []))
        return [self._movies.get_by_id(i) for i in ids if self._movies.get_by_id(i)]


class FakeMLClient:
    """Controlável pelos testes via atributos de classe."""

    items: list[dict] = []
    raise_not_trained = False

    def __init__(self, *args, **kwargs):
        pass

    def recommend(self, liked_movie_ids, seen_movie_ids, limit=10):
        if FakeMLClient.raise_not_trained:
            raise ModelNotTrainedError("Modelo não treinado")
        seen = set(seen_movie_ids)
        out = [it for it in FakeMLClient.items if it["id"] not in seen]
        return out[:limit]


class FakeVectorRepository:
    ready = True
    pairs: list[tuple[int, float]] = []

    def __init__(self, *args, **kwargs):
        pass

    def collection_ready(self):
        return FakeVectorRepository.ready

    def similar_to(self, movie_id, limit=10):
        return FakeVectorRepository.pairs[:limit]


# --------------------------------------------------------------------------- #
# Dados semente + fixtures
# --------------------------------------------------------------------------- #
def _seed_movies() -> list[FakeMovie]:
    return [
        FakeMovie(id=603, title="The Matrix", release_year=1999, popularity=90.0,
                  vote_average=8.1, genres=["Action", "Science Fiction"],
                  director="Lana Wachowski", cast=["Keanu Reeves"], overview="Neo."),
        FakeMovie(id=78, title="Blade Runner", release_year=1982, popularity=70.0,
                  vote_average=7.9, genres=["Science Fiction"]),
        FakeMovie(id=11, title="Star Wars", release_year=1977, popularity=85.0,
                  vote_average=8.2, genres=["Adventure", "Science Fiction"]),
        FakeMovie(id=1891, title="The Empire Strikes Back", release_year=1980,
                  popularity=80.0, vote_average=8.4, genres=["Science Fiction"]),
        FakeMovie(id=680, title="Pulp Fiction", release_year=1994, popularity=95.0,
                  vote_average=8.5, genres=["Crime"]),
    ]


@pytest.fixture
def ctx(monkeypatch):
    """Monta o app com repositórios fake e ml/vector monkeypatchados."""
    movies = _seed_movies()
    movie_repo = FakeMovieRepository(movies)
    user_repo = FakeUserRepository(movie_repo)

    # reset do estado configurável dos fakes
    FakeMLClient.items = []
    FakeMLClient.raise_not_trained = False
    FakeVectorRepository.ready = True
    FakeVectorRepository.pairs = []

    app.dependency_overrides[movies_get_repo] = lambda: movie_repo
    app.dependency_overrides[get_movies] = lambda: movie_repo
    app.dependency_overrides[get_users] = lambda: user_repo

    monkeypatch.setattr("app.api.users.MLClient", FakeMLClient)
    monkeypatch.setattr("app.api.movies.VectorRepository", FakeVectorRepository)

    client = TestClient(app)  # sem context manager → não dispara o lifespan (create_all)
    yield SimpleNamespace(
        client=client,
        movies=movie_repo,
        users=user_repo,
        ml=FakeMLClient,
        vectors=FakeVectorRepository,
    )
    app.dependency_overrides.clear()


@pytest.fixture
def client(ctx):
    return ctx.client
