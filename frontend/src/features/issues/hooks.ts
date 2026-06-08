import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { issuesApi, type IssueCreatePayload, type IssueUpdatePayload } from "./api";

export const useIssues = (workspaceId: string, projectId: string, filters?: Record<string, string>) =>
  useQuery({
    queryKey: ["issues", workspaceId, projectId, filters],
    queryFn: () => issuesApi.list(workspaceId, projectId, filters),
    enabled: !!workspaceId && !!projectId,
  });

export const useCreateIssue = (workspaceId: string, projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: IssueCreatePayload) => issuesApi.create(workspaceId, projectId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues", workspaceId, projectId] }),
  });
};

export const useUpdateIssue = (workspaceId: string, projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, payload }: { issueId: string; payload: IssueUpdatePayload }) =>
      issuesApi.update(workspaceId, projectId, issueId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues", workspaceId, projectId] }),
  });
};

export const useDeleteIssue = (workspaceId: string, projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (issueId: string) => issuesApi.delete(workspaceId, projectId, issueId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues", workspaceId, projectId] }),
  });
};
