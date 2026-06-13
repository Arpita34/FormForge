import { publicApi } from "@/api/client";
import type { Question, SurveyWithQuestions } from "@survey-builder/shared";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/s/$publicId")({
  component: PublicSurveyPage,
});

function PublicSurveyPage() {
  const { publicId } = Route.useParams();
  const navigate = useNavigate();

  const {
    data: survey,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-survey", publicId],
    queryFn: () => publicApi.getSurvey(publicId),
    retry: false,
  });

  // Apply brand colour to CSS variable
  useEffect(() => {
    if (survey?.primary_color) {
      document.documentElement.style.setProperty("--brand-primary", survey.primary_color);
    }
    return () => {
      // Reset to default on unmount
      document.documentElement.style.removeProperty("--brand-primary");
    };
  }, [survey?.primary_color]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading survey…</span>
      </div>
    );
  }

  if (isError || !survey) {
    return (
      <div
        className="flex-center"
        style={{ minHeight: "100dvh", padding: "2rem 1rem", flexDirection: "column", gap: "1rem" }}
      >
        <div className="card animate-in" style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
          <h2 style={{ marginBottom: "0.5rem" }}>Survey not found</h2>
          <p className="text-secondary">
            This survey may have been deleted or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SurveyForm
      survey={survey}
      publicId={publicId}
      onSubmitted={() => navigate({ to: "/s/$publicId/thanks", params: { publicId } })}
    />
  );
}

// ── Survey Form ───────────────────────────────────────────────────────────────
function SurveyForm({
  survey,
  publicId,
  onSubmitted,
}: {
  survey: SurveyWithQuestions;
  publicId: string;
  onSubmitted: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function updateAnswer(questionId: string, value: string | number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => {
      const e = { ...prev };
      delete e[questionId];
      return e;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side required validation
    const newErrors: Record<string, string> = {};
    for (const q of survey.questions) {
      if (q.required) {
        const val = answers[q.id];
        if (val === undefined || String(val).trim() === "") {
          newErrors[q.id] = "This question is required";
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      setTimeout(() => {
        document
          .querySelector("[data-error]")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      await publicApi.respond(publicId, answers);
      onSubmitted();
    } catch (_err) {
      setSubmitting(false);
      setSubmitError("Failed to submit. Please try again.");
    }
  }

  const primaryColor = survey.primary_color;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        paddingBottom: "4rem",
      }}
    >
      {/* Brand header */}
      <div
        style={{
          background: primaryColor,
          padding: "2.5rem 1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {survey.logo_url && (
            <img
              src={survey.logo_url}
              alt="Survey logo"
              style={{ height: 48, marginBottom: "1rem", objectFit: "contain" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <h1
            style={{
              color: "#fff",
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
              marginBottom: "0.5rem",
              textShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            {survey.title}
          </h1>
          {survey.description && (
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.0625rem" }}>
              {survey.description}
            </p>
          )}
        </div>
      </div>

      {/* Questions */}
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {survey.questions.map((question, index) => (
              <QuestionBlock
                key={question.id}
                question={question}
                index={index}
                value={answers[question.id]}
                error={errors[question.id]}
                onChange={(val) => updateAnswer(question.id, val)}
                primaryColor={primaryColor}
              />
            ))}
          </div>

          {submitError && (
            <div className="alert alert-error" style={{ marginTop: "1.5rem" }}>
              {submitError}
            </div>
          )}

          <button
            id="submit-survey"
            type="submit"
            className="btn btn-primary btn-lg w-full"
            style={{
              marginTop: "2rem",
              background: primaryColor,
              boxShadow: `0 4px 16px ${primaryColor}66`,
            }}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div
                  className="spinner"
                  style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: "#fff" }}
                />{" "}
                Submitting…
              </>
            ) : (
              "Submit Response ✦"
            )}
          </button>

          <p className="text-center text-xs text-muted" style={{ marginTop: "1rem" }}>
            Your response will be recorded anonymously.
          </p>
        </div>
      </form>
    </div>
  );
}

// ── Question block ────────────────────────────────────────────────────────────
function QuestionBlock({
  question,
  index,
  value,
  error,
  onChange,
  primaryColor,
}: {
  question: Question;
  index: number;
  value: string | number | undefined;
  error: string | undefined;
  onChange: (val: string | number) => void;
  primaryColor: string;
}) {
  return (
    <div
      className="card animate-in"
      data-error={error ? "true" : undefined}
      style={{ borderTop: `3px solid ${error ? "var(--error)" : primaryColor}` }}
    >
      <label
        htmlFor={`q-${question.id}`}
        style={{ display: "block", marginBottom: "0.875rem", cursor: "pointer" }}
      >
        <span style={{ fontWeight: 600, fontSize: "1rem" }}>
          {index + 1}. {question.label || `Question ${index + 1}`}
          {question.required && (
            <span style={{ color: "var(--error)", marginLeft: "0.25rem" }}>*</span>
          )}
        </span>
      </label>

      {question.type === "short_text" && (
        <input
          id={`q-${question.id}`}
          type="text"
          className={`form-input ${error ? "error" : ""}`}
          placeholder="Your answer…"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {question.type === "long_text" && (
        <textarea
          id={`q-${question.id}`}
          className={`form-input form-textarea ${error ? "error" : ""}`}
          placeholder="Your answer…"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      )}

      {question.type === "date" && (
        <input
          id={`q-${question.id}`}
          type="date"
          className={`form-input ${error ? "error" : ""}`}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {question.type === "multiple_choice" && question.options && (
        <div
          role="radiogroup"
          aria-labelledby={`q-label-${question.id}`}
          style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}
        >
          {question.options.map((opt) => (
            <label
              key={opt}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem 0.875rem",
                background: value === opt ? `${primaryColor}18` : "var(--bg-input)",
                border: `1.5px solid ${value === opt ? primaryColor : "var(--border)"}`,
                borderRadius: "var(--radius)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                style={{ accentColor: primaryColor }}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === "rating" && (
        <fieldset
          aria-label={`Rating for: ${question.label}`}
          style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", border: "none", padding: 0 }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              id={`q-${question.id}-${n}`}
              aria-label={`Rate ${n} out of 5`}
              onClick={() => onChange(n)}
              style={{
                width: 48,
                height: 48,
                borderRadius: "var(--radius)",
                border: `2px solid ${value === n ? primaryColor : "var(--border)"}`,
                background: value === n ? primaryColor : "var(--bg-input)",
                color: value === n ? "#fff" : "var(--text-secondary)",
                fontSize: "1.125rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {n}
            </button>
          ))}
        </fieldset>
      )}

      {error && (
        <p className="form-error" style={{ marginTop: "0.5rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
