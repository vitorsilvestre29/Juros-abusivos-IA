from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from routers import auth, public, contracts, reports, payments
import os

from dotenv import load_dotenv
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Juros Abusivos IA",
    description="Plataforma de analise de contratos de emprestimo e financiamento",
    version="2.0.0",
    lifespan=lifespan,
)

def _normalize_origin(origin: str) -> str:
    value = (origin or "").strip().rstrip("/")
    if not value:
        return ""
    if value.startswith("http://") or value.startswith("https://"):
        return value
    if value.startswith("localhost") or value.startswith("127.0.0.1"):
        return f"http://{value}"
    return f"https://{value}"


raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
origins = [_normalize_origin(o) for o in raw_origins]
origins = [o for o in origins if o]
origin_regex = os.getenv("ALLOWED_ORIGIN_REGEX", r"^https://.*\.vercel\.app$")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/auth",      tags=["Autenticacao"])
app.include_router(public.router,    prefix="/api/public",    tags=["Publico"])
app.include_router(contracts.router, prefix="/api/contracts", tags=["Contratos"])
app.include_router(reports.router,   prefix="/api/reports",   tags=["Laudos"])
app.include_router(payments.router,  prefix="/api/payments",  tags=["Pagamentos"])


@app.get("/")
async def root():
    return {"message": "Juros Abusivos IA -- API v2.0", "status": "online"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
