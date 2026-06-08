import { useState } from "react";
import { Plus, Circle, Clock, CheckCircle2, XCircle, ArrowRight, Trash2 } from "lucide-react";
import { useTasks, useCreateTask, useDeleteTask } from "@/features/tasks/hooks";
import { type Task, type TaskStatus } from "@/types";

const COLUMNS: { status: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: "backlog", label: "Backlog", icon: <Circle className="h-3.5 w-3.5" />, color: "text-gray-400" },
  { status: "todo", label: "To Do", icon: <Circle className="h-3.5 w-3.5" />, color: "text-blue-500" },
  { status: "in_progress", label: "In Progress", icon: <Clock className="h-3.5 w-3.5" />, color: "text-yellow-500" },
  { status: "in_review", label: "In Review", icon: <ArrowRight className="h-3.5 w-3.5" />, color: "text-purple-500" },
  { status: "done", label: "Done", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-green-500" },
  { status: "cancelled", label: "Cancelled", icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-400" },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  none: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

function TaskCard({ task, onDelete }: { task: Task; onDelete: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-1.5">
        <p className="flex-1 text-sm text-gray-900 dark:text-gray-100 font-medium leading-snug line-clamp-2">
          {task.title}
        </p>
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0 p-0.5 rounded"
          title="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.priority !== "none" && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
        )}
        {task.labels.map((l) => (
          <span key={l.id} className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
            {l.name}
          </span>
        ))}
      </div>
      {task.assignee && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="h-5 w-5 rounded-full bg-brand-500 flex items-center justify-center text-xs text-white font-medium">
            {task.assignee.full_name[0]}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{task.assignee.full_name}</span>
        </div>
      )}
    </div>
  );
}

function AddTaskForm({ onAdd, onCancel }: { onAdd: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-brand-400 p-2 shadow-sm">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) { onAdd(title.trim()); }
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Task title…"
        className="w-full text-sm bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
      />
      <div className="flex gap-1.5 mt-2">
        <button
          onClick={() => title.trim() && onAdd(title.trim())}
          disabled={!title.trim()}
          className="text-xs px-2 py-1 rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40"
        >
          Add
        </button>
        <button onClick={onCancel} className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          Cancel
        </button>
      </div>
    </div>
  );
}

interface Props {
  workspaceId: string;
  projectId: string;
  projectName: string;
}

export function ProjectBoard({ workspaceId, projectId, projectName }: Props) {
  const { data, isLoading } = useTasks(workspaceId, projectId);
  const createTask = useCreateTask(workspaceId, projectId);
  const deleteTask = useDeleteTask(workspaceId, projectId);
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null);
  const tasks = data?.items ?? [];

  const tasksByStatus = Object.fromEntries(
    COLUMNS.map((col) => [col.status, tasks.filter((t) => t.status === col.status)])
  ) as Record<TaskStatus, Task[]>;

  const handleAdd = async (status: TaskStatus, title: string) => {
    await createTask.mutateAsync({ title, status });
    setAddingTo(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h1 className="font-semibold text-gray-900 dark:text-gray-100">{projectName}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        {isLoading ? (
          <div className="flex gap-4">
            {COLUMNS.map((col) => (
              <div key={col.status} className="w-64 flex-shrink-0">
                <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 h-full">
            {COLUMNS.map((col) => (
              <div key={col.status} className="w-64 flex-shrink-0 flex flex-col">
                <div className={`flex items-center gap-1.5 mb-2 ${col.color}`}>
                  {col.icon}
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="ml-auto text-xs text-gray-400 font-medium">
                    {tasksByStatus[col.status]?.length ?? 0}
                  </span>
                </div>

                <div className="flex-1 space-y-2 min-h-0 overflow-y-auto">
                  {(tasksByStatus[col.status] ?? []).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={() => deleteTask.mutate(task.id)}
                    />
                  ))}

                  {addingTo === col.status ? (
                    <AddTaskForm
                      onAdd={(title) => handleAdd(col.status, title)}
                      onCancel={() => setAddingTo(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setAddingTo(col.status)}
                      className="w-full flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add task
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
