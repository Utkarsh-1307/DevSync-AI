import api from "@/lib/api";
import { type PaginatedResponse, type Task, type TaskComment } from "@/types";

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  due_date?: string;
  estimated_hours?: number;
  labels?: string[];
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {
  version: number;
}

export const tasksApi = {
  list: (workspaceId: string, projectId: string, params?: Record<string, string>) =>
    api
      .get<PaginatedResponse<Task>>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, { params })
      .then((r) => r.data),

  get: (workspaceId: string, projectId: string, taskId: string) =>
    api
      .get<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`)
      .then((r) => r.data),

  create: (workspaceId: string, projectId: string, data: CreateTaskPayload) =>
    api
      .post<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, data)
      .then((r) => r.data),

  update: (workspaceId: string, projectId: string, taskId: string, data: UpdateTaskPayload) =>
    api
      .patch<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, data)
      .then((r) => r.data),

  delete: (workspaceId: string, projectId: string, taskId: string) =>
    api
      .delete(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`)
      .then((r) => r.data),

  getComments: (workspaceId: string, projectId: string, taskId: string) =>
    api
      .get<TaskComment[]>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`)
      .then((r) => r.data),

  addComment: (workspaceId: string, projectId: string, taskId: string, content: string) =>
    api
      .post<TaskComment>(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
        { content }
      )
      .then((r) => r.data),
};
