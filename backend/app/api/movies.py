from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.schemas import MovieDetail, MovieList, MovieSummary
from app.db.session import get_db
from app.infrastructure.movie_repository import MovieRepository

router = APIRouter(prefix="/movies", tags=["movies"])


def get_repo(db: Session = Depends(get_db)) -> MovieRepository:
    return MovieRepository(db)


@router.get("", response_model=MovieList)
def list_movies(
    q: str | None = Query(None, description="Busca por título"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    repo: MovieRepository = Depends(get_repo),
) -> MovieList:
    """Lista o catálogo (ordenado por popularidade) ou busca por título."""
    if q:
        items = repo.search(q, limit=limit, offset=offset)
    else:
        items = repo.list(limit=limit, offset=offset)
    return MovieList(
        total=repo.count(),
        limit=limit,
        offset=offset,
        items=[MovieSummary.model_validate(m) for m in items],
    )


@router.get("/{movie_id}", response_model=MovieDetail)
def get_movie(
    movie_id: int,
    repo: MovieRepository = Depends(get_repo),
) -> MovieDetail:
    movie = repo.get_by_id(movie_id)
    if movie is None:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    return MovieDetail.model_validate(movie)
