import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Download, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useChannels, useCreateChannel, useMessages, useSendMessage } from "@/features/channels/hooks";
import { channelsApi } from "@/features/channels/api";
import { useAuthStore } from "@/stores/authStore";
import { Avatar } from "@/shared/components/ui/Avatar";
import type { MessageAttachment } from "@/types";

interface Props {
  workspaceId: string;
}

function AttachmentPreview({ att, onRemove }: { att: MessageAttachment; onRemove: () => void }) {
  const isImage = att.content_type.startsWith("image/");
  return (
    <div className="relative inline-flex items-center gap-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-300">
      {isImage ? (
        <img src={att.url} alt={att.filename} className="h-8 w-8 rounded object-cover" />
      ) : (
        <Download className="h-4 w-4 text-brand-400 flex-shrink-0" />
      )}
      <span className="max-w-[120px] truncate">{att.filename}</span>
      <button type="button" onClick={onRemove} aria-label="Remove attachment" className="text-gray-500 hover:text-red-400">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function HomeChatPanel({ workspaceId }: Props) {
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);

  const { data: channels = [], isLoading: channelsLoading } = useChannels(workspaceId);
  const createChannel = useCreateChannel(workspaceId);

  // Find or lazily create a #general channel
  const generalChannel = channels.find((c) => c.name === "general" && c.channel_type === "public");
  const [generalId, setGeneralId] = useState<string | null>(null);

  useEffect(() => {
    if (generalChannel) {
      setGeneralId(generalChannel.id);
      return;
    }
    if (channelsLoading) return;
    // Auto-create #general once channels loaded and it doesn't exist
    createChannel.mutateAsync({ name: "general", description: "General workspace chat", channel_type: "public" })
      .then((ch) => setGeneralId(ch.id))
      .catch(() => {/* already exists race — refetch will surface it */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generalChannel?.id, channelsLoading]);

  const { data: messages = [], isLoading: msgsLoading } = useMessages(workspaceId, generalId ?? "");
  const sendMessage = useSendMessage(workspaceId, generalId ?? "");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!generalId) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map((f) => channelsApi.uploadAttachment(workspaceId, generalId, f))
      );
      setPendingAttachments((prev) => [
        ...prev,
        ...uploaded.map((u) => ({
          id: u.id,
          filename: u.filename,
          url: u.file_url,
          content_type: u.content_type,
          file_size: u.file_size,
        })),
      ]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSend() {
    if (!generalId) return;
    const text = input.trim();
    if (!text && pendingAttachments.length === 0) return;
    setInput("");
    setPendingAttachments([]);
    await sendMessage.mutateAsync({ content: text, attachments: pendingAttachments });
  }

  if (!generalId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
        <MessageSquare className="h-10 w-10 opacity-30" />
        <p className="text-sm">Setting up general chat…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {msgsLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-600">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender?.id === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isMine ? "flex-row-reverse" : ""}`}>
                {msg.sender && <Avatar user={msg.sender} size="sm" />}
                <div className={`flex flex-col gap-1 max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
                  <div className="flex items-baseline gap-1.5">
                    {!isMine && <span className="text-xs font-medium text-gray-300">{msg.sender?.full_name}</span>}
                    <span className="text-xs text-gray-600">{format(new Date(msg.created_at), "HH:mm")}</span>
                  </div>
                  {msg.content && (
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? "bg-brand-600 text-white rounded-tr-sm"
                        : "bg-gray-800 text-gray-200 rounded-tl-sm"
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  {msg.attachments?.map((att) => {
                    const isImage = att.content_type.startsWith("image/");
                    return isImage ? (
                      <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer">
                        <img src={att.url} alt={att.filename} className="max-w-[200px] max-h-48 rounded-lg border border-gray-700 object-cover hover:opacity-90 transition-opacity" />
                      </a>
                    ) : (
                      <a key={att.id} href={att.url} download={att.filename} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors text-xs text-gray-300 max-w-[200px]">
                        <Download className="h-4 w-4 text-brand-400 flex-shrink-0" />
                        <span className="truncate">{att.filename}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Pending attachments */}
      {pendingAttachments.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {pendingAttachments.map((att, i) => (
            <AttachmentPreview
              key={att.id}
              att={att}
              onRemove={() => setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-800">
        <div className="flex items-end gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 focus-within:border-gray-600 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message #general…"
            aria-label="Message input"
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none resize-none max-h-32"
          />
          <div className="flex items-center gap-1 flex-shrink-0">
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
              title="Attach file"
              aria-label="Attach file"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {uploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              title="Send message"
              aria-label="Send message"
              onClick={handleSend}
              disabled={(!input.trim() && pendingAttachments.length === 0) || sendMessage.isPending}
              className="p-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-1 px-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
