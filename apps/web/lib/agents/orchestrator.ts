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
import {
  agentRuns,
  agentTasks,
  agentLogs,
  leads as leadsTable,
  integrations,
  outreachMessages,
  replyDrafts,
  users,
} from "@/lib/db/schema";
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
import {
  searchCompanies,
  isSerperConfigured,
  type CompanyResearch,
} from "./tools/serper";
import { getBookingLinkForUser, isCalcomConfigured } from "./tools/calcom";
import { GmailClient } from "@/lib/integrations/gmail";

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
  // Populated by persistLeadsForRun after the row is INSERTed into the
  // `leads` table. Downstream nodes (sender) use it as the FK on
  // outreach_messages.lead_id.
  dbId?: string;
  // Populated by the research node when Serper found grounded hits.
  webContext?: CompanyResearch | null;
}

interface Researched {
  leadIndex: number;
  hook: string;
  painPoint: string;
  source?: "web" | "generic";
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

/**
 * Persist a batch of freshly-prospected leads into the `leads` table so
 * later nodes (sender) can foreign-key them from outreach_messages.
 * Best-effort: individual failures are logged but don't sink the run —
 * the sender will just skip any lead that ended up without a dbId.
 *
 * Dedupes by (userId, email) — if a lead with the same email already
 * exists for this user, we reuse it and skip the INSERT.
 */
async function persistLeadsForRun(
  userId: string,
  campaignId: string | null | undefined,
  leadsIn: Lead[]
): Promise<Lead[]> {
  const out: Lead[] = [];
  for (const l of leadsIn) {
    try {
      const email = (l.email ?? "").toLowerCase().trim() || null;

      if (email) {
        // Reuse an existing row for this (user, email) so we don't
        // accumulate duplicates across runs.
        const [existing] = await db
          .select({ id: leadsTable.id })
          .from(leadsTable)
          .where(and(eq(leadsTable.userId, userId), eq(leadsTable.email, email)))
          .limit(1);
        if (existing) {
          out.push({ ...l, dbId: existing.id });
          continue;
        }
      }

      const fullName = [l.firstName, l.lastName].filter(Boolean).join(" ").trim() || null;
      const [row] = await db
        .insert(leadsTable)
        .values({
          userId,
          campaignId: campaignId ?? null,
          firstName: l.firstName || null,
          lastName: l.lastName || null,
          fullName,
          email,
          linkedinUrl: l.linkedin ?? null,
          companyName: l.companyName || null,
          industry: l.industry || null,
          location: l.location || null,
          jobTitle: l.jobTitle || null,
          status: "new",
          source: l.source ?? null,
        })
        .returning({ id: leadsTable.id });
      out.push({ ...l, dbId: row?.id });
    } catch (err) {
      console.error("[agents/persistLeadsForRun] insert failed for", l.email, err);
      out.push(l); // no dbId — sender will skip
    }
  }
  return out;
}

/** Look up the user's Gmail integration + minimal profile in one query. */
async function getUserGmailContext(userId: string): Promise<{
  gmail: {
    accessToken: string;
    refreshToken: string;
    accountEmail: string | null;
  } | null;
  calendarLink: string | null;
}> {
  const [gmailRow] = await db
    .select({
      accessToken: integrations.accessToken,
      refreshToken: integrations.refreshToken,
      accountEmail: integrations.accountEmail,
    })
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.type, "gmail")))
    .limit(1);

  const [userRow] = await db
    .select({ calendarLink: users.calendarLink })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    gmail:
      gmailRow?.accessToken
        ? {
            accessToken: gmailRow.accessToken,
            refreshToken: gmailRow.refreshToken ?? "",
            accountEmail: gmailRow.accountEmail ?? null,
          }
        : null,
    calendarLink: userRow?.calendarLink ?? null,
  };
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
      const rawLeads: Lead[] = hunterLeads.map((h) => ({
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
        `Hunter returned ${rawLeads.length} verified leads with real emails (avg confidence ${Math.round(
          rawLeads.reduce((s, l) => s + (l.confidence ?? 0), 0) / rawLeads.length
        )}%).`
      );

      const leads = await persistLeadsForRun(state.userId, state.campaignId, rawLeads);
      const persisted = leads.filter((l) => l.dbId).length;
      await logTask(
        state.runId,
        taskId,
        `Persisted ${persisted}/${leads.length} leads to the leads table (sender will use these dbIds as outreach_messages FKs).`
      );

      await completeTask(state.runId, taskId, "prospecting", {
        count: leads.length,
        persisted,
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
  const rawLeads: Lead[] = (out.leads ?? []).slice(0, 50).map((l) => ({
    firstName: l.firstName ?? "",
    lastName: l.lastName ?? "",
    jobTitle: l.jobTitle ?? "",
    companyName: l.companyName ?? "",
    industry: l.industry ?? state.icp.industry?.[0] ?? "",
    location: l.location ?? state.icp.location?.[0] ?? "",
    source: "synthesized",
  }));
  const leads = await persistLeadsForRun(state.userId, state.campaignId, rawLeads);
  await logTask(
    state.runId,
    taskId,
    `Returned ${leads.length} synthesised prospects (${leads.filter((l) => l.dbId).length} persisted to DB; no real emails yet — connect Hunter.io to unlock delivery).`
  );
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
    serperConfigured: isSerperConfigured(),
  });
  try {
    let enrichedLeads = state.leads;
    let webHits = 0;

    if (isSerperConfigured() && state.leads.length > 0) {
      await logTask(
        state.runId,
        taskId,
        `Serper.dev configured — searching Google for real news + funding + press per lead…`
      );

      // De-dupe by company so we don't burn our free-tier quota
      // searching the same company N times when N leads share it.
      const uniqueCompanies = new Map<string, { company: string; personName: string; leadIndex: number }>();
      state.leads.forEach((l, i) => {
        const key = (l.companyName || "").toLowerCase().trim();
        if (!key) return;
        if (!uniqueCompanies.has(key)) {
          uniqueCompanies.set(key, {
            company: l.companyName,
            personName: [l.firstName, l.lastName].filter(Boolean).join(" ").trim(),
            leadIndex: i,
          });
        }
      });

      const { results, errors } = await searchCompanies([...uniqueCompanies.values()]);

      // Fan the per-company research back out to every lead at that company.
      const byCompany = new Map<string, CompanyResearch | null>();
      results.forEach((r) => {
        const lead = state.leads[r.leadIndex];
        if (!lead) return;
        byCompany.set((lead.companyName || "").toLowerCase().trim(), r.research);
      });

      enrichedLeads = state.leads.map((l) => {
        const key = (l.companyName || "").toLowerCase().trim();
        const research = byCompany.get(key) ?? null;
        if (research && research.hits.length > 0) webHits++;
        return { ...l, webContext: research };
      });

      await logTask(
        state.runId,
        taskId,
        `Serper found ${webHits} companies with recent web coverage (${uniqueCompanies.size} unique companies queried, ${errors.length} errors).`
      );
      if (errors.length > 0) {
        await logTask(
          state.runId,
          taskId,
          `Partial failures (rate-limit / bad query): ${errors.slice(0, 3).join(" | ")}${errors.length > 3 ? "…" : ""}`
        );
      }
    } else {
      await logTask(
        state.runId,
        taskId,
        `Enriching ${state.leads.length} leads with hooks + pain points (generic mode — add SERPER_API_KEY to unlock real web research)…`
      );
    }

    // Compact payload to Claude — send only fields it needs so we don't
    // bloat the prompt. webContext is the load-bearing new addition.
    const payload = enrichedLeads.map((l, i) => ({
      leadIndex: i,
      firstName: l.firstName,
      lastName: l.lastName,
      jobTitle: l.jobTitle,
      companyName: l.companyName,
      industry: l.industry,
      webContext: l.webContext
        ? {
            hooks: l.webContext.hooks,
            fundingMention: l.webContext.fundingMention,
            topHits: l.webContext.hits.slice(0, 3).map((h) => ({
              title: h.title,
              snippet: h.snippet,
              date: h.date,
            })),
          }
        : null,
    }));

    const out = await callAgent<{ researched: Researched[] }>(
      RESEARCH_PROMPT,
      `Leads:\n${JSON.stringify(payload)}`
    );
    const researched = out.researched ?? [];
    const webGrounded = researched.filter((r) => r.source === "web").length;
    await logTask(
      state.runId,
      taskId,
      `Copywriter will see ${webGrounded} web-grounded hooks and ${researched.length - webGrounded} generic ones.`
    );
    await completeTask(state.runId, taskId, "research", {
      count: researched.length,
      webGrounded,
      companiesWithWebHits: webHits,
      serperConfigured: isSerperConfigured(),
    });
    return { leads: enrichedLeads, researched, sequence: seq };
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
    const schedule = out.schedule ?? [];

    // ---- Real delivery via Gmail ----
    const { gmail } = await getUserGmailContext(state.userId);
    if (!gmail) {
      await logTask(
        state.runId,
        taskId,
        `Gmail not connected — schedule generated but no delivery. Connect Gmail in Settings → Integrations to enable actual sends.`
      );
      await completeTask(state.runId, taskId, "sender", {
        count: schedule.length,
        firstSendAt: schedule[0]?.sendAt ?? null,
        delivered: 0,
        skipped: state.emails.length,
        skippedReason: "gmail_not_connected",
      });
      return { schedule, sequence: seq };
    }

    const gmailClient = new GmailClient(gmail.accessToken, gmail.refreshToken);
    await logTask(
      state.runId,
      taskId,
      `Gmail connected as ${gmail.accountEmail ?? "unknown"} — beginning real delivery…`
    );

    let delivered = 0;
    let skippedNoEmail = 0;
    let failed = 0;
    for (const email of state.emails) {
      const lead = state.leads[email.leadIndex];
      if (!lead) continue;

      const to = (lead.email ?? "").trim();
      if (!to || !lead.dbId) {
        skippedNoEmail++;
        continue;
      }

      // Compose the final body: research hook is already inside
      // email.body per the copywriter prompt; append the CTA + a
      // minimal signature line so replies attach cleanly to the
      // right sender.
      const composedBody = `${email.body}\n\n${email.cta}`;

      try {
        const { messageId, threadId } = await gmailClient.sendEmail({
          to,
          subject: email.subject,
          body: composedBody,
        });

        await db.insert(outreachMessages).values({
          userId: state.userId,
          leadId: lead.dbId,
          campaignId: state.campaignId ?? null,
          agentRunId: state.runId,
          channel: "email",
          stepNumber: 1,
          subject: email.subject,
          body: composedBody,
          aiGenerated: true,
          modelUsed: "claude-sonnet-4-6",
          status: "sent",
          scheduledAt: new Date(),
          sentAt: new Date(),
          externalMessageId: messageId,
          threadId,
        });
        delivered++;
        // Best-effort per-lead log — keep it terse; the sample is
        // captured in the task output for the dashboard.
        if (delivered <= 5 || delivered % 10 === 0) {
          await logTask(
            state.runId,
            taskId,
            `Sent to ${to} via Gmail (message id ${messageId.slice(0, 12)}…, thread ${threadId.slice(0, 12)}…).`
          );
        }
      } catch (err) {
        failed++;
        const errMsg = err instanceof Error ? err.message : String(err);
        try {
          await db.insert(outreachMessages).values({
            userId: state.userId,
            leadId: lead.dbId,
            campaignId: state.campaignId ?? null,
            agentRunId: state.runId,
            channel: "email",
            stepNumber: 1,
            subject: email.subject,
            body: composedBody,
            aiGenerated: true,
            modelUsed: "claude-sonnet-4-6",
            status: "failed",
            error: errMsg.slice(0, 500),
          });
        } catch {
          /* swallow — the log below is enough */
        }
        if (failed <= 3) {
          await logTask(
            state.runId,
            taskId,
            `Gmail send failed for ${to}: ${errMsg.slice(0, 160)}`
          );
        }
      }
    }

    await logTask(
      state.runId,
      taskId,
      `Delivery complete: ${delivered} sent, ${failed} failed, ${skippedNoEmail} skipped (no email).`
    );
    await completeTask(state.runId, taskId, "sender", {
      count: schedule.length,
      firstSendAt: schedule[0]?.sendAt ?? null,
      delivered,
      failed,
      skippedNoEmail,
      gmailAccount: gmail.accountEmail,
    });
    return { schedule, sequence: seq };
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
  draftSubject?: string | null;
}

export interface ReplyContext {
  leadName?: string;
  leadCompany?: string;
  originalSubject?: string;
  originalBody?: string;
}

export async function classifyReply(
  replyBody: string,
  context?: ReplyContext
): Promise<ReplyClassification> {
  const payload = context
    ? {
        replyBody,
        senderName: context.leadName ?? "",
        senderCompany: context.leadCompany ?? "",
        originalSubject: context.originalSubject ?? "",
        originalBody: context.originalBody ?? "",
      }
    : { replyBody };
  return callAgent<ReplyClassification>(
    REPLY_HANDLER_PROMPT,
    JSON.stringify(payload)
  );
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
  bookingLink?: string | null;
}): Promise<MeetingProposal> {
  return callAgent<MeetingProposal>(
    MEETING_BOOKER_PROMPT,
    JSON.stringify({
      lead: context.leadName,
      replyBody: context.replyBody,
      bookingLink: context.bookingLink ?? null,
      today: new Date().toISOString(),
    })
  );
}

/**
 * Full "classify + draft + optionally auto-send" pipeline for a single
 * inbound reply. Used by the handle-replies cron. Returns the created
 * reply_drafts row so the caller can log the outcome.
 *
 * Ownership: the caller is responsible for having already inserted the
 * `replies` row and knowing `replyId` + `leadId`. This helper reads the
 * lead/user context, generates the draft, substitutes booking-link
 * placeholders, writes reply_drafts, and — if `autoSend` is true —
 * sends the draft via Gmail and stamps sent_at.
 */
export async function classifyAndDraftReply(params: {
  userId: string;
  replyId: string;
  replyBody: string;
  replySubject?: string | null;
  replyFromEmail: string;
  replyThreadId?: string | null;
  /** Gmail API opaque id (used only for dedup; not for RFC threading). */
  replyExternalMessageId?: string | null;
  /** RFC 2822 Message-ID header value from the inbound mail, e.g.
   *  <CAAxxx@mail.gmail.com>. Used for In-Reply-To / References headers. */
  rfcMessageId?: string | null;
  leadName: string;
  leadCompany: string;
  originalSubject?: string;
  originalBody?: string;
  autoSend: boolean;
}): Promise<{
  draftId: string | null;
  classification: ReplyClassification;
  autoSent: boolean;
  error?: string;
}> {
  const classification = await classifyReply(params.replyBody, {
    leadName: params.leadName,
    leadCompany: params.leadCompany,
    originalSubject: params.originalSubject,
    originalBody: params.originalBody,
  });

  if (!classification.draftReply) {
    return { draftId: null, classification, autoSent: false };
  }

  // Substitute the booking-link placeholder when present.
  let draftBody = classification.draftReply;
  if (classification.intent === "interested" && draftBody.includes("{{BOOKING_LINK}}")) {
    const { calendarLink } = await getUserGmailContext(params.userId);
    const link = await getBookingLinkForUser(calendarLink);
    if (link) {
      draftBody = draftBody.replace(/\{\{BOOKING_LINK\}\}/g, link.url);
    } else {
      // No link available — strip the placeholder line rather than
      // shipping a literal template artifact to the prospect.
      draftBody = draftBody.replace(/^.*\{\{BOOKING_LINK\}\}.*$/gm, "").trim();
    }
  }

  // Guard: if the body is empty after placeholder substitution, don't
  // auto-send a blank email. Escalate to human instead.
  if (!draftBody.trim()) {
    return {
      draftId: null,
      classification: { ...classification, shouldEscalate: true },
      autoSent: false,
      error: "draft_body_empty_after_substitution",
    };
  }

  const draftSubject =
    classification.draftSubject ??
    (params.replySubject ? `Re: ${params.replySubject.replace(/^Re:\s*/i, "")}` : null);

  const [draftRow] = await db
    .insert(replyDrafts)
    .values({
      userId: params.userId,
      replyId: params.replyId,
      intent: classification.intent,
      draftBody,
      draftSubject: draftSubject ?? null,
    })
    .returning({ id: replyDrafts.id });

  // Auto-send guard — only fire for intents where a machine reply is
  // safe. "other" + "not_interested" + "out_of_office" + "unsubscribe"
  // never auto-send even if the toggle is on.
  const safeToAutoSend =
    params.autoSend &&
    (classification.intent === "interested" || classification.intent === "question") &&
    !classification.shouldEscalate;

  if (!safeToAutoSend) {
    return { draftId: draftRow?.id ?? null, classification, autoSent: false };
  }

  try {
    const { gmail } = await getUserGmailContext(params.userId);
    if (!gmail) {
      return {
        draftId: draftRow?.id ?? null,
        classification,
        autoSent: false,
        error: "gmail_not_connected",
      };
    }
    const gmailClient = new GmailClient(gmail.accessToken, gmail.refreshToken);
    const { messageId } = await gmailClient.sendEmail({
      to: params.replyFromEmail,
      subject: draftSubject ?? "Re:",
      body: draftBody,
      threadId: params.replyThreadId ?? undefined,
      // Use the RFC 2822 Message-ID header (e.g. <CAAxxx@mail.gmail.com>)
      // for In-Reply-To / References — not the Gmail API's opaque msg.id.
      replyToMessageId: params.rfcMessageId ?? undefined,
    });
    await db
      .update(replyDrafts)
      .set({
        autoSent: true,
        sentAt: new Date(),
        externalMessageId: messageId,
      })
      .where(eq(replyDrafts.id, draftRow.id));
    return { draftId: draftRow.id, classification, autoSent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(replyDrafts)
      .set({ error: msg.slice(0, 500) })
      .where(eq(replyDrafts.id, draftRow.id));
    return {
      draftId: draftRow.id,
      classification,
      autoSent: false,
      error: msg,
    };
  }
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
