import api from "@/lib/api";
import type { Issue } from "@/types";

export interface IssueCreatePayload {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  due_date?: string;
}

export interface IssueUpdatePayload extends Partial<IssueCreatePayload> {}

export const issuesApi = {
  list: (workspaceId: string, projectId: string, params?: Record<string, string>) =>
    api
      .get<Issue[]>(`/workspaces/${workspaceId}/projects/${projectId}/issues`, { params })
      .then((r) => r.data),

  create: (workspaceId: string, projectId: string, payload: IssueCreatePayload) =>
    api
      .post<Issue>(`/workspaces/${workspaceId}/projects/${projectId}/issues`, payload)
      .then((r) => r.data),

  update: (workspaceId: string, projectId: string, issueId: string, payload: IssueUpdatePayload) =>
    api
      .patch<Issue>(`/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`, payload)
      .then((r) => r.data),

  delete: (workspaceId: string, projectId: string, issueId: string) =>
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`),
};
