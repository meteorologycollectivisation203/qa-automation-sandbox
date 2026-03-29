from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://buzzhive_user:buzzhive_password@db:5432/buzzhive"
    SECRET_KEY: str = "super-secret-key-for-dev-only-do-not-use-in-prod"
    REFRESH_SECRET_KEY: str = "refresh-secret-key-for-dev-only"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    RATE_LIMIT_PER_MINUTE: int = 100

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
