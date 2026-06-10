import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, campaigns } from "@aisdr/db/schema";
import { and, eq, sql } from "drizzle-orm";

const leadRowSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
});

const bulkSchema = z.object({
  campaignId: z.string().uuid().optional(),
  leads: z.array(leadRowSchema).min(1).max(10000),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as unknown;
    const parsed = bulkSchema.parse(body);

    const rows = parsed.leads
      .map((row) => {
        const fullName =
          row.fullName ??
          ([row.firstName, row.lastName].filter(Boolean).join(" ") ||
            undefined);

        if (!row.email && !fullName) return null;

        return {
          userId: user.id,
          campaignId: parsed.campaignId,
          firstName: row.firstName || undefined,
          lastName: row.lastName || undefined,
          fullName: fullName || undefined,
          email: row.email || undefined,
          companyName: row.companyName || undefined,
          jobTitle: row.jobTitle || undefined,
          status: "new" as const,
          source: "csv_import" as const,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows to import" },
        { status: 400 }
      );
    }

    let imported = 0;
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const result = await db.insert(leads).values(chunk).returning({
        id: leads.id,
      });
      imported += result.length;
    }

    if (parsed.campaignId) {
      await db
        .update(campaigns)
        .set({ totalLeads: sql`${campaigns.totalLeads} + ${imported}` })
        .where(
          and(
            eq(campaigns.id, parsed.campaignId),
            eq(campaigns.userId, user.id)
          )
        );
    }

    return NextResponse.json({
      data: { imported, total: parsed.leads.length },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
