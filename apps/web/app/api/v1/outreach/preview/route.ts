import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { agentClient } from "@/lib/agents/client";
import { db } from "@/lib/db";
import { leads } from "@aisdr/db/schema";
import { eq, and } from "drizzle-orm";

const previewSchema = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(["email", "linkedin_connection", "linkedin_dm", "whatsapp"]),
  stepNumber: z.number().int().min(1).max(10).default(1),
  tone: z
    .enum(["professional_formal", "professional_warm", "casual_friendly", "direct_bold"])
    .default("professional_warm"),
  language: z.string().default("english"),
  goal: z.string().default("book_meeting"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json() as unknown;
    const parsed = previewSchema.parse(body);

    const lead = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, parsed.leadId), eq(leads.userId, user.id)))
      .limit(1);

    if (!lead[0]) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const l = lead[0];
    const message = await agentClient.generateMessage({
      lead_id: l.id,
      channel: parsed.channel,
      step_number: parsed.stepNumber,
      tone: parsed.tone,
      language: parsed.language,
      goal: parsed.goal,
      sender_name: user.fullName ?? "Sales Rep",
      sender_company: user.companyName ?? "Our Company",
      sender_value_proposition: user.valueProposition ?? "",
      sender_calendar_link: user.calendarLink ?? undefined,
      lead_name: l.fullName ?? `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim(),
      lead_company: l.companyName ?? "",
      lead_job_title: l.jobTitle ?? "",
      lead_research: l.researchSummary
        ? {
            lead_id: l.id,
            research_summary: l.researchSummary,
            recent_activity: (l.recentActivity as never[]) ?? [],
            pain_points: (l.painPoints as string[]) ?? [],
            personality_notes: l.personalityNotes ?? "",
            icebreakers: (l.icebreakers as string[]) ?? [],
            score: l.score ?? 50,
            confidence: 70,
          }
        : undefined,
    });

    return NextResponse.json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
