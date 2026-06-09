import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "./api";

export const useDashboard = (workspaceId: string) =>
  useQuery({
    queryKey: ["dashboard", workspaceId],
    queryFn: () => dashboardApi.get(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
