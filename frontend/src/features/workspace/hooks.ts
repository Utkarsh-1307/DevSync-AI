import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceApi } from "./api";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export const workspaceKeys = {
  all: ["workspaces"] as const,
  detail: (id: string) => ["workspaces", id] as const,
  members: (id: string) => ["workspaces", id, "members"] as const,
};

export function useWorkspaces() {
  const { setWorkspaces } = useWorkspaceStore();
  return useQuery({
    queryKey: workspaceKeys.all,
    queryFn: async () => {
      const data = await workspaceApi.list();
      setWorkspaces(data);
      return data;
    },
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  const { setActiveWorkspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: workspaceApi.create,
    onSuccess: (workspace) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.all });
      setActiveWorkspace(workspace);
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  const { clearWorkspace } = useWorkspaceStore();
  return useMutation({
    mutationFn: workspaceApi.delete,
    onSuccess: () => {
      clearWorkspace();
      qc.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => workspaceApi.getMembers(workspaceId),
    enabled: !!workspaceId,
  });
}
