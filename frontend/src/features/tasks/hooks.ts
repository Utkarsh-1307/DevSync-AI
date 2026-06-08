import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi, type CreateTaskPayload, type UpdateTaskPayload } from "./api";

export const taskKeys = {
  list: (wid: string, pid: string) => ["tasks", wid, pid] as const,
  detail: (wid: string, pid: string, tid: string) => ["tasks", wid, pid, tid] as const,
  comments: (wid: string, pid: string, tid: string) => ["task-comments", wid, pid, tid] as const,
};

export function useTasks(workspaceId: string, projectId: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: [...taskKeys.list(workspaceId, projectId), params],
    queryFn: () => tasksApi.list(workspaceId, projectId, params),
    enabled: !!workspaceId && !!projectId,
  });
}

export function useTask(workspaceId: string, projectId: string, taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(workspaceId, projectId, taskId),
    queryFn: () => tasksApi.get(workspaceId, projectId, taskId),
    enabled: !!taskId,
  });
}

export function useCreateTask(workspaceId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskPayload) => tasksApi.create(workspaceId, projectId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.list(workspaceId, projectId) }),
  });
}

export function useUpdateTask(workspaceId: string, projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTaskPayload) => tasksApi.update(workspaceId, projectId, taskId, data),
    onSuccess: (updated) => {
      qc.setQueryData(taskKeys.detail(workspaceId, projectId, taskId), updated);
      qc.invalidateQueries({ queryKey: taskKeys.list(workspaceId, projectId) });
    },
  });
}

export function useDeleteTask(workspaceId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksApi.delete(workspaceId, projectId, taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.list(workspaceId, projectId) }),
  });
}

export function useTaskComments(workspaceId: string, projectId: string, taskId: string) {
  return useQuery({
    queryKey: taskKeys.comments(workspaceId, projectId, taskId),
    queryFn: () => tasksApi.getComments(workspaceId, projectId, taskId),
    enabled: !!taskId,
  });
}

export function useAddComment(workspaceId: string, projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => tasksApi.addComment(workspaceId, projectId, taskId, content),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: taskKeys.comments(workspaceId, projectId, taskId) }),
  });
}
