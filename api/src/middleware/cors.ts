import { cors } from "hono/cors";

/**
 * CORS middleware — allow Vite dev server in development.
 * In production (same domain via Cloudflare), requests are same-origin.
 */
export const corsMiddleware = cors({
  origin: ["http://localhost:5173", "http://localhost:4173"],
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Cookie"],
  credentials: true,
});
