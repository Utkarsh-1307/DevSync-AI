from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserStatus
from app.repositories.user_repo import UserRepository
from app.schemas.auth import RegisterRequest, TokenResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self._user_repo = UserRepository(db)

    async def register(self, data: RegisterRequest) -> User:
        existing = await self._user_repo.get_by_email(data.email.lower())
        if existing:
            raise ConflictError("Email already registered")

        existing_username = await self._user_repo.get_by_username(data.username.lower())
        if existing_username:
            raise ConflictError("Username already taken")

        return await self._user_repo.create(
            email=data.email.lower(),
            username=data.username.lower(),
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
            status=UserStatus.ACTIVE,
            email_verified_at=datetime.now(UTC),
        )

    async def login(self, email: str, password: str) -> TokenResponse:
        user = await self._user_repo.get_by_email(email.lower())
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")

        if user.status == UserStatus.SUSPENDED:
            raise UnauthorizedError("Account suspended")
        if user.status == UserStatus.INACTIVE:
            raise UnauthorizedError("Account inactive")

        await self._user_repo.update(user, last_seen_at=datetime.now(UTC))

        return self._build_token_response(user.id)

    async def refresh(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token, expected_type="refresh")
        user_id = UUID(payload["sub"])

        user = await self._user_repo.get_by_id_required(user_id)
        if user.status not in (UserStatus.ACTIVE,):
            raise UnauthorizedError("Account not active")

        return self._build_token_response(user.id)

    @staticmethod
    def _build_token_response(user_id: UUID) -> TokenResponse:
        from app.core.config import settings

        return TokenResponse(
            access_token=create_access_token(user_id),
            refresh_token=create_refresh_token(user_id),
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
