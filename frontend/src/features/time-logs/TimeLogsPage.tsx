import { useState } from "react";
import { Clock, Plus, X } from "lucide-react";
import { useProjects } from "@/features/projects/hooks";
import { useTimeLogs, useLogTime, useDeleteTimeLog } from "./hooks";
import { useTasks } from "@/features/tasks/hooks";

interface Props {
  workspaceId: string;
}

export default function TimeLogsPage({ workspaceId }: Props) {
  const { data: projects = [] } = useProjects(workspaceId);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ hours: "", description: "", logged_date: new Date().toISOString().split("T")[0] });

  const projectId = selectedProject || projects[0]?.id || "";
  const { data: tasks = [] } = useTasks(workspaceId, projectId);
  const taskId = selectedTask || tasks[0]?.id || "";

  const { data: logs = [], isLoading } = useTimeLogs(workspaceId, projectId, taskId);
  const logTime = useLogTime(workspaceId, projectId, taskId);
  const deleteLog = useDeleteTimeLog(workspaceId, projectId, taskId);

  const handleCreate = () => {
    if (!form.hours || !taskId) return;
    logTime.mutate(
      { hours: parseFloat(form.hours), description: form.description || undefined, logged_date: form.logged_date },
      { onSuccess: () => { setShowForm(false); setForm({ hours: "", description: "", logged_date: new Date().toISOString().split("T")[0] }); } }
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-semibold">Time Logs</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Log Time
        </button>
      </div>

      {/* Selectors */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800">
        <select
          value={selectedProject}
          onChange={(e) => { setSelectedProject(e.target.value); setSelectedTask(""); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
        >
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
        >
          <option value="">Select task...</option>
          {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      {/* Log time form */}
      {showForm && (
        <div className="mx-6 mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Log Time</span>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Hours</label>
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={form.hours}
                onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                placeholder="e.g. 1.5"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Date</label>
              <input
                type="date"
                value={form.logged_date}
                onChange={(e) => setForm((f) => ({ ...f, logged_date: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)..."
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-brand-500 mb-3"
          />
          <button
            onClick={handleCreate}
            disabled={logTime.isPending || !taskId}
            className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {logTime.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {/* Logs table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {!taskId ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Clock className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">Select a task to view time logs</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Clock className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">No time logged yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-2 font-medium">Date</th>
                <th className="text-left py-2 font-medium">Task</th>
                <th className="text-left py-2 font-medium">Hours</th>
                <th className="text-left py-2 font-medium">User</th>
                <th className="text-left py-2 font-medium">Description</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 group">
                  <td className="py-3 pr-4 text-gray-300">{new Date(log.logged_date).toLocaleDateString()}</td>
                  <td className="py-3 pr-4 text-gray-100 max-w-xs truncate">{log.task.title}</td>
                  <td className="py-3 pr-4">
                    <span className="font-semibold text-brand-400">{log.hours}h</span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">{log.user.full_name}</td>
                  <td className="py-3 pr-4 text-gray-400 max-w-xs truncate">{log.description ?? "—"}</td>
                  <td className="py-3">
                    <button
                      onClick={() => deleteLog.mutate(log.id)}
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
