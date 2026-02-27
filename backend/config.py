from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:password@localhost:5432/postgres"
    # Optional: separate DB credentials (used to build URL if provided)
    db_host: str = ""
    db_port: str = "6543"
    db_user: str = "postgres.nfszvojzyswxjqybonab"
    db_password: str = ""
    db_name: str = "postgres"
    frontend_url: str = "http://localhost:3000"
    app_name: str = "Instagram AI Agent"
    debug: bool = False

    class Config:
        env_file = ".env"

    def get_database_url(self) -> str:
        """Get database URL, building from parts if DB_PASSWORD is set."""
        if self.db_password and self.db_host:
            from urllib.parse import quote
            encoded_pw = quote(self.db_password, safe="")
            return f"postgresql://{self.db_user}:{encoded_pw}@{self.db_host}:{self.db_port}/{self.db_name}"
        return self.database_url


settings = Settings()
