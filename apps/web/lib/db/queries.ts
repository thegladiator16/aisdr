import { eq, and, desc, count, sql } from "drizzle-orm";
import { db } from "./index";
import {
  users,
  leads,
  campaigns,
  outreachMessages,
  replies,
  meetings,
  integrations,
  subscriptions,
} from "@aisdr/db/schema";

export async function getUserByClerkId(clerkId: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return result[0] ?? null;
}

export async function createUser(data: {
  clerkId: string;
  email: string;
  fullName?: string;
}) {
  const result = await db.insert(users).values(data).returning();
  await db.insert(subscriptions).values({
    userId: result[0].id,
    tier: "free",
    leadsLimit: 50,
    emailsMonthlyLimit: 100,
  });
  return result[0];
}

export async function getDashboardStats(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [emailsToday, openRate, replyRate, meetingsThisMonth] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(outreachMessages)
        .where(
          and(
            eq(outreachMessages.userId, userId),
            eq(outreachMessages.channel, "email"),
            sql`${outreachMessages.sentAt} >= ${today}`
          )
        ),
      db
        .select({
          total: count(),
          opened: sql<number>`sum(case when ${outreachMessages.openCount} > 0 then 1 else 0 end)`,
        })
        .from(outreachMessages)
        .where(
          and(
            eq(outreachMessages.userId, userId),
            sql`${outreachMessages.sentAt} >= now() - interval '7 days'`
          )
        ),
      db
        .select({
          total: count(),
          replied: sql<number>`sum(case when ${outreachMessages.repliedAt} is not null then 1 else 0 end)`,
        })
        .from(outreachMessages)
        .where(
          and(
            eq(outreachMessages.userId, userId),
            sql`${outreachMessages.sentAt} >= now() - interval '7 days'`
          )
        ),
      db
        .select({ count: count() })
        .from(meetings)
        .where(
          and(
            eq(meetings.userId, userId),
            sql`${meetings.scheduledAt} >= date_trunc('month', now())`
          )
        ),
    ]);

  const totalSent = openRate[0]?.total ?? 0;
  const totalOpened = openRate[0]?.opened ?? 0;
  const totalReplied = replyRate[0]?.replied ?? 0;

  return {
    emailsSentToday: emailsToday[0]?.count ?? 0,
    openRatePercent:
      totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
    replyRatePercent:
      totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
    meetingsThisMonth: meetingsThisMonth[0]?.count ?? 0,
  };
}

export async function getCampaigns(userId: string) {
  return db
    .select()
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(desc(campaigns.createdAt));
}

export async function getLeads(
  userId: string,
  opts: {
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  } = {}
) {
  const { limit = 50, offset = 0 } = opts;
  const conditions = [eq(leads.userId, userId)];
  if (opts.status) conditions.push(eq(leads.status, opts.status));

  return db
    .select()
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUnreadReplies(userId: string, limit = 20) {
  return db
    .select()
    .from(replies)
    .where(and(eq(replies.userId, userId), eq(replies.isRead, false)))
    .orderBy(desc(replies.receivedAt))
    .limit(limit);
}

export async function getUserIntegrations(userId: string) {
  return db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, userId));
}

export async function getUserSubscription(userId: string) {
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return result[0] ?? null;
}
