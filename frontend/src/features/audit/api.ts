import api from "@/lib/api";

export interface AuditLogEntry {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  request_id: string | null;
  created_at: string;
}

export interface AuditLogsParams {
  action?: string;
  entity_type?: string;
  user_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedAuditLogs {
  items: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

export const auditApi = {
  list: (workspaceId: string, params?: AuditLogsParams): Promise<PaginatedAuditLogs> =>
    api.get<PaginatedAuditLogs>(`/workspaces/${workspaceId}/audit-logs`, { params }).then((r) => r.data),
};
