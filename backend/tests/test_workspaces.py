import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_workspace(client: AsyncClient, auth_headers: dict) -> None:
    response = await client.post(
        "/api/v1/workspaces",
        json={"name": "My Workspace", "slug": "my-workspace"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Workspace"
    assert data["slug"] == "my-workspace"


@pytest.mark.asyncio
async def test_create_workspace_duplicate_slug(client: AsyncClient, auth_headers: dict) -> None:
    payload = {"name": "Dup Workspace", "slug": "dup-workspace"}
    await client.post("/api/v1/workspaces", json=payload, headers=auth_headers)
    response = await client.post("/api/v1/workspaces", json=payload, headers=auth_headers)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_workspaces(client: AsyncClient, auth_headers: dict) -> None:
    await client.post(
        "/api/v1/workspaces",
        json={"name": "Listed WS", "slug": "listed-ws"},
        headers=auth_headers,
    )
    response = await client.get("/api/v1/workspaces", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) >= 1


@pytest.mark.asyncio
async def test_get_workspace_not_member(client: AsyncClient, auth_headers: dict) -> None:
    import uuid

    response = await client.get(f"/api/v1/workspaces/{uuid.uuid4()}", headers=auth_headers)
    assert response.status_code in (403, 404)
