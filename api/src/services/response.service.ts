import type { PaginatedResponses, Response } from "@survey-builder/shared";
import type { SubmitResponseInput } from "@survey-builder/shared";
import { getSurveyByPublicId } from "./survey.service";

interface ResponseRow {
  id: string;
  survey_id: string;
  answers: string;
  submitted_at: number;
}

// ── Submit a response (public endpoint) ─────────────────────────────────────
export async function submitResponse(
  publicId: string,
  data: SubmitResponseInput,
  db: D1Database,
): Promise<{ responseId: string } | { error: string; code: string; missingFields: string[] }> {
  // Load survey to validate it exists
  const survey = await getSurveyByPublicId(publicId, db);
  if (!survey) {
    return { error: "Survey not found", code: "NOT_FOUND", missingFields: [] };
  }

  // Validate required questions in-memory (no extra D1 round-trip)
  const missingRequired: string[] = [];
  for (const question of survey.questions) {
    if (question.required) {
      const answer = data.answers[question.id];
      const isEmpty = answer === undefined || answer === null || String(answer).trim() === "";
      if (isEmpty) missingRequired.push(question.id);
    }
  }

  if (missingRequired.length > 0) {
    return {
      error: "Required questions not answered",
      code: "REQUIRED_ANSWER_MISSING",
      missingFields: missingRequired,
    };
  }

  const id = crypto.randomUUID().replace(/-/g, "");
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare("INSERT INTO responses (id, survey_id, answers, submitted_at) VALUES (?, ?, ?, ?)")
    .bind(id, survey.id, JSON.stringify(data.answers), now)
    .run();

  return { responseId: id };
}

// ── List responses for a survey (owner only, paginated) ──────────────────────
export async function listResponses(
  surveyId: string,
  ownerId: string,
  page: number,
  db: D1Database,
): Promise<PaginatedResponses | null> {
  // Verify survey ownership (prevents IDOR)
  const survey = await db
    .prepare("SELECT id FROM surveys WHERE id = ? AND owner_id = ?")
    .bind(surveyId, ownerId)
    .first<{ id: string }>();

  if (!survey) return null;

  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const [{ results }, totalRow] = await Promise.all([
    db
      .prepare(
        "SELECT * FROM responses WHERE survey_id = ? ORDER BY submitted_at DESC LIMIT ? OFFSET ?",
      )
      .bind(surveyId, pageSize, offset)
      .all<ResponseRow>(),
    db
      .prepare("SELECT COUNT(*) as count FROM responses WHERE survey_id = ?")
      .bind(surveyId)
      .first<{ count: number }>(),
  ]);

  const responses: Response[] = results.map((row) => ({
    id: row.id,
    survey_id: row.survey_id,
    answers: JSON.parse(row.answers) as Record<string, string | number>,
    submitted_at: row.submitted_at,
  }));

  return {
    responses,
    total: totalRow?.count ?? 0,
    page,
    pageSize,
  };
}
