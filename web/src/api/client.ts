import type {
  ApiError,
  PaginatedResponses,
  Survey,
  SurveyWithQuestions,
  User,
} from "@survey-builder/shared";
import type { CreateSurveyInput, UpdateSurveyInput } from "@survey-builder/shared";

// ── Error class ──────────────────────────────────────────────────────────────
export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────
interface ApiFetchOptions extends RequestInit {
  /** When true, a 401 response throws an error instead of redirecting to /login.
   *  Use this for endpoints like /auth/me where 401 just means "not logged in". */
  skipAuthRedirect?: boolean;
}

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { skipAuthRedirect, ...fetchOptions } = options;

  const res = await fetch(`/api${path}`, {
    ...fetchOptions,
    credentials: "include", // always send session cookie
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (res.status === 401) {
    if (!skipAuthRedirect) {
      // Session expired on an authenticated endpoint — redirect to login
      const returnUrl = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?return=${returnUrl}`;
    }

    // For /auth/me, just return null so React Query treats it as a successful empty response
    // instead of an error. This completely prevents any error-retry or unmount loops.
    if (path === "/auth/me") {
      return null as unknown as T;
    }

    // For other endpoints like /auth/verify, we MUST throw the error so the
    // catch() block in the UI can handle it properly.
    throw new ApiRequestError("UNAUTHENTICATED", 401, "Session expired or not logged in");
  }

  if (!res.ok) {
    let body: Partial<ApiError> = {};
    try {
      body = (await res.json()) as ApiError;
    } catch {
      /* noop */
    }
    throw new ApiRequestError(
      body.code ?? "UNKNOWN_ERROR",
      res.status,
      body.error ?? `HTTP ${res.status}`,
      body,
    );
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  // skipAuthRedirect: 401 here simply means "not logged in" — let React Query handle it
  me: () => apiFetch<User>("/auth/me", { skipAuthRedirect: true }),
  requestMagicLink: (email: string) =>
    apiFetch<{ message: string }>("/auth/magic-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifyMagicLink: (token: string) =>
    apiFetch<{ success: boolean }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
      skipAuthRedirect: true, // Let verify.tsx handle its own 401 errors
    }),
  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
};

// ── Surveys ───────────────────────────────────────────────────────────────────
export const surveysApi = {
  list: () => apiFetch<Survey[]>("/surveys"),
  get: (id: string) => apiFetch<SurveyWithQuestions>(`/surveys/${id}`),
  create: (data: CreateSurveyInput) =>
    apiFetch<Survey>("/surveys", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: UpdateSurveyInput) =>
    apiFetch<SurveyWithQuestions>(`/surveys/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) => apiFetch<void>(`/surveys/${id}`, { method: "DELETE" }),
  getResponses: (id: string, page = 1) =>
    apiFetch<PaginatedResponses>(`/surveys/${id}/responses?page=${page}`),
};

// ── Public ────────────────────────────────────────────────────────────────────
export const publicApi = {
  getSurvey: (publicId: string) => apiFetch<SurveyWithQuestions>(`/public/s/${publicId}`),
  respond: (publicId: string, answers: Record<string, string | number>) =>
    apiFetch<{ responseId: string }>(`/public/s/${publicId}/respond`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
};
