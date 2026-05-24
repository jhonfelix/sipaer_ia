from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.schemas.user import UserUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise ValueError("Token inválido")
        return int(user_id)
    except JWTError:
        raise ValueError("Token inválido ou expirado")


async def authenticate_user(email: str, password: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.email == email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        raise ValueError("Credenciais inválidas")
    return user


async def create_user(
    name: str, email: str, password: str, role: str, unit: str, db: AsyncSession
) -> User:
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise ValueError("E-mail já cadastrado")
    user = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role=role,
        unit=unit,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(user: User, data: UserUpdate, db: AsyncSession) -> User:
    if data.email and data.email != user.email:
        taken = await db.execute(select(User).where(User.email == data.email))
        if taken.scalar_one_or_none():
            raise ValueError("E-mail já está em uso por outro usuário")
        user.email = data.email

    if data.posto_graduacao is not None:
        user.posto_graduacao = data.posto_graduacao

    if data.current_password and data.new_password:
        if not verify_password(data.current_password, user.hashed_password):
            raise ValueError("Senha atual incorreta")
        user.hashed_password = hash_password(data.new_password)

    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_id(user_id: int, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("Usuário não encontrado")
    return user
