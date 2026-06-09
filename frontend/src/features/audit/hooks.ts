import { useQuery } from "@tanstack/react-query";
import { auditApi, type AuditLogsParams } from "./api";

export function useAuditLogs(workspaceId: string, params?: AuditLogsParams) {
  return useQuery({
    queryKey: ["audit-logs", workspaceId, params],
    queryFn: () => auditApi.list(workspaceId, params),
    enabled: !!workspaceId,
  });
}
