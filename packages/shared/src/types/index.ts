import type { QuestionType } from "../schemas/survey";

export interface User {
  id: string;
  email: string;
  created_at: number;
}

export interface Survey {
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

export interface Question {
  id: string;
  survey_id: string;
  type: QuestionType;
  label: string;
  options: string[] | null; // parsed from JSON column
  required: boolean;
  position: number;
  created_at: number;
}

export interface SurveyWithQuestions extends Survey {
  questions: Question[];
}

export interface Response {
  id: string;
  survey_id: string;
  answers: Record<string, string | number>; // parsed from JSON column
  submitted_at: number;
}

export interface ApiError {
  error: string;
  code: string;
  status: number;
}

export interface PaginatedResponses {
  responses: Response[];
  total: number;
  page: number;
  pageSize: number;
}
