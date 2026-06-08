import { useState, useEffect, useRef } from "react";
import { Search, FileText, MessageSquare, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface TaskResult  { id: string; title: string; status: string; priority: string; project_id: string }
interface MsgResult   { id: string; content: string; channel_id: string; created_at: string }
interface SearchResp  { tasks: TaskResult[]; messages: MsgResult[]; query: string }

interface Props {
  workspaceId: string;
}

export function SearchBar({ workspaceId }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  // Debounced search — only fire when ≥ 2 chars
  const debouncedQ = useDebounce(query.trim(), 300);

  const { data, isFetching } = useQuery<SearchResp>({
    queryKey: ["search", workspaceId, debouncedQ],
    queryFn: () =>
      api
        .get(`/workspaces/${workspaceId}/search`, { params: { q: debouncedQ, limit: 8 } })
        .then((r) => r.data),
    enabled: debouncedQ.length >= 2,
    staleTime: 10_000,
  });

  const hasResults = data && (data.tasks.length > 0 || data.messages.length > 0);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-64">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus-within:border-brand-500 transition-colors">
        <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search tasks & messages…"
          className="flex-1 text-sm bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 min-w-0"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }}>
            <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {open && debouncedQ.length >= 2 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden max-h-80 overflow-y-auto">
          {isFetching && (
            <p className="px-4 py-3 text-xs text-gray-400 animate-pulse">Searching…</p>
          )}
          {!isFetching && !hasResults && (
            <p className="px-4 py-3 text-xs text-gray-400">No results for "{debouncedQ}"</p>
          )}

          {data?.tasks && data.tasks.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tasks</p>
              {data.tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    navigate(`/w/${workspaceId}/projects/${t.project_id}`);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />
                  <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{t.title}</span>
                  <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{t.status.replace("_", " ")}</span>
                </button>
              ))}
            </div>
          )}

          {data?.messages && data.messages.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Messages</p>
              {data.messages.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    navigate(`/w/${workspaceId}/c/${m.channel_id}`);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{m.content}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
