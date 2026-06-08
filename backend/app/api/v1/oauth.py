import re
import secrets
from datetime import UTC, datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.api.deps import DB
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, hash_password
from app.models.user import User, UserStatus
from app.repositories.user_repo import UserRepository

router = APIRouter(prefix="/auth/oauth", tags=["oauth"])

_PROVIDERS = {"google", "github", "microsoft"}

# ── authorize ─────────────────────────────────────────────────────────────────

@router.get("/{provider}/authorize")
async def authorize(provider: str):
    if provider not in _PROVIDERS:
        return {"error": f"Unknown provider: {provider}"}

    if provider == "google":
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": f"{settings.FRONTEND_URL.rstrip('/')}/api/auth/oauth/google/callback",
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "select_account",
        }
        url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)

    elif provider == "github":
        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": f"{settings.FRONTEND_URL.rstrip('/')}/api/auth/oauth/github/callback",
            "scope": "read:user user:email",
        }
        url = "https://github.com/login/oauth/authorize?" + urlencode(params)

    else:  # microsoft
        params = {
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "redirect_uri": f"{settings.FRONTEND_URL.rstrip('/')}/api/auth/oauth/microsoft/callback",
            "response_type": "code",
            "scope": "openid email profile User.Read",
            "response_mode": "query",
        }
        url = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?" + urlencode(params)

    return {"url": url}


# ── callback ──────────────────────────────────────────────────────────────────

@router.get("/{provider}/callback")
async def callback(provider: str, code: str, db: DB):
    if provider not in _PROVIDERS:
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=unknown_provider")

    try:
        if provider == "google":
            user_info = await _google_user_info(code)
        elif provider == "github":
            user_info = await _github_user_info(code)
        else:
            user_info = await _microsoft_user_info(code)
    except Exception:
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=oauth_failed")

    user = await _upsert_user(db, provider, user_info)
    tokens = _build_redirect_tokens(user)
    return RedirectResponse(tokens)


# ── provider helpers ──────────────────────────────────────────────────────────

async def _google_user_info(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": f"{settings.FRONTEND_URL.rstrip('/')}/api/auth/oauth/google/callback",
                "grant_type": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        info_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        info_resp.raise_for_status()
        data = info_resp.json()
        return {
            "provider_id": data["id"],
            "email": data.get("email", ""),
            "name": data.get("name", ""),
            "avatar_url": data.get("picture"),
        }


async def _github_user_info(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "code": code,
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "redirect_uri": f"{settings.FRONTEND_URL.rstrip('/')}/api/auth/oauth/github/callback",
            },
            headers={"Accept": "application/json"},
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        user_resp = await client.get("https://api.github.com/user", headers=headers)
        user_resp.raise_for_status()
        user_data = user_resp.json()

        email = user_data.get("email")
        if not email:
            emails_resp = await client.get("https://api.github.com/user/emails", headers=headers)
            emails_resp.raise_for_status()
            primary = next((e for e in emails_resp.json() if e.get("primary")), None)
            email = primary["email"] if primary else ""

        return {
            "provider_id": str(user_data["id"]),
            "email": email,
            "name": user_data.get("name") or user_data.get("login", ""),
            "avatar_url": user_data.get("avatar_url"),
        }


async def _microsoft_user_info(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/token",
            data={
                "code": code,
                "client_id": settings.MICROSOFT_CLIENT_ID,
                "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                "redirect_uri": f"{settings.FRONTEND_URL.rstrip('/')}/api/auth/oauth/microsoft/callback",
                "grant_type": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        info_resp = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        info_resp.raise_for_status()
        data = info_resp.json()
        email = data.get("mail") or data.get("userPrincipalName", "")
        return {
            "provider_id": data["id"],
            "email": email,
            "name": data.get("displayName", ""),
            "avatar_url": None,
        }


# ── user upsert ───────────────────────────────────────────────────────────────

async def _upsert_user(db, provider: str, info: dict) -> User:
    repo = UserRepository(db)
    id_field = f"oauth_{provider}_id"

    # Try by provider ID first
    result = await db.execute(
        select(User).where(getattr(User, id_field) == info["provider_id"])
    )
    user = result.scalar_one_or_none()

    # Try by email if provider ID not matched
    if not user and info["email"]:
        user = await repo.get_by_email(info["email"].lower())

    if user:
        # Update provider ID if not yet stored
        updates: dict = {}
        if getattr(user, id_field) != info["provider_id"]:
            updates[id_field] = info["provider_id"]
        if updates:
            await repo.update(user, **updates)
        await repo.update(user, last_seen_at=datetime.now(UTC))
        return user

    # Create new user
    base_username = _derive_username(info["email"] or info["name"])
    username = base_username
    suffix = 1
    while await repo.get_by_username(username):
        username = f"{base_username}{suffix}"
        suffix += 1

    return await repo.create(
        email=info["email"].lower(),
        username=username,
        full_name=info["name"] or info["email"].split("@")[0],
        hashed_password=hash_password(secrets.token_urlsafe(32)),
        status=UserStatus.ACTIVE,
        email_verified_at=datetime.now(UTC),
        avatar_url=info.get("avatar_url"),
        oauth_provider=provider,
        **{id_field: info["provider_id"]},
    )


def _derive_username(source: str) -> str:
    base = source.split("@")[0] if "@" in source else source
    base = re.sub(r"[^a-zA-Z0-9_-]", "", base).lower()
    return base[:32] or "user"


def _build_redirect_tokens(user: User) -> str:
    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    return f"{settings.FRONTEND_URL}/auth/callback?access_token={access}&refresh_token={refresh}"
