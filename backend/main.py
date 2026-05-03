"""
MOPS Wywiad Środowiskowy — Backend API
FastAPI + Supabase + Anthropic Claude Haiku
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import os
from dotenv import load_dotenv

load_dotenv()

# Import routerów PO załadowaniu .env
from routers import health, interviews, generate, scan

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Rate limiter globalny
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 MOPS API — start")
    yield
    logger.info("🛑 MOPS API — stop")


app = FastAPI(
    title="MOPS Wywiad Środowiskowy API",
    description="Generowanie wywiadów środowiskowych z AI i RAG z polskich ustaw",
    version="1.0.0",
    lifespan=lifespan,
    # Dokumentacja Swagger tylko w trybie deweloperskim
    docs_url="/docs" if os.getenv("ENVIRONMENT", "development") != "production" else None,
    redoc_url=None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — tylko dozwolone originy
allowed_origins = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:8081,http://localhost:3000"
    ).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Nieobsłużony błąd [{request.method} {request.url}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Wewnętrzny błąd serwera. Spróbuj ponownie za chwilę."},
    )


# Rejestracja routerów
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(interviews.router, prefix="/api/v1", tags=["interviews"])
app.include_router(generate.router, prefix="/api/v1", tags=["generate"])
app.include_router(scan.router, prefix="/api/v1", tags=["scan"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
