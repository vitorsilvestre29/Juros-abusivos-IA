from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./juros_abusivos.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine_kwargs = {"echo": False}

if "postgresql" in DATABASE_URL:
    engine_kwargs["connect_args"] = {"statement_cache_size": 0}
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_recycle"] = 300
    engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(DATABASE_URL, **engine_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        if "postgresql" in DATABASE_URL:
            try:
                result = await conn.execute(text(
                    "SELECT is_nullable FROM information_schema.columns "
                    "WHERE table_name='users' AND column_name='role'"
                ))
                row = result.fetchone()
                if row and row[0] == 'NO':
                    print("Schema antigo detectado. Migrando...")
                    for tbl in ["chat_messages", "documents", "client_payments",
                                "cases", "contracts", "analyses", "payments", "users"]:
                        await conn.execute(text(
                            "DROP TABLE IF EXISTS " + tbl + " CASCADE"
                        ))
                    print("Tabelas antigas removidas.")
            except Exception as e:
                print("Aviso migracao:", e)


        if "postgresql" in DATABASE_URL:
            try:
                result = await conn.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name='contracts' AND column_name='user_phone'"
                ))
                if result.fetchone() is None:
                    await conn.execute(text(
                        "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS user_phone VARCHAR(20)"
                    ))
                    print("Coluna user_phone adicionada.")
            except Exception as e:
                print("Aviso migracao user_phone:", e)

        await conn.run_sync(Base.metadata.create_all)
        print("Banco de dados inicializado.")
