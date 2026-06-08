import { useState, useRef, useEffect, Fragment } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, X } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { aiApi } from "./api";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { clsx } from "clsx";

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <span className="whitespace-pre-wrap">
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
        const rendered = parts.map((part, pi) => {
          if (part.startsWith("**") && part.endsWith("**"))
            return <strong key={pi}>{part.slice(2, -2)}</strong>;
          if (part.startsWith("*") && part.endsWith("*"))
            return <em key={pi}>{part.slice(1, -1)}</em>;
          return <Fragment key={pi}>{part}</Fragment>;
        });
        return (
          <Fragment key={li}>
            {li > 0 && <br />}
            {rendered}
          </Fragment>
        );
      })}
    </span>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIChatPanelProps {
  onClose: () => void;
}

export function AIChatPanel({ onClose }: AIChatPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const workspace = useWorkspaceStore((s) => s.activeWorkspace);

  const chat = useMutation({
    mutationFn: (question: string) =>
      aiApi.chat(workspace!.id, question, messages, workspace?.name),
    onSuccess: (result) => {
      setMessages((prev) => [...prev, { role: "assistant", content: result }]);
    },
  });

  const send = () => {
    const q = input.trim();
    if (!q || chat.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    chat.mutate(q);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chat.isPending]);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col z-50"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <Bot className="h-5 w-5 text-brand-600" />
        <span className="font-semibold text-gray-900 dark:text-gray-100">DevSync AI</span>
        <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm pt-8">
            <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Ask me anything about your workspace, tasks, or projects.</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx(
                "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
                msg.role === "user"
                  ? "ml-auto bg-brand-600 text-white rounded-br-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
              )}
            >
              <MarkdownText text={msg.content} />
            </motion.div>
          ))}
        </AnimatePresence>
        {chat.isPending && (
          <div className="flex gap-1 px-4 py-2">
            {[0, 0.1, 0.2].map((delay, i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1, delay }}
                className="h-2 w-2 rounded-full bg-brand-400"
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask DevSync AI..."
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button size="sm" onClick={send} loading={chat.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
