export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKeys } from "@aisdr/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureApiKeysSchema } from "../_lib";

// Hard delete — chosen over soft-disable because a user hitting the
// "Delete" button in the settings UI expects the row to disappear from
// the table. `disabledAt` still exists on the schema for future use
// (e.g. an admin-scoped revoke that keeps an audit trail), but the
// user-facing action here removes the key entirely so it can never be
// reactivated.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureApiKeysSchema();

    const [deleted] = await db
      .delete(apiKeys)
      .where(
        and(eq(apiKeys.id, params.id), eq(apiKeys.userId, user.id))
      )
      .returning({ id: apiKeys.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { id: deleted.id } });
  } catch (err) {
    console.error("[api-keys:DELETE] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
