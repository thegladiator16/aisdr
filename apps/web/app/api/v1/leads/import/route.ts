import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads } from "@aisdr/db/schema";
import { eq, and, inArray } from "drizzle-orm";

type CsvRow = Record<string, string>;

function mapCsvRow(row: CsvRow, userId: string) {
  const firstName = row.first_name ?? row.firstName ?? row["First Name"] ?? "";
  const lastName = row.last_name ?? row.lastName ?? row["Last Name"] ?? "";
  const fullName =
    row.full_name ??
    row.fullName ??
    row["Full Name"] ??
    ([firstName, lastName].filter(Boolean).join(" ") || undefined);

  const email = row.email ?? row.Email ?? undefined;
  if (!email && !fullName) return null;

  return {
    userId,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    fullName: fullName || undefined,
    email: email || undefined,
    phone: row.phone ?? row.Phone ?? undefined,
    linkedinUrl: row.linkedin_url ?? row.linkedin ?? row.LinkedIn ?? undefined,
    companyName: row.company ?? row.company_name ?? row.Company ?? undefined,
    companyWebsite: row.website ?? row.company_website ?? undefined,
    jobTitle: row.title ?? row.job_title ?? row["Job Title"] ?? undefined,
    location: row.location ?? row.Location ?? undefined,
    country: row.country ?? row.Country ?? undefined,
    industry: row.industry ?? row.Industry ?? undefined,
    fundingStage: row.funding_stage ?? row.funding ?? undefined,
    source: "csv_import" as const,
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json() as { rows: CsvRow[] };
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    if (rows.length > 10000) {
      return NextResponse.json(
        { error: "Max 10,000 leads per import" },
        { status: 400 }
      );
    }

    const mapped = rows
      .map((r) => mapCsvRow(r, user.id))
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const emails = mapped
      .map((r) => r.email)
      .filter((e): e is string => Boolean(e));

    const existing = emails.length
      ? await db
          .select({ email: leads.email })
          .from(leads)
          .where(and(eq(leads.userId, user.id), inArray(leads.email, emails)))
      : [];

    const existingEmails = new Set(existing.map((e) => e.email));
    const duplicates = mapped.filter((r) => r.email && existingEmails.has(r.email));
    const toInsert = mapped.filter(
      (r) => !r.email || !existingEmails.has(r.email)
    );

    let imported = 0;
    const errors: string[] = [];

    if (toInsert.length > 0) {
      const chunks = [];
      for (let i = 0; i < toInsert.length; i += 500) {
        chunks.push(toInsert.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        try {
          const result = await db.insert(leads).values(chunk).returning({ id: leads.id });
          imported += result.length;
        } catch (e) {
          errors.push(`Chunk insert failed: ${e instanceof Error ? e.message : "Unknown"}`);
        }
      }
    }

    return NextResponse.json({
      imported,
      duplicates: duplicates.length,
      errors,
      total: rows.length,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
