from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, movies, users
from app.core.config import settings
from app.db.session import Base, engine

# Importa os modelos para registrá-los no metadata antes do create_all.
from app.domain import movie as _movie  # noqa: F401
from app.domain import user as _user  # noqa: F401


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Cria as tabelas que ainda não existem (idempotente; não altera as atuais).
    # Sprint 5 adiciona users/watched sem depender de re-rodar a ingestão.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.project_name, version=settings.api_version, lifespan=lifespan
)

# CORS liberado em desenvolvimento (frontend em localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(movies.router)
app.include_router(users.router)


@app.get("/")
def root() -> dict:
    return {
        "message": "UNIPDS Movie Recommendation API",
        "docs": "/docs",
        "health": "/health",
    }
