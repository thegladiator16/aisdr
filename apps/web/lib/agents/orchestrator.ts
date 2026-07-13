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
  PROSPECTING_PROMPT,
  RESEARCH_PROMPT,
  COPYWRITER_PROMPT,
  SENDER_PROMPT,
  REPLY_HANDLER_PROMPT,
  MEETING_BOOKER_PROMPT,
} from "./prompts";

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

let currentOnEvent: OnAgentEvent | null = null;

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
  currentOnEvent?.({
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
  currentOnEvent?.({ kind: "task_log", runId, taskId, message });
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
  currentOnEvent?.({ kind: "task_completed", runId, taskId, agent, data: output });
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
  currentOnEvent?.({ kind: "task_failed", runId, taskId, agent, message: msg });
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

async function prospectingNode(state: StateT): Promise<Partial<StateT>> {
  const seq = state.sequence + 1;
  const taskId = await startTask(state.runId, "prospecting", seq, {
    icp: state.icp,
    audienceSize: state.audienceSize,
  });
  try {
    await logTask(
      state.runId,
      taskId,
      `Searching for ~${state.audienceSize} leads matching ICP…`
    );
    const out = await callAgent<{ leads: Lead[] }>(
      PROSPECTING_PROMPT,
      `ICP: ${JSON.stringify(state.icp)}\nDesired count: ${state.audienceSize}`
    );
    const leads = (out.leads ?? []).slice(0, 50);
    await logTask(state.runId, taskId, `Returned ${leads.length} prospects.`);
    await completeTask(state.runId, taskId, "prospecting", { count: leads.length });
    return { leads, sequence: seq };
  } catch (err) {
    await failTask(state.runId, taskId, "prospecting", err);
  }
  return {};
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

  currentOnEvent = onEvent ?? null;
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
    await db
      .update(agentRuns)
      .set({
        status: "completed",
        output: {
          plan: final.plan,
          leadCount: final.leads.length,
          emailCount: final.emails.length,
          firstSendAt: final.schedule[0]?.sendAt ?? null,
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
    currentOnEvent = null;
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
