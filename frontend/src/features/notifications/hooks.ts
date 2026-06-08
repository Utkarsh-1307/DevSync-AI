import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "./api";
import { socket } from "@/lib/socket";

export const notifKeys = {
  list: (wid: string) => ["notifications", wid] as const,
  unread: (wid: string) => ["notifications", wid, "unread"] as const,
};

export function useNotifications(workspaceId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    const unsub = socket.on("notification.new", (data) => {
      const notif = data as { workspace_id: string };
      if (notif.workspace_id === workspaceId) {
        // Immediately refetch the list and unread count
        qc.invalidateQueries({ queryKey: notifKeys.list(workspaceId) });
        qc.invalidateQueries({ queryKey: notifKeys.unread(workspaceId) });
      }
    });
    return unsub;
  }, [workspaceId, qc]);

  return useQuery({
    queryKey: notifKeys.list(workspaceId),
    queryFn: () => notificationsApi.list(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
}

export function useUnreadCount(workspaceId: string) {
  return useQuery({
    queryKey: notifKeys.unread(workspaceId),
    queryFn: () => notificationsApi.unreadCount(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 15000,
  });
}

export function useMarkAllRead(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(workspaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.list(workspaceId) });
      qc.invalidateQueries({ queryKey: notifKeys.unread(workspaceId) });
    },
  });
}
