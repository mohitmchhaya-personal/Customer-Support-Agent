import { describe, expect, it } from "vitest";
import {
  dismissEmailForm,
  initialState,
  receiveError,
  receiveReply,
  resetConversation,
  retryQuestion,
  submitEmail,
  submitQuestion,
} from "./conversation";
import type { SupportReply } from "./types";

const GROUNDED: SupportReply = {
  kind: "grounded",
  text: "Here is how.",
  source: "SpreadBliss Help Center · Organization Profiles",
};

const ESCALATE: SupportReply = {
  kind: "escalate",
  text: "Needs human review.",
};

describe("conversation state transitions", () => {
  it("starts in the welcome state with the welcome message", () => {
    const state = initialState();
    expect(state.status).toBe("welcome");
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].role).toBe("support");
  });

  it("moves to processing with customer message and typing indicator", () => {
    const state = submitQuestion(initialState(), "How do I manage my account?");
    expect(state.status).toBe("processing");
    expect(state.messages.at(-2)).toMatchObject({
      role: "customer",
      text: "How do I manage my account?",
    });
    expect(state.messages.at(-1)).toMatchObject({ kind: "typing" });
  });

  it("ignores blank submissions", () => {
    const state = initialState();
    expect(submitQuestion(state, "   ")).toBe(state);
  });

  it("ignores submissions while already processing", () => {
    const processing = submitQuestion(initialState(), "First question");
    expect(submitQuestion(processing, "Second question")).toBe(processing);
  });

  it("moves to answered on a grounded reply and removes typing", () => {
    const state = receiveReply(
      submitQuestion(initialState(), "How do I create a profile?"),
      GROUNDED,
    );
    expect(state.status).toBe("answered");
    expect(state.messages.some((m) => m.kind === "typing")).toBe(false);
    expect(state.messages.at(-1)).toMatchObject({
      kind: "grounded",
      source: GROUNDED.source,
    });
  });

  it("moves to needs_email on an escalation reply with an email form", () => {
    const state = receiveReply(
      submitQuestion(initialState(), "Refund my donation"),
      ESCALATE,
    );
    expect(state.status).toBe("needs_email");
    expect(state.messages.at(-1)).toMatchObject({ kind: "email-form" });
  });

  it("moves to failed on an error, keeping the retry text", () => {
    const state = receiveError(
      submitQuestion(initialState(), "network problem"),
      "network problem",
    );
    expect(state.status).toBe("failed");
    expect(state.messages.some((m) => m.kind === "typing")).toBe(false);
    expect(state.messages.at(-1)).toMatchObject({
      kind: "error",
      retry: "network problem",
    });
  });

  it("clears a previous error when a new question is submitted", () => {
    const failed = receiveError(
      submitQuestion(initialState(), "network problem"),
      "network problem",
    );
    const retried = submitQuestion(failed, "network problem");
    expect(retried.messages.some((m) => m.kind === "error")).toBe(false);
  });

  it("retries a failed question without duplicating the customer message", () => {
    const failed = receiveError(
      submitQuestion(initialState(), "network problem"),
      "network problem",
    );
    const retried = retryQuestion(failed);
    expect(retried.status).toBe("processing");
    expect(retried.messages.filter((m) => m.role === "customer")).toHaveLength(
      1,
    );
    expect(retried.messages.some((m) => m.kind === "error")).toBe(false);
    expect(retried.messages.at(-1)).toMatchObject({ kind: "typing" });
  });

  it("moves to awaiting_human_review after email submission", () => {
    const needsEmail = receiveReply(
      submitQuestion(initialState(), "Refund my donation"),
      ESCALATE,
    );
    const state = submitEmail(needsEmail, "user@example.org", "SB-12345");
    expect(state.status).toBe("awaiting_human_review");
    expect(state.messages.some((m) => m.kind === "email-form")).toBe(false);
    expect(state.messages.at(-1)).toMatchObject({
      kind: "escalation",
      email: "user@example.org",
      reference: "SB-12345",
    });
  });

  it("removes the email form when dismissed", () => {
    const needsEmail = receiveReply(
      submitQuestion(initialState(), "Refund my donation"),
      ESCALATE,
    );
    const state = dismissEmailForm(needsEmail);
    expect(state.status).toBe("answered");
    expect(state.messages.some((m) => m.kind === "email-form")).toBe(false);
  });

  it("resets back to the welcome state", () => {
    const state = resetConversation();
    expect(state.status).toBe("welcome");
    expect(state.messages).toHaveLength(1);
  });
});
