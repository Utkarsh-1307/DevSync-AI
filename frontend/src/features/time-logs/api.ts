import api from "@/lib/api";
import type { TimeLog, TimesheetEntry } from "@/types";

export interface TimeLogCreatePayload {
  hours: number;
  description?: string;
  logged_date: string;
}

export const timeLogsApi = {
  list: (workspaceId: string, projectId: string, taskId: string) =>
    api
      .get<TimeLog[]>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/time-logs`)
      .then((r) => r.data),

  create: (workspaceId: string, projectId: string, taskId: string, payload: TimeLogCreatePayload) =>
    api
      .post<TimeLog>(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/time-logs`,
        payload
      )
      .then((r) => r.data),

  delete: (workspaceId: string, projectId: string, taskId: string, logId: string) =>
    api.delete(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/time-logs/${logId}`),
};

export const timesheetsApi = {
  get: (workspaceId: string, weekStart?: string) =>
    api
      .get<TimesheetEntry[]>(`/workspaces/${workspaceId}/timesheets`, {
        params: weekStart ? { week_start: weekStart } : undefined,
      })
      .then((r) => r.data),
};
