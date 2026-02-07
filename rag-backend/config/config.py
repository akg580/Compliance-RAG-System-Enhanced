"""
Configuration management
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Keys
    openai_api_key: str = ""
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    api_prefix: str = ""
    # ChromaDB
    chroma_persist_directory: str = "./chroma_db"
    
    # RAG Settings
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k_results: int = 5
    confidence_threshold: float = 0.7
    
    # LLM
    llm_model: str = "gpt-4-turbo-preview"
    llm_temperature: float = 0.1
    max_tokens: int = 2000
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Initialize settings
settings = Settings()

# Ensure directories exist
Path(settings.chroma_persist_directory).mkdir(parents=True, exist_ok=True)
