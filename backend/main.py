import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from instagram.monitor import monitor

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_db_initialized = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _db_initialized
    # Startup
    logger.info("Starting Instagram AI Agent API...")
    try:
        init_db()
        _db_initialized = True
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Database init failed (will retry on first request): {e}")
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

@app.middleware("http")
async def ensure_db_initialized(request: Request, call_next):
    global _db_initialized
    if not _db_initialized:
        try:
            init_db()
            _db_initialized = True
            logger.info("Database initialized on first request")
        except Exception as e:
            logger.error(f"Database init retry failed: {e}")
    return await call_next(request)


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
