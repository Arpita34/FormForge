import { Hono } from "hono";
import { logger } from "hono/logger";
import type { Env } from "./env";
import { corsMiddleware } from "./middleware/cors";
import { authRouter } from "./routes/auth";
import { publicRouter } from "./routes/public";
import { responsesRouter } from "./routes/responses";
import { surveyRouter } from "./routes/surveys";

const app = new Hono<{ Bindings: Env }>();

// ── Global middleware ────────────────────────────────────────────────────────
app.use("*", logger());
app.use("*", corsMiddleware);

// ── Global error handler ─────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error("[Worker Error]", err);
  return c.json({ error: "Internal server error", code: "INTERNAL_ERROR", status: 500 }, 500);
});

// ── Not found handler ────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Route not found", code: "NOT_FOUND", status: 404 }, 404));

// ── Route groups ─────────────────────────────────────────────────────────────
app.route("/api/auth", authRouter);
app.route("/api/surveys", surveyRouter);
app.route("/api/surveys", responsesRouter); // /api/surveys/:id/responses
app.route("/api/public", publicRouter);

// Health check
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));

export default app;
