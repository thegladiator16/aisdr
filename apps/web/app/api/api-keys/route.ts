export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKeys } from "@aisdr/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureApiKeysSchema } from "./_lib";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

// Generate a fresh personal API key. Format:
//   "arya_" + base64url(32 random bytes)  → ~48 chars
// keyPrefix is the first 12 chars (e.g. "arya_a1b2c3d") — enough for
// humans to disambiguate at a glance and safe to expose in the UI/URL.
// keyHash is sha256(fullKey), the ONLY thing we persist alongside the
// prefix — the raw key is returned once and then forgotten.
function generateKey(): { key: string; keyPrefix: string; keyHash: string } {
  const raw = crypto.randomBytes(32).toString("base64url");
  const key = `arya_${raw}`;
  const keyPrefix = key.slice(0, 12);
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, keyPrefix, keyHash };
}

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureApiKeysSchema();

    // Deliberately do NOT select keyHash — the settings page has no
    // legitimate reason to see it, and keeping it out of the response
    // means there's no accidental leak path if a component logs the row.
    const rows = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        lastUsedAt: apiKeys.lastUsedAt,
        disabledAt: apiKeys.disabledAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id))
      .orderBy(desc(apiKeys.createdAt));

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[api-keys:GET] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureApiKeysSchema();

    const body = (await req.json()) as unknown;
    const parsed = createSchema.parse(body);

    const { key, keyPrefix, keyHash } = generateKey();

    const [created] = await db
      .insert(apiKeys)
      .values({
        userId: user.id,
        name: parsed.name,
        keyPrefix,
        keyHash,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        createdAt: apiKeys.createdAt,
      });

    // `key` is returned only in this response — the ONLY time the
    // plaintext value ever leaves the server. The UI is expected to
    // show it once behind a "copy to clipboard" affordance and warn
    // the user that it won't be shown again.
    return NextResponse.json(
      {
        data: {
          id: created.id,
          name: created.name,
          keyPrefix: created.keyPrefix,
          createdAt: created.createdAt,
          key,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[api-keys:POST] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
