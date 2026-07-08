from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.domain.movie import Movie
from app.domain.user import User, Watched


class UserRepository:
    """Acesso a usuários e ao histórico de assistidos (camada de infraestrutura)."""

    def __init__(self, db: Session):
        self.db = db

    # --- Usuários ---
    def create(self, name: str, email: str) -> User:
        user = User(name=name, email=email)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.execute(
            select(User).where(User.email == email)
        ).scalar_one_or_none()

    def list(self, *, limit: int = 100, offset: int = 0) -> list[User]:
        stmt = select(User).order_by(User.id).limit(limit).offset(offset)
        return list(self.db.execute(stmt).scalars())

    # --- Histórico (assistidos) ---
    def add_watched(self, user_id: int, movie_id: int) -> bool:
        """Marca um filme como assistido. Idempotente — retorna False se já existia."""
        exists = self.db.execute(
            select(Watched).where(
                Watched.user_id == user_id, Watched.movie_id == movie_id
            )
        ).scalar_one_or_none()
        if exists:
            return False
        self.db.add(Watched(user_id=user_id, movie_id=movie_id))
        self.db.commit()
        return True

    def remove_watched(self, user_id: int, movie_id: int) -> bool:
        result = self.db.execute(
            delete(Watched).where(
                Watched.user_id == user_id, Watched.movie_id == movie_id
            )
        )
        self.db.commit()
        return result.rowcount > 0

    def watched_movie_ids(self, user_id: int) -> list[int]:
        rows = self.db.execute(
            select(Watched.movie_id).where(Watched.user_id == user_id)
        ).scalars()
        return list(rows)

    def list_watched_movies(self, user_id: int) -> list[Movie]:
        """Filmes assistidos pelo usuário (mais recentes primeiro)."""
        stmt = (
            select(Movie)
            .join(Watched, Watched.movie_id == Movie.id)
            .where(Watched.user_id == user_id)
            .order_by(Watched.watched_at.desc())
        )
        return list(self.db.execute(stmt).scalars())
