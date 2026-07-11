import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { agentConfigItems } from "@aisdr/db/schema";
import { and, eq, asc, inArray } from "drizzle-orm";
import { ensureAgentConfigSchema } from "@/app/api/agent-config/_lib";
import { consumeCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Categories from Manage Arya that should influence how Arya answers
// questions in the chat sidebar (banned phrases + custom escalation
// rules + a sampling of knowledge/coaching so the tone reflects the
// user's configured guardrails). This does NOT wire into real outreach
// message generation — that lives in apps/agent-service (Python) and
// is out of scope for this route.
const CHAT_CONTEXT_CATEGORIES = [
  "banned_phrase",
  "escalation_rule",
  "knowledge_item",
  "coaching_point",
] as const;

const MAX_CONTEXT_ITEMS = 10;

async function buildUserGuardrails(userId: string): Promise<string> {
  try {
    await ensureAgentConfigSchema();
    const rows = await db
      .select({
        category: agentConfigItems.category,
        title: agentConfigItems.title,
        content: agentConfigItems.content,
      })
      .from(agentConfigItems)
      .where(
        and(
          eq(agentConfigItems.userId, userId),
          inArray(
            agentConfigItems.category,
            CHAT_CONTEXT_CATEGORIES as unknown as string[]
          )
        )
      )
      .orderBy(asc(agentConfigItems.createdAt))
      .limit(MAX_CONTEXT_ITEMS);

    if (rows.length === 0) return "";

    const labelFor = (cat: string): string => {
      switch (cat) {
        case "banned_phrase":
          return "Never use this phrase";
        case "escalation_rule":
          return "Escalate to a human when";
        case "knowledge_item":
          return "Company knowledge";
        case "coaching_point":
          return "Coaching";
        default:
          return "Guideline";
      }
    };

    const bullets = rows.map((r) => {
      const body = r.content ? ` — ${r.content}` : "";
      return `- [${labelFor(r.category)}] ${r.title}${body}`;
    });

    return [
      "",
      "The user has configured these guardrails and knowledge in Manage Arya. Respect them in every reply:",
      ...bullets,
    ].join("\n");
  } catch (err) {
    console.error("[arya/chat] buildUserGuardrails error:", err);
    return "";
  }
}

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

    const guardrails = await buildUserGuardrails(user.id);
    const systemPrompt =
      `You are Arya, an AI BDR (Business Development Representative) assistant. You help users with their sales outreach campaigns, lead generation, and email strategy. Be helpful, concise, and professional. The user's name is ${user.fullName ?? "there"} and their company is ${user.companyName ?? "their company"}. Keep responses under 3 sentences when possible.` +
      guardrails;

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
        system: systemPrompt,
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

    // Only charge on the success path — canned apology replies from the
    // error branches above are free (the user didn't get real value from
    // them). consumeCredits swallows its own errors, so a credits-log
    // failure won't break the chat response.
    await consumeCredits({
      userId: user.id,
      amount: 1,
      action: "arya_chat_message",
    });

    return NextResponse.json({ reply, creditsConsumed: 1 });
  } catch (err) {
    console.error("[arya/chat] Unhandled error:", err);
    return NextResponse.json({
      reply: "Something went wrong on our side. Please try again.",
    });
  }
}
