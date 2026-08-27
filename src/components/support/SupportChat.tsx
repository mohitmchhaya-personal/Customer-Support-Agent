"use client";

import { useEffect, useRef, useState } from "react";
import {
  SUGGESTED_QUESTIONS,
  dismissEmailForm,
  initialState,
  receiveError,
  receiveReply,
  resetConversation,
  submitEmail,
  submitQuestion,
} from "@/lib/support/conversation";
import { MockSupportService, type SupportService } from "@/lib/support/service";
import type { ConversationState } from "@/lib/support/types";
import { ChatMessageBubble } from "./ChatMessage";
import { EscalationCard } from "./EscalationCard";
import { ErrorMessage } from "./ErrorMessage";
import { InlineEmailForm } from "./InlineEmailForm";
import { MessageComposer } from "./MessageComposer";
import { SuggestionChip } from "./SuggestionChip";
import { TypingIndicator } from "./TypingIndicator";

const defaultService = new MockSupportService();

export function SupportChat({
  service = defaultService,
}: {
  service?: SupportService;
}) {
  const [state, setState] = useState<ConversationState>(initialState);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const busy = state.status === "processing";
  const hasCustomerMessage = state.messages.some((m) => m.role === "customer");
  const showSuggestions = !hasCustomerMessage && !busy;
  const showAskAnother = state.messages.some((m) => m.kind === "escalation");

  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [state.messages]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;

    setInput("");
    setState((prev) => submitQuestion(prev, text));

    try {
      const reply = await service.submitMessage(text);
      setState((prev) => receiveReply(prev, reply));
    } catch {
      setState((prev) => receiveError(prev, text));
    }
  }

  function handleEmailSubmit(email: string) {
    setState((prev) => submitEmail(prev, email));
  }

  function handleDismissEmailForm() {
    setState((prev) => dismissEmailForm(prev));
  }

  function reset() {
    setState(resetConversation());
    setInput("");
  }

  return (
    <div className="mt-9 overflow-hidden rounded-3xl border border-line bg-white shadow-[0_1px_2px_rgba(16,48,43,0.04),0_18px_44px_-28px_rgba(16,48,43,0.3)]">
      <div
        ref={scrollRef}
        aria-live="polite"
        className="flex max-h-[520px] min-h-[340px] flex-col gap-5 overflow-y-auto p-5 sm:p-7"
      >
        {state.messages.map((m) => {
          if (m.kind === "typing") return <TypingIndicator key={m.id} />;
          if (m.kind === "grounded")
            return (
              <ChatMessageBubble key={m.id} role="support" source={m.source}>
                {m.text}
              </ChatMessageBubble>
            );
          if (m.kind === "text")
            return (
              <ChatMessageBubble key={m.id} role={m.role}>
                {m.text}
              </ChatMessageBubble>
            );
          if (m.kind === "email-form")
            return (
              <InlineEmailForm
                key={m.id}
                onSubmit={handleEmailSubmit}
                onDismiss={handleDismissEmailForm}
              />
            );
          if (m.kind === "escalation")
            return (
              <EscalationCard
                key={m.id}
                email={m.email}
                reference={m.reference}
              />
            );
          if (m.kind === "error")
            return <ErrorMessage key={m.id} onRetry={() => send(m.retry)} />;
          return null;
        })}

        {showAskAnother ? (
          <div className="ml-11">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-semibold text-ink shadow-sm transition hover:border-brand/60 hover:text-brand-strong focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
            >
              Ask another question
            </button>
          </div>
        ) : null}
      </div>

      {showSuggestions ? (
        <div className="border-t border-line bg-canvas/40 px-5 pb-1 pt-4 sm:px-7">
          <p className="mb-2.5 text-[12.5px] font-semibold uppercase tracking-wide text-muted">
            Suggested questions
          </p>
          <div className="flex flex-wrap gap-2.5 pb-4">
            {SUGGESTED_QUESTIONS.map((q) => (
              <SuggestionChip key={q} label={q} onClick={() => send(q)} />
            ))}
          </div>
        </div>
      ) : null}

      <MessageComposer
        value={input}
        onChange={setInput}
        onSend={() => send(input)}
        disabled={busy}
      />
    </div>
  );
}
