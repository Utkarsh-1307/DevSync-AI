import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  activeChannelId: string | null;
  activeProjectId: string | null;
  theme: "light" | "dark" | "system";
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveChannel: (id: string | null) => void;
  setActiveProject: (id: string | null) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeChannelId: null,
  activeProjectId: null,
  theme: "system",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveChannel: (id) => set({ activeChannelId: id }),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setTheme: (theme) => set({ theme }),
}));
