from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.movie import Movie


class MovieRepository:
    """Acesso ao catálogo de filmes (camada de infraestrutura, DDD)."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, movie_id: int) -> Movie | None:
        return self.db.get(Movie, movie_id)

    def get_by_ids(self, ids: list[int]) -> dict[int, Movie]:
        """Busca vários filmes por id, retornando um mapa id -> Movie."""
        if not ids:
            return {}
        stmt = select(Movie).where(Movie.id.in_(ids))
        return {m.id: m for m in self.db.execute(stmt).scalars()}

    def count(self) -> int:
        return self.db.execute(select(func.count()).select_from(Movie)).scalar_one()

    def list(
        self,
        *,
        limit: int = 20,
        offset: int = 0,
        order_by_popularity: bool = True,
    ) -> list[Movie]:
        stmt = select(Movie)
        if order_by_popularity:
            stmt = stmt.order_by(Movie.popularity.desc().nullslast())
        stmt = stmt.limit(limit).offset(offset)
        return list(self.db.execute(stmt).scalars())

    def search(self, query: str, *, limit: int = 20, offset: int = 0) -> list[Movie]:
        """Busca por título (case-insensitive), ordenada por popularidade."""
        stmt = (
            select(Movie)
            .where(Movie.title.ilike(f"%{query}%"))
            .order_by(Movie.popularity.desc().nullslast())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars())
