/**
 * Multi-agent orchestration graph. Uses LangGraph.js StateGraph so the
 * seven specialised agents are real nodes with typed state edges — not
 * a hand-rolled switch statement. Each node:
 *
 *   1. INSERTs an agent_tasks row (status: running) so the UI can render
 *      progress in real time.
 *   2. Calls Claude Sonnet 4.6 with the prompt from prompts.ts.
 *   3. Parses the JSON envelope (agents are constrained to structured
 *      output — a failed parse becomes an error_message on the task).
 *   4. Appends agent_logs entries as it goes.
 *   5. UPDATEs the task row to status: completed | failed and returns a
 *      state slice.
 *
 * The `run` entry point wraps a complete graph invocation, creates the
 * parent agent_runs row, streams events via an onEvent callback so the
 * /api/agents/run-campaign SSE route can forward them to the client, and
 * marks the run completed | failed at the end.
 *
 * Reply-handler + meeting-booker are exposed as standalone async fns
 * (not part of the outbound graph) — they run from the hourly
 * /api/agents/handle-replies cron over already-received inbound replies.
 */

import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { agentRuns, agentTasks, agentLogs } from "@/lib/db/schema";
import { ensureAgentTables } from "./schema";
import { agentLLM, isAgentsConfigured } from "./llm";
import {
  ORCHESTRATOR_PROMPT,
  ICP_TO_COMPANIES_PROMPT,
  PROSPECTING_PROMPT,
  RESEARCH_PROMPT,
  COPYWRITER_PROMPT,
  SENDER_PROMPT,
  REPLY_HANDLER_PROMPT,
  MEETING_BOOKER_PROMPT,
} from "./prompts";
import { findByCompanies, isHunterConfigured } from "./tools/hunter";

/* ---------- Types ---------- */

export interface AgentEvent {
  kind:
    | "run_started"
    | "task_started"
    | "task_log"
    | "task_completed"
    | "task_failed"
    | "run_completed"
    | "run_failed";
  runId: string;
  taskId?: string;
  agent?: string;
  message?: string;
  data?: unknown;
}

export type OnAgentEvent = (e: AgentEvent) => void;

export interface RunInput {
  userId: string;
  campaignId?: string | null;
  goal: string;
  icp: {
    industry?: string[];
    companySize?: string[];
    jobTitles?: string[];
    location?: string[];
  };
  channels?: string[];
}

interface Lead {
  firstName: string;
  lastName: string;
  jobTitle: string;
  companyName: string;
  industry: string;
  location: string;
  // Present when the lead came from Hunter.io; absent for synthesised
  // fallback leads. `source` lets the copywriter tell the difference so
  // it can call out demo-mode runs.
  email?: string;
  confidence?: number;
  linkedin?: string | null;
  source?: "hunter" | "synthesized";
}

interface Researched {
  leadIndex: number;
  hook: string;
  painPoint: string;
}

interface Email {
  leadIndex: number;
  subject: string;
  body: string;
  cta: string;
  variant: "A" | "B";
}

interface Scheduled {
  leadIndex: number;
  sendAt: string;
  sequenceStep: 1 | 2 | 3;
}

/* ---------- LangGraph state annotation ---------- */

const AgentState = Annotation.Root({
  runId: Annotation<string>(),
  userId: Annotation<string>(),
  campaignId: Annotation<string | null | undefined>(),
  goal: Annotation<string>(),
  icp: Annotation<RunInput["icp"]>(),
  channels: Annotation<string[]>({ reducer: (_a, b) => b, default: () => ["email"] }),
  sequence: Annotation<number>({ reducer: (a, b) => (b ?? a ?? 0), default: () => 0 }),
  plan: Annotation<string[]>({ reducer: (_a, b) => b, default: () => [] }),
  audienceSize: Annotation<number>({ reducer: (_a, b) => b, default: () => 0 }),
  leads: Annotation<Lead[]>({ reducer: (_a, b) => b, default: () => [] }),
  researched: Annotation<Researched[]>({ reducer: (_a, b) => b, default: () => [] }),
  emails: Annotation<Email[]>({ reducer: (_a, b) => b, default: () => [] }),
  schedule: Annotation<Scheduled[]>({ reducer: (_a, b) => b, default: () => [] }),
});

type StateT = typeof AgentState.State;

/* ---------- Helpers ---------- */

// runId → onEvent — a warm serverless container can hold two concurrent
// runs (two overlapping SSE connections). A module-level singleton was
// clobbering the earlier run's SSE stream when the later run arrived;
// keying by runId keeps them isolated.
const eventSinks = new Map<string, OnAgentEvent>();

