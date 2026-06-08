import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, type LoginPayload, type RegisterPayload } from "./api";
import { useAuthStore } from "@/stores/authStore";
import { setTokens } from "@/lib/api";

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLogin() {
  const { setUser, setTokens: storeTokens } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginPayload) => authApi.login(data),
    onSuccess: async (tokens) => {
      storeTokens(tokens.access_token, tokens.refresh_token);
      setTokens(tokens.access_token, tokens.refresh_token);
      const user = await authApi.me();
      setUser(user);
      qc.setQueryData(["auth", "me"], user);
    },
  });
}

export function useRegister() {
  const { setUser, setTokens: storeTokens } = useAuthStore();

  return useMutation({
    mutationFn: (data: RegisterPayload) => authApi.register(data),
    onSuccess: async (tokens) => {
      storeTokens(tokens.access_token, tokens.refresh_token);
      setTokens(tokens.access_token, tokens.refresh_token);
      const user = await authApi.me();
      setUser(user);
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const qc = useQueryClient();

  return () => {
    logout();
    qc.clear();
    window.location.href = "/login";
  };
}
