/**
 * Twilio SMS sender — delivers text messages via Twilio's messaging
 * API for the Outreach Agent.
 *
 * Uses Node 18+ native fetch (same pattern as hunter.ts / serper.ts).
 *
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *   — get these from https://console.twilio.com. The phone number
 *   must have SMS capability enabled.
 *
 * All exported functions throw with sanitised codes
 * ("SMS_HTTP_429", "SMS_NOT_CONFIGURED", etc.) so callers can
 * pattern-match without leaking Twilio's API surface.
 */

const TWILIO_BASE = "https://api.twilio.com/2010-04-01";
const REQUEST_TIMEOUT_MS = 15_000;

/* ------------------------------------------------------------------ */
/*  Config guard                                                       */
/* ------------------------------------------------------------------ */

export function isSMSConfigured(): boolean {
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
    throw new Error("SMS_NOT_CONFIGURED");
  }
  return { sid, token, phoneNumber };
}

/* ------------------------------------------------------------------ */
/*  Raw Twilio response shape                                          */
/* ------------------------------------------------------------------ */

interface TwilioMessageResponse {
  sid?: string;
  status?: string;
  error_code?: number | null;
  error_message?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Send an SMS via Twilio. The `phone` should be in E.164 format
 * (e.g. "+14155552671"). Returns the Twilio message SID and delivery
 * status.
 */
export async function sendSMS(
  phone: string,
  message: string
): Promise<{ sid: string; status: string }> {
  const { sid, token, phoneNumber } = getTwilioCredentials();

  const formBody = new URLSearchParams({
    From: phoneNumber,
    To: phone,
    Body: message,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${TWILIO_BASE}/Accounts/${sid}/Messages.json`,
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

    if (!res.ok) throw new Error(`SMS_HTTP_${res.status}`);

    const json = (await res.json()) as TwilioMessageResponse;
    if (!json.sid) throw new Error("SMS_MISSING_SID");
    return { sid: json.sid, status: json.status ?? "unknown" };
  } finally {
    clearTimeout(timeout);
  }
}
