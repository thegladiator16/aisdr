import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: "I'm not fully configured yet. Please ask your admin to set up the ANTHROPIC_API_KEY environment variable.",
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: `You are Arya, an AI BDR (Business Development Representative) assistant. You help users with their sales outreach campaigns, lead generation, and email strategy. Be helpful, concise, and professional. The user's name is ${user.fullName ?? "there"} and their company is ${user.companyName ?? "their company"}. Keep responses under 3 sentences when possible.`,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        reply: "I'm having trouble connecting right now. Please try again in a moment.",
      });
    }

    const data = await response.json();
    const reply =
      data.content?.[0]?.type === "text"
        ? data.content[0].text
        : "I couldn't generate a response. Please try again.";

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({
      reply: "Something went wrong. Please try again.",
    });
  }
}
