import type { Env } from "../env";

const MAGIC_LINK_TTL = 60 * 15; // 15 minutes in seconds
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

// ── Token & Session key helpers ─────────────────────────────────────────────
const magicKey = (token: string) => `magic:${token}`;
const sessionKey = (sessionId: string) => `session:${sessionId}`;

// ── User upsert ──────────────────────────────────────────────────────────────
async function upsertUser(email: string, db: D1Database): Promise<{ id: string; email: string }> {
  // Try to find existing user
  const existing = await db
    .prepare("SELECT id, email FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string; email: string }>();

  if (existing) return existing;

  // Create new user
  const id = crypto.randomUUID().replace(/-/g, "");
  await db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").bind(id, email).run();
  return { id, email };
}

// ── Magic link generation ────────────────────────────────────────────────────
export async function requestMagicLink(email: string, env: Env, baseUrl: string): Promise<void> {
  const user = await upsertUser(email, env.DB);
  const token = crypto.randomUUID();

  // Store token → userId in KV with 15-min TTL
  await env.KV.put(magicKey(token), user.id, {
    expirationTtl: MAGIC_LINK_TTL,
  });

  const link = `${baseUrl}/auth/verify?token=${token}`;

  // In dev: log to console. In prod: send via email API.
  console.log(`\n✉️  Magic Link for ${email}:\n${link}\n`);
}

// ── Token verification ───────────────────────────────────────────────────────
export async function verifyMagicLink(
  token: string,
  env: Env,
): Promise<{ sessionId: string } | null> {
  const key = magicKey(token);
  const userId = await env.KV.get(key);

  if (!userId) return null;

  // One-time use: delete the token immediately
  await env.KV.delete(key);

  // Create a new session
  const sessionId = crypto.randomUUID();
  await env.KV.put(sessionKey(sessionId), JSON.stringify({ userId }), {
    expirationTtl: SESSION_TTL,
  });

  return { sessionId };
}

// ── Session retrieval ────────────────────────────────────────────────────────
export async function getSession(sessionId: string, env: Env): Promise<{ userId: string } | null> {
  const raw = await env.KV.get(sessionKey(sessionId));
  if (!raw) return null;
  return JSON.parse(raw) as { userId: string };
}

// ── Get user by id ───────────────────────────────────────────────────────────
export async function getUserById(
  userId: string,
  db: D1Database,
): Promise<{ id: string; email: string } | null> {
  return db
    .prepare("SELECT id, email FROM users WHERE id = ?")
    .bind(userId)
    .first<{ id: string; email: string }>();
}

// ── Session deletion ─────────────────────────────────────────────────────────
export async function deleteSession(sessionId: string, env: Env): Promise<void> {
  await env.KV.delete(sessionKey(sessionId));
}
