import { useState } from "react";
import { Layers, Plus, X, CheckSquare } from "lucide-react";
import type { PhaseStatus } from "@/types";
import { useProjects } from "@/features/projects/hooks";
import { usePhases, useCreatePhase, useDeletePhase } from "./hooks";

interface Props {
  workspaceId: string;
}

const STATUS_COLORS: Record<PhaseStatus, string> = {
  planned: "bg-gray-700 text-gray-300",
  active: "bg-blue-900 text-blue-300",
  completed: "bg-green-900 text-green-300",
};

export default function PhasesPage({ workspaceId }: Props) {
  const { data: projects = [] } = useProjects(workspaceId);
  const [selectedProject, setSelectedProject] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });

  const projectId = selectedProject || projects[0]?.id || "";
  const { data: phases = [], isLoading } = usePhases(workspaceId, projectId);
  const createPhase = useCreatePhase(workspaceId, projectId);
  const deletePhase = useDeletePhase(workspaceId, projectId);

  const handleCreate = () => {
    if (!form.name.trim() || !projectId) return;
    const payload: Record<string, string> = { name: form.name };
    if (form.start_date) payload.start_date = form.start_date;
    if (form.end_date) payload.end_date = form.end_date;
    createPhase.mutate(payload, {
      onSuccess: () => { setShowForm(false); setForm({ name: "", start_date: "", end_date: "" }); },
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-semibold">Phases</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Phase
        </button>
      </div>

      {/* Project selector */}
      <div className="px-6 py-3 border-b border-gray-800">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
        >
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mx-6 mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">New Phase</span>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Phase name..."
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-brand-500 mb-3"
          />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={createPhase.isPending}
            className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {createPhase.isPending ? "Creating..." : "Create Phase"}
          </button>
        </div>
      )}

      {/* Phases list */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : phases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Layers className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">No phases yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {phases.map((phase) => (
              <div
                key={phase.id}
                className="flex items-center justify-between p-4 bg-gray-800/60 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-brand-400 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-100">{phase.name}</p>
                    {(phase.start_date || phase.end_date) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {phase.start_date ? new Date(phase.start_date).toLocaleDateString() : "—"}
                        {" → "}
                        {phase.end_date ? new Date(phase.end_date).toLocaleDateString() : "—"}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <CheckSquare className="h-3.5 w-3.5" />
                    {phase.task_count} tasks
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[phase.status]}`}>
                    {phase.status}
                  </span>
                  <button
                    onClick={() => deletePhase.mutate(phase.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
