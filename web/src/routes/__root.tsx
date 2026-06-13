import { authApi } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, createRootRoute, useNavigate } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      navigate({ to: "/login" });
    },
  });

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <>
      {user && (
        <nav className="nav">
          <div className="container nav-inner">
            <Link to="/dashboard" className="nav-logo">
              ✦ SurveyBuilder
            </Link>
            <div className="flex gap-3" style={{ alignItems: "center" }}>
              <span className="text-sm text-muted hide-mobile">{user.email}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? "…" : "Sign out"}
              </button>
            </div>
          </div>
        </nav>
      )}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </>
  );
}
