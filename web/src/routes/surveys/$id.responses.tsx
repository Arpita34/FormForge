import { surveysApi } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import type { PaginatedResponses, Question } from "@survey-builder/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/surveys/$id/responses")({
  component: ResponsesPage,
});

function ResponsesPage() {
  const { id } = Route.useParams();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  if (!authLoading && !user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  const { data: survey, isLoading: surveyLoading } = useQuery({
    queryKey: ["survey", id],
    queryFn: () => surveysApi.get(id),
  });

  const { data: responsesData, isLoading: responsesLoading } = useQuery({
    queryKey: ["responses", id, page],
    queryFn: () => surveysApi.getResponses(id, page),
  });

  if (surveyLoading || responsesLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="alert alert-error">Survey not found.</div>
      </div>
    );
  }

  const questions = survey.questions;
  const data = responsesData as PaginatedResponses | undefined;
  const responses = data?.responses ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / (data?.pageSize ?? 50));

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="page-header">
        <div>
          <Link
            to="/dashboard"
            className="text-sm text-muted"
            style={{ display: "block", marginBottom: "0.5rem" }}
          >
            ← Dashboard
          </Link>
          <h1 style={{ fontSize: "1.5rem" }}>{survey.title}</h1>
          <p className="page-subtitle">
            {total} response{total === 1 ? "" : "s"} total
          </p>
        </div>
        <Link to="/surveys/$id/edit" params={{ id }} className="btn btn-secondary">
          ✏️ Edit Survey
        </Link>
      </div>

      {responses.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: "center", padding: "3rem 2rem", color: "var(--text-muted)" }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📭</div>
          <h3 style={{ marginBottom: "0.5rem" }}>No responses yet</h3>
          <p className="text-sm">Share the survey link to start collecting responses.</p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: "1.5rem" }}
            onClick={() =>
              navigator.clipboard.writeText(`${window.location.origin}/s/${survey.public_id}`)
            }
          >
            📋 Copy Share Link
          </button>
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto", borderRadius: "var(--radius-lg)" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                fontSize: "0.875rem",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th
                    style={{
                      padding: "0.875rem 1.25rem",
                      textAlign: "left",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Submitted
                  </th>
                  {questions.map((q: Question) => (
                    <th
                      key={q.id}
                      style={{
                        padding: "0.875rem 1.25rem",
                        textAlign: "left",
                        color: "var(--text-secondary)",
                        fontWeight: 600,
                        minWidth: 160,
                        maxWidth: 280,
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={q.label}
                      >
                        {q.label || `Question ${q.position + 1}`}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responses.map((response, i) => (
                  <tr
                    key={response.id}
                    style={{
                      borderBottom: i < responses.length - 1 ? "1px solid var(--border)" : "none",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = "";
                    }}
                  >
                    <td
                      style={{
                        padding: "0.875rem 1.25rem",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(response.submitted_at)}
                    </td>
                    {questions.map((q: Question) => {
                      const val = response.answers[q.id];
                      return (
                        <td
                          key={q.id}
                          style={{
                            padding: "0.875rem 1.25rem",
                            color: "var(--text-primary)",
                            maxWidth: 280,
                          }}
                        >
                          {val === undefined ? (
                            <span className="text-muted">—</span>
                          ) : q.type === "rating" ? (
                            <span>
                              {"★".repeat(Number(val))}
                              {"☆".repeat(5 - Number(val))}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {String(val)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex-center gap-3" style={{ marginTop: "1.5rem" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className="text-sm text-secondary">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
