from fastapi import APIRouter, Request

from app.api.deps import CurrentUser, DB
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from app.schemas.user import UpdateProfileRequest, UserProfile
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService
from app.repositories.user_repo import UserRepository

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: RegisterRequest, request: Request, db: DB) -> TokenResponse:
    service = AuthService(db)
    user = await service.register(data)
    await AuditService.log(
        db, action="auth.register", request=request,
        user_id=user.id, entity_type="user", entity_id=user.id,
        new_value={"email": user.email},
    )
    return AuthService._build_token_response(user.id)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, db: DB) -> TokenResponse:
    service = AuthService(db)
    try:
        tokens = await service.login(data.email, data.password)
        # Resolve user id for the audit log
        repo = UserRepository(db)
        user = await repo.get_by_email(data.email)
        if user:
            await AuditService.log(
                db, action="auth.login", request=request,
                user_id=user.id, entity_type="user", entity_id=user.id,
            )
        return tokens
    except Exception:
        await AuditService.log(
            db, action="auth.login_failed", request=request,
            new_value={"email": data.email},
        )
        raise


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
