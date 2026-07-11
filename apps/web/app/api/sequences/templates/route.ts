import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { SEQUENCE_TEMPLATES } from "@/lib/sequences/templates";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json({ data: SEQUENCE_TEMPLATES });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
