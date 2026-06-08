from fastapi import APIRouter

from app.api.deps import CurrentUser, DB
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from app.schemas.common import MessageResponse
from app.schemas.user import UpdateProfileRequest, UserProfile
from app.services.auth_service import AuthService
from app.repositories.user_repo import UserRepository

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: RegisterRequest, db: DB) -> TokenResponse:
    service = AuthService(db)
    user = await service.register(data)
    return AuthService._build_token_response(user.id)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: DB) -> TokenResponse:
    service = AuthService(db)
    return await service.login(data.email, data.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: DB) -> TokenResponse:
    service = AuthService(db)
    return await service.refresh(data.refresh_token)


@router.get("/me", response_model=UserProfile)
async def me(current_user: CurrentUser) -> UserProfile:
    return UserProfile.model_validate(current_user)


@router.patch("/me", response_model=UserProfile)
async def update_me(
    data: UpdateProfileRequest,
    current_user: CurrentUser,
    db: DB,
) -> UserProfile:
    updates = data.model_dump(exclude_none=True)
    if updates:
        repo = UserRepository(db)
        await repo.update(current_user, **updates)
    return UserProfile.model_validate(current_user)
