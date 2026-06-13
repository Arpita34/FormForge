import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { listResponses } from "../services/response.service";

export const responsesRouter = new Hono<{ Bindings: Env }>();

responsesRouter.use("*", requireAuth);

// GET /api/surveys/:id/responses — paginated responses for survey (owner only)
responsesRouter.get("/:id/responses", async (c) => {
  const page = Number(c.req.query("page") ?? "1");
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;

  const result = await listResponses(c.req.param("id"), c.var.user.id, safePage, c.env.DB);

  if (!result) {
    return c.json({ error: "Survey not found", code: "NOT_FOUND", status: 404 }, 404);
  }

  return c.json(result);
});
