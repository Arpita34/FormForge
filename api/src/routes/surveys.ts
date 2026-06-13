import { zValidator } from "@hono/zod-validator";
import { CreateSurveySchema, UpdateSurveySchema } from "@survey-builder/shared";
import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import {
  createSurvey,
  deleteSurvey,
  getSurveyById,
  listSurveysByOwner,
  updateSurvey,
} from "../services/survey.service";

export const surveyRouter = new Hono<{ Bindings: Env }>();

// All survey routes require authentication
surveyRouter.use("*", requireAuth);

// GET /api/surveys — list all surveys for the current user
surveyRouter.get("/", async (c) => {
  const surveys = await listSurveysByOwner(c.var.user.id, c.env.DB);
  return c.json(surveys);
});

// POST /api/surveys — create a new survey
surveyRouter.post("/", zValidator("json", CreateSurveySchema), async (c) => {
  const data = c.req.valid("json");
  const survey = await createSurvey(c.var.user.id, data, c.env.DB);
  return c.json(survey, 201);
});

// GET /api/surveys/:id — get survey with questions
surveyRouter.get("/:id", async (c) => {
  const survey = await getSurveyById(c.req.param("id"), c.var.user.id, c.env.DB);
  if (!survey) {
    return c.json({ error: "Survey not found", code: "NOT_FOUND", status: 404 }, 404);
  }
  return c.json(survey);
});

// PATCH /api/surveys/:id — update survey metadata + replace questions atomically
surveyRouter.patch("/:id", zValidator("json", UpdateSurveySchema), async (c) => {
  const data = c.req.valid("json");
  const survey = await updateSurvey(c.req.param("id"), c.var.user.id, data, c.env.DB);
  if (!survey) {
    return c.json({ error: "Survey not found", code: "NOT_FOUND", status: 404 }, 404);
  }
  return c.json(survey);
});

// DELETE /api/surveys/:id — delete survey (cascades questions + responses)
surveyRouter.delete("/:id", async (c) => {
  const deleted = await deleteSurvey(c.req.param("id"), c.var.user.id, c.env.DB);
  if (!deleted) {
    return c.json({ error: "Survey not found", code: "NOT_FOUND", status: 404 }, 404);
  }
  return new Response(null, { status: 204 });
});
