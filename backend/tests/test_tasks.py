import uuid

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


@pytest.mark.asyncio
async def test_list_tasks(
    client: AsyncClient, auth_headers: dict, workspace_and_project: dict
) -> None:
    wid = workspace_and_project["workspace_id"]
    pid = workspace_and_project["project_id"]

    await client.post(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks",
        json={"title": "Listed Task"},
        headers=auth_headers,
    )
    resp = await client.get(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert isinstance(resp.json()["items"], list)
    assert len(resp.json()["items"]) >= 1


@pytest.mark.asyncio
async def test_list_tasks_empty_project(
    client: AsyncClient, auth_headers: dict, workspace_and_project: dict
) -> None:
    wid = workspace_and_project["workspace_id"]
    # Create a fresh project with no tasks
    proj = await client.post(
        f"/api/v1/workspaces/{wid}/projects",
        json={"name": "Empty Proj", "key": "EMP", "visibility": "workspace"},
        headers=auth_headers,
    )
    empty_pid = proj.json()["id"]
    resp = await client.get(
        f"/api/v1/workspaces/{wid}/projects/{empty_pid}/tasks",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["items"] == []


@pytest.mark.asyncio
async def test_get_task(
    client: AsyncClient, auth_headers: dict, workspace_and_project: dict
) -> None:
    wid = workspace_and_project["workspace_id"]
    pid = workspace_and_project["project_id"]

    create = await client.post(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks",
        json={"title": "Get Me Task"},
        headers=auth_headers,
    )
    task_id = create.json()["id"]
    resp = await client.get(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks/{task_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == task_id
    assert resp.json()["title"] == "Get Me Task"


@pytest.mark.asyncio
async def test_update_task_status(
    client: AsyncClient, auth_headers: dict, workspace_and_project: dict
) -> None:
    wid = workspace_and_project["workspace_id"]
    pid = workspace_and_project["project_id"]

    create = await client.post(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks",
        json={"title": "Status Task"},
        headers=auth_headers,
    )
    task_id = create.json()["id"]
    resp = await client.patch(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks/{task_id}",
        json={"status": "in_progress", "version": 1},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_update_task_priority(
    client: AsyncClient, auth_headers: dict, workspace_and_project: dict
) -> None:
    wid = workspace_and_project["workspace_id"]
    pid = workspace_and_project["project_id"]

    create = await client.post(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks",
        json={"title": "Priority Task", "priority": "high"},
        headers=auth_headers,
    )
    task_id = create.json()["id"]
    resp = await client.patch(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks/{task_id}",
        json={"priority": "low", "version": 1},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["priority"] == "low"


@pytest.mark.asyncio
async def test_delete_task(
    client: AsyncClient, auth_headers: dict, workspace_and_project: dict
) -> None:
    wid = workspace_and_project["workspace_id"]
    pid = workspace_and_project["project_id"]

    create = await client.post(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks",
        json={"title": "Delete Me"},
        headers=auth_headers,
    )
    task_id = create.json()["id"]
    resp = await client.delete(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks/{task_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200

    # Confirm it's gone
    get_resp = await client.get(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks/{task_id}",
        headers=auth_headers,
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_task_not_found(
    client: AsyncClient, auth_headers: dict, workspace_and_project: dict
) -> None:
    wid = workspace_and_project["workspace_id"]
    pid = workspace_and_project["project_id"]

    resp = await client.delete(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks/{uuid.uuid4()}",
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_task_missing_title(
    client: AsyncClient, auth_headers: dict, workspace_and_project: dict
) -> None:
    wid = workspace_and_project["workspace_id"]
    pid = workspace_and_project["project_id"]

    resp = await client.post(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks",
        json={"status": "todo"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_task_unauthenticated(
    client: AsyncClient, workspace_and_project: dict
) -> None:
    wid = workspace_and_project["workspace_id"]
    pid = workspace_and_project["project_id"]

    resp = await client.post(
        f"/api/v1/workspaces/{wid}/projects/{pid}/tasks",
        json={"title": "No Auth Task"},
    )
    assert resp.status_code == 401
