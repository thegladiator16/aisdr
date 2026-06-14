import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { plan, amount, currency = "INR", type } = body;

  const order = {
    id: "order_" + Math.random().toString(36).substring(2, 11),
    amount: (amount || 0) * 100,
    currency,
    plan: plan || type || "unknown",
    status: "created",
  };

  return NextResponse.json(order);
}
