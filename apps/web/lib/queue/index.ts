import { Queue } from "bullmq";
import IORedis from "ioredis";

// Only connect when UPSTASH_REDIS_REST_URL is explicitly provided.
// Falling back to localhost:6379 causes ECONNREFUSED on every serverless
// cold-start because Vercel has no local Redis — that TCP timeout is the
// #1 cause of slow page loads.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;

let _connection: IORedis | null = null;

function getConnection(): IORedis {
  if (_connection) return _connection;
  if (!REDIS_URL) throw new Error("UPSTASH_REDIS_REST_URL is not set — queues unavailable");
  _connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    tls: REDIS_URL.startsWith("rediss://") ? {} : undefined,
  });
  return _connection;
}

export const QUEUES = {
  LEAD_RESEARCH: "lead-research",
  OUTREACH: "outreach",
  REPLY_SYNC: "reply-sync",
  SEQUENCE_ADVANCE: "sequence-advance",
} as const;

function makeQueue(name: string) {
  return new Proxy({} as Queue, {
    get(_t, prop) {
      const q = new Queue(name, { connection: getConnection() as never });
      const v = (q as unknown as Record<string, unknown>)[prop as string];
      return typeof v === "function" ? (v as Function).bind(q) : v;
    },
  });
}

export const leadResearchQueue = makeQueue(QUEUES.LEAD_RESEARCH);
export const outreachQueue = makeQueue(QUEUES.OUTREACH);
export const replySyncQueue = makeQueue(QUEUES.REPLY_SYNC);
export const sequenceAdvanceQueue = makeQueue(QUEUES.SEQUENCE_ADVANCE);

export type LeadResearchJob = {
  leadId: string;
  userId: string;
};

export type OutreachJob = {
  leadId: string;
  campaignId: string;
  userId: string;
  channel: string;
  stepNumber: number;
  sequenceId?: string;
  enrollmentId?: string;
  scheduledAt?: string;
};

export type ReplySyncJob = {
  userId: string;
  integrationId: string;
  since: string;
};

export type SequenceAdvanceJob = {
  enrollmentId: string;
  leadId: string;
  userId: string;
  campaignId: string;
};

export async function enqueueLeadResearch(job: LeadResearchJob) {
  return leadResearchQueue.add("research", job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function enqueueOutreach(job: OutreachJob, delayMs = 0) {
  return outreachQueue.add("send", job, {
    delay: delayMs,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function enqueueReplySync(job: ReplySyncJob) {
  return replySyncQueue.add("sync", job, {
    attempts: 2,
    backoff: { type: "fixed", delay: 30000 },
  });
}
