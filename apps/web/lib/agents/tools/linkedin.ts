/**
 * Unipile LinkedIn automation wrapper — connection requests, messaging,
 * and profile lookups for the LinkedIn Agent.
 *
 * Unipile provides a unified API for LinkedIn automation
 * (https://unipile.com). The DSN (base URL) is tenant-specific and
 * must be set alongside the API key.
 *
 * Env: UNIPILE_API_KEY — your Unipile API key.
 *      UNIPILE_DSN     — base URL for your Unipile instance
 *                         (e.g. "https://api1.unipile.com:13111").
 *
 * All exported functions throw with sanitised codes
 * ("LINKEDIN_NOT_CONFIGURED", "LINKEDIN_HTTP_429", etc.) so callers
 * can pattern-match without leaking Unipile's API surface to the
 * browser.
 */

const REQUEST_TIMEOUT_MS = 15_000;

export function isLinkedInConfigured(): boolean {
  return !!(process.env.UNIPILE_API_KEY ?? "").trim();
}

function getDsn(): string {
  const dsn = (process.env.UNIPILE_DSN ?? "").trim();
  return dsn.replace(/\/+$/, "");
}

/* ---------------- Raw response shapes ---------------- */

interface UnipileInviteResponse {
  success?: boolean;
  request_id?: string;
}

interface UnipileMessageResponse {
  success?: boolean;
  message_id?: string;
}

interface UnipileProfileResponse {
  name?: string;
  title?: string;
  company?: string;
  email?: string;
}

interface UnipileConnectionStatusResponse {
  status?: string;
}

/* ---------------- HTTP helpers ---------------- */

async function linkedinPost(
  path: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const apiKey = (process.env.UNIPILE_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("LINKEDIN_NOT_CONFIGURED");

  const dsn = getDsn();
  if (!dsn) throw new Error("LINKEDIN_NOT_CONFIGURED");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${dsn}${path}`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`LINKEDIN_HTTP_${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function linkedinGet(path: string): Promise<unknown> {
  const apiKey = (process.env.UNIPILE_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("LINKEDIN_NOT_CONFIGURED");

  const dsn = getDsn();
  if (!dsn) throw new Error("LINKEDIN_NOT_CONFIGURED");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${dsn}${path}`, {
      method: "GET",
      headers: { "X-API-KEY": apiKey },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`LINKEDIN_HTTP_${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------------- Public API ---------------- */

/**
 * Send a LinkedIn connection request to a profile URL with an
 * accompanying note. Returns the request ID on success.
 */
export async function sendConnectionRequest(
  profileUrl: string,
  message: string
): Promise<{ success: boolean; requestId?: string }> {
  const json = (await linkedinPost("/api/v1/linkedin/invite", {
    linkedin_url: profileUrl,
    message,
  })) as UnipileInviteResponse;

  return {
    success: json.success ?? false,
    requestId: json.request_id ?? undefined,
  };
}

/**
 * Send a direct message to a LinkedIn profile. The connection must
 * already exist (first-degree) for most message types.
 */
export async function sendLinkedInMessage(
  profileUrl: string,
  message: string
): Promise<{ success: boolean; messageId?: string }> {
  const json = (await linkedinPost("/api/v1/linkedin/message", {
    linkedin_url: profileUrl,
    text: message,
  })) as UnipileMessageResponse;

  return {
    success: json.success ?? false,
    messageId: json.message_id ?? undefined,
  };
}

/**
 * Retrieve basic profile information for a LinkedIn URL. Returns null
 * when the profile cannot be resolved.
 */
export async function getProfileInfo(
  profileUrl: string
): Promise<{
  name: string;
  title: string;
  company: string;
  email?: string;
} | null> {
  const encoded = encodeURIComponent(profileUrl);
  const json = (await linkedinGet(
    `/api/v1/linkedin/profile?url=${encoded}`
  )) as UnipileProfileResponse;

  if (!json.name) return null;
  return {
    name: json.name,
    title: json.title ?? "",
    company: json.company ?? "",
    email: json.email ?? undefined,
  };
}

/**
 * Check the current connection status with a LinkedIn profile.
 * Returns "connected", "pending", or "not_connected".
 */
export async function checkConnectionStatus(
  profileUrl: string
): Promise<"connected" | "pending" | "not_connected"> {
  const encoded = encodeURIComponent(profileUrl);
  const json = (await linkedinGet(
    `/api/v1/linkedin/connection-status?url=${encoded}`
  )) as UnipileConnectionStatusResponse;

  const status = (json.status ?? "").toLowerCase();
  if (status === "connected") return "connected";
  if (status === "pending") return "pending";
  return "not_connected";
}
