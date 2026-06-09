import { useState, useEffect, useRef } from "react";
import { Plus, Circle, Clock, CheckCircle2, XCircle, ArrowRight, Trash2, Pencil, Check, X, Timer } from "lucide-react";
import { useTasks, useCreateTask, useDeleteTask, useUpdateTask } from "@/features/tasks/hooks";
import { type Task, type TaskStatus, type TaskPriority } from "@/types";

const COLUMNS: { status: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: "backlog",     label: "Backlog",     icon: <Circle className="h-3.5 w-3.5" />,       color: "text-gray-400" },
  { status: "todo",        label: "To Do",       icon: <Circle className="h-3.5 w-3.5" />,       color: "text-blue-500" },
  { status: "in_progress", label: "In Progress", icon: <Clock className="h-3.5 w-3.5" />,        color: "text-yellow-500" },
  { status: "in_review",   label: "In Review",   icon: <ArrowRight className="h-3.5 w-3.5" />,   color: "text-purple-500" },
  { status: "done",        label: "Done",        icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-green-500" },
  { status: "cancelled",   label: "Cancelled",   icon: <XCircle className="h-3.5 w-3.5" />,      color: "text-red-400" },
];

const STATUS_OPTIONS: TaskStatus[] = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"];
const PRIORITY_OPTIONS: TaskPriority[] = ["none", "low", "medium", "high", "critical"];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-900/30 text-red-400",
  high:     "bg-orange-900/30 text-orange-400",
  medium:   "bg-yellow-900/30 text-yellow-400",
  low:      "bg-blue-900/30 text-blue-400",
  none:     "bg-gray-800 text-gray-400",
};

// ---- Task Timer ----
function useTaskTimer(taskId: string) {
  const storageKey = `task_timer_${taskId}`;
  const [seconds, setSeconds] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          localStorage.setItem(storageKey, String(next));
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, storageKey]);

  function toggle() { setRunning((r) => !r); }
  function reset() {
    setRunning(false);
    setSeconds(0);
    localStorage.removeItem(storageKey);
  }

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const display = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return { display, running, seconds, toggle, reset };
}

// ---- Edit Task Modal ----
function EditTaskModal({
  task,
  workspaceId,
  projectId,
  onClose,
}: {
  task: Task;
  workspaceId: string;
  projectId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [description, setDescription] = useState(task.description ?? "");
  const update = useUpdateTask(workspaceId, projectId, task.id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await update.mutateAsync({ title, status, priority, description: description || undefined, version: task.version });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Edit Task</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4 text-gray-400 hover:text-white" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Task title"
              aria-label="Task title"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
              placeholder="Optional description…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                title="Task status"
                aria-label="Task status"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                title="Task priority"
                aria-label="Task priority"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={!title.trim() || update.isPending} className="flex-1 px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium">
              {update.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Task Card ----
function TaskCard({
  task,
  onDelete,
  onEdit,
}: {
  task: Task;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const timer = useTaskTimer(task.id);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 shadow-sm hover:border-gray-600 transition-colors group">
      {/* Title + action buttons */}
      <div className="flex items-start gap-1.5 mb-2">
        <p className="flex-1 text-sm text-gray-100 font-medium leading-snug line-clamp-2">{task.title}</p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            title="Edit task"
            className="p-1 rounded text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 transition-colors"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete task"
            className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Priority + labels */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {task.priority !== "none" && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
        )}
        {task.labels.map((l) => (
          <span key={l.id} className="text-xs px-1.5 py-0.5 rounded bg-indigo-900/30 text-indigo-400">
            {l.name}
          </span>
        ))}
      </div>

      {/* Assignee */}
      {task.assignee && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="h-5 w-5 rounded-full bg-brand-500 flex items-center justify-center text-xs text-white font-medium flex-shrink-0">
            {task.assignee.full_name[0]}
          </div>
          <span className="text-xs text-gray-400 truncate">{task.assignee.full_name}</span>
        </div>
      )}

      {/* Timer */}
      <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-700/60">
        <Timer className={`h-3 w-3 flex-shrink-0 ${timer.running ? "text-green-400" : "text-gray-500"}`} />
        <span className={`text-xs font-mono tabular-nums ${timer.running ? "text-green-400" : "text-gray-500"}`}>
          {timer.display}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={timer.toggle}
            title={timer.running ? "Pause timer" : "Start timer"}
            className={`text-xs px-1.5 py-0.5 rounded font-medium transition-colors ${
              timer.running
                ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
            }`}
          >
            {timer.running ? "Pause" : "Start"}
          </button>
          {timer.seconds > 0 && (
            <button
              type="button"
              onClick={timer.reset}
              title="Reset timer"
              className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-500 hover:bg-gray-600 hover:text-white transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddTaskForm({ onAdd, onCancel }: { onAdd: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="bg-gray-800 rounded-lg border border-brand-500/50 p-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) onAdd(title.trim());
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Task title…"
        className="w-full text-sm bg-transparent focus:outline-none text-gray-100 placeholder-gray-500"
      />
      <div className="flex gap-1.5 mt-2">
        <button
          type="button"
          onClick={() => title.trim() && onAdd(title.trim())}
          disabled={!title.trim()}
          className="text-xs px-2 py-1 rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 flex items-center gap-1"
        >
          <Check className="h-3 w-3" /> Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-700"
        >
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const tasks = data?.items ?? [];

  const tasksByStatus = Object.fromEntries(
    COLUMNS.map((col) => [col.status, tasks.filter((t) => t.status === col.status)])
  ) as Record<TaskStatus, Task[]>;

  const handleAdd = async (status: TaskStatus, title: string) => {
    await createTask.mutateAsync({ title, status });
    setAddingTo(null);
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <h1 className="font-semibold text-gray-100">{projectName}</h1>
        <p className="text-xs text-gray-500 mt-0.5">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        {isLoading ? (
          <div className="flex gap-4">
            {COLUMNS.map((col) => (
              <div key={col.status} className="w-64 flex-shrink-0">
                <div className="h-6 w-24 rounded bg-gray-800 animate-pulse mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-lg bg-gray-800 animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 h-full">
            {COLUMNS.map((col) => (
              <div key={col.status} className="w-64 flex-shrink-0 flex flex-col">
                {/* Column header */}
                <div className={`flex items-center gap-1.5 mb-3 ${col.color}`}>
                  {col.icon}
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="ml-auto text-xs bg-gray-800 text-gray-400 rounded-full px-1.5 py-0.5 font-medium">
                    {tasksByStatus[col.status]?.length ?? 0}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2 min-h-[40px] overflow-y-auto">
                  {(tasksByStatus[col.status] ?? []).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      workspaceId={workspaceId}
                      projectId={projectId}
                      onDelete={() => {
                        if (confirm(`Delete "${task.title}"?`)) deleteTask.mutate(task.id);
                      }}
                      onEdit={() => setEditingTask(task)}
                    />
                  ))}

                  {addingTo === col.status ? (
                    <AddTaskForm
                      onAdd={(title) => handleAdd(col.status, title)}
                      onCancel={() => setAddingTo(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingTo(col.status)}
                      className="w-full flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 py-1.5 px-2 rounded hover:bg-gray-800 transition-colors"
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

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
