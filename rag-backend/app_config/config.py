"""
Application configuration — reads from .env file or environment variables.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM
    groq_api_key: str = ""

    # JWT Auth
    jwt_secret: str = ""
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Chunking
    chunk_size: int = 150
    chunk_overlap: int = 30

    # RAG
    top_k_results: int = 5

    # CORS — comma-separated list
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()