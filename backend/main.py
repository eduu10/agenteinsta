import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from instagram.monitor import monitor

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Instagram AI Agent API...")
    init_db()
    logger.info("Database initialized")
    yield
    # Shutdown
    if monitor.is_running:
        await monitor.stop()
    logger.info("Shutting down")


app = FastAPI(
    title="Instagram AI Agent API",
    description="Backend API for the Instagram AI Agent with Agno",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
from api.routes import health, agent, conversations, settings as settings_routes, monitor as monitor_routes

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(settings_routes.router, prefix="/api/settings", tags=["settings"])
app.include_router(monitor_routes.router, prefix="/api/monitor", tags=["monitor"])


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "status": "running",
        "docs": "/docs",
    }
