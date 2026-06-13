import { surveysApi } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/surveys/new")({
  component: NewSurveyPage,
});

function NewSurveyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  if (!authLoading && !user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  const createMutation = useMutation({
    mutationFn: surveysApi.create,
    onSuccess: (survey) => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      navigate({ to: "/surveys/$id/edit", params: { id: survey.id } });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Survey title is required");
      return;
    }
    createMutation.mutate({ title: title.trim(), primary_color: "#6366f1" });
  }

  return (
    <div className="flex-center" style={{ minHeight: "80vh", padding: "2rem 1rem" }}>
      <div className="card animate-in" style={{ width: "100%", maxWidth: 480 }}>
        <h2 style={{ marginBottom: "0.25rem" }}>New Survey</h2>
        <p className="text-secondary text-sm" style={{ marginBottom: "1.5rem" }}>
          Give your survey a title to get started. You can add questions and branding next.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="survey-title" className="form-label required">
              Survey title
            </label>
            <input
              id="survey-title"
              type="text"
              className={`form-input ${error ? "error" : ""}`}
              placeholder="e.g. Customer Satisfaction Q3"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError("");
              }}
              maxLength={200}
            />
            {error && <span className="form-error">{error}</span>}
          </div>

          {createMutation.isError && (
            <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
              Failed to create survey. Please try again.
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate({ to: "/dashboard" })}
            >
              Cancel
            </button>
            <button
              id="create-survey-submit"
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{" "}
                  Creating…
                </>
              ) : (
                "Create & Add Questions →"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
