import { surveysApi } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { formatRelative } from "@/lib/utils";
import type { Survey } from "@survey-builder/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (!authLoading && !user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="page-header">
        <div>
          <h1>My Surveys</h1>
          <p className="page-subtitle">Create, manage, and share your surveys</p>
        </div>
        <Link to="/surveys/new" className="btn btn-primary">
          + New Survey
        </Link>
      </div>
      <SurveyList />
    </div>
  );
}

function SurveyList() {
  const queryClient = useQueryClient();
  const {
    data: surveys,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["surveys"],
    queryFn: surveysApi.list,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: surveysApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["surveys"] }),
  });

  function handleCopyLink(publicId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/s/${publicId}`);
  }

  function handleDelete(id: string, title: string) {
    if (window.confirm(`Delete survey "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (isError) {
    return <div className="alert alert-error">Failed to load surveys. Please refresh.</div>;
  }

  if (!surveys?.length) {
    return <EmptyState />;
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {surveys.map((survey) => (
        <SurveyCard
          key={survey.id}
          survey={survey}
          onCopyLink={() => handleCopyLink(survey.public_id)}
          onDelete={() => handleDelete(survey.id, survey.title)}
          isDeleting={deleteMutation.isPending && deleteMutation.variables === survey.id}
        />
      ))}
    </div>
  );
}

function SurveyCard({
  survey,
  onCopyLink,
  onDelete,
  isDeleting,
}: {
  survey: Survey;
  onCopyLink: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="card animate-in survey-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "1.25rem 1.5rem",
        borderLeft: `4px solid ${survey.primary_color ?? "var(--brand-primary)"}`,
        transition: "box-shadow 0.18s",
      }}
    >
      {/* Colour dot */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: survey.primary_color,
          flexShrink: 0,
        }}
      />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 className="truncate" style={{ fontSize: "1rem", marginBottom: "0.125rem" }}>
          {survey.title}
        </h3>
        <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
          <span className="text-xs text-muted">
            {survey.response_count ?? 0} response{(survey.response_count ?? 0) === 1 ? "" : "s"}
          </span>
          <span className="text-xs text-muted">Created {formatRelative(survey.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 survey-actions" style={{ flexShrink: 0 }}>
        <Link
          to="/surveys/$id/responses"
          params={{ id: survey.id }}
          className="btn btn-ghost btn-sm hide-mobile"
        >
          Responses
        </Link>
        <Link
          to="/surveys/$id/edit"
          params={{ id: survey.id }}
          className="btn btn-secondary btn-sm"
        >
          Edit
        </Link>
        <button
          type="button"
          id={`copy-link-${survey.id}`}
          className="btn btn-ghost btn-sm"
          onClick={handleCopy}
          title="Copy shareable link"
        >
          {copied ? "✓ Copied!" : "📋 Copy Link"}
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="card animate-in"
      style={{
        textAlign: "center",
        padding: "4rem 2rem",
        background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%)",
      }}
    >
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
      <h2 style={{ marginBottom: "0.5rem" }}>No surveys yet</h2>
      <p className="text-secondary" style={{ marginBottom: "1.5rem" }}>
        Create your first survey and start collecting responses.
      </p>
      <Link to="/surveys/new" className="btn btn-primary btn-lg">
        Create your first survey
      </Link>
    </div>
  );
}
