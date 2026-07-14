import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const WARMUP_SCHEDULE = [
  { day: 1, maxEmails: 5 },
  { day: 7, maxEmails: 5 },
  { day: 8, maxEmails: 10 },
  { day: 14, maxEmails: 10 },
  { day: 15, maxEmails: 20 },
  { day: 21, maxEmails: 20 },
  { day: 22, maxEmails: 40 },
] as const;

export function getDailyLimit(dayNumber: number): number {
  // Find the highest bracket the day falls into
  let limit = 5;
  for (const bracket of WARMUP_SCHEDULE) {
    if (dayNumber >= bracket.day) limit = bracket.maxEmails;
  }
  return limit;
}

export interface WarmupSession {
  id: string;
  userId: string;
  gmailAccount: string;
  status: 'active' | 'paused' | 'completed';
  dayNumber: number;
  emailsSentToday: number;
  healthScore: number;
}

// Content pool for warmup emails - business-like conversations
const WARMUP_SUBJECTS = [
  "Quick question about Q3 projections",
  "Following up on our last discussion",
  "Partnership opportunity - thoughts?",
  "Re: Budget review meeting notes",
  "Team update - project timeline",
  "Invitation: Strategy session next week",
  "FYI: Industry report attached",
  "Thanks for the introduction",
  "Re: Quarterly review action items",
  "Checking in - how's the new initiative going?",
];

const WARMUP_BODIES = [
  "Hi there,\n\nJust wanted to follow up on our conversation from last week. Have you had a chance to review the proposal I sent over?\n\nLet me know if you need any additional details.\n\nBest regards",
  "Hello,\n\nI came across some interesting data that might be relevant to your current project. Would you have 15 minutes this week to discuss?\n\nLooking forward to connecting.\n\nThanks",
  "Hi,\n\nThanks for the great session yesterday. I've compiled the action items and wanted to make sure we're aligned on next steps.\n\nPlease review when you get a chance.\n\nBest",
  "Hello,\n\nI wanted to share an update on the initiative we discussed. We've made significant progress and I think you'll find the results interesting.\n\nHappy to schedule a quick call to walk you through it.\n\nRegards",
  "Hi,\n\nHope you're doing well! I noticed some interesting trends in the market that could affect our strategy. Would love to get your perspective.\n\nLet me know a good time to chat.\n\nCheers",
];

export function getRandomWarmupContent(): { subject: string; body: string } {
  const subject = WARMUP_SUBJECTS[Math.floor(Math.random() * WARMUP_SUBJECTS.length)];
  const body = WARMUP_BODIES[Math.floor(Math.random() * WARMUP_BODIES.length)];
  return { subject, body };
}

export function getWarmupPoolEmails(): string[] {
  const pool = (process.env.WARMUP_POOL_EMAILS ?? "").trim();
  if (!pool) return [];
  return pool.split(",").map(e => e.trim()).filter(Boolean);
}

export function isWarmupConfigured(): boolean {
  return getWarmupPoolEmails().length > 0;
}

// Calculate health score based on warmup session metrics
export function calculateHealthScore(params: {
  totalSent: number;
  totalReplies: number;
  totalBounces: number;
  spamReports: number;
  dayNumber: number;
}): number {
  let score = 0;
  score += Math.min(params.totalSent * 2, 40); // max 40 from sends
  score += Math.min(params.totalReplies * 5, 30); // max 30 from replies
  score -= params.spamReports * 20;
  score -= params.totalBounces * 5;
  // Bonus for consistent warmup days
  score += Math.min(params.dayNumber * 1, 30); // max 30 from consistency
  return Math.max(0, Math.min(100, score));
}

// Ensure warmup tables exist (idempotent DDL)
let tablesEnsured = false;
export async function ensureWarmupTables(): Promise<void> {
  if (tablesEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS warmup_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gmail_account varchar(255) NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'active',
        day_number integer DEFAULT 0,
        emails_sent_today integer DEFAULT 0,
        health_score integer DEFAULT 0,
        started_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_warmup_sessions_user ON warmup_sessions(user_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_warmup_sessions_status ON warmup_sessions(user_id, status);`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS warmup_emails (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid NOT NULL REFERENCES warmup_sessions(id) ON DELETE CASCADE,
        from_email varchar(255) NOT NULL,
        to_email varchar(255) NOT NULL,
        subject varchar(500),
        body text,
        sent_at timestamptz NOT NULL DEFAULT now(),
        replied_at timestamptz,
        status varchar(32) DEFAULT 'sent'
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_warmup_emails_session ON warmup_emails(session_id);`);
    tablesEnsured = true;
  } catch (err) {
    console.error("[warmup] ensureWarmupTables failed:", err);
  }
}
