import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Agent Service starting up")
    yield
    logger.info("AI Agent Service shutting down")


app = FastAPI(
    title="AI SDR Agent Service",
    description="AI agents for autonomous B2B sales outreach",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers.agents import router as agents_router
app.include_router(agents_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-sdr-agent"}


@app.get("/")
async def root():
    return {"message": "AI SDR Agent Service", "version": "1.0.0"}
