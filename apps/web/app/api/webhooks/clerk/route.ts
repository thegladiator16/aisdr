import { NextResponse } from "next/server";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, subscriptions } from "@aisdr/db/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json(
      { ok: false, error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { ok: false, error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const body = await req.text();

  let evt: WebhookEvent;
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("[clerk-webhook] Signature verification failed", err);
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    if (evt.type === "user.created") {
      const data = evt.data;
      const email = data.email_addresses?.[0]?.email_address;

      if (!email) {
        console.error("[clerk-webhook] user.created missing email", data.id);
        return NextResponse.json({ ok: true });
      }

      const fullName = [data.first_name, data.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      // Insert user idempotently on clerkId
      await db
        .insert(users)
        .values({
          clerkId: data.id,
          email,
          fullName: fullName || null,
        })
        .onConflictDoNothing({ target: users.clerkId });

      // Look up the user (whether just inserted or already existed)
      const [dbUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, data.id))
        .limit(1);

      if (!dbUser) {
        console.error(
          "[clerk-webhook] Failed to find user after insert",
          data.id
        );
        return NextResponse.json(
          { ok: false, error: "User upsert failed" },
          { status: 500 }
        );
      }

      // Only create a subscription if one doesn't already exist
      const existing = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(eq(subscriptions.userId, dbUser.id))
        .limit(1);

      if (existing.length === 0) {
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        await db.insert(subscriptions).values({
          userId: dbUser.id,
          tier: "trial",
          status: "trialing",
          trialEndsAt,
          leadsLimit: 10000,
          emailsMonthlyLimit: 10000,
        });
      }

      return NextResponse.json({ ok: true });
    }

    if (evt.type === "user.deleted") {
      const clerkId = evt.data.id;
      if (!clerkId) {
        return NextResponse.json({ ok: true });
      }

      const [dbUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1);

      if (dbUser) {
        await db
          .update(subscriptions)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, dbUser.id));
      }

      return NextResponse.json({ ok: true });
    }

    // Unhandled event type — ack so Clerk doesn't retry
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[clerk-webhook] Handler error", err);
    return NextResponse.json(
      { ok: false, error: "Handler failed" },
      { status: 500 }
    );
  }
}
