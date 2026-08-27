"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
  HttpSupportApiClient,
  type SupportApiClient,
} from "@/lib/support/api-client";
import type { SubmitMessageRequest } from "@/lib/support/api-contract";
import {
  SUGGESTED_QUESTIONS,
  conversationReducer,
  initialState,
} from "@/lib/support/conversation";
import { ChatMessageBubble } from "./ChatMessage";
import { EscalationCard } from "./EscalationCard";
import { ErrorMessage } from "./ErrorMessage";
import { InlineEmailForm } from "./InlineEmailForm";
import { MessageComposer } from "./MessageComposer";
import { StillWorkingNotice } from "./StillWorkingNotice";
import { SuggestionChip } from "./SuggestionChip";
import { TypingIndicator } from "./TypingIndicator";

const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_MAX_POLL_ATTEMPTS = 20;

const defaultClient = new HttpSupportApiClient();

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function SupportChat({
  client = defaultClient,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
}: {
  client?: SupportApiClient;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}) {
  const [state, dispatch] = useReducer(conversationReducer, undefined, () =>
    initialState(),
  );
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const busy = state.status === "processing";
  const hasCustomerMessage = state.messages.some((m) => m.role === "customer");
  const showSuggestions = !hasCustomerMessage && !busy;
  const showAskAnother =
    !busy && state.messages.some((m) => m.kind === "escalation");

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [state.messages]);

  function getSessionId(): string {
    if (!sessionIdRef.current) {
      sessionIdRef.current = createSessionId();
    }
    return sessionIdRef.current;
  }

  function beginRun(): AbortController | null {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  }

  function endRun(controller: AbortController) {
    if (abortRef.current === controller) {
      inFlightRef.current = false;
    }
  }

  async function pollExecution(executionId: string, controller: AbortController) {
    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      await delay(pollIntervalMs, controller.signal);
      const result = await client.getExecution(executionId, controller.signal);
      if (controller.signal.aborted) return;
      if (result.status !== "processing") {
        dispatch({ type: "result", response: result });
        return;
      }
    }
    dispatch({ type: "still_working" });
  }

  async function runSubmission(
    request: SubmitMessageRequest,
    controller: AbortController,
  ) {
    try {
      const ack = await client.submitMessage(request, controller.signal);
      if (controller.signal.aborted) return;
      dispatch({
        type: "accepted",
        ticketId: ack.ticketId,
        executionId: ack.executionId,
      });
      await pollExecution(ack.executionId, controller);
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      dispatch({ type: "request_failed" });
    } finally {
      endRun(controller);
    }
  }

  function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    const controller = beginRun();
    if (!controller) return;
    setInput("");
    dispatch({ type: "submit", text });
    void runSubmission({ message: text, sessionId: getSessionId() }, controller);
  }

  function retry() {
    const question = state.question;
    if (!question || busy) return;
    const controller = beginRun();
    if (!controller) return;
    dispatch({ type: "retry" });
    const request: SubmitMessageRequest = {
      message: question,
      sessionId: getSessionId(),
    };
    if (state.ticketId) request.ticketId = state.ticketId;
    if (state.email) request.customerEmail = state.email;
    void runSubmission(request, controller);
  }

  function handleEmailSubmit(email: string) {
    const question = state.question;
    const ticketId = state.ticketId;
    if (!question || busy || state.status !== "needs_email") return;
    const controller = beginRun();
    if (!controller) return;
    dispatch({ type: "submit_email", email });
    const request: SubmitMessageRequest = {
      message: question,
      sessionId: getSessionId(),
      customerEmail: email,
    };
    if (ticketId) request.ticketId = ticketId;
    void runSubmission(request, controller);
  }

  function handleCheckAgain() {
    const executionId = state.executionId;
    if (!executionId || state.status !== "still_working") return;
    const controller = beginRun();
    if (!controller) return;
    dispatch({ type: "resume_polling" });
    void (async () => {
      try {
        await pollExecution(executionId, controller);
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        dispatch({ type: "request_failed" });
      } finally {
        endRun(controller);
      }
    })();
  }

  function handleDismissEmailForm() {
    dispatch({ type: "dismiss_email_form" });
  }

  function reset() {
    abortRef.current?.abort();
    inFlightRef.current = false;
    sessionIdRef.current = null;
    dispatch({ type: "reset" });
    setInput("");
  }

  return (
    <div className="mt-9 overflow-hidden rounded-3xl border border-line bg-white shadow-[0_1px_2px_rgba(16,48,43,0.04),0_18px_44px_-28px_rgba(16,48,43,0.3)]">
      <div
        ref={scrollRef}
        aria-live="polite"
        className="flex max-h-[520px] min-h-[340px] flex-col gap-5 overflow-y-auto p-5 sm:p-7 [&>*]:shrink-0"
      >
        {state.messages.map((m) => {
          if (m.kind === "typing") return <TypingIndicator key={m.id} />;
          if (m.kind === "still-working")
            return (
              <StillWorkingNotice key={m.id} onCheckAgain={handleCheckAgain} />
            );
          if (m.kind === "grounded")
            return (
              <ChatMessageBubble key={m.id} role="support" sources={m.sources}>
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
            return <ErrorMessage key={m.id} onRetry={retry} />;
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
        disabled={busy || state.status === "still_working"}
      />
    </div>
  );
}
