import { useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import type { IssueStatus, IssuePriority } from "@/types";
import { useProjects } from "@/features/projects/hooks";
import { useIssues, useCreateIssue, useDeleteIssue, useUpdateIssue } from "./hooks";

interface Props {
  workspaceId: string;
}

const STATUS_COLORS: Record<IssueStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const STATUSES: IssueStatus[] = ["open", "in_progress", "resolved", "closed"];
const PRIORITIES: IssuePriority[] = ["critical", "high", "medium", "low"];

export default function IssuesPage({ workspaceId }: Props) {
  const { data: projects = [] } = useProjects(workspaceId);
  const [selectedProject, setSelectedProject] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", priority: "medium" as IssuePriority });

  const projectId = selectedProject || projects[0]?.id || "";
  const filters: Record<string, string> = {};
  if (statusFilter) filters.status = statusFilter;
  if (priorityFilter) filters.priority = priorityFilter;

  const { data: issues = [], isLoading } = useIssues(workspaceId, projectId, filters);
  const createIssue = useCreateIssue(workspaceId, projectId);
  const deleteIssue = useDeleteIssue(workspaceId, projectId);
  const updateIssue = useUpdateIssue(workspaceId, projectId);

  const handleCreate = () => {
    if (!form.title.trim() || !projectId) return;
    createIssue.mutate({ title: form.title, priority: form.priority }, {
      onSuccess: () => { setShowForm(false); setForm({ title: "", priority: "medium" }); },
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-semibold">Issues</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Issue
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* New Issue Form */}
      {showForm && (
        <div className="mx-6 mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">New Issue</span>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            autoFocus
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Issue title..."
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-brand-500 mb-3"
          />
          <div className="flex items-center gap-3">
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as IssuePriority }))}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none"
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button
              onClick={handleCreate}
              disabled={createIssue.isPending}
              className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {createIssue.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Issues Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <AlertCircle className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">No issues found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-2 font-medium">Title</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-left py-2 font-medium">Priority</th>
                <th className="text-left py-2 font-medium">Assignee</th>
                <th className="text-left py-2 font-medium">Due</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 group">
                  <td className="py-3 pr-4 text-gray-100 font-medium max-w-xs truncate">{issue.title}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={issue.status}
                      onChange={(e) =>
                        updateIssue.mutate({ issueId: issue.id, payload: { status: e.target.value as IssueStatus } })
                      }
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 ${STATUS_COLORS[issue.status]} bg-opacity-20 focus:outline-none cursor-pointer`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[issue.priority]}`}>
                      {issue.priority}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">
                    {issue.assignee?.full_name ?? <span className="text-gray-600">Unassigned</span>}
                  </td>
                  <td className="py-3 pr-4 text-gray-400">
                    {issue.due_date ? new Date(issue.due_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => deleteIssue.mutate(issue.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
