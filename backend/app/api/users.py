from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.api.schemas import (
    MovieSummary,
    RecommendationList,
    RecommendedMovie,
    UserCreate,
    UserLogin,
    UserOut,
    WatchedCreate,
    WatchedList,
)
from app.db.session import get_db
from app.infrastructure.ml_client import MLClient, ModelNotTrainedError, MLServiceError
from app.infrastructure.movie_repository import MovieRepository
from app.infrastructure.user_repository import UserRepository

router = APIRouter(prefix="/users", tags=["users"])


def get_users(db: Session = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_movies(db: Session = Depends(get_db)) -> MovieRepository:
    return MovieRepository(db)


# --------------------------------------------------------------------------- #
# Auth leve (sem senha) — cadastro e seleção de usuário
# --------------------------------------------------------------------------- #
@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, users: UserRepository = Depends(get_users)) -> UserOut:
    if users.get_by_email(payload.email):
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    user = users.create(payload.name.strip(), payload.email.strip().lower())
    return UserOut.model_validate(user)


@router.post("/login", response_model=UserOut)
def login(payload: UserLogin, users: UserRepository = Depends(get_users)) -> UserOut:
    """Auth leve: seleciona o usuário pelo e-mail (sem senha no MVP)."""
    user = users.get_by_email(payload.email.strip().lower())
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return UserOut.model_validate(user)


@router.get("", response_model=list[UserOut])
def list_users(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    users: UserRepository = Depends(get_users),
) -> list[UserOut]:
    return [UserOut.model_validate(u) for u in users.list(limit=limit, offset=offset)]


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, users: UserRepository = Depends(get_users)) -> UserOut:
    user = users.get(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return UserOut.model_validate(user)


# --------------------------------------------------------------------------- #
# Histórico — marcar / listar / remover assistidos
# --------------------------------------------------------------------------- #
@router.post("/{user_id}/watched", status_code=201)
def mark_watched(
    user_id: int,
    payload: WatchedCreate,
    users: UserRepository = Depends(get_users),
    movies: MovieRepository = Depends(get_movies),
) -> dict:
    if users.get(user_id) is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if movies.get_by_id(payload.movie_id) is None:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    created = users.add_watched(user_id, payload.movie_id)
    return {"user_id": user_id, "movie_id": payload.movie_id, "created": created}


@router.get("/{user_id}/watched", response_model=WatchedList)
def list_watched(
    user_id: int, users: UserRepository = Depends(get_users)
) -> WatchedList:
    if users.get(user_id) is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    items = [MovieSummary.model_validate(m) for m in users.list_watched_movies(user_id)]
    return WatchedList(user_id=user_id, items=items)


@router.delete("/{user_id}/watched/{movie_id}", status_code=204)
def unmark_watched(
    user_id: int, movie_id: int, users: UserRepository = Depends(get_users)
) -> Response:
    if users.get(user_id) is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    users.remove_watched(user_id, movie_id)
    return Response(status_code=204)


# --------------------------------------------------------------------------- #
# Recomendações — delega ao ml-service (perfil = filmes assistidos)
# --------------------------------------------------------------------------- #
@router.get("/{user_id}/recommendations", response_model=RecommendationList)
def recommendations(
    user_id: int,
    limit: int = Query(10, ge=1, le=50),
    users: UserRepository = Depends(get_users),
    movies: MovieRepository = Depends(get_movies),
) -> RecommendationList:
    if users.get(user_id) is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    watched_ids = users.watched_movie_ids(user_id)

    try:
        # Gosto = filmes assistidos; excluímos os já vistos do resultado.
        items = MLClient().recommend(watched_ids, watched_ids, limit=limit)
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except MLServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Hidrata os detalhes do Postgres, preservando a ordem e o score do modelo.
    by_id = movies.get_by_ids([it["id"] for it in items])
    recommended: list[RecommendedMovie] = []
    for it in items:
        movie = by_id.get(it["id"])
        if movie is None:
            continue
        summary = MovieSummary.model_validate(movie).model_dump()
        recommended.append(RecommendedMovie(**summary, score=it["score"]))

    return RecommendationList(user_id=user_id, items=recommended)
