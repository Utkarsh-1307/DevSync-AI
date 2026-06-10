import uuid

import pytest
from httpx import AsyncClient


@pytest.fixture
async def workspace(client: AsyncClient, auth_headers: dict) -> dict:
    resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "Proj WS", "slug": "proj-ws"},
        headers=auth_headers,
    )
    return resp.json()


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, auth_headers: dict, workspace: dict) -> None:
    resp = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/projects",
        json={"name": "Alpha", "key": "ALP", "visibility": "workspace"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Alpha"
    assert data["key"] == "ALP"


@pytest.mark.asyncio
async def test_create_project_duplicate_key(
    client: AsyncClient, auth_headers: dict, workspace: dict
) -> None:
    payload = {"name": "Beta", "key": "BET", "visibility": "workspace"}
    await client.post(
        f"/api/v1/workspaces/{workspace['id']}/projects",
        json=payload,
        headers=auth_headers,
    )
    resp = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/projects",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient, auth_headers: dict, workspace: dict) -> None:
    await client.post(
        f"/api/v1/workspaces/{workspace['id']}/projects",
        json={"name": "List Proj", "key": "LST", "visibility": "workspace"},
        headers=auth_headers,
    )
    resp = await client.get(
        f"/api/v1/workspaces/{workspace['id']}/projects",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_get_project(client: AsyncClient, auth_headers: dict, workspace: dict) -> None:
    create = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/projects",
        json={"name": "Get Me", "key": "GTM", "visibility": "workspace"},
        headers=auth_headers,
    )
    project_id = create.json()["id"]
    resp = await client.get(
        f"/api/v1/workspaces/{workspace['id']}/projects/{project_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == project_id


@pytest.mark.asyncio
async def test_get_project_not_found(
    client: AsyncClient, auth_headers: dict, workspace: dict
) -> None:
    resp = await client.get(
        f"/api/v1/workspaces/{workspace['id']}/projects/{uuid.uuid4()}",
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient, auth_headers: dict, workspace: dict) -> None:
    create = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/projects",
        json={"name": "Old Name", "key": "OLD", "visibility": "workspace"},
        headers=auth_headers,
    )
    project_id = create.json()["id"]
    resp = await client.patch(
        f"/api/v1/workspaces/{workspace['id']}/projects/{project_id}",
        json={"name": "New Name"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_archive_project(client: AsyncClient, auth_headers: dict, workspace: dict) -> None:
    create = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/projects",
        json={"name": "Archive Me", "key": "ARC", "visibility": "workspace"},
        headers=auth_headers,
    )
    project_id = create.json()["id"]
    resp = await client.delete(
        f"/api/v1/workspaces/{workspace['id']}/projects/{project_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200

    # Archived project should no longer appear in list
    list_resp = await client.get(
        f"/api/v1/workspaces/{workspace['id']}/projects",
        headers=auth_headers,
    )
    ids = [p["id"] for p in list_resp.json()]
    assert project_id not in ids


@pytest.mark.asyncio
async def test_create_project_unauthenticated(
    client: AsyncClient, workspace: dict
) -> None:
    resp = await client.post(
        f"/api/v1/workspaces/{workspace['id']}/projects",
        json={"name": "No Auth", "key": "NAT", "visibility": "workspace"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_project_non_member(
    client: AsyncClient, auth_headers: dict
) -> None:
    resp = await client.post(
        f"/api/v1/workspaces/{uuid.uuid4()}/projects",
        json={"name": "Stranger", "key": "STR", "visibility": "workspace"},
        headers=auth_headers,
    )
    assert resp.status_code in (403, 404)
