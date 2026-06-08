import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { phasesApi, type PhaseCreatePayload } from "./api";

export const usePhases = (workspaceId: string, projectId: string) =>
  useQuery({
    queryKey: ["phases", workspaceId, projectId],
    queryFn: () => phasesApi.list(workspaceId, projectId),
    enabled: !!workspaceId && !!projectId,
  });

export const useCreatePhase = (workspaceId: string, projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PhaseCreatePayload) => phasesApi.create(workspaceId, projectId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["phases", workspaceId, projectId] }),
  });
};

export const useUpdatePhase = (workspaceId: string, projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phaseId, payload }: { phaseId: string; payload: Partial<PhaseCreatePayload> }) =>
      phasesApi.update(workspaceId, projectId, phaseId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["phases", workspaceId, projectId] }),
  });
};

export const useDeletePhase = (workspaceId: string, projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (phaseId: string) => phasesApi.delete(workspaceId, projectId, phaseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["phases", workspaceId, projectId] }),
  });
};
