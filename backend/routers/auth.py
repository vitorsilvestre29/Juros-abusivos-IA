from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from datetime import timedelta
import secrets

from database import get_db
from models import User
from auth_utils import verify_password, get_password_hash, create_access_token, verify_token, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class GuestUpgrade(BaseModel):
    name: str
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user_name: str
    user_email: str
    is_guest: bool = False


def _is_guest_email(email: str) -> bool:
    return str(email or "").lower().endswith("@guest.local")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    email = verify_token(token)
    if email is None:
        raise exc
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise exc
    return user


async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db)
) -> User | None:
    if not token:
        return None
    email = verify_token(token)
    if email is None:
        return None
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(
        access_token=token,
        token_type="bearer",
        user_name=user.name,
        user_email=user.email,
        is_guest=_is_guest_email(user.email),
    )


@router.post("/guest", response_model=Token)
async def create_guest_session(db: AsyncSession = Depends(get_db)):
    guest_id = secrets.token_hex(8)
    guest_email = f"guest_{guest_id}@guest.local"
    guest_name = "Convidado"
    guest_password = secrets.token_urlsafe(24)

    user = User(
        name=guest_name,
        email=guest_email,
        hashed_password=get_password_hash(guest_password),
    )
    db.add(user)
    await db.commit()

    token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(
        access_token=token,
        token_type="bearer",
        user_name=user.name,
        user_email=user.email,
        is_guest=True,
    )


@router.post("/upgrade-guest", response_model=Token)
async def upgrade_guest_account(
    data: GuestUpgrade,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_guest_email(current_user.email):
        raise HTTPException(status_code=400, detail="Sessao atual nao e de convidado")

    email_check = await db.execute(select(User).where(User.email == data.email))
    existing = email_check.scalar_one_or_none()
    if existing and existing.id != current_user.id:
        raise HTTPException(status_code=400, detail="Email ja cadastrado")

    current_user.name = data.name
    current_user.email = data.email
    current_user.hashed_password = get_password_hash(data.password)
    await db.commit()

    token = create_access_token(
        data={"sub": current_user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(
        access_token=token,
        token_type="bearer",
        user_name=current_user.name,
        user_email=current_user.email,
        is_guest=False,
    )


@router.post("/register", status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    user = User(
        name=data.name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
    )
    db.add(user)
    await db.commit()
    return {"message": "Cadastro realizado com sucesso"}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "is_guest": _is_guest_email(current_user.email),
        "created_at": current_user.created_at.isoformat(),
    }