function emit(runId: string, e: AgentEvent): void {
  eventSinks.get(runId)?.(e);
}

async function startTask(
  runId: string,
  agent: string,
  sequence: number,
  input: unknown
): Promise<string> {
  const [row] = await db
    .insert(agentTasks)
    .values({
      runId,
      agentName: agent,
      status: "running",
      sequence,
      input: input as Record<string, unknown>,
    })
    .returning({ id: agentTasks.id });
  emit(runId, {
    kind: "task_started",
    runId,
    taskId: row.id,
    agent,
    message: `${agent} started`,
  });
  return row.id;
}

async function logTask(runId: string, taskId: string, message: string): Promise<void> {
  await db.insert(agentLogs).values({ taskId, message, level: "info" });
  emit(runId, { kind: "task_log", runId, taskId, message });
}

async function completeTask(
  runId: string,
  taskId: string,
  agent: string,
  output: unknown
): Promise<void> {
  await db
    .update(agentTasks)
    .set({ status: "completed", output: output as Record<string, unknown>, completedAt: new Date() })
    .where(eq(agentTasks.id, taskId));
  emit(runId, { kind: "task_completed", runId, taskId, agent, data: output });
}

async function failTask(
  runId: string,
  taskId: string,
  agent: string,
  err: unknown
): Promise<never> {
  const msg = err instanceof Error ? err.message : String(err);
  await db
    .update(agentTasks)
    .set({ status: "failed", errorMessage: msg, completedAt: new Date() })
    .where(eq(agentTasks.id, taskId));
  await db.insert(agentLogs).values({ taskId, level: "error", message: msg });
  emit(runId, { kind: "task_failed", runId, taskId, agent, message: msg });
  throw new Error(`${agent}: ${msg}`);
}

/** Round-trip Claude with a system prompt + user context, parse the JSON
 *  envelope. Every agent's response is contracted to be a bare JSON object
 *  (prompts enforce "ONLY the JSON object"). We strip common code fences
 *  before parsing so a stray ```json ``` wrap doesn't crash the run. */
async function callAgent<T>(system: string, user: string): Promise<T> {
  const model = agentLLM();
  const res = await model.invoke([
    new SystemMessage(system),
    new HumanMessage(user),
  ]);
  const raw =
    typeof res.content === "string"
      ? res.content
      : res.content
          .map((c: { type?: string; text?: string }) =>
            c.type === "text" ? c.text ?? "" : ""
          )
          .join("");
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(stripped) as T;
}

/* ---------- Nodes ---------- */

async function orchestratorNode(state: StateT): Promise<Partial<StateT>> {
  const seq = state.sequence + 1;
  const taskId = await startTask(state.runId, "orchestrator", seq, {
    goal: state.goal,
    icp: state.icp,
  });
  try {
    await logTask(state.runId, taskId, "Decomposing goal into a plan…");
    const out = await callAgent<{
      plan: string[];
      audienceSize: number;
      channels: string[];
    }>(
      ORCHESTRATOR_PROMPT,
      `Goal: ${state.goal}\nICP: ${JSON.stringify(state.icp)}`
    );
    await completeTask(state.runId, taskId, "orchestrator", out);
    return {
      plan: out.plan ?? [],
      audienceSize: out.audienceSize ?? 20,
      channels: out.channels?.length ? out.channels : ["email"],
      sequence: seq,
    };
  } catch (err) {
    await failTask(state.runId, taskId, "orchestrator", err);
  }
  return {};
}

/**
 * Prospecting node — two-path strategy.
 *
 * Primary (HUNTER_API_KEY set): ask Claude for a list of REAL company
 * names that fit the ICP, fan those out to Hunter.io's Domain Search in
 * parallel, aggregate + dedupe. Result: leads with real emails +
 * Hunter's own confidence score.
 *
 * Fallback (no HUNTER_API_KEY, or Hunter returned zero hits): synthesise
 * plausible prospects via PROSPECTING_PROMPT so the graph can finish and
 * the copywriter has something to work with. These leads are marked
 * source: "synthesized" so downstream nodes can distinguish them.
 */
