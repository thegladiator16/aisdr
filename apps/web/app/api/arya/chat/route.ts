import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { reply: "You need to be signed in to chat with Arya." },
        { status: 200 }
      );
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { reply: "Please type a message and try again." },
        { status: 200 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[arya/chat] ANTHROPIC_API_KEY missing on server");
      return NextResponse.json({
        reply: "I'm not fully configured yet. Please ask your admin to set up ANTHROPIC_API_KEY.",
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
      const errorBody = await response.text().catch(() => "<no body>");
      console.error(
        `[arya/chat] Anthropic API error ${response.status}: ${errorBody.slice(0, 500)}`
      );

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({
          reply: "Arya's AI service isn't authenticated correctly. Please contact support.",
        });
      }
      if (response.status === 429) {
        return NextResponse.json({
          reply: "Arya is a bit overloaded right now. Please try again in a moment.",
        });
      }
      if (response.status >= 500) {
        return NextResponse.json({
          reply: "The AI service is having trouble right now. Please try again shortly.",
        });
      }
      return NextResponse.json({
        reply: "I couldn't process that request. Please rephrase and try again.",
      });
    }

    const data = await response.json();
    const reply =
      data.content?.[0]?.type === "text"
        ? data.content[0].text
        : "I couldn't generate a response. Please try again.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[arya/chat] Unhandled error:", err);
    return NextResponse.json({
      reply: "Something went wrong on our side. Please try again.",
    });
  }
}
