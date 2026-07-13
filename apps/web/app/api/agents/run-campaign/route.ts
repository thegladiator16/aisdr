export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  runCampaignGraph,
  isAgentsConfigured,
  type AgentEvent,
} from "@/lib/agents";

/**
 * Streams SSE progress events from a multi-agent campaign run.
 *
 * Request body:
 *   {
 *     goal:        string,                        // free-form
 *     icp:         { industry?, companySize?, jobTitles?, location? },
 *     campaignId?: string,                        // link back to campaigns
 *     channels?:   ("email" | "linkedin" | "whatsapp")[]
 *   }
 *
 * Response:
 *   text/event-stream. Each `data:` line is a JSON `AgentEvent` — the
 *   client's EventSource dispatches these to update the Agent Activity
 *   feed as the orchestrator + specialist agents step through the graph.
 */

const bodySchema = z.object({
  goal: z.string().min(3).max(2000),
  icp: z
    .object({
      industry: z.array(z.string()).optional(),
      companySize: z.array(z.string()).optional(),
      jobTitles: z.array(z.string()).optional(),
      location: z.array(z.string()).optional(),
    })
    .default({}),
  campaignId: z.string().uuid().optional(),
  channels: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isAgentsConfigured()) {
    return new Response(
      JSON.stringify({
        error: "Agents aren't set up on this deployment — ANTHROPIC_API_KEY missing.",
        code: "AGENTS_NOT_CONFIGURED",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AgentEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          /* client already gone — the run itself keeps going in the DB. */
        }
      };

      try {
        await runCampaignGraph(
          {
            userId: user.id,
            campaignId: parsed.data.campaignId ?? null,
            goal: parsed.data.goal,
            icp: parsed.data.icp,
            channels: parsed.data.channels,
          },
          send
        );
      } catch (err) {
        send({
          kind: "run_failed",
          runId: "unknown",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
