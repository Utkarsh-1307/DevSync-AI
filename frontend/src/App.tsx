import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { useSocketConnection } from "@/shared/hooks/useSocket";

const LoginPage = lazy(() => import("./features/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./features/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const OAuthCallbackPage = lazy(() => import("./features/auth/OAuthCallbackPage").then((m) => ({ default: m.OAuthCallbackPage })));
const AppLayout = lazy(() => import("./layouts/AppLayout").then((m) => ({ default: m.AppLayout })));
const CreateWorkspacePage = lazy(() => import("./features/workspace/CreateWorkspacePage").then((m) => ({ default: m.CreateWorkspacePage })));
const OnboardingPage = lazy(() => import("./features/onboarding/OnboardingPage").then((m) => ({ default: m.OnboardingPage })));

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useSocketConnection();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          }
        >
          <Routes>
            <Route
              path="/login"
              element={
                <GuestGuard>
                  <LoginPage />
                </GuestGuard>
              }
            />
            <Route
              path="/register"
              element={
                <GuestGuard>
                  <RegisterPage />
                </GuestGuard>
              }
            />
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />
            <Route
              path="/onboarding"
              element={
                <AuthGuard>
                  <OnboardingPage />
                </AuthGuard>
              }
            />
            <Route
              path="/new-workspace"
              element={
                <AuthGuard>
                  <CreateWorkspacePage />
                </AuthGuard>
              }
            />
            {/* Workspace routes — the /* suffix lets nested <Routes> see relative sub-paths */}
            <Route
              path="/w/:workspaceId/*"
              element={
                <AuthGuard>
                  <AppLayout />
                </AuthGuard>
              }
            />
            {/* Catch-all: let AppLayout redirect to first workspace or /new-workspace */}
            <Route
              path="/*"
              element={
                <AuthGuard>
                  <AppLayout />
                </AuthGuard>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
