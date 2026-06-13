-- Migration: 0001_init
-- Creates the full schema for the survey builder MVP

CREATE TABLE users (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email      TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE surveys (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2E75B6',
  logo_url      TEXT,
  public_id     TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(8)))),
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_surveys_owner     ON surveys(owner_id);
CREATE INDEX idx_surveys_public_id ON surveys(public_id);

CREATE TABLE questions (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  survey_id  TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK(type IN ('short_text','multiple_choice','rating','long_text','date')),
  label      TEXT NOT NULL,
  options    TEXT,   -- JSON array for multiple_choice
  required   INTEGER NOT NULL DEFAULT 0,  -- 0=false 1=true
  position   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_questions_survey ON questions(survey_id, position);

CREATE TABLE responses (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  survey_id    TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  answers      TEXT NOT NULL,  -- JSON: { [questionId]: value }
  submitted_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_responses_survey ON responses(survey_id, submitted_at);