async function prospectingNode(state: StateT): Promise<Partial<StateT>> {
  const seq = state.sequence + 1;
  const taskId = await startTask(state.runId, "prospecting", seq, {
    icp: state.icp,
    audienceSize: state.audienceSize,
    hunterConfigured: isHunterConfigured(),
  });

  try {
    if (isHunterConfigured()) {
      await logTask(
        state.runId,
        taskId,
        "Hunter.io configured — asking Claude for target companies matching the ICP…"
      );
      const { companies } = await callAgent<{ companies: string[] }>(
        ICP_TO_COMPANIES_PROMPT,
        `ICP: ${JSON.stringify(state.icp)}\nGoal: ${state.goal}\nRoughly need: ${state.audienceSize} leads`
      );
      // Keep any non-empty trimmed name — 2-char legitimate companies
      // like "3M", "GE", "HP", "BP", "IBM" (yes, 3 but still) must not
      // be dropped by an overzealous length filter.
      const targetCompanies = (companies ?? [])
        .map((c) => (typeof c === "string" ? c.trim() : ""))
        .filter((c) => c.length > 0);
      await logTask(
        state.runId,
        taskId,
        `Target companies (${targetCompanies.length}): ${targetCompanies.slice(0, 8).join(", ")}${targetCompanies.length > 8 ? "…" : ""}`
      );

      if (targetCompanies.length === 0) {
        await logTask(
          state.runId,
          taskId,
          "Claude returned no target companies — falling back to synthesised prospects."
        );
        return await fallbackProspecting(state, taskId, seq);
      }

      const roleForHunter = state.icp.jobTitles?.[0];
      const totalTarget = Math.min(Math.max(state.audienceSize || 10, 5), 50);
      const perCompany = Math.max(
        2,
        Math.ceil(totalTarget / Math.max(targetCompanies.length, 1))
      );

      await logTask(
        state.runId,
        taskId,
        `Calling Hunter.io Domain Search for ${targetCompanies.length} companies (up to ${perCompany}/co, ${totalTarget} total)…`
      );
      const { leads: hunterLeads, errors } = await findByCompanies(
        targetCompanies,
        roleForHunter,
        perCompany,
        totalTarget
      );

      // Detect "the key itself is bad" (401 / 403) vs. individual
      // company misses. If EVERY Hunter call failed with an auth error,
      // silently falling back to synthesised leads would hide a
      // configuration bug from a paying user — surface it as a task
      // failure instead.
      const authErrorCount = errors.filter((e) =>
        /HUNTER_HTTP_(401|403)/.test(e)
      ).length;
      if (
        authErrorCount > 0 &&
        authErrorCount === errors.length &&
        hunterLeads.length === 0
      ) {
        throw new Error(
          `Hunter.io rejected every request with auth error (${authErrorCount}/${targetCompanies.length}) — check HUNTER_API_KEY.`
        );
      }

      if (errors.length > 0) {
        await logTask(
          state.runId,
          taskId,
          `Hunter reported ${errors.length} partial failures (bad domain / rate limit / etc.) — continuing with the ${hunterLeads.length} that came back.`
        );
      }

      if (hunterLeads.length === 0) {
        await logTask(
          state.runId,
          taskId,
          "Hunter returned zero leads across all target companies — falling back to synthesised prospects so the run can complete."
        );
        return await fallbackProspecting(state, taskId, seq);
      }

      const industryTag = state.icp.industry?.[0] ?? "";
      const locationTag = state.icp.location?.[0] ?? "";
      const leads: Lead[] = hunterLeads.map((h) => ({
        firstName: h.firstName ?? "",
        lastName: h.lastName ?? "",
        // Never fall back to the ICP's role here — the copywriter will
        // read jobTitle back verbatim into the email opener, and
        // labelling an intern "VP of Sales" because that's what the ICP
        // asked for is the worst kind of hallucination in a cold email.
        jobTitle: h.position ?? "",
        companyName: h.company ?? "",
        industry: industryTag,
        location: locationTag,
        email: h.email,
        confidence: h.confidence,
        linkedin: h.linkedin,
        source: "hunter",
      }));

      await logTask(
        state.runId,
        taskId,
        `Hunter returned ${leads.length} verified leads with real emails (avg confidence ${Math.round(
          leads.reduce((s, l) => s + (l.confidence ?? 0), 0) / leads.length
        )}%).`
      );
      await completeTask(state.runId, taskId, "prospecting", {
        count: leads.length,
        source: "hunter",
        companiesTried: targetCompanies.length,
        hunterErrors: errors.length,
        sampleEmails: leads.slice(0, 3).map((l) => l.email),
      });
      return { leads, sequence: seq };
    }

    await logTask(
      state.runId,
      taskId,
      "HUNTER_API_KEY not configured — synthesising plausible prospects (demo mode). Add HUNTER_API_KEY to unlock real emails."
    );
    return await fallbackProspecting(state, taskId, seq);
  } catch (err) {
    await failTask(state.runId, taskId, "prospecting", err);
  }
  return {};
}

/** Fallback lead generation via the LLM. Used when HUNTER_API_KEY is
 *  missing, when Claude fails to name any target companies, or when
 *  every Hunter call comes up empty. */
