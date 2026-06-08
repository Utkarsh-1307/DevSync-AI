import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { timeLogsApi, type TimeLogCreatePayload } from "./api";

export const useTimeLogs = (workspaceId: string, projectId: string, taskId: string) =>
  useQuery({
    queryKey: ["time-logs", workspaceId, projectId, taskId],
    queryFn: () => timeLogsApi.list(workspaceId, projectId, taskId),
    enabled: !!workspaceId && !!projectId && !!taskId,
  });

export const useLogTime = (workspaceId: string, projectId: string, taskId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TimeLogCreatePayload) =>
      timeLogsApi.create(workspaceId, projectId, taskId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["time-logs", workspaceId] }),
  });
};

export const useDeleteTimeLog = (workspaceId: string, projectId: string, taskId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => timeLogsApi.delete(workspaceId, projectId, taskId, logId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["time-logs", workspaceId] }),
  });
};
