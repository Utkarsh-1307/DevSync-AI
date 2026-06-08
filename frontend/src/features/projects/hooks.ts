import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "./api";

export const projectKeys = {
  list: (wid: string) => ["projects", wid] as const,
  detail: (wid: string, pid: string) => ["projects", wid, pid] as const,
};

export function useProjects(workspaceId: string) {
  return useQuery({
    queryKey: projectKeys.list(workspaceId),
    queryFn: () => projectsApi.list(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateProject(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; key: string; description?: string }) =>
      projectsApi.create(workspaceId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.list(workspaceId) }),
  });
}
