import { useState, useEffect, useRef } from "react";
import {
  Plus, Circle, Clock, CheckCircle2, XCircle, ArrowRight,
  Trash2, Pencil, Check, X, Timer,
} from "lucide-react";
import { useProjects } from "@/features/projects/hooks";
import { useTasks, useCreateTask, useDeleteTask, useUpdateTask } from "@/features/tasks/hooks";
import { type Task, type TaskStatus, type TaskPriority } from "@/types";

interface Props { workspaceId: string; }

const COLUMNS: { status: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: "backlog",     label: "Backlog",     icon: <Circle className="h-3.5 w-3.5" />,       color: "text-gray-400" },
  { status: "todo",        label: "To Do",       icon: <Circle className="h-3.5 w-3.5" />,       color: "text-blue-400" },
  { status: "in_progress", label: "In Progress", icon: <Clock className="h-3.5 w-3.5" />,        color: "text-yellow-400" },
  { status: "in_review",   label: "In Review",   icon: <ArrowRight className="h-3.5 w-3.5" />,   color: "text-purple-400" },
  { status: "done",        label: "Done",        icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-green-400" },
  { status: "cancelled",   label: "Cancelled",   icon: <XCircle className="h-3.5 w-3.5" />,      color: "text-red-400" },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-900/30 text-red-400",
  high:     "bg-orange-900/30 text-orange-400",
  medium:   "bg-yellow-900/30 text-yellow-400",
  low:      "bg-blue-900/30 text-blue-400",
  none:     "bg-gray-800 text-gray-400",
};

const STATUS_OPTIONS: TaskStatus[] = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"];
const PRIORITY_OPTIONS: TaskPriority[] = ["none", "low", "medium", "high", "critical"];

// ── timer ──────────────────────────────────────────────────────────────────
function useTaskTimer(taskId: string) {
  const key = `task_timer_${taskId}`;
  const [seconds, setSeconds] = useState(() => parseInt(localStorage.getItem(key) ?? "0", 10));
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSeconds((s) => { const n = s + 1; localStorage.setItem(key, String(n)); return n; });
      }, 1000);
    } else if (ref.current) {
      clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, key]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const display = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return {
    display, running, seconds,
    toggle: () => setRunning((r) => !r),
    reset:  () => { setRunning(false); setSeconds(0); localStorage.removeItem(key); },
  };
}

