import { publicApi } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/s/$publicId_/thanks")({
  component: ThanksPage,
});

function ThanksPage() {
  const { publicId } = Route.useParams();

  const { data: survey } = useQuery({
    queryKey: ["public-survey", publicId],
    queryFn: () => publicApi.getSurvey(publicId),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const primaryColor = survey?.primary_color ?? "#6366f1";

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-primary", primaryColor);
    return () => {
      document.documentElement.style.removeProperty("--brand-primary");
    };
  }, [primaryColor]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        background: `radial-gradient(ellipse at 50% 0%, ${primaryColor}20 0%, transparent 60%)`,
      }}
    >
      <div className="card animate-in" style={{ maxWidth: 440, textAlign: "center" }}>
        {survey?.logo_url && (
          <img
            src={survey.logo_url}
            alt="Logo"
            style={{ height: 48, margin: "0 auto 1.5rem", objectFit: "contain" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: primaryColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            margin: "0 auto 1.5rem",
            boxShadow: `0 8px 32px ${primaryColor}60`,
          }}
        >
          ✓
        </div>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Thank you!</h1>
        <p className="text-secondary" style={{ marginBottom: "1.5rem" }}>
          {survey ? (
            <>
              Your response to{" "}
              <strong style={{ color: "var(--text-primary)" }}>{survey.title}</strong> has been
              recorded.
            </>
          ) : (
            "Your response has been recorded."
          )}
        </p>
        <p className="text-xs text-muted">You can now close this tab.</p>
      </div>
    </div>
  );
}
