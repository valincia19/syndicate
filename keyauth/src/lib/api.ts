/**
 * API Client for keyauth app
 *
 * Cross-origin requests to the main backend API.
 * Set NEXT_PUBLIC_API_URL in .env.local to point to your backend.
 * In development: http://localhost:5000
 * In production: your backend domain (must be in CORS whitelist)
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface FreeKeyResponse {
  status: string;
  statusCode: number;
  message: string;
  data: {
    license_key: string;
    tier: string;
    status: string;
    hwid_limit: number;
    expires_at: string;
  };
}

interface ApiErrorResponse {
  status: string;
  statusCode: number;
  message: string;
}

export class ApiError extends Error {
  statusCode: number;
  status: string;

  constructor(message: string, statusCode: number, status: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.status = status;
  }
}

interface SessionResponse {
  status: string;
  statusCode: number;
  message: string;
  data: {
    session_id: string;
    uuid: string;
  };
}

interface VerifyCaptchaResponse {
  status: string;
  statusCode: number;
  message: string;
  data: {
    session_id: string;
    captcha_verified: boolean;
  };
}

interface VerifyShortlinkResponse {
  status: string;
  statusCode: number;
  message: string;
  data: {
    id: string;
    uuid: string;
    session_id: string;
    shortlink_verified: boolean;
  };
}

export const api = {
  /**
   * Create a new verification session.
   * POST /v1/bypass/session
   */
  async createSession(): Promise<SessionResponse> {
    const res = await fetch(`${BASE_URL}/v1/bypass/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data as ApiErrorResponse;
      throw new ApiError(err?.message || `Failed to create session (${res.status})`, res.status, err?.status || "error");
    }
    return data as SessionResponse;
  },

  /**
   * Verify Turnstile captcha server-side.
   * POST /v1/bypass/verify-captcha
   */
  async verifyCaptcha(sessionId: string, turnstileToken?: string): Promise<VerifyCaptchaResponse> {
    const res = await fetch(`${BASE_URL}/v1/bypass/verify-captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, turnstile_token: turnstileToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data as ApiErrorResponse;
      throw new ApiError(err?.message || `Captcha verification failed (${res.status})`, res.status, err?.status || "error");
    }
    return data as VerifyCaptchaResponse;
  },

  /**
   * Verify Valinc Link shortlink gateway completion (fail-closed).
   * POST /v1/bypass/verify
   */
  async verifyShortlink(sessionId: string, uuid: string): Promise<VerifyShortlinkResponse> {
    const res = await fetch(`${BASE_URL}/v1/bypass/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, uuid }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data as ApiErrorResponse;
      throw new ApiError(err?.message || `Gateway verification failed (${res.status})`, res.status, err?.status || "error");
    }
    return data as VerifyShortlinkResponse;
  },

  /**
   * Verify Linkvertise Anti-Bypass completion hash (fail-closed).
   * POST /v1/bypass/verify-linkvertise
   */
  async verifyLinkvertise(sessionId: string, hash: string): Promise<VerifyShortlinkResponse> {
    const res = await fetch(`${BASE_URL}/v1/bypass/verify-linkvertise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, hash }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data as ApiErrorResponse;
      throw new ApiError(err?.message || `Linkvertise verification failed (${res.status})`, res.status, err?.status || "error");
    }
    return data as VerifyShortlinkResponse;
  },

  /**
   * Verify Work.ink Anti-Bypass / Key System completion token (fail-closed).
   * POST /v1/bypass/verify-workink
   */
  async verifyWorkink(sessionId: string, token: string): Promise<VerifyShortlinkResponse> {
    const res = await fetch(`${BASE_URL}/v1/bypass/verify-workink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data as ApiErrorResponse;
      throw new ApiError(err?.message || `Work.ink verification failed (${res.status})`, res.status, err?.status || "error");
    }
    return data as VerifyShortlinkResponse;
  },

  /**
   * Claim a free key using a server-verified session_id.
   * POST /v1/licenses/free
   */
  async claimFreeKey(sessionId: string): Promise<FreeKeyResponse> {
    const res = await fetch(`${BASE_URL}/v1/licenses/free`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = data as ApiErrorResponse;
      throw new ApiError(
        err?.message || `Request failed (${res.status})`,
        res.status,
        err?.status || "error"
      );
    }

    return data as FreeKeyResponse;
  },
};
