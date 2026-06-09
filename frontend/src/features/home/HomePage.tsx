import { Plus, MoreHorizontal, ChevronDown, ClipboardList, AlertCircle } from "lucide-react";
import { useDashboard } from "./hooks";
import type { DashboardTaskSummary, DashboardIssueSummary } from "./api";
import type { TaskStatus, TaskPriority, IssueStatus, IssuePriority } from "@/types";

interface Props {
  workspaceId: string;
}

// ---- colour maps ----
const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  backlog: "bg-gray-700 text-gray-300",
  todo: "bg-blue-900 text-blue-300",
  in_progress: "bg-yellow-900 text-yellow-300",
  in_review: "bg-purple-900 text-purple-300",
  done: "bg-green-900 text-green-300",
  cancelled: "bg-gray-800 text-gray-500",
};

const ISSUE_STATUS_COLOR: Record<IssueStatus, string> = {
  open: "bg-blue-900 text-blue-300",
  in_progress: "bg-yellow-900 text-yellow-300",
  resolved: "bg-green-900 text-green-300",
  closed: "bg-gray-800 text-gray-500",
};

const PRIORITY_COLOR: Record<TaskPriority | IssuePriority, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-green-400",
  none: "text-gray-500",
};

// ---- sub-components ----
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 min-w-[140px] bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-2">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-3xl font-bold text-white">{value}</span>
    </div>
  );
}

function TaskRow({ task }: { task: DashboardTaskSummary }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 rounded-lg transition-colors">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TASK_STATUS_COLOR[task.status]}`}>
        {task.status.replace("_", " ")}
      </span>
      <span className="flex-1 text-sm text-gray-200 truncate">{task.title}</span>
      <span className={`text-xs font-medium ${PRIORITY_COLOR[task.priority]}`}>
        {task.priority}
      </span>
      {task.due_date && (
        <span className="text-xs text-gray-500 shrink-0">
          {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: DashboardIssueSummary }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 rounded-lg transition-colors">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ISSUE_STATUS_COLOR[issue.status]}`}>
        {issue.status.replace("_", " ")}
      </span>
      <span className="flex-1 text-sm text-gray-200 truncate">{issue.title}</span>
      <span className={`text-xs font-medium ${PRIORITY_COLOR[issue.priority]}`}>
        {issue.priority}
      </span>
      {issue.due_date && (
        <span className="text-xs text-gray-500 shrink-0">
          {new Date(issue.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}
    </div>
  );
}

function EmptyWidget({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-16 gap-4 text-gray-600">
      <Icon className="h-14 w-14 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ---- main component ----
export default function HomePage({ workspaceId }: Props) {
  const { data: stats, isLoading } = useDashboard(workspaceId);

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-auto">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <button
          type="button"
          className="flex items-center gap-1.5 text-brand-400 font-semibold text-base hover:text-brand-300 transition-colors"
        >
          Global Dashboard
          <ChevronDown className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Widget
          </button>
          <button
            type="button"
            aria-label="More options"
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 space-y-6">
        {/* Stat cards */}
        <div className="flex flex-wrap gap-3">
          <StatCard label="Open Tasks" value={isLoading ? 0 : (stats?.open_tasks ?? 0)} />
          <StatCard label="Closed Tasks" value={isLoading ? 0 : (stats?.closed_tasks ?? 0)} />
          <StatCard label="Open Issues" value={isLoading ? 0 : (stats?.open_issues ?? 0)} />
          <StatCard label="Closed Issues" value={isLoading ? 0 : (stats?.closed_issues ?? 0)} />
          <StatCard label="Open Phases" value={isLoading ? 0 : (stats?.open_phases ?? 0)} />
          <StatCard label="Closed Phases" value={isLoading ? 0 : (stats?.closed_phases ?? 0)} />
        </div>

        {/* Widgets row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* My Tasks widget */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col min-h-[320px]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
              <span className="text-sm font-semibold text-gray-200">My Tasks</span>
              {stats && stats.my_tasks.length > 0 && (
                <span className="text-xs bg-gray-700 text-gray-300 rounded-full px-2 py-0.5">
                  {stats.my_tasks.length}
                </span>
              )}
            </div>
            <div className="flex-1 flex flex-col">
              {isLoading ? (
                <div className="flex justify-center items-center flex-1">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                </div>
              ) : !stats || stats.my_tasks.length === 0 ? (
                <EmptyWidget icon={ClipboardList} message="No Tasks assigned to you yet." />
              ) : (
                <div className="py-2">
                  {stats.my_tasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Issues widget */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col min-h-[320px]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
              <span className="text-sm font-semibold text-gray-200">My Issues</span>
              {stats && stats.my_issues.length > 0 && (
                <span className="text-xs bg-gray-700 text-gray-300 rounded-full px-2 py-0.5">
                  {stats.my_issues.length}
                </span>
              )}
            </div>
            <div className="flex-1 flex flex-col">
              {isLoading ? (
                <div className="flex justify-center items-center flex-1">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                </div>
              ) : !stats || stats.my_issues.length === 0 ? (
                <EmptyWidget icon={AlertCircle} message="No Issues assigned to you yet." />
              ) : (
                <div className="py-2">
                  {stats.my_issues.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
