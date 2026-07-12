// Central source of truth for plan capabilities, credit allocations, and
// credit costs. Shared by UI (feature gates, upgrade prompts) and backend
// (verify-payment subscription updates, campaign gating).

export const PLAN_CREDITS: Record<string, number> = {
  trial: 10000,
  free: 300,
  starter: 5000,
  growth: 15000,
  scale: 999999,
};

export const PLAN_LEADS_DB_LIMIT: Record<string, number> = {
  trial: 10000,
  free: 0,
  starter: 500,
  growth: 5000,
  scale: 999999,
};

export const PLAN_ACTIVE_CAMPAIGNS: Record<string, number | null> = {
  trial: 5,
  free: 0,
  starter: 5,
  growth: null,
  scale: null,
};

// Features that are gated per plan (false = blocked)
export const PLAN_CAN_RUN_CAMPAIGNS: Record<string, boolean> = {
  trial: true,
  free: false,
  starter: true,
  growth: true,
  scale: true,
};

export const PLAN_CAN_SEND_EMAILS: Record<string, boolean> = {
  trial: true,
  free: false,
  starter: true,
  growth: true,
  scale: true,
};

export const PLAN_CAN_USE_SEQUENCES: Record<string, boolean> = {
  trial: true,
  free: false,
  starter: true,
  growth: true,
  scale: true,
};

export const PLAN_HAS_AZ_TESTING: Record<string, boolean> = {
  trial: false,
  free: false,
  starter: false,
  growth: true,
  scale: true,
};

export const PLAN_HAS_PRIORITY_SUPPORT: Record<string, boolean> = {
  trial: false,
  free: false,
  starter: false,
  growth: true,
  scale: true,
};

// Credit costs for each action
export const CREDIT_COSTS = {
  EMAIL_ENRICHMENT: 2,
  PHONE_ENRICHMENT: 10,
  CAMPAIGN_ENROLLMENT: 22,
} as const;

export function canRunCampaigns(tier: string): boolean {
  return PLAN_CAN_RUN_CAMPAIGNS[tier] ?? false;
}

export function getCreditsForPlan(tier: string): number {
  return PLAN_CREDITS[tier] ?? 300;
}