async function fallbackProspecting(
  state: StateT,
  taskId: string,
  seq: number
): Promise<Partial<StateT>> {
  const out = await callAgent<{ leads: Partial<Lead>[] }>(
    PROSPECTING_PROMPT,
    `ICP: ${JSON.stringify(state.icp)}\nDesired count: ${state.audienceSize}`
  );
  // Normalise — Claude occasionally drops a field when the prompt
  // drifts. The rest of the graph assumes strings, not undefined, so
  // we backfill empty strings here to keep downstream nodes safe.
  const leads: Lead[] = (out.leads ?? []).slice(0, 50).map((l) => ({
    firstName: l.firstName ?? "",
    lastName: l.lastName ?? "",
    jobTitle: l.jobTitle ?? "",
    companyName: l.companyName ?? "",
    industry: l.industry ?? state.icp.industry?.[0] ?? "",
    location: l.location ?? state.icp.location?.[0] ?? "",
    source: "synthesized",
  }));
  await logTask(state.runId, taskId, `Returned ${leads.length} synthesised prospects.`);
  await completeTask(state.runId, taskId, "prospecting", {
    count: leads.length,
    source: "synthesized",
  });
  return { leads, sequence: seq };
}

async function researchNode(state: StateT): Promise<Partial<StateT>> {
  const seq = state.sequence + 1;
  const taskId = await startTask(state.runId, "research", seq, {
    leadCount: state.leads.length,
  });
  try {
    await logTask(
      state.runId,
      taskId,
      `Enriching ${state.leads.length} leads with hooks + pain points…`
    );
    const out = await callAgent<{ researched: Researched[] }>(
      RESEARCH_PROMPT,
      `Leads:\n${JSON.stringify(state.leads)}`
    );
    await completeTask(state.runId, taskId, "research", {
      count: out.researched?.length ?? 0,
    });
    return { researched: out.researched ?? [], sequence: seq };
  } catch (err) {
    await failTask(state.runId, taskId, "research", err);
  }
  return {};
}

async function copywriterNode(state: StateT): Promise<Partial<StateT>> {
  const seq = state.sequence + 1;
  const taskId = await startTask(state.runId, "copywriter", seq, {
    leadCount: state.leads.length,
  });
  try {
    await logTask(
      state.runId,
      taskId,
      `Writing hyper-personalised emails with A/Z variants…`
    );
    // Zip leads with researched by index so the copywriter has the full
    // context in one payload.
    const context = state.leads.map((l, i) => ({
      leadIndex: i,
      lead: l,
      research: state.researched.find((r) => r.leadIndex === i),
    }));
    const out = await callAgent<{ emails: Email[] }>(
      COPYWRITER_PROMPT,
      `Prospects with research:\n${JSON.stringify(context)}`
    );
    await completeTask(state.runId, taskId, "copywriter", {
      count: out.emails?.length ?? 0,
    });
    return { emails: out.emails ?? [], sequence: seq };
  } catch (err) {
    await failTask(state.runId, taskId, "copywriter", err);
  }
  return {};
}

async function senderNode(state: StateT): Promise<Partial<StateT>> {
  const seq = state.sequence + 1;
  const taskId = await startTask(state.runId, "sender", seq, {
    emailCount: state.emails.length,
  });
  try {
    await logTask(
      state.runId,
      taskId,
      `Scheduling ${state.emails.length} sends across the window…`
    );
    const out = await callAgent<{ schedule: Scheduled[] }>(
      SENDER_PROMPT,
      `Emails to schedule:\n${JSON.stringify(state.emails)}\nStart from: ${new Date().toISOString()}`
    );
    // TODO: wire the actual send (Gmail integration exists in
    // /api/v1/integrations/gmail — plug the schedule into
    // outreach_messages rows once ready).
    await logTask(
      state.runId,
      taskId,
      `Schedule generated. Delivery will happen via the outreach queue once Gmail send is wired.`
    );
    await completeTask(state.runId, taskId, "sender", {
      count: out.schedule?.length ?? 0,
      firstSendAt: out.schedule?.[0]?.sendAt ?? null,
    });
    return { schedule: out.schedule ?? [], sequence: seq };
  } catch (err) {
    await failTask(state.runId, taskId, "sender", err);
  }
  return {};
}

/* ---------- Graph ---------- */

function buildGraph() {
  return new StateGraph(AgentState)
    .addNode("orchestrator", orchestratorNode)
    .addNode("prospecting", prospectingNode)
    .addNode("research", researchNode)
    .addNode("copywriter", copywriterNode)
    .addNode("sender", senderNode)
    .addEdge(START, "orchestrator")
    .addEdge("orchestrator", "prospecting")
    .addEdge("prospecting", "research")
    .addEdge("research", "copywriter")
    .addEdge("copywriter", "sender")
    .addEdge("sender", END)
    .compile();
}

