import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface MailboxHealth {
  email: string;
  healthScore: number;
  bounceRate: number;
  openRate: number;
  replyRate: number;
  spamComplaints: number;
  totalSent: number;
  totalOpened: number;
  totalReplied: number;
  totalBounced: number;
  recommendation: string | null;
  canSend: boolean;
}

export async function getMailboxHealth(userId: string, email: string): Promise<MailboxHealth> {
  // Query outreach_messages for this user's email stats
  const stats = await db.execute(sql`
    SELECT
      COUNT(*) as total_sent,
      COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as total_opened,
      COUNT(CASE WHEN replied_at IS NOT NULL THEN 1 END) as total_replied,
      COUNT(CASE WHEN status = 'bounced' OR error IS NOT NULL THEN 1 END) as total_bounced
    FROM outreach_messages
    WHERE user_id = ${userId}::uuid
      AND sent_at IS NOT NULL
      AND sent_at > now() - interval '30 days'
  `);

  const row = ((stats as any).rows?.[0] ?? {}) as Record<string, string>;
  const totalSent = parseInt(row.total_sent ?? "0");
  const totalOpened = parseInt(row.total_opened ?? "0");
  const totalReplied = parseInt(row.total_replied ?? "0");
  const totalBounced = parseInt(row.total_bounced ?? "0");

  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
  const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;
  const spamComplaints = 0; // Would need webhook from ESP

  let healthScore = 100;
  healthScore -= totalBounced * 5;
  healthScore -= spamComplaints * 20;
  healthScore += totalReplied > 0 ? Math.min(totalReplied * 2, 20) : 0;
  if (openRate > 30) healthScore += 10;
  healthScore = Math.max(0, Math.min(100, healthScore));

  let recommendation: string | null = null;
  if (healthScore < 30) recommendation = "Sending paused — mailbox needs immediate warmup";
  else if (healthScore < 60) recommendation = "Reduce sending volume and enable email warmup";
  else if (bounceRate > 5) recommendation = "High bounce rate — verify email list quality";

  return {
    email,
    healthScore,
    bounceRate: Math.round(bounceRate * 10) / 10,
    openRate: Math.round(openRate * 10) / 10,
    replyRate: Math.round(replyRate * 10) / 10,
    spamComplaints,
    totalSent,
    totalOpened,
    totalReplied,
    totalBounced,
    recommendation,
    canSend: healthScore >= 30,
  };
}

export function getHealthColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}
