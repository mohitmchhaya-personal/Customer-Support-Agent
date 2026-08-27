import type { ExecutionStatusResponse } from "./api-contract";
import type { ChatMessage, ConversationState } from "./types";

export const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "support",
  kind: "text",
  text: "Hi! I'm SpreadBliss Support. Ask me anything about your account, organization profiles, recommendations, donations, privacy, or technical issues — I'll help where I can and hand off to a specialist when your question needs a closer look.",
};

export const SUGGESTED_QUESTIONS = [
  "How do I create an organization profile?",
  "How do I manage my account?",
  "I'm having a technical issue",
];

export const ESCALATION_ACK_MESSAGE =
  "Thanks—your question has been received and sent to a SpreadBliss support specialist. We'll email you after it has been reviewed.";

export function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export type ConversationAction =
  | { type: "submit"; text: string }
  | { type: "retry" }
  | { type: "accepted"; ticketId: string; executionId: string }
  | { type: "result"; response: ExecutionStatusResponse }
  | { type: "still_working" }
  | { type: "resume_polling" }
  | { type: "request_failed" }
  | { type: "submit_email"; email: string }
  | { type: "dismiss_email_form" }
  | { type: "reset" };

export function initialState(): ConversationState {
  return {
    status: "welcome",
    messages: [WELCOME_MESSAGE],
    question: null,
    ticketId: null,
    executionId: null,
    email: null,
  };
}

const TRANSIENT_KINDS = new Set(["error", "typing", "still-working"]);

function withoutTransient(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((m) => !TRANSIENT_KINDS.has(m.kind));
}

function typing(): ChatMessage {
  return { id: createId(), role: "support", kind: "typing" };
}

/**
 * Explicit client-side state machine for the support conversation. All
 * transitions are pure; the component dispatches actions from network
 * lifecycle events and never mutates state directly.
 */
export function conversationReducer(
  state: ConversationState,
  action: ConversationAction,
): ConversationState {
  switch (action.type) {
    case "submit": {
      const text = action.text.trim();
      if (!text || state.status === "processing") return state;
      return {
        ...state,
        status: "processing",
        question: text,
        ticketId: null,
        executionId: null,
        email: null,
        messages: [
          ...withoutTransient(state.messages).filter(
            (m) => m.kind !== "email-form",
          ),
          { id: createId(), role: "customer", kind: "text", text },
          typing(),
        ],
      };
    }
    case "retry": {
      if (state.status === "processing" || !state.question) return state;
      return {
        ...state,
        status: "processing",
        executionId: null,
        messages: [...withoutTransient(state.messages), typing()],
      };
    }
    case "accepted": {
      if (state.status !== "processing") return state;
      return {
        ...state,
        ticketId: action.ticketId,
        executionId: action.executionId,
      };
    }
    case "result": {
      if (state.status !== "processing") return state;
      const base = withoutTransient(state.messages);
      const response = action.response;
      switch (response.status) {
        case "processing":
          return state;
        case "answered":
          return {
            ...state,
            status: "answered",
            messages: [
              ...base,
              {
                id: createId(),
                role: "support",
                kind: "grounded",
                text: response.message,
                sources: response.sources,
              },
            ],
          };
        case "needs_email":
          return {
            ...state,
            status: "needs_email",
            messages: [
              ...base,
              {
                id: createId(),
                role: "support",
                kind: "text",
                text: response.message,
              },
              { id: createId(), role: "support", kind: "email-form" },
            ],
          };
        case "awaiting_human_review": {
          const reference = response.ticketId ?? state.ticketId;
          return {
            ...state,
            status: "awaiting_human_review",
            messages: [
              ...base,
              {
                id: createId(),
                role: "support",
                kind: "text",
                text: ESCALATION_ACK_MESSAGE,
              },
              ...(reference
                ? [
                    {
                      id: createId(),
                      role: "support",
                      kind: "escalation",
                      email: state.email,
                      reference,
                    } satisfies ChatMessage,
                  ]
                : []),
            ],
          };
        }
        case "failed":
          return {
            ...state,
            status: "failed",
            messages: [
              ...base,
              { id: createId(), role: "support", kind: "error" },
            ],
          };
      }
      return state;
    }
    case "still_working": {
      if (state.status !== "processing") return state;
      return {
        ...state,
        status: "still_working",
        messages: [
          ...withoutTransient(state.messages),
          { id: createId(), role: "support", kind: "still-working" },
        ],
      };
    }
    case "resume_polling": {
      if (state.status !== "still_working" || !state.executionId) return state;
      return {
        ...state,
        status: "processing",
        messages: [...withoutTransient(state.messages), typing()],
      };
    }
    case "request_failed": {
      if (state.status !== "processing") return state;
      return {
        ...state,
        status: "failed",
        messages: [
          ...withoutTransient(state.messages),
          { id: createId(), role: "support", kind: "error" },
        ],
      };
    }
    case "submit_email": {
      if (state.status !== "needs_email") return state;
      return {
        ...state,
        status: "processing",
        email: action.email,
        executionId: null,
        messages: [
          ...state.messages.filter(
            (m) => m.kind !== "email-form" && !TRANSIENT_KINDS.has(m.kind),
          ),
          typing(),
        ],
      };
    }
    case "dismiss_email_form": {
      if (state.status !== "needs_email") return state;
      return {
        ...state,
        status: "answered",
        messages: state.messages.filter((m) => m.kind !== "email-form"),
      };
    }
    case "reset":
      return initialState();
  }
}
