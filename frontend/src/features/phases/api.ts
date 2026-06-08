import api from "@/lib/api";
import type { Phase } from "@/types";

export interface PhaseCreatePayload {
  name: string;
  description?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export const phasesApi = {
  list: (workspaceId: string, projectId: string) =>
    api.get<Phase[]>(`/workspaces/${workspaceId}/projects/${projectId}/phases`).then((r) => r.data),

  create: (workspaceId: string, projectId: string, payload: PhaseCreatePayload) =>
    api.post<Phase>(`/workspaces/${workspaceId}/projects/${projectId}/phases`, payload).then((r) => r.data),

  update: (workspaceId: string, projectId: string, phaseId: string, payload: Partial<PhaseCreatePayload>) =>
    api.patch<Phase>(`/workspaces/${workspaceId}/projects/${projectId}/phases/${phaseId}`, payload).then((r) => r.data),

  delete: (workspaceId: string, projectId: string, phaseId: string) =>
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}/phases/${phaseId}`),

  assignTask: (workspaceId: string, projectId: string, phaseId: string, taskId: string) =>
    api.post(`/workspaces/${workspaceId}/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`),

  removeTask: (workspaceId: string, projectId: string, phaseId: string, taskId: string) =>
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`),
};
