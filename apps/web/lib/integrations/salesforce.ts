/**
 * Salesforce CRM wrapper — syncs leads, opportunities, and contacts
 * from the pipeline into Salesforce.
 *
 * Uses Node 18+ native fetch (same pattern as hunter.ts / serper.ts).
 *
 * Env: SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET,
 *      SALESFORCE_INSTANCE_URL (e.g. https://na1.salesforce.com)
 *
 * All functions require an OAuth access token (obtained via the OAuth
 * flow at the route layer). Errors surface as sanitised codes
 * ("SALESFORCE_HTTP_401", "SALESFORCE_NOT_CONFIGURED", etc.) so callers
 * can pattern-match without leaking Salesforce's API surface.
 */

const SF_API_VERSION = "v59.0";
const REQUEST_TIMEOUT_MS = 15_000;

/* ------------------------------------------------------------------ */
/*  Public interfaces                                                  */
/* ------------------------------------------------------------------ */

export interface SalesforceLead {
  email: string;
  firstName?: string;
  lastName?: string;
  company: string;
  title?: string;
}

export interface SalesforceOpportunity {
  name: string;
  stageName: string;
  closeDate: string;
  amount?: number;
  contactId?: string;
}

export interface SalesforceContact {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
}

/* ------------------------------------------------------------------ */
/*  Config guard                                                       */
/* ------------------------------------------------------------------ */

export function isSalesforceConfigured(): boolean {
  return !!(process.env.SALESFORCE_INSTANCE_URL ?? "").trim();
}

/* ------------------------------------------------------------------ */
/*  HTTP helper                                                        */
/* ------------------------------------------------------------------ */

function getInstanceUrl(): string {
  const url = (process.env.SALESFORCE_INSTANCE_URL ?? "").trim();
  if (!url) throw new Error("SALESFORCE_NOT_CONFIGURED");
  // Strip trailing slash for consistent path joins.
  return url.replace(/\/+$/, "");
}

async function sfFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const instanceUrl = getInstanceUrl();
  const url = `${instanceUrl}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
/*  Raw Salesforce response shapes                                     */
/* ------------------------------------------------------------------ */

interface SfCreateResponse {
  id?: string;
  success?: boolean;
  errors?: Array<{ message?: string; statusCode?: string }>;
}

interface SfQueryResponse {
  totalSize?: number;
  done?: boolean;
  records?: Array<{
    Id?: string;
    Email?: string;
    FirstName?: string;
    LastName?: string;
    Account?: { Name?: string };
  }>;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Create a Lead in Salesforce. Returns the Salesforce Lead ID.
 */
export async function syncLeadToSalesforce(
  accessToken: string,
  lead: SalesforceLead
): Promise<{ leadId: string }> {
  const body = JSON.stringify({
    Email: lead.email,
    FirstName: lead.firstName ?? "",
    LastName: lead.lastName ?? "Unknown",
    Company: lead.company,
    Title: lead.title ?? "",
  });

  const res = await sfFetch(
    accessToken,
    `/services/data/${SF_API_VERSION}/sobjects/Lead`,
    { method: "POST", body }
  );

  if (!res.ok) throw new Error(`SALESFORCE_HTTP_${res.status}`);

  const json = (await res.json()) as SfCreateResponse;
  if (!json.id) {
    const errMsg = json.errors?.[0]?.statusCode ?? "UNKNOWN";
    throw new Error(`SALESFORCE_CREATE_FAILED:${errMsg}`);
  }
  return { leadId: json.id };
}

/**
 * Create an Opportunity in Salesforce. Returns the Opportunity ID.
 *
 * When `contactId` is provided, creates a ContactRole association so
 * the opportunity shows up on the contact's record.
 */
export async function syncOpportunityToSalesforce(
  accessToken: string,
  params: SalesforceOpportunity
): Promise<{ opportunityId: string }> {
  const body = JSON.stringify({
    Name: params.name,
    StageName: params.stageName,
    CloseDate: params.closeDate,
    ...(params.amount != null ? { Amount: params.amount } : {}),
  });

  const res = await sfFetch(
    accessToken,
    `/services/data/${SF_API_VERSION}/sobjects/Opportunity`,
    { method: "POST", body }
  );

  if (!res.ok) throw new Error(`SALESFORCE_HTTP_${res.status}`);

  const json = (await res.json()) as SfCreateResponse;
  if (!json.id) {
    const errMsg = json.errors?.[0]?.statusCode ?? "UNKNOWN";
    throw new Error(`SALESFORCE_CREATE_FAILED:${errMsg}`);
  }

  const opportunityId = json.id;

  // If a contactId was provided, link the contact to the opportunity
  // via OpportunityContactRole. Non-fatal — log and continue.
  if (params.contactId) {
    try {
      const roleBody = JSON.stringify({
        OpportunityId: opportunityId,
        ContactId: params.contactId,
        IsPrimary: true,
      });
      const roleRes = await sfFetch(
        accessToken,
        `/services/data/${SF_API_VERSION}/sobjects/OpportunityContactRole`,
        { method: "POST", body: roleBody }
      );
      if (!roleRes.ok) {
        console.error(
          `[salesforce] ContactRole link failed (${roleRes.status}) for opp ${opportunityId} → contact ${params.contactId}`
        );
      }
    } catch (err) {
      console.error("[salesforce] ContactRole association error:", err);
    }
  }

  return { opportunityId };
}

/**
 * Query contacts from Salesforce via SOQL. Returns up to `limit`
 * contacts with their account (company) name.
 */
export async function queryContacts(
  accessToken: string,
  limit = 50
): Promise<SalesforceContact[]> {
  const capped = Math.min(Math.max(limit, 1), 200);
  const soql = `SELECT Email,FirstName,LastName,Account.Name FROM Contact LIMIT ${capped}`;
  const encodedQuery = encodeURIComponent(soql);

  const res = await sfFetch(
    accessToken,
    `/services/data/${SF_API_VERSION}/query?q=${encodedQuery}`
  );
  if (!res.ok) throw new Error(`SALESFORCE_HTTP_${res.status}`);

  const json = (await res.json()) as SfQueryResponse;
  return (json.records ?? []).map((r) => ({
    email: r.Email ?? "",
    firstName: r.FirstName ?? "",
    lastName: r.LastName ?? "",
    company: r.Account?.Name ?? "",
  }));
}
