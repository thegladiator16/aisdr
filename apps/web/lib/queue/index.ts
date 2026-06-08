import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? "redis://localhost:6379";

export const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: REDIS_URL.startsWith("rediss://") ? {} : undefined,
});

export const QUEUES = {
  LEAD_RESEARCH: "lead-research",
  OUTREACH: "outreach",
  REPLY_SYNC: "reply-sync",
  SEQUENCE_ADVANCE: "sequence-advance",
} as const;

export const leadResearchQueue = new Queue(QUEUES.LEAD_RESEARCH, { connection });
export const outreachQueue = new Queue(QUEUES.OUTREACH, { connection });
export const replySyncQueue = new Queue(QUEUES.REPLY_SYNC, { connection });
export const sequenceAdvanceQueue = new Queue(QUEUES.SEQUENCE_ADVANCE, { connection });

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
