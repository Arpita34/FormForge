import type { Question, Survey, SurveyWithQuestions } from "@survey-builder/shared";
import type { CreateSurveyInput, UpdateSurveyInput } from "@survey-builder/shared";

// ── D1 row shapes (raw SQL results) ─────────────────────────────────────────
interface SurveyRow {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  primary_color: string;
  logo_url: string | null;
  public_id: string;
  created_at: number;
  updated_at: number;
  response_count?: number;
}

interface QuestionRow {
  id: string;
  survey_id: string;
  type: string;
  label: string;
  options: string | null; // JSON string
  required: number; // 0 or 1
  position: number;
  created_at: number;
}

// ── Mappers ──────────────────────────────────────────────────────────────────
function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    survey_id: row.survey_id,
    type: row.type as Question["type"],
    label: row.label,
    options: row.options ? (JSON.parse(row.options) as string[]) : null,
    required: row.required === 1,
    position: row.position,
    created_at: row.created_at,
  };
}

// ── Create survey ────────────────────────────────────────────────────────────
export async function createSurvey(
  ownerId: string,
  data: CreateSurveyInput,
  db: D1Database,
): Promise<Survey> {
  const id = crypto.randomUUID().replace(/-/g, "");
  const publicId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO surveys (id, owner_id, title, description, primary_color, logo_url, public_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      ownerId,
      data.title,
      data.description ?? null,
      data.primary_color ?? "#2E75B6",
      data.logo_url || null,
      publicId,
      now,
      now,
    )
    .run();

  const row = await db.prepare("SELECT * FROM surveys WHERE id = ?").bind(id).first<SurveyRow>();

  if (!row) throw new Error("Failed to create survey");
  return row as Survey;
}

// ── List surveys by owner (with response count) ───────────────────────────────
export async function listSurveysByOwner(ownerId: string, db: D1Database): Promise<Survey[]> {
  const { results } = await db
    .prepare(
      `SELECT s.*, COUNT(r.id) as response_count
       FROM surveys s
       LEFT JOIN responses r ON r.survey_id = s.id
       WHERE s.owner_id = ?
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
    )
    .bind(ownerId)
    .all<SurveyRow>();

  return results as Survey[];
}

// ── Get survey + questions by internal id ────────────────────────────────────
export async function getSurveyById(
  id: string,
  ownerId: string,
  db: D1Database,
): Promise<SurveyWithQuestions | null> {
  const survey = await db
    .prepare("SELECT * FROM surveys WHERE id = ? AND owner_id = ?")
    .bind(id, ownerId)
    .first<SurveyRow>();

  if (!survey) return null;

  const { results: questionRows } = await db
    .prepare("SELECT * FROM questions WHERE survey_id = ? ORDER BY position ASC")
    .bind(id)
    .all<QuestionRow>();

  return {
    ...(survey as Survey),
    questions: questionRows.map(mapQuestion),
  };
}

// ── Update survey — atomic question replace ──────────────────────────────────
export async function updateSurvey(
  id: string,
  ownerId: string,
  data: UpdateSurveyInput,
  db: D1Database,
): Promise<SurveyWithQuestions | null> {
  // Verify ownership first
  const existing = await db
    .prepare("SELECT id FROM surveys WHERE id = ? AND owner_id = ?")
    .bind(id, ownerId)
    .first<{ id: string }>();

  if (!existing) return null;

  const now = Math.floor(Date.now() / 1000);

  // Build update clauses dynamically for only provided fields
  const updates: string[] = ["updated_at = ?"];
  const values: (string | number | null)[] = [now];

  if (data.title !== undefined) {
    updates.push("title = ?");
    values.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    values.push(data.description ?? null);
  }
  if (data.primary_color !== undefined) {
    updates.push("primary_color = ?");
    values.push(data.primary_color);
  }
  if ("logo_url" in data) {
    updates.push("logo_url = ?");
    values.push(data.logo_url || null);
  }

  values.push(id, ownerId);

  const statements: D1PreparedStatement[] = [
    db
      .prepare(`UPDATE surveys SET ${updates.join(", ")} WHERE id = ? AND owner_id = ?`)
      .bind(...values),
  ];

  // Atomic question replace: delete all + bulk insert
  if (data.questions !== undefined) {
    statements.push(db.prepare("DELETE FROM questions WHERE survey_id = ?").bind(id));

    for (const [index, q] of data.questions.entries()) {
      const qId = q.id ?? crypto.randomUUID().replace(/-/g, "");
      const qNow = Math.floor(Date.now() / 1000);
      statements.push(
        db
          .prepare(
            `INSERT INTO questions (id, survey_id, type, label, options, required, position, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            qId,
            id,
            q.type,
            q.label,
            q.options ? JSON.stringify(q.options) : null,
            q.required ? 1 : 0,
            index, // re-index positions from 0
            qNow,
          ),
      );
    }
  }

  await db.batch(statements);

  return getSurveyById(id, ownerId, db);
}

// ── Delete survey ─────────────────────────────────────────────────────────────
export async function deleteSurvey(id: string, ownerId: string, db: D1Database): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM surveys WHERE id = ? AND owner_id = ?")
    .bind(id, ownerId)
    .run();

  return result.meta.changes > 0;
}

// ── Get survey by public_id (for public survey page) ─────────────────────────
export async function getSurveyByPublicId(
  publicId: string,
  db: D1Database,
): Promise<SurveyWithQuestions | null> {
  const survey = await db
    .prepare("SELECT * FROM surveys WHERE public_id = ?")
    .bind(publicId)
    .first<SurveyRow>();

  if (!survey) return null;

  const { results: questionRows } = await db
    .prepare("SELECT * FROM questions WHERE survey_id = ? ORDER BY position ASC")
    .bind(survey.id)
    .all<QuestionRow>();

  return {
    ...(survey as Survey),
    questions: questionRows.map(mapQuestion),
  };
}
