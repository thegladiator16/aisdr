import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { GmailClient, encryptPassword } from "@/lib/integrations/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST — Connect Gmail via SMTP (App Password).
 * Validates the SMTP connection, encrypts the password, and upserts the
 * integration row.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
      smtp_host?: string;
      smtp_port?: number;
    };

    const email = (body.email ?? "").trim();
    const password = (body.password ?? "").trim();
    const name = (body.name ?? "").trim() || email.split("@")[0] || "AryaSDR";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and App Password are required" },
        { status: 400 }
      );
    }

    if (password.replace(/\s/g, "").length !== 16) {
      return NextResponse.json(
        { error: "App Password must be exactly 16 characters (spaces removed)" },
        { status: 400 }
      );
    }

    const host = body.smtp_host || "smtp.gmail.com";
    const port = body.smtp_port || 587;
    const cleanPassword = password.replace(/\s/g, "");

    const client = new GmailClient(email, cleanPassword, name, host, port);
    try {
      await client.verifyConnection();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      return NextResponse.json(
        { error: `SMTP connection failed: ${msg}. Make sure your App Password is correct and IMAP/SMTP is enabled in Gmail settings.` },
        { status: 400 }
      );
    }

    const encrypted = encryptPassword(cleanPassword);

    const [existing] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.userId, user.id), eq(integrations.type, "gmail")))
      .limit(1);

    if (existing) {
      await db
        .update(integrations)
        .set({
          accessToken: encrypted,
          refreshToken: null,
          accountEmail: email,
          accountName: name,
          config: { smtp_host: host, smtp_port: port, connection_type: "smtp" },
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id));
    } else {
      await db.insert(integrations).values({
        userId: user.id,
        type: "gmail",
        accessToken: encrypted,
        accountEmail: email,
        accountName: name,
        config: { smtp_host: host, smtp_port: port, connection_type: "smtp" },
        status: "active",
      });
    }

    return NextResponse.json({ success: true, email });
  } catch (err) {
    console.error("[gmail:connect] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE — Disconnect Gmail SMTP.
 */
export async function DELETE() {
  try {
    const user = await requireUser();

    await db
      .update(integrations)
      .set({
        accessToken: null,
        refreshToken: null,
        accountEmail: null,
        accountName: null,
        config: null,
        status: "inactive",
        updatedAt: new Date(),
      })
      .where(and(eq(integrations.userId, user.id), eq(integrations.type, "gmail")));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[gmail:disconnect] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET — Gmail SMTP connection status.
 */
export async function GET() {
  try {
    const user = await requireUser();

    const [row] = await db
      .select({
        accountEmail: integrations.accountEmail,
        accountName: integrations.accountName,
        status: integrations.status,
        emailsSentToday: integrations.emailsSentToday,
        dailyEmailLimit: integrations.dailyEmailLimit,
      })
      .from(integrations)
      .where(and(eq(integrations.userId, user.id), eq(integrations.type, "gmail")))
      .limit(1);

    if (!row?.accountEmail) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      email: row.accountEmail,
      name: row.accountName,
      status: row.status,
      emailsSentToday: row.emailsSentToday ?? 0,
      dailyEmailLimit: row.dailyEmailLimit ?? null,
    });
  } catch (err) {
    console.error("[gmail:status] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
