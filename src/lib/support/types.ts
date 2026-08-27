export type SupportStatus =
  | "processing"
  | "answered"
  | "needs_email"
  | "awaiting_human_review"
  | "failed";

export type ConversationStatus = "welcome" | SupportStatus;

export type SupportReply =
  | { kind: "grounded"; text: string; source: string }
  | { kind: "escalate"; text: string };

export type ChatMessage =
  | { id: string; role: "support"; kind: "text"; text: string }
  | {
      id: string;
      role: "support";
      kind: "grounded";
      text: string;
      source: string;
    }
  | { id: string; role: "customer"; kind: "text"; text: string }
  | { id: string; role: "support"; kind: "typing" }
  | { id: string; role: "support"; kind: "email-form" }
  | {
      id: string;
      role: "support";
      kind: "escalation";
      email: string;
      reference: string;
    }
  | { id: string; role: "support"; kind: "error"; retry: string };

export interface ConversationState {
  status: ConversationStatus;
  messages: ChatMessage[];
}
