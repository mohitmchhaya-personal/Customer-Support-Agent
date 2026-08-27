// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  FAILED_MESSAGE,
  HUMAN_REVIEW_MESSAGE,
  NEEDS_EMAIL_MESSAGE,
  mapExecutionToPublicStatus,
} from "./adapter";
import { LyzrMalformedResponseError } from "./errors";
import {
  acknowledgedExecution,
  completedAnswerExecution,
  failedExecution,
  malformedExecution,
  needsEmailExecution,
  runningExecution,
} from "./__fixtures__/executions";

describe("mapExecutionToPublicStatus", () => {
  it("maps a running execution to processing", () => {
    expect(mapExecutionToPublicStatus(runningExecution)).toEqual({
      status: "processing",
    });
  });

  it("maps a completed answer to answered with sanitized source labels", () => {
    const result = mapExecutionToPublicStatus(completedAnswerExecution);
    expect(result).toEqual({
      status: "answered",
      message:
        "To create an organization profile in SpreadBliss, a representative first searches for an existing organization or registry listing.",
      sources: [
        "SpreadBliss Customer Service Chatbot Knowledge Base.docx · Nonprofit, company, and foundation profiles",
      ],
    });
  });

  it("maps a needs-email outcome to the customer-safe email request", () => {
    expect(mapExecutionToPublicStatus(needsEmailExecution)).toEqual({
      status: "needs_email",
      message: NEEDS_EMAIL_MESSAGE,
    });
  });

  it("maps an acknowledged escalation to awaiting_human_review with the ticket ID", () => {
    expect(mapExecutionToPublicStatus(acknowledgedExecution)).toEqual({
      status: "awaiting_human_review",
      message: HUMAN_REVIEW_MESSAGE,
      ticketId: "SB-TEST03",
    });
  });

  it("omits upstream ticket IDs that are not customer-safe references", () => {
    const execution = structuredClone(acknowledgedExecution);
    execution.outputs!["Escalation Submitted"]["0"][0].ticket_id =
      "I was charged twice and want a refund immediately";
    const result = mapExecutionToPublicStatus(execution);
    expect(result).toEqual({
      status: "awaiting_human_review",
      message: HUMAN_REVIEW_MESSAGE,
      ticketId: undefined,
    });
  });

  it("maps a failed execution to a generic retryable failure", () => {
    expect(mapExecutionToPublicStatus(failedExecution)).toEqual({
      status: "failed",
      message: FAILED_MESSAGE,
      retryable: true,
    });
  });

  it("throws for a completed execution without a recognizable outcome", () => {
    expect(() => mapExecutionToPublicStatus(malformedExecution)).toThrow(
      LyzrMalformedResponseError,
    );
  });

  it("throws for an unknown execution status", () => {
    expect(() =>
      mapExecutionToPublicStatus({ status: "exploded" }),
    ).toThrow(LyzrMalformedResponseError);
  });

  it("never leaks internal fields in any mapped response", () => {
    const executions = [
      runningExecution,
      completedAnswerExecution,
      needsEmailExecution,
      acknowledgedExecution,
      failedExecution,
    ];
    const forbidden = [
      "confidence",
      "evidence_quality",
      "escalation_reason",
      "node_outputs",
      "awakeable",
      "stack",
      "statusCode",
      "internal webhook error detail",
      "payment dispute",
      "x-api-key",
    ];
    for (const execution of executions) {
      const serialized = JSON.stringify(
        mapExecutionToPublicStatus(execution),
      );
      for (const term of forbidden) {
        expect(serialized).not.toContain(term);
      }
    }
  });

  it("prefers escalation outcomes over answered items injected in other nodes", () => {
    const execution = structuredClone(acknowledgedExecution);
    execution.outputs!["Trigger"] = {
      "0": [
        {
          status: "answered",
          message: "customer_email=victim@example.com\nstack trace...",
        },
      ],
    };
    expect(mapExecutionToPublicStatus(execution)).toEqual({
      status: "awaiting_human_review",
      message: HUMAN_REVIEW_MESSAGE,
      ticketId: "SB-TEST03",
    });
  });

  it("prefers needs_email over conflicting answered items", () => {
    const execution = structuredClone(needsEmailExecution);
    execution.outputs!["Trigger"] = {
      "0": [{ status: "answered", message: "spoofed raw output" }],
    };
    expect(mapExecutionToPublicStatus(execution)).toEqual({
      status: "needs_email",
      message: NEEDS_EMAIL_MESSAGE,
    });
  });

  it("caps very long answer text", () => {
    const execution = structuredClone(completedAnswerExecution);
    execution.outputs!["Answer Complete"]["0"][0].message = "a".repeat(10_000);
    execution.outputs!["Answer Complete"]["0"][0].answer = "a".repeat(10_000);
    const result = mapExecutionToPublicStatus(execution);
    expect(result.status).toBe("answered");
    if (result.status === "answered") {
      expect(result.message.length).toBeLessThanOrEqual(4000);
    }
  });

  it("drops malformed source entries and deduplicates labels", () => {
    const execution = structuredClone(completedAnswerExecution);
    execution.outputs!["Answer Complete"]["0"][0].sources = [
      { document: "Guide", section: "Basics" },
      { document: "Guide", section: "Basics" },
      { unrelated: true },
      42,
      "Plain label",
    ];
    const result = mapExecutionToPublicStatus(execution);
    expect(result).toMatchObject({
      status: "answered",
      sources: ["Guide · Basics", "Plain label"],
    });
  });
});
