from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://sdp:sdp@localhost:5432/sdp"
    face_model_name: str = "buffalo_l"
    face_detection_size: int = 640
    biometric_media_root: str = "data/biometric"
    ai_service_api_key: str = "development-only-change-me"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
