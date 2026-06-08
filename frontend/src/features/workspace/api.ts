import api from "@/lib/api";
import { type Workspace } from "@/types";

export const workspaceApi = {
  list: () => api.get<Workspace[]>("/workspaces").then((r) => r.data),

  create: (data: { name: string; slug: string; description?: string }) =>
    api.post<Workspace>("/workspaces", data).then((r) => r.data),

  get: (id: string) => api.get<Workspace>(`/workspaces/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<Workspace>) =>
    api.patch<Workspace>(`/workspaces/${id}`, data).then((r) => r.data),

  inviteMember: (id: string, email: string, role: string) =>
    api.post(`/workspaces/${id}/members`, { email, role }).then((r) => r.data),

  getMembers: (id: string) =>
    api.get(`/workspaces/${id}/members`).then((r) => r.data),
};
