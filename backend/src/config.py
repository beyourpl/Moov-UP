from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    OPENROUTER_API_KEY: str = "missing"
    JWT_SECRET: str = "dev-secret-not-for-prod"
    LLM_MODEL: str = "google/gemini-3-flash-preview"
    ALLOWED_ORIGIN: str = "http://localhost:5173,http://localhost:3000"
    DATABASE_URL: str = "sqlite:///./moovup.db"
    DATA_DIR: str = "./data"


settings = Settings()
