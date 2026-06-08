import api from "@/lib/api";
import { type Notification, type PaginatedResponse } from "@/types";

export const notificationsApi = {
  list: (workspaceId: string, params?: { unread_only?: boolean; page?: number }) =>
    api
      .get<PaginatedResponse<Notification>>(`/workspaces/${workspaceId}/notifications`, { params })
      .then((r) => r.data),

  unreadCount: (workspaceId: string) =>
    api
      .get<{ unread_count: number }>(`/workspaces/${workspaceId}/notifications/unread-count`)
      .then((r) => r.data),

  markRead: (workspaceId: string, ids: string[]) =>
    api
      .post(`/workspaces/${workspaceId}/notifications/mark-read`, { notification_ids: ids })
      .then((r) => r.data),

  markAllRead: (workspaceId: string) =>
    api
      .post(`/workspaces/${workspaceId}/notifications/mark-all-read`)
      .then((r) => r.data),
};
