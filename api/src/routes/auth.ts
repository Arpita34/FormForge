import { zValidator } from "@hono/zod-validator";
import { MagicLinkSchema } from "@survey-builder/shared";
import { Hono } from "hono";
import type { Env } from "../env";
import { getCookie, requireAuth } from "../middleware/auth";
import { deleteSession, requestMagicLink, verifyMagicLink } from "../services/auth.service";

export const authRouter = new Hono<{ Bindings: Env }>();

// POST /api/auth/magic-link
// Accept email, generate token, store in KV, log link to console
authRouter.post("/magic-link", zValidator("json", MagicLinkSchema), async (c) => {
  const { email } = c.req.valid("json");
  const baseUrl = new URL(c.req.url).origin;
  // Replace API origin with the frontend origin in dev
  const frontendBase =
    c.env.ENVIRONMENT === "development" ? baseUrl.replace(":8787", ":5173") : baseUrl;

  await requestMagicLink(email, c.env, frontendBase);
  return c.json(
    {
      message:
        "Magic link sent! Check the server console in dev mode, or your inbox in production.",
    },
    200,
  );
});

// POST /api/auth/verify
// Validate token from KV, create session, set cookie, return success
authRouter.post("/verify", async (c) => {
  const { token } = await c.req.json().catch(() => ({ token: null }));

  if (!token) {
    return c.json({ error: "Token is required", code: "VALIDATION_ERROR", status: 400 }, 400);
  }

  const result = await verifyMagicLink(token, c.env);
  if (!result) {
    return c.json(
      { error: "Token is invalid or expired", code: "UNAUTHENTICATED", status: 401 },
      401,
    );
  }

  const isProduction = c.env.ENVIRONMENT === "production";
  const cookieValue = [
    `session=${result.sessionId}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=604800",
    ...(isProduction ? ["Secure"] : []),
  ].join("; ");

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieValue,
    },
  });
});

// POST /api/auth/logout
// Delete session from KV, clear the cookie
authRouter.post("/logout", requireAuth, async (c) => {
  const sessionId = getCookie(c.req.raw, "session");
  if (sessionId) {
    await deleteSession(sessionId, c.env);
  }

  const clearCookie = "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearCookie },
  });
});

// GET /api/auth/me
// Return the current authenticated user (used by frontend to check auth state)
authRouter.get("/me", requireAuth, async (c) => {
  const user = c.var.user;
  return c.json({ id: user.id, email: user.email });
});
