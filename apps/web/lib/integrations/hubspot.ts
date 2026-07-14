/**
 * HubSpot CRM wrapper — syncs leads, deals, and activities from the
 * pipeline into HubSpot.
 *
 * Uses Node 18+ native fetch (same pattern as hunter.ts / serper.ts).
 *
 * Env: HUBSPOT_API_KEY — get it from HubSpot Settings > Integrations >
 * Private Apps. Free CRM tier works; paid unlocks higher rate limits.
 *
 * All exported functions throw with sanitised codes ("HUBSPOT_HTTP_429",
 * "HUBSPOT_NOT_CONFIGURED", etc.) so callers can pattern-match without
 * leaking HubSpot's API surface.
 */

const HUBSPOT_BASE = "https://api.hubapi.com";
const REQUEST_TIMEOUT_MS = 15_000;

/* ------------------------------------------------------------------ */
/*  Public interfaces                                                  */
/* ------------------------------------------------------------------ */

export interface HubSpotLead {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  phone?: string;
}

export interface HubSpotContact {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
}

export interface HubSpotDealParams {
  contactId: string;
  dealName: string;
  stage: string;
  amount?: number;
}

/* ------------------------------------------------------------------ */
/*  Config guard                                                       */
/* ------------------------------------------------------------------ */

export function isHubSpotConfigured(): boolean {
  return !!(process.env.HUBSPOT_API_KEY ?? "").trim();
}

/* ------------------------------------------------------------------ */
/*  HTTP helpers                                                       */
/* ------------------------------------------------------------------ */

function getApiKey(): string {
  const key = (process.env.HUBSPOT_API_KEY ?? "").trim();
  if (!key) throw new Error("HUBSPOT_NOT_CONFIGURED");
  return key;
}

async function hubspotFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = getApiKey();
  const url = `${HUBSPOT_BASE}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> | undefined),
      },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/* ------------------------------------------------------------------ */
/*  Raw HubSpot response shapes                                        */
/* ------------------------------------------------------------------ */

interface HubSpotObjectResponse {
  id?: string;
  properties?: Record<string, string | null>;
}

interface HubSpotConflictResponse {
  message?: string;
  // HubSpot 409 embeds the existing contact ID in the message body.
  // Format: "Contact already exists. Existing ID: 12345"
}

interface HubSpotContactsListResponse {
  results?: Array<{
    id?: string;
    properties?: Record<string, string | null>;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Create (or update-on-conflict) a CRM contact from a lead. Returns the
 * HubSpot contact ID.
 *
 * On 409 (contact already exists) we extract the existing ID from the
 * error body and PATCH it instead, so callers never have to handle the
 * "already exists" dance themselves.
 */
export async function syncLeadToHubspot(
  lead: HubSpotLead
): Promise<{ contactId: string }> {
  const body = JSON.stringify({
    properties: {
      email: lead.email,
      firstname: lead.firstName ?? "",
      lastname: lead.lastName ?? "",
      company: lead.company ?? "",
      jobtitle: lead.title ?? "",
      phone: lead.phone ?? "",
    },
  });

  const res = await hubspotFetch("/crm/v3/objects/contacts", {
    method: "POST",
    body,
  });

  if (res.ok) {
    const json = (await res.json()) as HubSpotObjectResponse;
    if (!json.id) throw new Error("HUBSPOT_MISSING_ID");
    return { contactId: json.id };
  }

  // 409 → contact already exists; extract existing ID and update.
  if (res.status === 409) {
    const conflict = (await res.json()) as HubSpotConflictResponse;
    const match = (conflict.message ?? "").match(/Existing ID:\s*(\d+)/i);
    if (!match) throw new Error("HUBSPOT_CONFLICT_NO_ID");
    const existingId = match[1];

    const patchRes = await hubspotFetch(
      `/crm/v3/objects/contacts/${existingId}`,
      { method: "PATCH", body }
    );
    if (!patchRes.ok) throw new Error(`HUBSPOT_HTTP_${patchRes.status}`);
    return { contactId: existingId };
  }

  throw new Error(`HUBSPOT_HTTP_${res.status}`);
}

/**
 * Create a deal and associate it with a contact. Returns the deal ID.
 */
export async function syncDealToHubspot(
  params: HubSpotDealParams
): Promise<{ dealId: string }> {
  // 1. Create the deal.
  const dealBody = JSON.stringify({
    properties: {
      dealname: params.dealName,
      dealstage: params.stage,
      ...(params.amount != null ? { amount: String(params.amount) } : {}),
    },
  });

  const dealRes = await hubspotFetch("/crm/v3/objects/deals", {
    method: "POST",
    body: dealBody,
  });
  if (!dealRes.ok) throw new Error(`HUBSPOT_HTTP_${dealRes.status}`);

  const dealJson = (await dealRes.json()) as HubSpotObjectResponse;
  const dealId = dealJson.id;
  if (!dealId) throw new Error("HUBSPOT_MISSING_DEAL_ID");

  // 2. Associate deal → contact.
  const assocRes = await hubspotFetch(
    `/crm/v3/objects/deals/${dealId}/associations/contacts/${params.contactId}/deal_to_contact`,
    { method: "PUT" }
  );
  if (!assocRes.ok) {
    // Non-fatal — the deal exists, we just couldn't link it. Log and
    // return the deal ID anyway so the caller can decide.
    console.error(
      `[hubspot] Association failed (${assocRes.status}) for deal ${dealId} → contact ${params.contactId}`
    );
  }

  return { dealId };
}

/**
 * Pull contacts from HubSpot for import / sync purposes.
 */
export async function pullContactsFromHubspot(
  limit = 50
): Promise<HubSpotContact[]> {
  const capped = Math.min(Math.max(limit, 1), 100);
  const res = await hubspotFetch(
    `/crm/v3/objects/contacts?limit=${capped}&properties=email,firstname,lastname,company`
  );
  if (!res.ok) throw new Error(`HUBSPOT_HTTP_${res.status}`);

  const json = (await res.json()) as HubSpotContactsListResponse;
  return (json.results ?? []).map((c) => ({
    email: c.properties?.email ?? "",
    firstName: c.properties?.firstname ?? "",
    lastName: c.properties?.lastname ?? "",
    company: c.properties?.company ?? "",
  }));
}

/**
 * Log a note/activity against a contact. Useful for recording outreach
 * events (emails sent, calls made) so the CRM timeline stays current.
 */
export async function logActivityInHubspot(
  contactId: string,
  subject: string,
  body: string
): Promise<void> {
  // 1. Create the note.
  const noteBody = JSON.stringify({
    properties: {
      hs_timestamp: new Date().toISOString(),
      hs_note_body: `**${subject}**\n\n${body}`,
    },
  });

  const noteRes = await hubspotFetch("/crm/v3/objects/notes", {
    method: "POST",
    body: noteBody,
  });
  if (!noteRes.ok) throw new Error(`HUBSPOT_HTTP_${noteRes.status}`);

  const noteJson = (await noteRes.json()) as HubSpotObjectResponse;
  const noteId = noteJson.id;
  if (!noteId) throw new Error("HUBSPOT_MISSING_NOTE_ID");

  // 2. Associate note → contact.
  const assocRes = await hubspotFetch(
    `/crm/v3/objects/notes/${noteId}/associations/contacts/${contactId}/note_to_contact`,
    { method: "PUT" }
  );
  if (!assocRes.ok) {
    console.error(
      `[hubspot] Note association failed (${assocRes.status}) for note ${noteId} → contact ${contactId}`
    );
  }
}
