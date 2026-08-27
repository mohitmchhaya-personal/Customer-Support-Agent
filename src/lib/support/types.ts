export type SupportStatus =
  | "processing"
  | "answered"
  | "needs_email"
  | "awaiting_human_review"
  | "failed";

export type ConversationStatus = "welcome" | "still_working" | SupportStatus;

export type ChatMessage =
  | { id: string; role: "support"; kind: "text"; text: string }
  | {
      id: string;
      role: "support";
      kind: "grounded";
      text: string;
      sources: string[];
    }
  | { id: string; role: "customer"; kind: "text"; text: string }
  | { id: string; role: "support"; kind: "typing" }
  | { id: string; role: "support"; kind: "email-form" }
  | { id: string; role: "support"; kind: "still-working" }
  | {
      id: string;
      role: "support";
      kind: "escalation";
      email: string | null;
      reference: string;
    }
  | { id: string; role: "support"; kind: "error" };

export interface ConversationState {
  status: ConversationStatus;
  messages: ChatMessage[];
  /** The customer's original question, retained for retry and resubmission. */
  question: string | null;
  ticketId: string | null;
  executionId: string | null;
  /** Held in memory only for the current conversation; never persisted. */
  email: string | null;
}
