import type {
  ChatMessage,
  ConversationState,
  SupportReply,
} from "./types";

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

export function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createReference(): string {
  return `SB-${Math.floor(10000 + Math.random() * 90000)}`;
}

export function initialState(): ConversationState {
  return { status: "welcome", messages: [WELCOME_MESSAGE] };
}

export function submitQuestion(
  state: ConversationState,
  text: string,
): ConversationState {
  const trimmed = text.trim();
  if (!trimmed || state.status === "processing") return state;
  return {
    status: "processing",
    messages: [
      ...state.messages.filter(
        (m) => m.kind !== "error" && m.kind !== "typing",
      ),
      { id: createId(), role: "customer", kind: "text", text: trimmed },
      { id: createId(), role: "support", kind: "typing" },
    ],
  };
}

export function retryQuestion(state: ConversationState): ConversationState {
  if (state.status === "processing") return state;
  return {
    status: "processing",
    messages: [
      ...state.messages.filter(
        (m) => m.kind !== "error" && m.kind !== "typing",
      ),
      { id: createId(), role: "support", kind: "typing" },
    ],
  };
}

export function receiveReply(
  state: ConversationState,
  reply: SupportReply,
): ConversationState {
  const base = state.messages.filter((m) => m.kind !== "typing");
  if (reply.kind === "grounded") {
    return {
      status: "answered",
      messages: [
        ...base,
        {
          id: createId(),
          role: "support",
          kind: "grounded",
          text: reply.text,
          source: reply.source,
        },
      ],
    };
  }
  return {
    status: "needs_email",
    messages: [
      ...base,
      { id: createId(), role: "support", kind: "text", text: reply.text },
      { id: createId(), role: "support", kind: "email-form" },
    ],
  };
}

export function receiveError(
  state: ConversationState,
  retryText: string,
): ConversationState {
  return {
    status: "failed",
    messages: [
      ...state.messages.filter((m) => m.kind !== "typing"),
      { id: createId(), role: "support", kind: "error", retry: retryText },
    ],
  };
}

export function submitEmail(
  state: ConversationState,
  email: string,
  reference: string = createReference(),
): ConversationState {
  return {
    status: "awaiting_human_review",
    messages: [
      ...state.messages.filter((m) => m.kind !== "email-form"),
      {
        id: createId(),
        role: "support",
        kind: "text",
        text: "Thanks—your question has been received and sent to a SpreadBliss support specialist. We'll email you after it has been reviewed.",
      },
      { id: createId(), role: "support", kind: "escalation", email, reference },
    ],
  };
}

export function dismissEmailForm(state: ConversationState): ConversationState {
  return {
    status: "answered",
    messages: state.messages.filter((m) => m.kind !== "email-form"),
  };
}

export function resetConversation(): ConversationState {
  return initialState();
}
