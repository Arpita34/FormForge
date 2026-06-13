import { zValidator } from "@hono/zod-validator";
import { SubmitResponseSchema } from "@survey-builder/shared";
import { Hono } from "hono";
import type { Env } from "../env";
import { submitResponse } from "../services/response.service";
import { getSurveyByPublicId } from "../services/survey.service";

export const publicRouter = new Hono<{ Bindings: Env }>();

// GET /api/public/s/:publicId — return survey branding + questions (no auth, no owner PII)
publicRouter.get("/s/:publicId", async (c) => {
  const survey = await getSurveyByPublicId(c.req.param("publicId"), c.env.DB);
  if (!survey) {
    return c.json({ error: "Survey not found", code: "NOT_FOUND", status: 404 }, 404);
  }

  // Strip owner_id — respondents must not see internal owner identity
  const { owner_id: _owner, ...publicSurvey } = survey;

  return c.json(publicSurvey, 200, {
    // Cache public survey data for 60s at the edge (branding changes rarely)
    "Cache-Control": "public, max-age=60",
  });
});

// POST /api/public/s/:publicId/respond — anonymous response submission
publicRouter.post("/s/:publicId/respond", zValidator("json", SubmitResponseSchema), async (c) => {
  const data = c.req.valid("json");
  const result = await submitResponse(c.req.param("publicId"), data, c.env.DB);

  if ("error" in result) {
    if (result.code === "NOT_FOUND") {
      return c.json({ error: result.error, code: result.code, status: 404 }, 404);
    }
    return c.json(
      { error: result.error, code: result.code, missingFields: result.missingFields, status: 422 },
      422,
    );
  }

  return c.json(result, 201);
});
