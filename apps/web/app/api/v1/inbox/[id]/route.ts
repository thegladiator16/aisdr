import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { replies, integrations, leads, outreachMessages } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { GmailClient, decryptPassword } from "@/lib/integrations/gmail";
import { ensureRepliesColumns } from "@/lib/db/ensure-schema";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    await ensureRepliesColumns();
    const body = await req.json() as { action: "read" | "acted" | "reply"; replyBody?: string };

    if (body.action === "read") {
      await db
        .update(replies)
        .set({ isRead: true })
        .where(and(eq(replies.id, params.id), eq(replies.userId, user.id)));
      return NextResponse.json({ success: true });
    }

    if (body.action === "acted") {
      await db
        .update(replies)
        .set({ isActedOn: true, isRead: true })
        .where(and(eq(replies.id, params.id), eq(replies.userId, user.id)));
      return NextResponse.json({ success: true });
    }

    if (body.action === "reply" && body.replyBody) {
      const reply = await db
        .select()
        .from(replies)
        .where(and(eq(replies.id, params.id), eq(replies.userId, user.id)))
        .limit(1);

      if (!reply[0]) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const lead = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, reply[0].leadId), eq(leads.userId, user.id)))
        .limit(1);

      if (!lead[0]?.email) {
        return NextResponse.json({ error: "Lead has no email" }, { status: 400 });
      }

      const gmailIntegration = await db
        .select()
        .from(integrations)
        .where(and(eq(integrations.userId, user.id), eq(integrations.type, "gmail")))
        .limit(1);

      if (!gmailIntegration[0]?.accessToken || !gmailIntegration[0]?.accountEmail) {
        return NextResponse.json(
          { error: "Gmail not connected" },
          { status: 400 }
        );
      }

      const cfg = (gmailIntegration[0].config ?? {}) as Record<string, unknown>;
      const gmail = new GmailClient(
        gmailIntegration[0].accountEmail,
        decryptPassword(gmailIntegration[0].accessToken),
        gmailIntegration[0].accountName ?? undefined,
        (cfg.smtp_host as string) || undefined,
        (cfg.smtp_port as number) || undefined,
      );

      await gmail.sendEmail({
        to: lead[0].email,
        subject: `Re: ${reply[0].subject ?? "Our conversation"}`,
        body: body.replyBody,
      });

      await db
        .update(replies)
        .set({ isActedOn: true, isRead: true })
        .where(eq(replies.id, params.id));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
