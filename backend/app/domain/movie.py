from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Movie(Base):
    """Filme do catálogo (chave = id do TMDB)."""

    __tablename__ = "movies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # TMDB id
    imdb_id: Mapped[str | None] = mapped_column(String(20), index=True)

    title: Mapped[str] = mapped_column(String(500), index=True)
    original_title: Mapped[str | None] = mapped_column(String(500))
    original_language: Mapped[str | None] = mapped_column(String(10), index=True)

    overview: Mapped[str | None] = mapped_column(Text)
    tagline: Mapped[str | None] = mapped_column(Text)

    release_date: Mapped[date | None] = mapped_column(Date)
    release_year: Mapped[int | None] = mapped_column(Integer, index=True)
    runtime: Mapped[float | None] = mapped_column()

    budget: Mapped[int | None] = mapped_column(BigInteger)
    revenue: Mapped[int | None] = mapped_column(BigInteger)
    popularity: Mapped[float | None] = mapped_column(index=True)
    vote_average: Mapped[float | None] = mapped_column()
    vote_count: Mapped[int | None] = mapped_column(Integer)

    status: Mapped[str | None] = mapped_column(String(50))
    poster_path: Mapped[str | None] = mapped_column(String(255))
    adult: Mapped[bool] = mapped_column(default=False)

    # Campos derivados dos CSVs auxiliares (merge de genres/credits/keywords)
    genres: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    director: Mapped[str | None] = mapped_column(String(255), index=True)
    cast: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    keywords: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)

    ratings: Mapped[list["Rating"]] = relationship(
        back_populates="movie", cascade="all, delete-orphan"
    )


class Rating(Base):
    """Avaliação de um usuário para um filme (origem: ratings_small do MovieLens)."""

    __tablename__ = "ratings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    movie_id: Mapped[int] = mapped_column(
        ForeignKey("movies.id", ondelete="CASCADE"), index=True
    )
    rating: Mapped[float] = mapped_column()
    rated_at: Mapped[datetime | None] = mapped_column(DateTime)

    movie: Mapped["Movie"] = relationship(back_populates="ratings")
