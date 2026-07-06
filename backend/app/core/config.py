from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração central da aplicação, carregada de variáveis de ambiente."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    # Banco relacional (catálogo de filmes)
    database_url: str = "postgresql+psycopg://movies:movies@postgres:5432/movies"

    # Banco vetorial
    qdrant_url: str = "http://qdrant:6333"

    # Microserviço de ML (TensorFlow.js)
    ml_service_url: str = "http://ml-service:3001"

    project_name: str = "UNIPDS Movie Recommendation API"
    api_version: str = "0.1.0"


settings = Settings()
