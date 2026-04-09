from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./juridico.db")

# Supabase/PostgreSQL URLs começam com "postgres://" mas SQLAlchemy precisa de "postgresql+asyncpg://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine_kwargs = {"echo": False}

if "postgresql" in DATABASE_URL:
    # Transaction pooler (porta 6543) exige statement_cache_size=0
    # Session pooler e Direct também funcionam com essa config
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
        await conn.run_sync(Base.metadata.create_all)

        # Migração: Adiciona coluna 'role' se não existir (para upgrade de usuários antigos)
        if "postgresql" in DATABASE_URL:
            try:
                # Verifica se a coluna 'role' existe na tabela 'users'
                result = await conn.execute(text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='users' AND column_name='role'
                    )
                """))
                has_role_column = result.scalar()

                if not has_role_column:
                    print("⚠️  Adicionando coluna 'role' à tabela 'users'...")
                    await conn.execute(text("""
                        ALTER TABLE users
                        ADD COLUMN role VARCHAR(20) DEFAULT 'advogado'
                    """))
                    print("✅ Coluna 'role' adicionada com sucesso!")

                # Migração: Garante que o usuário admin tem role='admin'
                print("⚠️  Atualizando role do usuário admin...")
                await conn.execute(text("""
                    UPDATE users
                    SET role = 'admin'
                    WHERE email = 'admin@escritorio.com'
                """))
                print("✅ Role do admin atualizado para 'admin'!")

                # ── Migração v2: colunas de plano e custo ──
                migrations_users = [
                    ("plan",                       "VARCHAR(30) DEFAULT 'trial'"),
                    ("cases_used_this_month",      "INTEGER DEFAULT 0"),
                    ("api_cost_this_month_usd",    "FLOAT DEFAULT 0.0"),
                    ("plan_reset_at",              "DATE"),
                ]
                for col, definition in migrations_users:
                    result = await conn.execute(text(f"""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name='users' AND column_name='{col}'
                        )
                    """))
                    if not result.scalar():
                        print(f"⚠️  Adicionando coluna '{col}' à tabela 'users'...")
                        await conn.execute(text(
                            f"ALTER TABLE users ADD COLUMN {col} {definition}"
                        ))
                        print(f"✅ Coluna '{col}' adicionada!")

                # ── Migração v3: custo por caso ──
                result = await conn.execute(text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='cases' AND column_name='api_cost_usd'
                    )
                """))
                if not result.scalar():
                    print("⚠️  Adicionando coluna 'api_cost_usd' à tabela 'cases'...")
                    await conn.execute(text(
                        "ALTER TABLE cases ADD COLUMN api_cost_usd FLOAT DEFAULT 0.0"
                    ))
                    print("✅ Coluna 'api_cost_usd' adicionada em 'cases'!")

                # ── Migração v4: whatsapp do advogado ──
                result = await conn.execute(text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='users' AND column_name='whatsapp'
                    )
                """))
                if not result.scalar():
                    print("⚠️  Adicionando coluna 'whatsapp' à tabela 'users'...")
                    await conn.execute(text(
                        "ALTER TABLE users ADD COLUMN whatsapp VARCHAR(20)"
                    ))
                    print("✅ Coluna 'whatsapp' adicionada em 'users'!")

            except Exception as e:
                print(f"⚠️  Erro ao migrar dados: {e}")
                # Continua mesmo se houver erro
