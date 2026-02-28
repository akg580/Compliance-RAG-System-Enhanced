from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # LLM API Keys
    groq_api_key: str = ""
    openai_api_key: str = ""

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

settings = Settings()
