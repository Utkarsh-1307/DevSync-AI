import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { type ApiError } from "@/types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";
const ACCESS_TOKEN_KEY = "devsync_access_token";
const REFRESH_TOKEN_KEY = "devsync_refresh_token";

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};
export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;
    const refresh = getRefreshToken();
    if (!refresh) {
      clearTokens();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (refreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    refreshing = true;
    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: refresh,
      });
      setTokens(data.access_token, data.refresh_token);
      onRefreshed(data.access_token);
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return api(original);
    } catch {
      clearTokens();
      window.location.href = "/login";
      return Promise.reject(error);
    } finally {
      refreshing = false;
    }
  }
);

export default api;
