from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:password@localhost:5432/postgres"
    frontend_url: str = "http://localhost:3000"
    app_name: str = "Instagram AI Agent"
    debug: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
