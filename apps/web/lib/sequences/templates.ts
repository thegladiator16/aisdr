import type { SequenceStep } from "@aisdr/db/schema";

export type SequenceTemplate = {
  id: string;
  name: string;
  description: string;
  steps: SequenceStep[];
};

/**
 * Starter sequence templates offered when a user creates a new sequence.
 * All copy below is original and intentionally generic — meant as a scaffold
 * the user will edit with tokens ({{lead.firstName}} etc.) before sending.
 */
export const SEQUENCE_TEMPLATES: SequenceTemplate[] = [
  {
    id: "cold-outbound-3",
    name: "3-email cold outbound",
    description: "Value-prop opener, one follow-up, one polite break-up.",
    steps: [
      {
        stepNumber: 1,
        channel: "email",
        delayDays: 0,
        subject: "Quick idea for {{lead.companyName}}",
        body:
          "Hi {{lead.firstName}}, I help teams like {{lead.companyName}} cut the busywork out of their pipeline so reps spend more time on live conversations. Worth a short chat next week to see if it fits?",
        condition: "always",
      },
      {
        stepNumber: 2,
        channel: "email",
        delayDays: 3,
        subject: "Re: Quick idea for {{lead.companyName}}",
        body:
          "Wanted to float this back up in case my first note got buried. Happy to send a two-minute overview instead of booking time — just say the word.",
        condition: "if_no_reply",
      },
      {
        stepNumber: 3,
        channel: "email",
        delayDays: 5,
        subject: "Closing the loop",
        body:
          "No pressure at all — if the timing is off I'll stop reaching out. A quick 'not now' is genuinely helpful and I won't take it the wrong way.",
        condition: "if_no_reply",
      },
    ],
  },
  {
    id: "email-nurture-5",
    name: "5-email nurture",
    description: "Longer nurture cadence for warmer, patient outreach.",
    steps: [
      {
        stepNumber: 1,
        channel: "email",
        delayDays: 0,
        subject: "A thought on {{lead.companyName}}",
        body:
          "Hi {{lead.firstName}}, saw a couple of things about {{lead.companyName}} that made me think our approach could shorten your sales cycles. Open to sharing what I noticed?",
        condition: "always",
      },
      {
        stepNumber: 2,
        channel: "email",
        delayDays: 2,
        subject: "Following up",
        body:
          "Circling back with one specific idea rather than a generic pitch — happy to send it over as a short note if that reads easier than a call.",
        condition: "if_no_reply",
      },
      {
        stepNumber: 3,
        channel: "email",
        delayDays: 4,
        subject: "Case study you might like",
        body:
          "A team in a similar spot to {{lead.companyName}} shaved weeks off their ramp using this. Want me to send the one-pager?",
        condition: "if_no_reply",
      },
      {
        stepNumber: 4,
        channel: "email",
        delayDays: 7,
        subject: "One last angle",
        body:
          "If none of my earlier notes landed, my hunch is I'm framing this wrong for your role. What's actually on your plate this quarter?",
        condition: "if_no_reply",
      },
      {
        stepNumber: 5,
        channel: "email",
        delayDays: 10,
        subject: "Signing off",
        body:
          "I'll leave it here so I'm not filling your inbox. If timing shifts, just reply to any of these threads and I'll pick it back up.",
        condition: "if_no_reply",
      },
    ],
  },
  {
    id: "email-linkedin-touch",
    name: "Email + LinkedIn touch",
    description: "Blends inbox and LinkedIn touches for multi-channel warmth.",
    steps: [
      {
        stepNumber: 1,
        channel: "email",
        delayDays: 0,
        subject: "Reaching out from a different angle",
        body:
          "Hi {{lead.firstName}}, quick intro — {{sender.name}} at {{sender.company}}. I work with {{lead.jobTitle}}s on tightening the top of funnel. Mind if I share one thing worth testing?",
        condition: "always",
      },
      {
        stepNumber: 2,
        channel: "linkedin_connection",
        delayDays: 2,
        condition: "always",
      },
      {
        stepNumber: 3,
        channel: "linkedin_dm",
        delayDays: 3,
        body:
          "Thanks for connecting, {{lead.firstName}}. I sent a note over email too — happy to keep it here if LinkedIn is easier. What's the best way to reach you?",
        condition: "if_no_reply",
      },
      {
        stepNumber: 4,
        channel: "email",
        delayDays: 4,
        subject: "Bringing this back to your inbox",
        body:
          "Bumping this up in case LinkedIn isn't where you live day-to-day. A quick yes/no is all I'm asking — no follow-up if it's not the right time.",
        condition: "if_no_reply",
      },
    ],
  },
  {
    id: "reactivation-warmup",
    name: "Reactivation warm-up",
    description: "Two-step re-engage for stale leads that went quiet.",
    steps: [
      {
        stepNumber: 1,
        channel: "email",
        delayDays: 0,
        subject: "Still on your radar?",
        body:
          "Hi {{lead.firstName}}, it's been a while — wanted to check in without any agenda. If the priorities at {{lead.companyName}} have shifted, I'd rather know than keep guessing.",
        condition: "always",
      },
      {
        stepNumber: 2,
        channel: "email",
        delayDays: 5,
        subject: "Re: Still on your radar?",
        body:
          "One more nudge and then I'll leave your inbox alone. If timing is better in a quarter or two, a heads-up is enough and I'll reach back out then.",
        condition: "if_no_reply",
      },
    ],
  },
];
