import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Workspace } from "@/types";

interface WorkspaceState {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  setActiveWorkspace: (workspace: Workspace) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspace: null,
      workspaces: [],
      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      clearWorkspace: () => set({ activeWorkspace: null, workspaces: [] }),
    }),
    {
      name: "devsync-workspace",
      partialize: (state) => ({ activeWorkspace: state.activeWorkspace }),
    }
  )
);
