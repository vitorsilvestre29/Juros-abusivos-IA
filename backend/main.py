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
    description="Plataforma de análise de contratos de empréstimo e financiamento",
    version="2.0.0",
    lifespan=lifespan,
)

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
origins = [o.strip() for o in origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/auth",      tags=["Autenticação"])
app.include_router(public.router,    prefix="/api/public",    tags=["Público"])
app.include_router(contracts.router, prefix="/api/contracts", tags=["Contratos"])
app.include_router(reports.router,   prefix="/api/reports",   tags=["Laudos"])
app.include_router(payments.router,  prefix="/api/payments",  tags=["Pagamentos"])


@app.get("/")
async def root():
    return {"message": "Juros Abusivos IA — API v2.0", "status": "online"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
