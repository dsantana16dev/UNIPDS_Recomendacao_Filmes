from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health
from app.core.config import settings

app = FastAPI(title=settings.project_name, version=settings.api_version)

# CORS liberado em desenvolvimento (frontend em localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)


@app.get("/")
def root() -> dict:
    return {
        "message": "UNIPDS Movie Recommendation API",
        "docs": "/docs",
        "health": "/health",
    }
