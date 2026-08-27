import type { SupportReply } from "./types";

/**
 * Boundary between the support UI and the answering backend. The real
 * implementation will call the internal API backed by the Lyzr Chat
 * Response SuperFlow; the UI must only depend on this interface.
 */
export interface SupportService {
  submitMessage(message: string): Promise<SupportReply>;
}

const ESCALATION_REPLY: SupportReply = {
  kind: "escalate",
  text: "I've received your question, but it needs review by our support team. Please provide your email address so we can send you the outcome.",
};

const GROUNDED_REPLIES: Array<{
  matches: (text: string) => boolean;
  reply: SupportReply;
}> = [
  {
    matches: (text) => text.includes("create") && text.includes("profile"),
    reply: {
      kind: "grounded",
      text: "To create an organization profile, open the Growth Kit and go to Organization Information. Add your organization name and Spreadbliss profile URL — those two fields are required. You can optionally add a logo, tagline, and impact statistic, which appear on your shareable Impact Card. Once the required fields are filled, your sharing tools, QR code, and badge unlock automatically.",
      source: "SpreadBliss Help Center · Organization Profiles",
    },
  },
  {
    matches: (text) => text.includes("manage") && text.includes("account"),
    reply: {
      kind: "grounded",
      text: "You can manage your account from the account menu in the top-right of SpreadBliss. From there you can update your organization details, adjust notification preferences, and review connected profiles. Changes save automatically and apply the next time you open the Growth Kit.",
      source: "SpreadBliss Help Center · Account Settings",
    },
  },
];

/**
 * Mock implementation used by the standalone POC. Simulates latency, a
 * pair of grounded knowledge-base answers, human escalation for anything
 * else, and a transient failure trigger so the error state is reachable.
 */
export class MockSupportService implements SupportService {
  constructor(private readonly delayMs: number = 900) {}

  async submitMessage(message: string): Promise<SupportReply> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));

    const text = message.toLowerCase();

    if (text.includes("offline") || text.includes("network")) {
      throw new Error("request_failed");
    }

    const grounded = GROUNDED_REPLIES.find((entry) => entry.matches(text));
    if (grounded) return grounded.reply;

    return ESCALATION_REPLY;
  }
}
