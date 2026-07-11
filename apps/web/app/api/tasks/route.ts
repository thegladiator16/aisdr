export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, desc, ilike } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, leads, campaigns } from "@aisdr/db/schema";
import { ensureTasksColumns, TASK_TYPES } from "./_lib";

const createTaskSchema = z.object({
  leadId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  taskType: z.enum(TASK_TYPES).default("manual"),
  message: z.string().min(1, "Message is required"),
  dueDate: z.string().min(1).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser().catch((e) => {
      console.error("[tasks:GET] auth failed:", e);
      return null;
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureTasksColumns();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const taskType = searchParams.get("taskType");
    const campaignId = searchParams.get("campaignId");
    const leadId = searchParams.get("leadId");
    const company = searchParams.get("company");

    const conditions = [eq(tasks.userId, user.id)];
    if (status) conditions.push(eq(tasks.status, status));
    if (taskType) conditions.push(eq(tasks.taskType, taskType));
    if (campaignId) conditions.push(eq(tasks.campaignId, campaignId));
    if (leadId) conditions.push(eq(tasks.leadId, leadId));
    if (company) conditions.push(ilike(leads.companyName, `%${company}%`));

    const data = await db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        leadId: tasks.leadId,
        campaignId: tasks.campaignId,
        taskType: tasks.taskType,
        status: tasks.status,
        message: tasks.message,
        dueDate: tasks.dueDate,
        assignedToUserId: tasks.assignedToUserId,
        createdAt: tasks.createdAt,
        leadFirstName: leads.firstName,
        leadLastName: leads.lastName,
        leadFullName: leads.fullName,
        leadEmail: leads.email,
        leadCompanyName: leads.companyName,
        campaignName: campaigns.name,
      })
      .from(tasks)
      .leftJoin(leads, eq(tasks.leadId, leads.id))
      .leftJoin(campaigns, eq(tasks.campaignId, campaigns.id))
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[tasks:GET] DB error:", err);
    return NextResponse.json(
      { data: [], warning: "Could not fetch tasks" },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    await ensureTasksColumns();

    const body = (await req.json()) as unknown;
    const parsed = createTaskSchema.parse(body);

    const result = await db
      .insert(tasks)
      .values({
        userId: user.id,
        leadId: parsed.leadId,
        campaignId: parsed.campaignId,
        taskType: parsed.taskType,
        message: parsed.message,
        status: "pending",
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
      })
      .returning();

    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[tasks:POST] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
