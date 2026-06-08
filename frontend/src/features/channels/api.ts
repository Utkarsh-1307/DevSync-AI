import api from "@/lib/api";
import { type Channel, type Message, type MessageAttachment, type UserSummary, type WorkspaceMember } from "@/types";

export const channelsApi = {
  list: (workspaceId: string) =>
    api.get<Channel[]>(`/workspaces/${workspaceId}/channels`).then((r) => r.data),

  listDMs: (workspaceId: string) =>
    api.get<Channel[]>(`/workspaces/${workspaceId}/channels/dms`).then((r) => r.data),

  create: (workspaceId: string, data: { name: string; description?: string; channel_type?: string }) =>
    api.post<Channel>(`/workspaces/${workspaceId}/channels`, data).then((r) => r.data),

  createDM: (workspaceId: string, targetUserId: string) =>
    api
      .post<Channel>(`/workspaces/${workspaceId}/channels/dm`, { target_user_id: targetUserId })
      .then((r) => r.data),

  getMessages: (workspaceId: string, channelId: string, params?: { limit?: number; before_id?: string }) =>
    api
      .get<Message[]>(`/workspaces/${workspaceId}/channels/${channelId}/messages`, { params })
      .then((r) => r.data),

  sendMessage: (workspaceId: string, channelId: string, content: string, attachments?: MessageAttachment[], threadId?: string) =>
    api
      .post<Message>(`/workspaces/${workspaceId}/channels/${channelId}/messages`, {
        content,
        thread_id: threadId,
        attachments: attachments ?? [],
      })
      .then((r) => r.data),

  uploadAttachment: (workspaceId: string, channelId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post<{ id: string; filename: string; file_url: string; content_type: string; file_size: number }>(
        `/upload/workspace/${workspaceId}/channels/${channelId}/attachment`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      .then((r) => r.data);
  },

  editMessage: (workspaceId: string, channelId: string, messageId: string, content: string) =>
    api
      .patch<Message>(`/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}`, {
        content,
      })
      .then((r) => r.data),

  deleteMessage: (workspaceId: string, channelId: string, messageId: string) =>
    api
      .delete(`/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}`)
      .then((r) => r.data),

  toggleReaction: (workspaceId: string, channelId: string, messageId: string, emoji: string) =>
    api
      .post(
        `/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/reactions`,
        { emoji }
      )
      .then((r) => r.data),

  listChannelMembers: (workspaceId: string, channelId: string) =>
    api
      .get<UserSummary[]>(`/workspaces/${workspaceId}/channels/${channelId}/members`)
      .then((r) => r.data),

  removeChannelMember: (workspaceId: string, channelId: string, userId: string) =>
    api
      .delete(`/workspaces/${workspaceId}/channels/${channelId}/members/${userId}`)
      .then((r) => r.data),

  listWorkspaceMembers: (workspaceId: string) =>
    api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`).then((r) => r.data),

  removeWorkspaceMember: (workspaceId: string, userId: string) =>
    api.delete(`/workspaces/${workspaceId}/members/${userId}`).then((r) => r.data),
};
