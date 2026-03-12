from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # LLM API Keys
    groq_api_key: str = ""
    openai_api_key: str = ""  # Keep for backward compatibility

    # Auth / JWT
    jwt_secret: str = ""
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # CORS
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    
    # ChromaDB
    chroma_persist_directory: str = "./chroma_db"
    
    # Chunking
    chunk_size: int = 1000
    chunk_overlap: int = 200
    
    # RAG
    top_k_results: int = 5
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

settings = Settings()
