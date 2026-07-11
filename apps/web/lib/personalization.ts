/**
 * Personalization token rendering for sequence subjects and bodies.
 *
 * Supported tokens (case-sensitive):
 *   {{lead.firstName}}   {{lead.lastName}}   {{lead.fullName}}
 *   {{lead.email}}       {{lead.companyName}} {{lead.jobTitle}}
 *   {{sender.name}}      {{sender.company}}
 *
 * Missing values are left as the literal `{{token}}` so writers can see
 * unresolved data instead of silently sending an empty string.
 */

export type TokenContext = {
  lead?: {
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    email?: string | null;
    companyName?: string | null;
    jobTitle?: string | null;
  };
  sender?: {
    name?: string | null;
    company?: string | null;
  };
};

export const TOKEN_KEYS = [
  "lead.firstName",
  "lead.lastName",
  "lead.fullName",
  "lead.email",
  "lead.companyName",
  "lead.jobTitle",
  "sender.name",
  "sender.company",
] as const;

export type TokenKey = (typeof TOKEN_KEYS)[number];

function resolveToken(key: string, ctx: TokenContext): string | undefined {
  switch (key) {
    case "lead.firstName":
      return ctx.lead?.firstName ?? undefined;
    case "lead.lastName":
      return ctx.lead?.lastName ?? undefined;
    case "lead.fullName":
      return ctx.lead?.fullName ?? undefined;
    case "lead.email":
      return ctx.lead?.email ?? undefined;
    case "lead.companyName":
      return ctx.lead?.companyName ?? undefined;
    case "lead.jobTitle":
      return ctx.lead?.jobTitle ?? undefined;
    case "sender.name":
      return ctx.sender?.name ?? undefined;
    case "sender.company":
      return ctx.sender?.company ?? undefined;
    default:
      return undefined;
  }
}

export function renderTokens(text: string, ctx: TokenContext): string {
  if (!text) return text;
  return text.replace(/\{\{\s*([a-zA-Z]+\.[a-zA-Z]+)\s*\}\}/g, (match, key) => {
    const val = resolveToken(key, ctx);
    if (val === undefined || val === "") return match;
    return val;
  });
}
