/**
 * Server-side helpers for PayPal REST v2. Used by
 *   /api/billing/create-paypal-order   – creates an order for a plan/type
 *   /api/billing/verify-paypal-payment – captures the order, verifies the
 *                                        server-computed amount, and updates
 *                                        the subscription in one transaction.
 *
 * The React client (via @paypal/react-paypal-js's PayPalButtons) opens the
 * PayPal window with the order id we return from create-paypal-order, then
 * calls verify-paypal-payment with the same order id after PayPal reports
 * approval. Amount is never trusted from the client — every route
 * recomputes it from getPlanAmount() / getAddonUnitPrice() with currency
 * fixed to "USD" (INR orders never enter this path).
 *
 * Env vars:
 *   PAYPAL_CLIENT_ID          – REST app client id (server-only for token calls)
 *   PAYPAL_CLIENT_SECRET      – REST app secret
 *   PAYPAL_ENV                – "live" (default) or "sandbox"
 *   NEXT_PUBLIC_PAYPAL_CLIENT_ID – same client id but public, used by the JS SDK
 *                                  script tag on the client. Both must match.
 */

const LIVE_BASE = "https://api-m.paypal.com";
const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

export function isPayPalConfigured(): boolean {
  return !!(
    process.env.PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_SECRET &&
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  );
}

function baseUrl(): string {
  const env = (process.env.PAYPAL_ENV ?? "live").toLowerCase();
  return env === "sandbox" ? SANDBOX_BASE : LIVE_BASE;
}

/** OAuth2 client-credentials token. Cached per process for its TTL. */
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PAYPAL_NOT_CONFIGURED");

  const basic = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PAYPAL_TOKEN_HTTP_${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

export interface CreatePayPalOrderInput {
  /** Amount in cents. Converted to PayPal's decimal string form here. */
  amountCents: number;
  description: string;
  /** Internal reference we later reconcile against on capture. */
  referenceId: string;
}

export interface PayPalOrder {
  id: string;
  status: string;
}

export async function createPayPalOrder(
  input: CreatePayPalOrderInput
): Promise<PayPalOrder> {
  const token = await getAccessToken();
  const dollars = (input.amountCents / 100).toFixed(2);
  const res = await fetch(`${baseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.referenceId,
          description: input.description.slice(0, 127),
          amount: { currency_code: "USD", value: dollars },
        },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PAYPAL_CREATE_HTTP_${res.status}:${text.slice(0, 200)}`);
  }
  return (await res.json()) as PayPalOrder;
}

export interface CapturedPayment {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
}

export async function capturePayPalOrder(orderId: string): Promise<CapturedPayment> {
  const token = await getAccessToken();
  const res = await fetch(
    `${baseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PAYPAL_CAPTURE_HTTP_${res.status}:${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    id: string;
    status: string;
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id: string;
          status: string;
          amount?: { currency_code: string; value: string };
        }>;
      };
    }>;
  };
  const cap = json.purchase_units?.[0]?.payments?.captures?.[0];
  if (!cap || !cap.amount) throw new Error("PAYPAL_CAPTURE_NO_AMOUNT");
  const cents = Math.round(Number(cap.amount.value) * 100);
  if (!Number.isFinite(cents)) throw new Error("PAYPAL_CAPTURE_BAD_AMOUNT");
  return {
    id: cap.id,
    status: cap.status,
    amountCents: cents,
    currency: cap.amount.currency_code,
  };
}