/* ---------- Public entry ---------- */

export async function runCampaignGraph(
  input: RunInput,
  onEvent?: OnAgentEvent
): Promise<{ runId: string; status: "completed" | "failed"; error?: string }> {
  await ensureAgentTables();
  if (!isAgentsConfigured()) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const [run] = await db
    .insert(agentRuns)
    .values({
      userId: input.userId,
      campaignId: input.campaignId ?? null,
      goal: input.goal,
      input: input.icp as Record<string, unknown>,
      status: "running",
    })
    .returning({ id: agentRuns.id });

  if (onEvent) eventSinks.set(run.id, onEvent);
  onEvent?.({ kind: "run_started", runId: run.id, message: "Autonomous run started" });

  const graph = buildGraph();
  try {
    const final = await graph.invoke({
      runId: run.id,
      userId: input.userId,
      campaignId: input.campaignId ?? null,
      goal: input.goal,
      icp: input.icp,
      channels: input.channels ?? ["email"],
      sequence: 0,
      plan: [],
      audienceSize: 0,
      leads: [],
      researched: [],
      emails: [],
      schedule: [],
    });
    const leadSource = final.leads.find((l) => l.source)?.source ?? "unknown";
    await db
      .update(agentRuns)
      .set({
        status: "completed",
        output: {
          plan: final.plan,
          leadCount: final.leads.length,
          emailCount: final.emails.length,
          firstSendAt: final.schedule[0]?.sendAt ?? null,
          leadSource,
          sampleLeads: final.leads.slice(0, 5).map((l) => ({
            name: [l.firstName, l.lastName].filter(Boolean).join(" ").trim(),
            title: l.jobTitle || "",
            company: l.companyName || "",
            email: l.email ?? null,
            confidence: l.confidence ?? null,
          })),
        },
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentRuns.id, run.id));
    onEvent?.({
      kind: "run_completed",
      runId: run.id,
      data: { leadCount: final.leads.length, emailCount: final.emails.length },
    });
    return { runId: run.id, status: "completed" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(agentRuns)
      .set({
        status: "failed",
        errorMessage: msg,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentRuns.id, run.id));
    onEvent?.({ kind: "run_failed", runId: run.id, message: msg });
    return { runId: run.id, status: "failed", error: msg };
  } finally {
    eventSinks.delete(run.id);
  }
}

/* ---------- Reply handler + meeting booker (standalone) ---------- */

export interface ReplyClassification {
  intent:
    | "interested"
    | "not_interested"
    | "question"
    | "out_of_office"
    | "unsubscribe"
    | "other";
  sentiment: "positive" | "neutral" | "negative";
  shouldEscalate: boolean;
  draftReply: string | null;
}

export async function classifyReply(replyBody: string): Promise<ReplyClassification> {
  return callAgent<ReplyClassification>(REPLY_HANDLER_PROMPT, `Reply body:\n${replyBody}`);
}

export interface MeetingProposal {
  subject: string;
  body: string;
  proposedTimes: string[];
  calendarLink: string | null;
}

export async function proposeMeeting(context: {
  leadName: string;
  replyBody: string;
}): Promise<MeetingProposal> {
  return callAgent<MeetingProposal>(
    MEETING_BOOKER_PROMPT,
    `Lead: ${context.leadName}\nReply that indicated interest:\n${context.replyBody}\nToday: ${new Date().toISOString()}`
  );
}

/* ---------- Convenience readers ---------- */

export async function listRuns(userId: string, limit = 50) {
  await ensureAgentTables();
  return db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.userId, userId))
    .orderBy(desc(agentRuns.startedAt))
    .limit(limit);
}

export async function getRunDetail(userId: string, runId: string) {
  await ensureAgentTables();
  const [run] = await db
    .select()
    .from(agentRuns)
    .where(and(eq(agentRuns.id, runId), eq(agentRuns.userId, userId)))
    .limit(1);
  if (!run) return null;
  const tasks = await db
    .select()
    .from(agentTasks)
    .where(eq(agentTasks.runId, runId))
    .orderBy(agentTasks.sequence);
  const taskIds = tasks.map((t) => t.id);
  const logs =
    taskIds.length === 0
      ? []
      : await db
          .select()
          .from(agentLogs)
          .where(sql`${agentLogs.taskId} = ANY(${taskIds})`)
          .orderBy(agentLogs.createdAt);
  return { run, tasks, logs };
}
