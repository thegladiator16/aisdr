/**
 * Cal.com wrapper — real meeting-booking links for the Meeting Booker.
 *
 * Two paths:
 *   1. If CALCOM_API_KEY is set → hit Cal.com v1 /event-types, pick a
 *      matching event by id (or the first "Discovery"/"Intro" event),
 *      construct https://cal.com/{username}/{slug}.
 *   2. Fallback → use the user's users.calendar_link column (already
 *      settable from Settings). Works today, no external dep.
 *
 * Errors surface as sanitised codes so the orchestrator can decide.
 */

const CALCOM_BASE = "https://api.cal.com/v1";
const REQUEST_TIMEOUT_MS = 12_000;

export function isCalcomConfigured(): boolean {
  return !!(process.env.CALCOM_API_KEY ?? "").trim();
}

interface CalcomEventTypeRaw {
  id: number;
  slug?: string;
  title?: string;
  length?: number;
  hidden?: boolean;
  users?: Array<{ username?: string }>;
  team?: { slug?: string };
}

interface CalcomEventTypesResponse {
  event_types?: CalcomEventTypeRaw[];
}

async function calcomGet(path: string): Promise<unknown> {
  const apiKey = (process.env.CALCOM_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("CALCOM_NOT_CONFIGURED");

  const url = new URL(`${CALCOM_BASE}${path}`);
  url.searchParams.set("apiKey", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) throw new Error(`CALCOM_HTTP_${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * List the API key's event types. Cached inside a request via a
 * WeakMap-less module memo (per-serverless-container: fine, we only
 * care about avoiding N calls in one orchestrator run).
 */
let cachedEventTypes: CalcomEventTypeRaw[] | null = null;

async function listEventTypes(): Promise<CalcomEventTypeRaw[]> {
  if (cachedEventTypes) return cachedEventTypes;
  const json = (await calcomGet("/event-types")) as CalcomEventTypesResponse;
  cachedEventTypes = (json.event_types ?? []).filter((e) => !e.hidden);
  return cachedEventTypes;
}

/**
 * Build a public booking URL for a Cal.com event type. When
 * `eventTypeId` is provided, uses that exact event; otherwise falls
 * back to the first event with "discovery"/"intro"/"meet" in the slug,
 * else the first visible event. Returns null if no events found.
 */
export async function createBookingLink(
  eventTypeId?: number,
  _title?: string,
  _description?: string
): Promise<string | null> {
  const events = await listEventTypes();
  if (events.length === 0) return null;

  const target =
    (eventTypeId ? events.find((e) => e.id === eventTypeId) : undefined) ??
    events.find((e) => /discov|intro|meet|chat/i.test(e.slug ?? "")) ??
    events[0];

  if (!target?.slug) return null;

  const owner =
    target.team?.slug ?? target.users?.[0]?.username ?? null;
  if (!owner) return null;

  return `https://cal.com/${owner}/${target.slug}`;
}

/**
 * The Meeting Booker's entry point. Prefer Cal.com if configured; fall
 * back to the user's own `users.calendar_link`. Returns null when
 * neither is available so the caller can decide to still send a
 * "here are three time slots" plain-text proposal.
 */
export async function getBookingLinkForUser(
  userCalendarLink: string | null | undefined
): Promise<{ url: string; source: "calcom" | "user_profile" } | null> {
  if (isCalcomConfigured()) {
    try {
      const url = await createBookingLink();
      if (url) return { url, source: "calcom" };
    } catch (err) {
      // Log and fall through to profile link — Cal.com being down
      // shouldn't kill the meeting-booker step.
      console.error("[calcom] createBookingLink failed:", err);
    }
  }
  const fallback = (userCalendarLink ?? "").trim();
  if (fallback) return { url: fallback, source: "user_profile" };
  return null;
}
