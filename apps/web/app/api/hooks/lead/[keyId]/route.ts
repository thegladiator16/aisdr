export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { apiKeys, leads } from "@aisdr/db/schema";
import { eq } from "drizzle-orm";
import { ensureApiKeysSchema } from "../../../api-keys/_lib";

// Inbound-lead webhook body — deliberately permissive because external
// systems (Zapier, form providers, CRMs) rarely produce a clean shape.
// Everything except `email` is optional so a "just capture the address"
// form still succeeds.
const bodySchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  fullName: z.string().max(500).optional(),
  companyName: z.string().max(500).optional(),
  jobTitle: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  campaignId: z.string().uuid().optional(),
});

// Constant-time compare to avoid a timing side-channel that could
// otherwise leak the hash byte-by-byte across many probes.
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    await ensureApiKeysSchema();

    // Accept the key from either the `x-arya-key` header (preferred for
    // scripts / CRMs) or the `?key=` query param (preferred for Zapier
    // and other tools that can only send GET-like query strings on the
    // outbound side). Header wins if both are set.
    const headerKey = req.headers.get("x-arya-key");
    const queryKey = req.nextUrl.searchParams.get("key");
    const providedKey = (headerKey ?? queryKey ?? "").trim();

    if (!providedKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    // The [keyId] URL segment is the 12-char plaintext prefix (e.g.
    // "arya_a1b2c3d") — same value stored in api_keys.key_prefix. This
    // gives us a fast, indexed initial lookup that scopes the sha256
    // check to (at most) one candidate row per user, without ever
    // needing to scan the full table by hash.
    const prefix = params.keyId;
    if (!prefix || prefix.length !== 12 || !prefix.startsWith("arya_")) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Reject early if the caller's provided key doesn't even carry the
    // same prefix as the URL — protects against a malformed request
    // rather than a real attack, but keeps error semantics clean.
    if (!providedKey.startsWith(prefix)) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const providedHash = crypto
      .createHash("sha256")
      .update(providedKey)
      .digest("hex");

    const [row] = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        keyHash: apiKeys.keyHash,
        disabledAt: apiKeys.disabledAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.keyPrefix, prefix))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    if (row.disabledAt) {
      return NextResponse.json({ error: "API key disabled" }, { status: 401 });
    }

    if (!timingSafeEqualHex(providedHash, row.keyHash)) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = bodySchema.parse(body);

    // Scope every inserted lead to the key's owning user. `source` is
    // hard-coded to "webhook" so the leads table can be filtered/reported
    // on for inbound-webhook traffic separately from imported CSVs and
    // enriched leads.
    const [inserted] = await db
      .insert(leads)
      .values({
        userId: row.userId,
        campaignId: parsed.campaignId ?? null,
        email: parsed.email,
        firstName: parsed.firstName ?? null,
        lastName: parsed.lastName ?? null,
        fullName: parsed.fullName ?? null,
        companyName: parsed.companyName ?? null,
        jobTitle: parsed.jobTitle ?? null,
        phone: parsed.phone ?? null,
        source: "webhook",
        status: "new",
      })
      .returning({ id: leads.id });

    // Best-effort lastUsedAt update — a failed timestamp write must not
    // fail the whole request, since the lead has already been persisted.
    db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, row.id))
      .catch((err) => {
        console.error("[hooks/lead:lastUsedAt] update failed:", err);
      });

    return NextResponse.json(
      { leadId: inserted.id },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[hooks/lead:POST] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
