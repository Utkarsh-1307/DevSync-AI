import { useState } from "react";
import { Route, Routes, Link, useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Hash, Bell, Bot, Plus, FolderKanban, LogOut, Lock, X, PlusCircle, MessageCircle } from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useWorkspaces } from "@/features/workspace/hooks";
import { useChannels, useCreateChannel, useDMs, useCreateDM, useWorkspaceMembers } from "@/features/channels/hooks";
import { useProjects, useCreateProject } from "@/features/projects/hooks";
import { AIChatPanel } from "@/features/ai/AIChatPanel";
import { ProfileModal } from "@/features/profile/AvatarUpload";
import { SearchBar } from "@/features/search/SearchBar";
import { ChannelView } from "@/features/channels/ChannelView";
import { ProjectBoard } from "@/features/projects/ProjectBoard";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { useUnreadCount } from "@/features/notifications/hooks";
import { useLogout } from "@/features/auth/hooks";
import type { Channel } from "@/types";

function CreateChannelModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateChannel(workspaceId);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const ch = await create.mutateAsync({
        name,
        description: desc || undefined,
        channel_type: isPrivate ? "private" : "public",
      });
      onClose();
      navigate(`/w/${workspaceId}/c/${ch.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.response?.data?.detail ?? err?.message ?? "Failed to create channel");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Create Channel</h2>
          <button type="button" aria-label="Close" onClick={onClose}><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Channel name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, ""))}
              placeholder="general"
              required
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Description <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center justify-between py-1 select-none">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Private channel
            </span>
            <label htmlFor="channel-private-toggle" className="relative w-9 h-5 cursor-pointer">
              <input
                type="checkbox"
                id="channel-private-toggle"
                aria-label="Private channel"
                title="Private channel"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="sr-only peer"
              />
              <span className={`block w-9 h-5 rounded-full transition-colors ${isPrivate ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"}`} />
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPrivate ? "translate-x-4" : "translate-x-0"}`} />
            </label>
          </div>
          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={!name || create.isPending} className="flex-1 px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium">
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewDMModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const { data: wsMembers = [] } = useWorkspaceMembers(workspaceId);
  const createDM = useCreateDM(workspaceId);
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const filtered = wsMembers.filter(
    (m) =>
      m.user.id !== currentUser?.id &&
      (m.user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        m.user.username.toLowerCase().includes(search.toLowerCase()))
  );

  async function startDM(userId: string) {
    const channel = await createDM.mutateAsync(userId);
    onClose();
    navigate(`/w/${workspaceId}/c/${channel.id}`);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">New Direct Message</h2>
          <button type="button" aria-label="Close" onClick={onClose}><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members…"
          aria-label="Search members"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 mb-3"
        />
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No members found</p>
          )}
          {filtered.map((m) => (
            <button
              key={m.user.id}
              type="button"
              onClick={() => startDM(m.user.id)}
              disabled={createDM.isPending}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left disabled:opacity-50"
            >
              <Avatar user={m.user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{m.user.full_name}</p>
                <p className="text-xs text-gray-400 truncate">@{m.user.username}</p>
              </div>
              <span className="text-xs text-gray-400 capitalize flex-shrink-0">{m.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreateProjectModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [desc, setDesc] = useState("");
  const create = useCreateProject(workspaceId);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const project = await create.mutateAsync({ name, key: key.toUpperCase(), description: desc || undefined });
    onClose();
    navigate(`/w/${workspaceId}/projects/${project.id}`);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Create Project</h2>
          <button type="button" aria-label="Close" onClick={onClose}><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Project name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setKey(e.target.value.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, ""));
              }}
              placeholder="My Project"
              required
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Key <span className="font-normal text-gray-400">(2–10 uppercase chars)</span>
            </label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
              placeholder="PROJ"
              required
              minLength={2}
              maxLength={10}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Description <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What's this project about?"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={!name || !key || create.isPending} className="flex-1 px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium">
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkspaceSwitcher({ workspaceId }: { workspaceId: string }) {
  const navigate = useNavigate();
  const workspace = useWorkspaceStore((s) => s.activeWorkspace);
  const { setActiveWorkspace } = useWorkspaceStore();
  const { data: allWorkspaces = [] } = useWorkspaces();
  const [open, setOpen] = useState(false);

  function switchTo(ws: (typeof allWorkspaces)[0]) {
    setActiveWorkspace(ws);
    navigate(`/w/${ws.id}`);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 border-b border-gray-700 flex items-center gap-2 hover:bg-gray-800 transition-colors"
      >
        <div className="h-6 w-6 rounded bg-brand-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {workspace?.name[0] ?? "W"}
        </div>
        <span className="font-semibold text-sm truncate text-gray-100">{workspace?.name ?? "Workspace"}</span>
        <PlusCircle className="h-4 w-4 ml-auto text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 mt-0.5">
            <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Workspaces</p>
            {allWorkspaces.map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => switchTo(ws)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                  ws.id === workspaceId ? "text-white" : "text-gray-300"
                }`}
              >
                <div className="h-6 w-6 rounded bg-brand-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {ws.name[0]}
                </div>
                <span className="truncate">{ws.name}</span>
                {ws.id === workspaceId && <span className="ml-auto text-brand-400 text-xs">●</span>}
              </button>
            ))}
            <div className="border-t border-gray-700 mt-1 pt-1">
              <Link
                to="/new-workspace"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create new workspace
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Sidebar({ workspaceId }: { workspaceId: string }) {
  const location = useLocation();
  const { data: channels = [] } = useChannels(workspaceId);
  const { data: dms = [] } = useDMs(workspaceId);
  const { data: projects = [] } = useProjects(workspaceId);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: unreadData } = useUnreadCount(workspaceId);
  const unreadCount = unreadData?.unread_count ?? 0;
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);

  // For each DM channel, find the other user's name/avatar for display
  function dmDisplayUser(ch: Channel) {
    if (!user || !ch.members?.length) return null;
    return ch.members.find((m) => m.id !== user.id) ?? ch.members[0];
  }

  return (
    <>
      <aside className="w-64 flex-shrink-0 bg-gray-900 dark:bg-gray-950 text-gray-200 flex flex-col h-full">
        <WorkspaceSwitcher workspaceId={workspaceId} />

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <nav className="space-y-0.5">
            <Link
              to={`/w/${workspaceId}/notifications`}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                location.pathname === `/w/${workspaceId}/notifications`
                  ? "bg-brand-700 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Bell className="h-4 w-4 flex-shrink-0" />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </nav>

          {/* Channels */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Channels</span>
              <button type="button" onClick={() => setShowCreateChannel(true)} className="text-gray-400 hover:text-white transition-colors" title="Create channel" aria-label="Create channel">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {channels.length === 0 && <p className="text-xs text-gray-500 px-2 py-1">No channels yet</p>}
            {channels.map((ch) => {
              const Icon = ch.channel_type === "private" ? Lock : Hash;
              const path = `/w/${workspaceId}/c/${ch.id}`;
              return (
                <Link
                  key={ch.id}
                  to={path}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    location.pathname === path ? "bg-brand-700 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Direct Messages */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Direct Messages</span>
              <button type="button" onClick={() => setShowNewDM(true)} className="text-gray-400 hover:text-white transition-colors" title="New direct message" aria-label="New direct message">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {dms.length === 0 && (
              <p className="text-xs text-gray-500 px-2 py-1">No direct messages yet</p>
            )}
            {dms.map((ch) => {
              const other = dmDisplayUser(ch);
              const path = `/w/${workspaceId}/c/${ch.id}`;
              return (
                <Link
                  key={ch.id}
                  to={path}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    location.pathname === path ? "bg-brand-700 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  {other ? (
                    <Avatar user={other} size="xs" />
                  ) : (
                    <MessageCircle className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  )}
                  <span className="truncate">{other?.full_name ?? "Direct Message"}</span>
                </Link>
              );
            })}
          </div>

          {/* Projects */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projects</span>
              <button type="button" onClick={() => setShowCreateProject(true)} className="text-gray-400 hover:text-white transition-colors" title="Create project" aria-label="Create project">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {projects.length === 0 && <p className="text-xs text-gray-500 px-2 py-1">No projects yet</p>}
            {projects.map((p) => {
              const path = `/w/${workspaceId}/projects/${p.id}`;
              return (
                <Link
                  key={p.id}
                  to={path}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    location.pathname.startsWith(path) ? "bg-brand-700 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="truncate">{p.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {user && (
          <div className="p-3 border-t border-gray-700 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="flex-shrink-0 rounded-full ring-2 ring-transparent hover:ring-brand-500 transition-all"
              title="Edit profile"
              aria-label="Edit profile"
            >
              <Avatar user={user} size="sm" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user.full_name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <button type="button" onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors" title="Log out" aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>

      {showCreateChannel && <CreateChannelModal workspaceId={workspaceId} onClose={() => setShowCreateChannel(false)} />}
      {showCreateProject && <CreateProjectModal workspaceId={workspaceId} onClose={() => setShowCreateProject(false)} />}
      {showNewDM && <NewDMModal workspaceId={workspaceId} onClose={() => setShowNewDM(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}

function ChannelRouteView({ workspaceId }: { workspaceId: string }) {
  const { channelId } = useParams<{ channelId: string }>();
  const { data: channels = [] } = useChannels(workspaceId);
  const { data: dms = [] } = useDMs(workspaceId);
  // Search both regular channels and DM channels
  const channel = [...channels, ...dms].find((c) => c.id === channelId);
  if (!channel) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Channel not found</div>;
  return <ChannelView channel={channel} workspaceId={workspaceId} />;
}

function ProjectRouteView({ workspaceId }: { workspaceId: string }) {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: projects = [] } = useProjects(workspaceId);
  const project = projects.find((p) => p.id === projectId);
  if (!project) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Project not found</div>;
  return <ProjectBoard workspaceId={workspaceId} projectId={project.id} projectName={project.name} />;
}

function WorkspaceContent({ workspaceId }: { workspaceId: string }) {
  const { data: channels = [], isLoading } = useChannels(workspaceId);

  return (
    <Routes>
      <Route
        index
        element={
          isLoading ? null : channels.length > 0 ? (
            <Navigate to={`/w/${workspaceId}/c/${channels[0].id}`} replace />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Hash className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Click <strong>+</strong> next to Channels to get started</p>
              </div>
            </div>
          )
        }
      />
      <Route path="c/:channelId" element={<ChannelRouteView workspaceId={workspaceId} />} />
      <Route path="projects/:projectId" element={<ProjectRouteView workspaceId={workspaceId} />} />
      <Route path="notifications" element={<NotificationsPage workspaceId={workspaceId} />} />
    </Routes>
  );
}

export function AppLayout() {
  const [aiOpen, setAIOpen] = useState(false);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const { data: workspaces } = useWorkspaces();
  const { setActiveWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  if (!activeWorkspace && workspaces && workspaces.length > 0) {
    setActiveWorkspace(workspaces[0]);
    navigate(`/w/${workspaces[0].id}`);
    return null;
  }

  if (!activeWorkspace) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <FolderKanban className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-4 text-sm">No workspaces yet.</p>
          <Button onClick={() => navigate("/new-workspace")}>Create Workspace</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <Sidebar workspaceId={activeWorkspace.id} />
      <main className="flex-1 min-w-0 flex flex-col bg-white dark:bg-gray-900">
        <header className="h-12 flex-shrink-0 flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
          <SearchBar workspaceId={activeWorkspace.id} />
        </header>
        <div className="flex-1 min-h-0 overflow-hidden">
          <WorkspaceContent workspaceId={activeWorkspace.id} />
        </div>
      </main>
      <button
        type="button"
        onClick={() => setAIOpen((o) => !o)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-600 text-white shadow-xl hover:bg-brand-700 z-50 transition-colors"
        title="DevSync AI Assistant"
        aria-label="DevSync AI Assistant"
      >
        <Bot className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium">AI Assistant</span>
      </button>
      <AnimatePresence>
        {aiOpen && <AIChatPanel onClose={() => setAIOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
