import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId, tone } = await req.json();

    if (!threadId || !tone) {
      return NextResponse.json(
        { error: "threadId and tone are required" },
        { status: 400 }
      );
    }

    // Hardcoded responses per tone for now (no real AI integration)
    const replies: Record<string, string> = {
      professional:
        "Thank you for your interest. I'd be happy to schedule a call at your earliest convenience to walk you through our platform and discuss how we can help your team achieve its goals. Please let me know what times work best for you.",
      friendly:
        "Hey, thanks so much for getting back to me! I'd love to hop on a quick call and show you what we've been building. Super flexible on timing, just let me know what works for you and I'll get something on the calendar!",
      bold:
        "Let's cut to the chase: your team is leaving revenue on the table every day without this. I've blocked 30 minutes on my calendar this week for a no-fluff demo. Pick a slot and I'll show you exactly how we 3x your pipeline.",
    };

    const reply = replies[tone] ?? replies.professional;

    return NextResponse.json({ reply, threadId, tone });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate draft reply" },
      { status: 500 }
    );
  }
}
