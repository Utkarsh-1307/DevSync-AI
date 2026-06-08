import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "username": "newuser",
            "full_name": "New User",
            "password": "Password123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_user) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "username": "anotheruser",
            "full_name": "Another User",
            "password": "Password123",
        },
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "Password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "WrongPassword1"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, auth_headers: dict) -> None:
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, test_user) -> None:
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "Password123"},
    )
    refresh_token = login.json()["refresh_token"]
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    assert "access_token" in response.json()
