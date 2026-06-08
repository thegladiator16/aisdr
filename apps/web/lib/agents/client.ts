const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET ?? "dev_secret";

async function agentFetch<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(`${AI_SERVICE_URL}/api/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-token": AI_SERVICE_SECRET,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agent service error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export type LeadResearchResult = {
  lead_id: string;
  research_summary: string;
  recent_activity: Array<{ type: string; content: string; date: string }>;
  pain_points: string[];
  personality_notes: string;
  icebreakers: string[];
  score: number;
  confidence: number;
};

export type GeneratedMessage = {
  lead_id: string;
  channel: string;
  step_number: number;
  subject?: string;
  body: string;
  personalization_score: number;
  tokens_used: number;
  model_used: string;
};

export type ReplyAnalysis = {
  reply_id: string;
  sentiment: string;
  intent: string;
  requires_action: boolean;
  action_type: string;
  ai_suggested_reply: string;
  should_book_meeting: boolean;
  urgency: string;
};

export const agentClient = {
  researchLead: (params: {
    lead_id: string;
    linkedin_url?: string;
    company_website?: string;
    full_name: string;
    company_name: string;
    job_title?: string;
  }) => agentFetch<LeadResearchResult>("/agents/research", params),

  generateMessage: (params: {
    lead_id: string;
    channel: string;
    step_number: number;
    tone: string;
    language?: string;
    goal?: string;
    sender_name: string;
    sender_company: string;
    sender_value_proposition: string;
    sender_calendar_link?: string;
    lead_name: string;
    lead_company: string;
    lead_job_title: string;
    lead_research?: LeadResearchResult;
    previous_messages?: Array<{ channel: string; body: string }>;
  }) => agentFetch<GeneratedMessage>("/agents/write-message", params),

  analyzeReply: (params: {
    reply_id: string;
    lead_id: string;
    reply_body: string;
    original_message_body: string;
    channel: string;
    sender_calendar_link?: string;
  }) => agentFetch<ReplyAnalysis>("/agents/analyze-reply", params),
};
