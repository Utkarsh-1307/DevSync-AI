import api from "@/lib/api";
import { type Project } from "@/types";

export const projectsApi = {
  list: (workspaceId: string) =>
    api.get<Project[]>(`/workspaces/${workspaceId}/projects`).then((r) => r.data),

  create: (workspaceId: string, data: { name: string; key: string; description?: string; visibility?: string; color?: string }) =>
    api.post<Project>(`/workspaces/${workspaceId}/projects`, data).then((r) => r.data),

  get: (workspaceId: string, projectId: string) =>
    api.get<Project>(`/workspaces/${workspaceId}/projects/${projectId}`).then((r) => r.data),

  update: (workspaceId: string, projectId: string, data: Partial<Project>) =>
    api.patch<Project>(`/workspaces/${workspaceId}/projects/${projectId}`, data).then((r) => r.data),

  archive: (workspaceId: string, projectId: string) =>
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}`).then((r) => r.data),
};
