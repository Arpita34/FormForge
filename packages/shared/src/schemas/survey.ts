import { z } from "zod";

export const QuestionTypeSchema = z.enum([
  "short_text",
  "multiple_choice",
  "rating",
  "long_text",
  "date",
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QuestionSchema = z.object({
  id: z.string().optional(), // undefined for new questions (server assigns)
  type: QuestionTypeSchema,
  label: z.string().min(1, "Question label is required").max(500),
  options: z.array(z.string().max(200)).max(20).optional(),
  required: z.boolean().default(false),
  position: z.number().int().min(0),
});
export type QuestionInput = z.infer<typeof QuestionSchema>;

export const CreateSurveySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex colour e.g. #2E75B6")
    .default("#2E75B6"),
  logo_url: z
    .string()
    .url("Must be a valid URL")
    .startsWith("https://", "Logo URL must use HTTPS")
    .optional()
    .or(z.literal("")),
});
export type CreateSurveyInput = z.infer<typeof CreateSurveySchema>;

export const UpdateSurveySchema = CreateSurveySchema.partial().extend({
  questions: z.array(QuestionSchema).optional(),
});
export type UpdateSurveyInput = z.infer<typeof UpdateSurveySchema>;