// ── edit modal ─────────────────────────────────────────────────────────────
function EditTaskModal({ task, workspaceId, projectId, onClose }: {
  task: Task; workspaceId: string; projectId: string; onClose: () => void;
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
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Edit Task</h2>
          <button type="button" aria-label="Close" onClick={onClose}><X className="h-4 w-4 text-gray-400 hover:text-white" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder="Task title" aria-label="Task title"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Optional…"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}
                title="Status" aria-label="Status"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}
                title="Priority" aria-label="Priority"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500">
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-3 py-2 text-sm text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={!title.trim() || update.isPending}
              className="flex-1 px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium">
              {update.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── task card ──────────────────────────────────────────────────────────────
function TaskCard({ task, projectName, onDelete, onEdit }: {
  task: Task; projectName: string; onDelete: () => void; onEdit: () => void;
}) {
  const timer = useTaskTimer(task.id);
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors group">
      <div className="flex items-start gap-1.5 mb-1.5">
        <p className="flex-1 text-sm text-gray-100 font-medium leading-snug line-clamp-2">{task.title}</p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button type="button" onClick={onEdit} title="Edit task"
            className="p-1 rounded text-gray-400 hover:text-blue-400 hover:bg-blue-900/20">
            <Pencil className="h-3 w-3" />
          </button>
          <button type="button" onClick={onDelete} title="Delete task"
            className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-900/20">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        {task.priority !== "none" && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
        )}
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{projectName}</span>
      </div>
      {task.assignee && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="h-4 w-4 rounded-full bg-brand-500 flex items-center justify-center text-xs text-white font-medium flex-shrink-0">
            {task.assignee.full_name[0]}
          </div>
          <span className="text-xs text-gray-400 truncate">{task.assignee.full_name}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-700/60">
        <Timer className={`h-3 w-3 flex-shrink-0 ${timer.running ? "text-green-400" : "text-gray-500"}`} />
        <span className={`text-xs font-mono tabular-nums ${timer.running ? "text-green-400" : "text-gray-500"}`}>{timer.display}</span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={timer.toggle} title={timer.running ? "Pause timer" : "Start timer"}
            className={`text-xs px-1.5 py-0.5 rounded font-medium transition-colors ${
              timer.running ? "bg-green-900/30 text-green-400 hover:bg-green-900/50" : "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
            }`}>
            {timer.running ? "Pause" : "Start"}
          </button>
          {timer.seconds > 0 && (
            <button type="button" onClick={timer.reset} title="Reset timer"
              className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-500 hover:bg-gray-600 hover:text-white transition-colors">
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── per-project column slice (owns its own hooks) ──────────────────────────
function ProjectColumnSlice({ workspaceId, projectId, projectName, status, onEdit }: {
  workspaceId: string; projectId: string; projectName: string;
  status: TaskStatus;
  onEdit: (task: Task, projectId: string) => void;
}) {
  const { data } = useTasks(workspaceId, projectId);
  const deleteTask = useDeleteTask(workspaceId, projectId);
  const tasks = (data?.items ?? []).filter((t) => t.status === status);

  return (
    <>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          projectName={projectName}
          onEdit={() => onEdit(task, projectId)}
          onDelete={() => { if (confirm(`Delete "${task.title}"?`)) deleteTask.mutate(task.id); }}
        />
      ))}
    </>
  );
}

// ── add task inline ────────────────────────────────────────────────────────
function AddTaskInline({ workspaceId, projectId, status, onDone }: {
  workspaceId: string; projectId: string; status: TaskStatus; onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const create = useCreateTask(workspaceId, projectId);

  async function submit() {
    if (!title.trim()) return;
    await create.mutateAsync({ title: title.trim(), status });
    setTitle("");
    onDone();
  }

  return (
    <div className="bg-gray-800 border border-brand-500/50 rounded-lg p-2">
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onDone(); }}
        placeholder="Task title…" aria-label="New task title"
        className="w-full text-sm bg-transparent focus:outline-none text-gray-100 placeholder-gray-500" />
      <div className="flex gap-1.5 mt-2">
        <button type="button" onClick={submit} disabled={!title.trim()}
          className="text-xs px-2 py-1 rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 flex items-center gap-1">
          <Check className="h-3 w-3" /> Add
        </button>
        <button type="button" onClick={onDone}
          className="text-xs px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-700">Cancel</button>
      </div>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────
export default function WorkspaceTasksPage({ workspaceId }: Props) {
  const { data: projects = [], isLoading } = useProjects(workspaceId);
  const [addingTo, setAddingTo] = useState<{ status: TaskStatus; projectId: string } | null>(null);
  const [editingTask, setEditingTask] = useState<{ task: Task; projectId: string } | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const visibleProjects = selectedProject === "all" ? projects : projects.filter((p) => p.id === selectedProject);

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex-shrink-0 flex items-center gap-4">
        <div>
          <h1 className="font-semibold text-gray-100 text-lg">Tasks</h1>
          <p className="text-xs text-gray-500 mt-0.5">All tasks across projects</p>
        </div>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          title="Filter by project"
          aria-label="Filter by project"
          className="ml-auto bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-600">
          <CheckCircle2 className="h-16 w-16 opacity-20" />
          <p className="text-sm">No projects yet. Create a project first.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full">
            {COLUMNS.map((col) => (
              <div key={col.status} className="w-64 flex-shrink-0 flex flex-col">
                {/* Column header */}
                <div className={`flex items-center gap-1.5 mb-3 ${col.color}`}>
                  {col.icon}
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">{col.label}</span>
                </div>

                {/* Cards from each visible project */}
                <div className="flex-1 space-y-2 overflow-y-auto min-h-[40px]">
                  {visibleProjects.map((project) => (
                    <ProjectColumnSlice
                      key={project.id}
                      workspaceId={workspaceId}
                      projectId={project.id}
                      projectName={project.name}
                      status={col.status}
                      onEdit={(task, pid) => setEditingTask({ task, projectId: pid })}
                    />
                  ))}

                  {/* Add task — only when a single project is selected */}
                  {selectedProject !== "all" && (
                    addingTo?.status === col.status ? (
                      <AddTaskInline
                        workspaceId={workspaceId}
                        projectId={selectedProject}
                        status={col.status}
                        onDone={() => setAddingTo(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingTo({ status: col.status, projectId: selectedProject })}
                        className="w-full flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 py-1.5 px-2 rounded hover:bg-gray-800 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add task
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask.task}
          workspaceId={workspaceId}
          projectId={editingTask.projectId}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
