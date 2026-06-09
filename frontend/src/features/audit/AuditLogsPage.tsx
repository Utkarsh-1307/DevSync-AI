import { useState } from "react";
import { Shield, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useAuditLogs } from "./hooks";
import { format } from "date-fns";

interface Props { workspaceId: string; }

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "auth.login":         { label: "Login",            color: "text-green-400 bg-green-900/30" },
  "auth.login_failed":  { label: "Login Failed",     color: "text-red-400 bg-red-900/30" },
  "auth.register":      { label: "Register",         color: "text-blue-400 bg-blue-900/30" },
  "auth.token_refresh": { label: "Token Refresh",    color: "text-gray-400 bg-gray-800" },
  "task.created":       { label: "Task Created",     color: "text-brand-400 bg-brand-900/30" },
  "task.updated":       { label: "Task Updated",     color: "text-yellow-400 bg-yellow-900/30" },
  "task.deleted":       { label: "Task Deleted",     color: "text-red-400 bg-red-900/30" },
  "project.created":    { label: "Project Created",  color: "text-brand-400 bg-brand-900/30" },
  "project.updated":    { label: "Project Updated",  color: "text-yellow-400 bg-yellow-900/30" },
  "project.deleted":    { label: "Project Deleted",  color: "text-red-400 bg-red-900/30" },
  "workspace.created":  { label: "Workspace Created",color: "text-brand-400 bg-brand-900/30" },
  "workspace.deleted":  { label: "Workspace Deleted",color: "text-red-400 bg-red-900/30" },
};

const ACTION_OPTIONS = [
  "auth.login", "auth.login_failed", "auth.register",
  "task.created", "task.updated", "task.deleted",
  "project.created", "project.updated", "project.deleted",
  "workspace.created", "workspace.deleted",
];

export default function AuditLogsPage({ workspaceId }: Props) {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading } = useAuditLogs(workspaceId, {
    page,
    page_size: 25,
    action: action || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  });

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-brand-400" />
          <div>
            <h1 className="font-semibold text-gray-100 text-lg">Audit Logs</h1>
            <p className="text-xs text-gray-500 mt-0.5">Immutable record of all significant actions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            aria-label="Filter by action"
            title="Filter by action"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            aria-label="From date"
            title="From date"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-brand-500"
          />
          <span className="text-gray-600 text-xs">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            aria-label="To date"
            title="To date"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-brand-500"
          />
          {(action || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => { setAction(""); setFromDate(""); setToDate(""); setPage(1); }}
              className="text-xs text-gray-500 hover:text-gray-300 underline"
            >
              Clear filters
            </button>
          )}
          {data && (
            <span className="ml-auto text-xs text-gray-500">{data.total} events</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-600">
            <Shield className="h-16 w-16 opacity-20" />
            <p className="text-sm">No audit events found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">IP Address</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Request ID</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {data.items.map((log) => {
                const meta = ACTION_LABELS[log.action];
                return (
                  <tr key={log.id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${meta?.color ?? "text-gray-400 bg-gray-800"}`}>
                        {meta?.label ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[160px]">
                      {log.user_id ? log.user_id.slice(0, 8) + "…" : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {log.entity_type ? (
                        <span>
                          <span className="text-gray-300">{log.entity_type}</span>
                          {log.entity_id && <span className="text-gray-600 font-mono"> /{log.entity_id.slice(0, 8)}…</span>}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">
                      {log.ip_address ?? <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs hidden lg:table-cell truncate max-w-[120px]">
                      {log.request_id ? log.request_id.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs text-right whitespace-nowrap">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 25 && (
        <div className="flex-shrink-0 px-6 py-3 border-t border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Page {data.page} of {Math.ceil(data.total / data.page_size)}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={!data.has_prev}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.has_next}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
