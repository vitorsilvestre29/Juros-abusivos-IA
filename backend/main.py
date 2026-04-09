from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from routers import auth, cases, chat, documents
from routers import public as public_router
import os

try:
    from routers import admin
except ImportError:
    admin = None

try:
    from routers import client as client_router
except ImportError:
    client_router = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializa o banco de dados na startup
    await init_db()

    # Cria usuário admin padrão se não existir
    from database import AsyncSessionLocal
    from models import User
    from auth_utils import get_password_hash
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "admin@escritorio.com"))
        admin = result.scalar_one_or_none()
        if not admin:
            admin_user = User(
                name="Administrador",
                email="admin@escritorio.com",
                hashed_password=get_password_hash("juridico2024"),
                role="admin"
            )
            db.add(admin_user)
            await db.commit()
            print("✅ Usuário admin criado: admin@escritorio.com / juridico2024 (role: admin)")

    yield


app = FastAPI(
    title="Portal Jurídico AI",
    description="Sistema de automação jurídica para escritórios de advocacia",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - permite que o frontend acesse o backend
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
origins = [o.strip() for o in origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticação"])
app.include_router(public_router.router, prefix="/api/public", tags=["Público"])
app.include_router(cases.router, prefix="/api/cases", tags=["Casos"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat IA"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documentos"])
if admin is not None:
    app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
if client_router is not None:
    app.include_router(client_router.router, prefix="/api/client", tags=["Portal Cliente"])


@app.get("/")
async def root():
    return {
        "message": "Portal Jurídico AI - API v1.0",
        "status": "online",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
