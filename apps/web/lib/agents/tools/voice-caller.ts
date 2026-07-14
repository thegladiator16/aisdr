/**
 * Twilio Voice + TwiML wrapper — outbound calls with AI-generated
 * scripts for the Outreach Agent.
 *
 * Uses Node 18+ native fetch (same pattern as hunter.ts / serper.ts).
 *
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
 *      ELEVENLABS_API_KEY (optional — for future voice-clone flows)
 *   — get Twilio credentials from https://console.twilio.com. The
 *   phone number must have Voice capability enabled.
 *
 * All exported functions throw with sanitised codes
 * ("VOICE_HTTP_429", "VOICE_NOT_CONFIGURED", etc.) so callers can
 * pattern-match without leaking Twilio's API surface.
 */

const TWILIO_BASE = "https://api.twilio.com/2010-04-01";
const REQUEST_TIMEOUT_MS = 15_000;

/* ------------------------------------------------------------------ */
/*  Config guard                                                       */
/* ------------------------------------------------------------------ */

export function isVoiceConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

/* ------------------------------------------------------------------ */
/*  HTTP helper                                                        */
/* ------------------------------------------------------------------ */

function getTwilioCredentials(): {
  sid: string;
  token: string;
  phoneNumber: string;
} {
  const sid = (process.env.TWILIO_ACCOUNT_SID ?? "").trim();
  const token = (process.env.TWILIO_AUTH_TOKEN ?? "").trim();
  const phoneNumber = (process.env.TWILIO_PHONE_NUMBER ?? "").trim();
  if (!sid || !token || !phoneNumber) {
    throw new Error("VOICE_NOT_CONFIGURED");
  }
  return { sid, token, phoneNumber };
}

/* ------------------------------------------------------------------ */
/*  Raw Twilio response shapes                                         */
/* ------------------------------------------------------------------ */

interface TwilioCallResponse {
  sid?: string;
  status?: string;
  error_code?: number | null;
  error_message?: string | null;
}

interface TwilioRecordingRaw {
  sid?: string;
  duration?: string;
  uri?: string;
}

interface TwilioRecordingsListResponse {
  recordings?: TwilioRecordingRaw[];
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Initiate an outbound phone call via Twilio. The `twimlUrl` should
 * point to an endpoint that returns TwiML instructions for the call
 * (e.g. a hosted TwiML Bin or your own /api/voice/script route).
 *
 * The `phone` should be in E.164 format (e.g. "+14155552671").
 * Returns the Twilio call SID and initial status.
 */
export async function makeOutboundCall(
  phone: string,
  twimlUrl: string
): Promise<{ callSid: string; status: string }> {
  const { sid, token, phoneNumber } = getTwilioCredentials();

  const formBody = new URLSearchParams({
    From: phoneNumber,
    To: phone,
    Url: twimlUrl,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${TWILIO_BASE}/Accounts/${sid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
        signal: controller.signal,
      }
    );

    if (!res.ok) throw new Error(`VOICE_HTTP_${res.status}`);

    const json = (await res.json()) as TwilioCallResponse;
    if (!json.sid) throw new Error("VOICE_MISSING_SID");
    return { callSid: json.sid, status: json.status ?? "unknown" };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generate a TwiML XML string for an AI-powered sales call script.
 * The returned XML uses <Say> verbs with a personalised greeting,
 * value proposition, and a meeting-booking ask.
 *
 * This is a pure function — no network calls. Host the returned XML
 * at a publicly-accessible URL (e.g. a TwiML Bin or an API route)
 * and pass that URL to makeOutboundCall().
 */
export function generateVoiceScript(
  leadName: string,
  company: string,
  context: string
): string {
  const safeName = escapeXml(leadName.trim() || "there");
  const safeCompany = escapeXml(company.trim() || "your company");
  const safeContext = escapeXml(
    context.trim() || "help you grow your business"
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Say voice="Polly.Matthew" language="en-US">`,
    `    Hi ${safeName}, this is a quick call from AryaSDR.`,
    `    I noticed some exciting developments at ${safeCompany},`,
    `    and I wanted to reach out because we can ${safeContext}.`,
    `  </Say>`,
    "  <Pause length=\"1\"/>",
    `  <Say voice="Polly.Matthew" language="en-US">`,
    `    Would you have 15 minutes this week for a quick intro call?`,
    `    If now is not a good time, I will follow up by email.`,
    `    Thanks for your time, ${safeName}. Have a great day!`,
    `  </Say>`,
    "</Response>",
  ].join("\n");
}

/**
 * Retrieve the recording for a completed call. Returns the public
 * recording URL and duration, or null if no recording exists yet
 * (call still in progress, or recording was not enabled).
 */
export async function getCallRecording(
  callSid: string
): Promise<{ recordingUrl: string; duration: number } | null> {
  const { sid, token } = getTwilioCredentials();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${TWILIO_BASE}/Accounts/${sid}/Calls/${callSid}/Recordings.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        },
        signal: controller.signal,
      }
    );

    if (!res.ok) throw new Error(`VOICE_HTTP_${res.status}`);

    const json = (await res.json()) as TwilioRecordingsListResponse;
    const recordings = json.recordings ?? [];
    if (recordings.length === 0) return null;

    const rec = recordings[0];
    if (!rec.sid) return null;

    return {
      recordingUrl: `${TWILIO_BASE}/Accounts/${sid}/Recordings/${rec.sid}.mp3`,
      duration: parseInt(rec.duration ?? "0", 10),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/** Escape XML special characters for safe embedding in TwiML. */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
