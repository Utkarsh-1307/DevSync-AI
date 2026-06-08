import api from "@/lib/api";
import { type TokenResponse, type User } from "@/types";

export interface RegisterPayload {
  email: string;
  username: string;
  full_name: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<TokenResponse>("/auth/register", data).then((r) => r.data),

  login: (data: LoginPayload) =>
    api.post<TokenResponse>("/auth/login", data).then((r) => r.data),

  refresh: (refresh_token: string) =>
    api.post<TokenResponse>("/auth/refresh", { refresh_token }).then((r) => r.data),

  me: () => api.get<User>("/auth/me").then((r) => r.data),

  getOAuthUrl: (provider: string) =>
    api.get<{ url: string }>(`/auth/oauth/${provider}/authorize`).then((r) => r.data),
};
