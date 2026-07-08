from __future__ import annotations

import httpx

from app.core.config import settings


class MLServiceError(Exception):
    """Falha ao falar com o microserviço de ML."""


class ModelNotTrainedError(MLServiceError):
    """O modelo de recomendação ainda não foi treinado no ml-service."""


class MLClient:
    """Cliente HTTP para o microserviço de ML (TensorFlow.js)."""

    def __init__(self, base_url: str | None = None, timeout: float = 30.0):
        self.base_url = (base_url or settings.ml_service_url).rstrip("/")
        self.timeout = timeout

    def recommend(
        self, liked_movie_ids: list[int], seen_movie_ids: list[int], limit: int = 10
    ) -> list[dict]:
        """Pede recomendações ao ml-service a partir do gosto do usuário.

        Envia os ids explicitamente (endpoint desacoplado) e devolve a lista de
        itens [{id, title, score, ...}] já ranqueada.
        """
        payload = {
            "likedMovieIds": liked_movie_ids,
            "seenMovieIds": seen_movie_ids,
            "limit": limit,
        }
        try:
            resp = httpx.post(
                f"{self.base_url}/recommend", json=payload, timeout=self.timeout
            )
        except httpx.HTTPError as exc:
            raise MLServiceError(f"ml-service indisponível: {exc}") from exc

        if resp.status_code == 503:
            raise ModelNotTrainedError(resp.json().get("error", "Modelo não treinado"))
        if resp.status_code != 200:
            raise MLServiceError(f"ml-service retornou {resp.status_code}: {resp.text}")

        return resp.json().get("items", [])
