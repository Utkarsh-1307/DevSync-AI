import pytest
from httpx import AsyncClient


@pytest.fixture
async def workspace_and_project(client: AsyncClient, auth_headers: dict) -> dict:
    ws = await client.post(
        "/api/v1/workspaces",
        json={"name": "Task WS", "slug": "task-ws"},
        headers=auth_headers,
    )
    workspace_id = ws.json()["id"]

    proj = await client.post(
        f"/api/v1/workspaces/{workspace_id}/projects",
        json={"name": "Task Project", "key": "TSK", "visibility": "workspace"},
        headers=auth_headers,
    )
    project_id = proj.json()["id"]
    return {"workspace_id": workspace_id, "project_id": project_id}


@pytest.mark.asyncio
async def test_create_task(
    client: AsyncClient, auth_headers: dict, workspace_and_project: dict
) -> None:
    wid = workspace_and_project["workspace_id"]
    pid = workspace_and_project["project_id"]

    response = await client.post(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks",
        json={"title": "My First Task", "status": "todo", "priority": "high"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "My First Task"
    assert data["version"] == 1


@pytest.mark.asyncio
async def test_update_task_optimistic_lock(
    client: AsyncClient, auth_headers: dict, workspace_and_project: dict
) -> None:
    wid = workspace_and_project["workspace_id"]
    pid = workspace_and_project["project_id"]

    create_resp = await client.post(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks",
        json={"title": "Lock Test Task"},
        headers=auth_headers,
    )
    task_id = create_resp.json()["id"]

    # Update with correct version
    resp1 = await client.patch(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks/{task_id}",
        json={"title": "Updated", "version": 1},
        headers=auth_headers,
    )
    assert resp1.status_code == 200
    assert resp1.json()["version"] == 2

    # Update with stale version should fail
    resp2 = await client.patch(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks/{task_id}",
        json={"title": "Stale Update", "version": 1},
        headers=auth_headers,
    )
    assert resp2.status_code == 409
