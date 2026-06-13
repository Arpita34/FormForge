import { authApi } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [sentEmail, setSentEmail] = useState("");

  // Redirect if already authenticated
  if (!isLoading && user) {
    navigate({ to: "/dashboard", replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Email is required");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      await authApi.requestMagicLink(email.trim());
      setSentEmail(email.trim());
      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMsg("Could not send magic link. Please try again.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)",
      }}
    >
      <div className="animate-in" style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              margin: "0 auto 1rem",
              boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
            }}
          >
            ✦
          </div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>SurveyBuilder</h1>
          <p className="text-secondary">Create beautiful branded surveys</p>
        </div>

        <div className="card">
          {status === "sent" ? (
            <div className="animate-in">
              <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
                ✉️ Magic link sent!
              </div>
              <p className="text-secondary text-sm" style={{ marginBottom: "1rem" }}>
                We sent a sign-in link to{" "}
                <strong style={{ color: "var(--text-primary)" }}>{sentEmail}</strong>.
              </p>
              <p className="text-muted text-sm">
                💡 In dev mode, check the <strong>Wrangler console</strong> for the link — no email
                client needed.
              </p>
              <div className="divider" />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setStatus("idle");
                  setEmail("");
                }}
              >
                ← Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>Sign in</h2>
              <p className="text-secondary text-sm" style={{ marginBottom: "1.5rem" }}>
                Enter your email — we'll send a magic link. No password needed.
              </p>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label htmlFor="email" className="form-label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  className={`form-input ${errorMsg ? "error" : ""}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg("");
                  }}
                  disabled={status === "loading"}
                  autoComplete="email"
                />
                {errorMsg && <span className="form-error">{errorMsg}</span>}
              </div>

              <button
                id="submit-magic-link"
                type="submit"
                className="btn btn-primary w-full btn-lg"
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{" "}
                    Sending…
                  </>
                ) : (
                  "Send magic link ✦"
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted" style={{ marginTop: "1.5rem" }}>
          By signing in you agree to our terms. Built for the Cloudflare assignment.
        </p>
      </div>
    </div>
  );
}
