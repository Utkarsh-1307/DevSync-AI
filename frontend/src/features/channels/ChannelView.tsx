import { useState, useRef, useEffect } from "react";
import { Send, Hash, Lock, MessageCircle, Paperclip, X, Download, Users, UserMinus, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { useMessages, useSendMessage, useChannelMembers, useRemoveChannelMember, useWorkspaceMembers, useRemoveWorkspaceMember } from "./hooks";
import { channelsApi } from "./api";
import { type Channel, type MessageAttachment } from "@/types";
import { useAuthStore } from "@/stores/authStore";

interface ChannelViewProps {
  channel: Channel;
  workspaceId: string;
}

// ─── Attachment thumbnail/link ─────────────────────────────────────────────

function AttachmentItem({ att }: { att: MessageAttachment }) {
  const isImage = att.content_type.startsWith("image/");
  const sizeLabel = att.file_size > 1024 * 1024
    ? `${(att.file_size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(att.file_size / 1024)} KB`;

  if (isImage) {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img
          src={att.url}
          alt={att.filename}
          className="max-w-xs max-h-64 rounded-lg border border-gray-200 dark:border-gray-700 object-cover hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }

  return (
    <a
      href={att.url}
      download={att.filename}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors max-w-xs"
    >
      <Download className="h-4 w-4 text-brand-500 flex-shrink-0" />
      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{att.filename}</span>
      <span className="text-xs text-gray-400 flex-shrink-0">{sizeLabel}</span>
    </a>
  );
}

// ─── Admin member panel ────────────────────────────────────────────────────

function MemberPanel({
  workspaceId,
  channelId,
  currentUserId,
  currentUserRole,
  onClose,
}: {
  workspaceId: string;
  channelId: string;
  currentUserId: string;
  currentUserRole: "owner" | "admin" | "member" | "guest";
  onClose: () => void;
}) {
  const { data: channelMembers = [] } = useChannelMembers(workspaceId, channelId);
  const { data: wsMembers = [] } = useWorkspaceMembers(workspaceId);
  const removeFromChannel = useRemoveChannelMember(workspaceId, channelId);
  const removeFromWorkspace = useRemoveWorkspaceMember(workspaceId);
  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin";

  // Map workspace roles by user id
  const roleMap = new Map(wsMembers.map((m) => [m.user.id, m.role]));

  return (
    <div className="w-64 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Users className="h-4 w-4" /> Members ({channelMembers.length})
        </span>
        <button type="button" title="Close member panel" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {channelMembers.map((member) => {
          const wsRole = roleMap.get(member.id) ?? "member";
          const isSelf = member.id === currentUserId;
          const isOwner = wsRole === "owner";
          const canAct = isAdmin && !isSelf && !isOwner;
          return (
            <div
              key={member.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 group"
            >
              <Avatar user={member} size="xs" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{member.full_name}</p>
                <p className="text-xs text-gray-400 capitalize">{wsRole}</p>
              </div>
              {canAct && (
                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => removeFromChannel.mutate(member.id)}
                    title="Remove from channel"
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {currentUserRole === "owner" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove ${member.full_name} from workspace?`)) {
                          removeFromWorkspace.mutate(member.id);
                        }
                      }}
                      title="Remove from workspace"
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <UserMinus className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ChannelView ─────────────────────────────────────────────────────

export function ChannelView({ channel, workspaceId }: ChannelViewProps) {
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], isLoading } = useMessages(workspaceId, channel.id);
  const sendMessage = useSendMessage(workspaceId, channel.id);

  const user = useAuthStore((s) => s.user);
  const { data: wsMembers = [] } = useWorkspaceMembers(workspaceId);
  const currentMembership = wsMembers.find((m) => m.user.id === user?.id);
  const currentUserRole = currentMembership?.role ?? "member";
  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(
        files.map((f) => channelsApi.uploadAttachment(workspaceId, channel.id, f))
      );
      const newAtts: MessageAttachment[] = results.map((r) => ({
        url: r.file_url,
        filename: r.filename,
        content_type: r.content_type,
        file_size: r.file_size,
      }));
      setPendingAttachments((prev) => [...prev, ...newAtts]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const send = () => {
    const content = input.trim();
    if ((!content && pendingAttachments.length === 0) || sendMessage.isPending) return;
    setInput("");
    setPendingAttachments([]);
    sendMessage.mutate({ content, attachments: pendingAttachments });
  };

  const isDM = channel.channel_type === "direct";
  const Icon = isDM ? MessageCircle : channel.channel_type === "private" ? Lock : Hash;

  // For DMs, figure out the other person's name
  const dmOtherUser = isDM
    ? channel.members?.find((m) => m.id !== user?.id)
    : null;
  const displayName = isDM && dmOtherUser ? dmOtherUser.full_name : channel.name;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        {isDM && dmOtherUser ? (
          <Avatar user={dmOtherUser} size="sm" />
        ) : (
          <Icon className="h-5 w-5 text-gray-400" />
        )}
        <span className="font-semibold text-gray-900 dark:text-gray-100">{displayName}</span>
        {channel.description && !isDM && (
          <span className="text-sm text-gray-400 ml-2">— {channel.description}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {isAdmin && !isDM && (
            <button
              type="button"
              onClick={() => setShowMembers((s) => !s)}
              title="Manage members"
              aria-label="Manage members"
              className={`p-1.5 rounded-md transition-colors ${showMembers ? "bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            >
              <ShieldAlert className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowMembers((s) => !s)}
            title="Members"
            aria-label="Members"
            className={`p-1.5 rounded-md transition-colors ${showMembers && !isAdmin ? "bg-brand-100 text-brand-600" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
          >
            <Users className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Messages area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 group"
                >
                  <Avatar user={msg.author} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {msg.author.full_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(msg.created_at), "h:mm a")}
                      </span>
                      {msg.is_edited && <span className="text-xs text-gray-400">(edited)</span>}
                    </div>
                    {msg.content && !msg.is_deleted && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed break-words">
                        {msg.content}
                      </p>
                    )}
                    {msg.is_deleted && (
                      <p className="text-sm italic text-gray-400 mt-0.5">Message deleted</p>
                    )}
                    {/* Attachments */}
                    {msg.attachments?.length > 0 && !msg.is_deleted && (
                      <div className="flex flex-col gap-1">
                        {msg.attachments.map((att, i) => (
                          <AttachmentItem key={i} att={att} />
                        ))}
                      </div>
                    )}
                    {msg.reactions.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {msg.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            {r.emoji} {r.count}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={endRef} />
          </div>

          {/* Input area */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            {/* Pending attachments preview */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {pendingAttachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1 text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  >
                    {att.content_type.startsWith("image/") ? (
                      <img src={att.url} alt={att.filename} className="h-6 w-6 object-cover rounded" />
                    ) : (
                      <Paperclip className="h-3 w-3 text-brand-500" />
                    )}
                    <span className="truncate max-w-[120px]">{att.filename}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${att.filename}`}
                      onClick={() => setPendingAttachments((prev) => prev.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 items-center rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 focus-within:ring-2 focus-within:ring-brand-500">
              {/* File picker button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                aria-label="Attach files"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Attach file"
                className="text-gray-400 hover:text-brand-500 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <div className="h-4 w-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </button>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder={isDM ? `Message ${displayName}` : `Message #${channel.name}`}
                className="flex-1 text-sm bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={send}
                loading={sendMessage.isPending}
                disabled={!input.trim() && pendingAttachments.length === 0}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Member panel */}
        {showMembers && user && (
          <MemberPanel
            workspaceId={workspaceId}
            channelId={channel.id}
            currentUserId={user.id}
            currentUserRole={currentUserRole as any}
            onClose={() => setShowMembers(false)}
          />
        )}
      </div>
    </div>
  );
}
