// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  FAILED_MESSAGE,
  HUMAN_REVIEW_MESSAGE,
  NEEDS_EMAIL_MESSAGE,
} from "@/lib/lyzr/adapter";
import type { LyzrClient } from "@/lib/lyzr/client";
import { LyzrTimeoutError, LyzrUpstreamError } from "@/lib/lyzr/errors";
import type { LyzrExecution } from "@/lib/lyzr/types";
import {
  acknowledgedExecution,
  completedAnswerExecution,
  failedExecution,
  malformedExecution,
  needsEmailExecution,
  runningExecution,
} from "@/lib/lyzr/__fixtures__/executions";
import { createExecutionsHandler } from "./executions-handler";

const EXECUTION_ID = "1caeef4f731fb4bcc66866542a3f2851";

function makeContext(executionId: string = EXECUTION_ID) {
  return { params: Promise.resolve({ executionId }) };
}

const request = new Request(
  `http://localhost/api/support/executions/${EXECUTION_ID}`,
);

function handlerFor(execution: LyzrExecution | Error) {
  const getExecution = vi.fn(async () => {
    if (execution instanceof Error) throw execution;
    return execution;
  });
  return createExecutionsHandler({
    getClient: () => ({ getExecution }) as unknown as LyzrClient,
  });
}

describe("GET /api/support/executions/[executionId]", () => {
  it("returns processing for a running execution", async () => {
    const response = await handlerFor(runningExecution)(
      request,
      makeContext(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "processing" });
  });

  it("returns answered with message and source labels", async () => {
    const response = await handlerFor(completedAnswerExecution)(
      request,
      makeContext(),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("answered");
    expect(typeof body.message).toBe("string");
    expect(body.sources).toEqual([
      "SpreadBliss Customer Service Chatbot Knowledge Base.docx · Nonprofit, company, and foundation profiles",
    ]);
    expect(JSON.stringify(body)).not.toContain("confidence");
  });

  it("returns needs_email with the customer-safe request", async () => {
    const response = await handlerFor(needsEmailExecution)(
      request,
      makeContext(),
    );
    expect(await response.json()).toEqual({
      status: "needs_email",
      message: NEEDS_EMAIL_MESSAGE,
    });
  });

  it("returns awaiting_human_review with acknowledgement and ticket ID", async () => {
    const response = await handlerFor(acknowledgedExecution)(
      request,
      makeContext(),
    );
    const body = await response.json();
    expect(body).toEqual({
      status: "awaiting_human_review",
      message: HUMAN_REVIEW_MESSAGE,
      ticketId: "SB-TEST03",
    });
    expect(JSON.stringify(body)).not.toContain("statusCode");
  });

  it("returns a generic retryable failure for failed executions", async () => {
    const response = await handlerFor(failedExecution)(request, makeContext());
    const body = await response.json();
    expect(body).toEqual({
      status: "failed",
      message: FAILED_MESSAGE,
      retryable: true,
    });
    expect(JSON.stringify(body)).not.toContain("stack trace");
  });

  it("returns 502 for malformed upstream executions", async () => {
    const response = await handlerFor(malformedExecution)(
      request,
      makeContext(),
    );
    expect(response.status).toBe(502);
  });

  it("rejects invalid execution identifiers with 400 without calling Lyzr", async () => {
    const getExecution = vi.fn();
    const handler = createExecutionsHandler({
      getClient: () => ({ getExecution }) as unknown as LyzrClient,
    });

    const response = await handler(request, makeContext("../secrets"));

    expect(response.status).toBe(400);
    expect(getExecution).not.toHaveBeenCalled();
  });

  it("returns 404 when the execution does not exist upstream", async () => {
    const response = await handlerFor(new LyzrUpstreamError(404))(
      request,
      makeContext(),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Execution not found." });
  });

  it("maps upstream timeouts to 504", async () => {
    const response = await handlerFor(new LyzrTimeoutError())(
      request,
      makeContext(),
    );
    expect(response.status).toBe(504);
  });

  it("maps other upstream failures to 502", async () => {
    const response = await handlerFor(new LyzrUpstreamError(500))(
      request,
      makeContext(),
    );
    expect(response.status).toBe(502);
  });
});
