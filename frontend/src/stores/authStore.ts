import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type User } from "@/types";
import { clearTokens, setTokens } from "@/lib/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      setTokens: (access, refresh) => setTokens(access, refresh),
      logout: () => {
        clearTokens();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: "devsync-auth",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
