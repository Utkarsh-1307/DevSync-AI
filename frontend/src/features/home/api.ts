import api from "@/lib/api";
import type { TaskStatus, TaskPriority, IssueStatus, IssuePriority } from "@/types";

export interface DashboardTaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  due_date: string | null;
}

export interface DashboardIssueSummary {
  id: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  project_id: string;
  due_date: string | null;
}

export interface DashboardStats {
  open_tasks: number;
  closed_tasks: number;
  open_issues: number;
  closed_issues: number;
  open_phases: number;
  closed_phases: number;
  my_tasks: DashboardTaskSummary[];
  my_issues: DashboardIssueSummary[];
}

export const dashboardApi = {
  get: (workspaceId: string) =>
    api.get<DashboardStats>(`/workspaces/${workspaceId}/dashboard`).then((r) => r.data),
};
