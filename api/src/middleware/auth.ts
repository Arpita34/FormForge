import { createMiddleware } from "hono/factory";
import type { Env } from "../env";
import { getSession, getUserById } from "../services/auth.service";

export type AuthUser = { id: string; email: string };

// Extend Hono's variable map so route handlers have typed access to `c.var.user`
declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

/**
 * requireAuth — reads the `session` httpOnly cookie, validates it against KV,
 * loads the user from D1, and attaches them to context.
 * Returns 401 if no valid session exists.
 */
export const requireAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const sessionId = getCookie(c.req.raw, "session");
  if (!sessionId) {
    return c.json({ error: "Authentication required", code: "UNAUTHENTICATED", status: 401 }, 401);
  }

  const session = await getSession(sessionId, c.env);
  if (!session) {
    return c.json(
      { error: "Session expired or invalid", code: "UNAUTHENTICATED", status: 401 },
      401,
    );
  }

  const user = await getUserById(session.userId, c.env.DB);
  if (!user) {
    return c.json({ error: "User not found", code: "UNAUTHENTICATED", status: 401 }, 401);
  }

  c.set("user", user);
  await next();
});

/** Parse a cookie by name from the raw Request */
function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    if (key.trim() === name) return rest.join("=").trim();
  }
  return undefined;
}

export { getCookie };
