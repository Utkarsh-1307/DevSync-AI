import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateWorkspace } from "./hooks";

export function CreateWorkspacePage() {
  const navigate = useNavigate();
  const create = useCreateWorkspace();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  function toSlug(val: string) {
    return val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const workspace = await create.mutateAsync({ name, slug, description: description || undefined });
      navigate(`/w/${workspace.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.response?.data?.detail ?? "Failed to create workspace");
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full">
        <div className="mb-6">
          <div className="h-10 w-10 rounded-lg bg-brand-600 flex items-center justify-center mb-4">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your workspace</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            A workspace is where your team collaborates on projects and channels.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Workspace Name
            </label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(toSlug(e.target.value));
              }}
              placeholder="Acme Corp"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
              minLength={1}
              maxLength={255}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slug
            </label>
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
              <span className="px-3 py-2 bg-gray-50 dark:bg-gray-600 text-gray-400 text-sm border-r border-gray-300 dark:border-gray-600 select-none">
                devsync.ai/
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="acme-corp"
                pattern="^[a-z0-9-]+$"
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
                required
                minLength={2}
                maxLength={64}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers and hyphens only</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your team work on?"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              maxLength={1000}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={create.isPending || !name || !slug}
            className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {create.isPending ? "Creating workspace…" : "Create Workspace"}
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 py-2 text-sm transition-colors"
          >
            Go back
          </button>
        </form>
      </div>
    </div>
  );
}
