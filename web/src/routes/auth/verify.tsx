import { authApi } from "@/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/auth/verify")({
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = new URLSearchParams(window.location.search);
  const token = search.get("token");
  const [status, setStatus] = useState<"verifying" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("No token found in URL. Please request a new magic link.");
      return;
    }

    if (verifyingRef.current) return;
    verifyingRef.current = true;

    // Call the API to verify the token and set the session cookie
    authApi
      .verifyMagicLink(token)
      .then(() => {
        // Invalidate auth query so the next route fetches fresh user info
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        // Redirect to dashboard
        navigate({ to: "/dashboard", replace: true });
      })
      .catch((err) => {
        setStatus("error");
        // Using optional chaining or default message since err might be generic
        setErrorMsg(err?.message || "Token is invalid or expired. Please request a new one.");
      });
  }, [token, queryClient, navigate]);

  if (status === "error") {
    return (
      <div className="flex-center" style={{ minHeight: "60vh" }}>
        <div className="card animate-in" style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
          <h2 style={{ marginBottom: "0.5rem" }}>Invalid Link</h2>
          <p className="text-secondary" style={{ marginBottom: "1.5rem" }}>
            {errorMsg}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate({ to: "/login" })}
          >
            Request a new link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-screen">
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p className="text-secondary">Verifying your magic link…</p>
    </div>
  );
}
