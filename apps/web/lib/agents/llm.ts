/**
 * Anthropic Claude Sonnet 4.6 client factory shared by every agent node.
 * Wraps the same env var (ANTHROPIC_API_KEY) already used by /api/arya/chat
 * and the Python lead_researcher, so no new secrets need provisioning.
 */
import { ChatAnthropic } from "@langchain/anthropic";

export const AGENT_MODEL = "claude-sonnet-4-6-20250514";

/**
 * Build a Claude Sonnet 4.6 client tuned for structured-output agent work.
 * Temperature runs slightly cool (0.2) — agents need creative-but-grounded
 * outputs, not the higher-temperature exploration copywriting alone would
 * want. Individual agent nodes can override via `.bind({ temperature: … })`.
 */
export function agentLLM(overrides?: { temperature?: number; maxTokens?: number }): ChatAnthropic {
  return new ChatAnthropic({
    model: AGENT_MODEL,
    apiKey: process.env.ANTHROPIC_API_KEY,
    temperature: overrides?.temperature ?? 0.2,
    maxTokens: overrides?.maxTokens ?? 1500,
  });
}

export function isAgentsConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY ?? "").trim();
}
