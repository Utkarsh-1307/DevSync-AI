import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { setTokens } from "@/lib/api";
import { authApi } from "./api";

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setError("OAuth login failed. Missing tokens.");
      return;
    }

    setTokens(accessToken, refreshToken);

    authApi
      .me()
      .then((user) => {
        setUser(user);
        navigate("/", { replace: true });
      })
      .catch(() => {
        setError("Failed to load your profile. Please try again.");
      });
  }, [navigate, setUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-medium">{error}</p>
          <a href="/login" className="text-brand-600 text-sm hover:underline">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <p className="text-sm text-gray-500">Signing you in…</p>
      </div>
    </div>
  );
}
