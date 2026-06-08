import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { replies, integrations, leads, outreachMessages } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";
import { GmailClient } from "@/lib/integrations/gmail";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
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
        .where(eq(leads.id, reply[0].leadId))
        .limit(1);

      if (!lead[0]?.email) {
        return NextResponse.json({ error: "Lead has no email" }, { status: 400 });
      }

      const gmailIntegration = await db
        .select()
        .from(integrations)
        .where(and(eq(integrations.userId, user.id), eq(integrations.type, "gmail")))
        .limit(1);

      if (!gmailIntegration[0]?.accessToken) {
        return NextResponse.json(
          { error: "Gmail not connected" },
          { status: 400 }
        );
      }

      const gmail = new GmailClient(
        gmailIntegration[0].accessToken,
        gmailIntegration[0].refreshToken ?? ""
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
