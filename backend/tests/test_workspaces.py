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


@pytest.mark.asyncio
async def test_get_workspace_member(client: AsyncClient, auth_headers: dict) -> None:
    create = await client.post(
        "/api/v1/workspaces",
        json={"name": "Get WS", "slug": "get-ws"},
        headers=auth_headers,
    )
    workspace_id = create.json()["id"]
    resp = await client.get(f"/api/v1/workspaces/{workspace_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == workspace_id


@pytest.mark.asyncio
async def test_delete_workspace(client: AsyncClient, auth_headers: dict) -> None:
    create = await client.post(
        "/api/v1/workspaces",
        json={"name": "Delete WS", "slug": "delete-ws"},
        headers=auth_headers,
    )
    workspace_id = create.json()["id"]
    resp = await client.delete(f"/api/v1/workspaces/{workspace_id}", headers=auth_headers)
    assert resp.status_code == 200

    # Confirm it no longer appears in list
    list_resp = await client.get("/api/v1/workspaces", headers=auth_headers)
    ids = [w["id"] for w in list_resp.json()]
    assert workspace_id not in ids


@pytest.mark.asyncio
async def test_workspace_members_list(client: AsyncClient, auth_headers: dict) -> None:
    create = await client.post(
        "/api/v1/workspaces",
        json={"name": "Members WS", "slug": "members-ws"},
        headers=auth_headers,
    )
    workspace_id = create.json()["id"]
    resp = await client.get(
        f"/api/v1/workspaces/{workspace_id}/members",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    members = resp.json()
    assert isinstance(members, list)
    assert len(members) >= 1  # creator is always a member
