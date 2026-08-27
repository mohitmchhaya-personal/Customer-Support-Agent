import { describe, expect, it } from "vitest";
import {
  ESCALATION_ACK_MESSAGE,
  conversationReducer,
  initialState,
  type ConversationAction,
} from "./conversation";
import type { ConversationState } from "./types";

function run(
  actions: ConversationAction[],
  from: ConversationState = initialState(),
): ConversationState {
  return actions.reduce(conversationReducer, from);
}

const SUBMIT: ConversationAction = {
  type: "submit",
  text: "How do I manage my account?",
};

const ACCEPTED: ConversationAction = {
  type: "accepted",
  ticketId: "SB-TICKET100",
  executionId: "exec-1",
};

describe("conversationReducer", () => {
  it("starts in the welcome state with the welcome message", () => {
    const state = initialState();
    expect(state.status).toBe("welcome");
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].role).toBe("support");
  });

  it("moves to processing with customer message and typing indicator", () => {
    const state = run([SUBMIT]);
    expect(state.status).toBe("processing");
    expect(state.question).toBe("How do I manage my account?");
    expect(state.messages.at(-2)).toMatchObject({
      role: "customer",
      text: "How do I manage my account?",
    });
    expect(state.messages.at(-1)).toMatchObject({ kind: "typing" });
  });

  it("ignores blank submissions", () => {
    const state = initialState();
    expect(conversationReducer(state, { type: "submit", text: "   " })).toBe(
      state,
    );
  });

  it("ignores submissions while already processing", () => {
    const processing = run([SUBMIT]);
    expect(
      conversationReducer(processing, { type: "submit", text: "Second" }),
    ).toBe(processing);
  });

  it("stores ticket and execution ids when the submission is accepted", () => {
    const state = run([SUBMIT, ACCEPTED]);
    expect(state.ticketId).toBe("SB-TICKET100");
    expect(state.executionId).toBe("exec-1");
    expect(state.status).toBe("processing");
  });

  it("moves to answered with sources and removes typing", () => {
    const state = run([
      SUBMIT,
      ACCEPTED,
      {
        type: "result",
        response: {
          status: "answered",
          message: "Here is how.",
          sources: ["SpreadBliss Help Center · Account Settings"],
        },
      },
    ]);
    expect(state.status).toBe("answered");
    expect(state.messages.some((m) => m.kind === "typing")).toBe(false);
    expect(state.messages.at(-1)).toMatchObject({
      kind: "grounded",
      text: "Here is how.",
      sources: ["SpreadBliss Help Center · Account Settings"],
    });
  });

  it("moves to needs_email with an email form", () => {
    const state = run([
      SUBMIT,
      ACCEPTED,
      {
        type: "result",
        response: { status: "needs_email", message: "Please share an email." },
      },
    ]);
    expect(state.status).toBe("needs_email");
    expect(state.messages.at(-1)).toMatchObject({ kind: "email-form" });
    expect(state.ticketId).toBe("SB-TICKET100");
  });

  it("keeps question, ticket and email through the email resubmission", () => {
    const needsEmail = run([
      SUBMIT,
      ACCEPTED,
      {
        type: "result",
        response: { status: "needs_email", message: "Please share an email." },
      },
    ]);
    const resubmitted = conversationReducer(needsEmail, {
      type: "submit_email",
      email: "user@example.org",
    });
    expect(resubmitted.status).toBe("processing");
    expect(resubmitted.question).toBe("How do I manage my account?");
    expect(resubmitted.ticketId).toBe("SB-TICKET100");
    expect(resubmitted.email).toBe("user@example.org");
    expect(resubmitted.messages.some((m) => m.kind === "email-form")).toBe(
      false,
    );
    expect(
      resubmitted.messages.some(
        (m) => m.kind === "text" && m.text.includes("user@example.org"),
      ),
    ).toBe(false);
  });

  it("acknowledges escalation with the ticket reference and masked email", () => {
    const state = run([
      SUBMIT,
      ACCEPTED,
      {
        type: "result",
        response: { status: "needs_email", message: "Please share an email." },
      },
      { type: "submit_email", email: "user@example.org" },
      {
        type: "accepted",
        ticketId: "SB-TICKET100",
        executionId: "exec-2",
      },
      {
        type: "result",
        response: {
          status: "awaiting_human_review",
          message: "Sent to review.",
        },
      },
    ]);
    expect(state.status).toBe("awaiting_human_review");
    expect(state.messages.at(-2)).toMatchObject({
      kind: "text",
      text: ESCALATION_ACK_MESSAGE,
    });
    expect(state.messages.at(-1)).toMatchObject({
      kind: "escalation",
      email: "user@example.org",
      reference: "SB-TICKET100",
    });
  });

  it("moves to failed on a request failure", () => {
    const state = run([SUBMIT, { type: "request_failed" }]);
    expect(state.status).toBe("failed");
    expect(state.messages.some((m) => m.kind === "typing")).toBe(false);
    expect(state.messages.at(-1)).toMatchObject({ kind: "error" });
  });

  it("retries a failed question without duplicating the customer message", () => {
    const failed = run([SUBMIT, { type: "request_failed" }]);
    const retried = conversationReducer(failed, { type: "retry" });
    expect(retried.status).toBe("processing");
    expect(retried.messages.filter((m) => m.role === "customer")).toHaveLength(
      1,
    );
    expect(retried.messages.some((m) => m.kind === "error")).toBe(false);
    expect(retried.messages.at(-1)).toMatchObject({ kind: "typing" });
  });

  it("moves to still_working when polling is exhausted and resumes", () => {
    const stillWorking = run([SUBMIT, ACCEPTED, { type: "still_working" }]);
    expect(stillWorking.status).toBe("still_working");
    expect(stillWorking.messages.at(-1)).toMatchObject({
      kind: "still-working",
    });

    const resumed = conversationReducer(stillWorking, {
      type: "resume_polling",
    });
    expect(resumed.status).toBe("processing");
    expect(resumed.executionId).toBe("exec-1");
    expect(resumed.messages.at(-1)).toMatchObject({ kind: "typing" });
  });

  it("ignores stale results after the conversation left processing", () => {
    const failed = run([SUBMIT, { type: "request_failed" }]);
    expect(
      conversationReducer(failed, {
        type: "result",
        response: { status: "answered", message: "Late.", sources: [] },
      }),
    ).toBe(failed);
  });

  it("removes the email form when dismissed", () => {
    const state = run([
      SUBMIT,
      ACCEPTED,
      {
        type: "result",
        response: { status: "needs_email", message: "Please share an email." },
      },
      { type: "dismiss_email_form" },
    ]);
    expect(state.status).toBe("answered");
    expect(state.messages.some((m) => m.kind === "email-form")).toBe(false);
  });

  it("resets back to the welcome state", () => {
    const state = run([SUBMIT, { type: "reset" }]);
    expect(state.status).toBe("welcome");
    expect(state.messages).toHaveLength(1);
    expect(state.ticketId).toBeNull();
    expect(state.email).toBeNull();
  });
});
