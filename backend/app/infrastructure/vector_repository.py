from __future__ import annotations

from qdrant_client import QdrantClient

from app.core.config import settings

COLLECTION = "movies"


class VectorRepository:
    """Acesso à busca vetorial no Qdrant (camada de infraestrutura, DDD)."""

    def __init__(self, url: str | None = None):
        self.client = QdrantClient(url=url or settings.qdrant_url)

    def collection_ready(self) -> bool:
        try:
            return self.client.collection_exists(COLLECTION)
        except Exception:
            return False

    def similar_to(self, movie_id: int, *, limit: int = 10) -> list[tuple[int, float]]:
        """Vizinhos mais próximos de um filme já indexado.

        Usa o próprio ponto (movie_id) como consulta e exclui-o do resultado.
        Retorna pares (id, score) ordenados por similaridade.
        """
        result = self.client.query_points(
            collection_name=COLLECTION,
            query=movie_id,          # recomendação pelo ponto armazenado
            limit=limit + 1,
            with_payload=False,
            with_vectors=False,
        )
        pairs: list[tuple[int, float]] = []
        for point in result.points:
            if point.id == movie_id:
                continue
            pairs.append((int(point.id), float(point.score)))
        return pairs[:limit]
