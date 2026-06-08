import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { channelsApi } from "./api";
import { type Message, type MessageAttachment } from "@/types";
import { useEffect } from "react";
import { socket } from "@/lib/socket";

export const channelKeys = {
  list: (wid: string) => ["channels", wid] as const,
  dms: (wid: string) => ["dms", wid] as const,
  messages: (wid: string, cid: string) => ["messages", wid, cid] as const,
  members: (wid: string, cid: string) => ["channel-members", wid, cid] as const,
  workspaceMembers: (wid: string) => ["workspace-members", wid] as const,
};

export function useChannels(workspaceId: string) {
  return useQuery({
    queryKey: channelKeys.list(workspaceId),
    queryFn: () => channelsApi.list(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useDMs(workspaceId: string) {
  return useQuery({
    queryKey: channelKeys.dms(workspaceId),
    queryFn: () => channelsApi.listDMs(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateDM(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => channelsApi.createDM(workspaceId, targetUserId),
    onSuccess: () => qc.invalidateQueries({ queryKey: channelKeys.dms(workspaceId) }),
  });
}

export function useMessages(workspaceId: string, channelId: string) {
  const qc = useQueryClient();
  const key = channelKeys.messages(workspaceId, channelId);

  useEffect(() => {
    if (!channelId) return;
    socket.subscribeChannel(channelId);

    const unsub = socket.on("message.new", (data) => {
      const msg = data as Message;
      if (msg.channel_id === channelId) {
        qc.setQueryData<Message[]>(key, (old = []) =>
          old.some((m) => m.id === msg.id) ? old : [...old, msg]
        );
      }
    });

    return () => {
      socket.unsubscribeChannel(channelId);
      unsub();
    };
  }, [channelId, workspaceId]);

  return useQuery({
    queryKey: key,
    queryFn: () => channelsApi.getMessages(workspaceId, channelId),
    enabled: !!channelId,
  });
}

export function useSendMessage(workspaceId: string, channelId: string) {
  const qc = useQueryClient();
  const key = channelKeys.messages(workspaceId, channelId);
  return useMutation({
    mutationFn: ({ content, attachments }: { content: string; attachments?: MessageAttachment[] }) =>
      channelsApi.sendMessage(workspaceId, channelId, content, attachments),
    onSuccess: (newMsg) => {
      qc.setQueryData<Message[]>(key, (old = []) =>
        old.some((m) => m.id === newMsg.id) ? old : [...old, newMsg]
      );
    },
  });
}

export function useCreateChannel(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; channel_type?: string }) =>
      channelsApi.create(workspaceId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: channelKeys.list(workspaceId) }),
  });
}

export function useChannelMembers(workspaceId: string, channelId: string) {
  return useQuery({
    queryKey: channelKeys.members(workspaceId, channelId),
    queryFn: () => channelsApi.listChannelMembers(workspaceId, channelId),
    enabled: !!channelId,
  });
}

export function useRemoveChannelMember(workspaceId: string, channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => channelsApi.removeChannelMember(workspaceId, channelId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: channelKeys.members(workspaceId, channelId) }),
  });
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: channelKeys.workspaceMembers(workspaceId),
    queryFn: () => channelsApi.listWorkspaceMembers(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => channelsApi.removeWorkspaceMember(workspaceId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: channelKeys.workspaceMembers(workspaceId) });
    },
  });
}
