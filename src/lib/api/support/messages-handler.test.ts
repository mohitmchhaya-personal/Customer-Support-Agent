// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { LyzrClient } from "@/lib/lyzr/client";
import {
  LyzrMalformedResponseError,
  LyzrTimeoutError,
  LyzrUpstreamError,
} from "@/lib/lyzr/errors";
import { deriveTicketId } from "@/lib/support/ticket";
import { createMessagesHandler } from "./messages-handler";

function makeRequest(
  body: unknown,
  { contentType = "application/json" }: { contentType?: string } = {},
): Request {
  return new Request("http://localhost/api/support/messages", {
    method: "POST",
    headers: { "content-type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function fakeClient(
  executeWorkflow: LyzrClient["executeWorkflow"],
): () => LyzrClient {
  return () => ({ executeWorkflow }) as unknown as LyzrClient;
}

const validBody = {
  message: "How do I create a profile?",
  sessionId: "sess_123",
};

describe("POST /api/support/messages", () => {
  it("submits the workflow and returns processing with a generated ticket", async () => {
    const executeWorkflow = vi.fn(async () => ({
      execution_id: "exec_abc12345",
      status: "running",
    }));
    const handler = createMessagesHandler({
      getClient: fakeClient(executeWorkflow),
      deriveTicketId: () => "SB-FIXED123",
    });

    const response = await handler(makeRequest(validBody));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      status: "processing",
      ticketId: "SB-FIXED123",
      executionId: "exec_abc12345",
    });
    expect(executeWorkflow).toHaveBeenCalledWith({
      message: "How do I create a profile?",
      session_id: "sess_123",
      ticket_id: "SB-FIXED123",
    });
  });

  it("accepts a supplied ticket ID matching the session and maps optional fields", async () => {
    const executeWorkflow = vi.fn(async () => ({
      execution_id: "exec_abc12345",
      status: "running",
    }));
    const sessionTicket = deriveTicketId("sess_123");
    const handler = createMessagesHandler({
      getClient: fakeClient(executeWorkflow),
    });

    const response = await handler(
      makeRequest({
        ...validBody,
        customerName: "Ada",
        customerEmail: "ada@example.com",
        ticketId: sessionTicket,
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ ticketId: sessionTicket });
    expect(executeWorkflow).toHaveBeenCalledWith({
      message: "How do I create a profile?",
      customer_name: "Ada",
      customer_email: "ada@example.com",
      session_id: "sess_123",
      ticket_id: sessionTicket,
    });
  });

  it("rejects a well-formed ticket ID that does not belong to the session", async () => {
    const executeWorkflow = vi.fn();
    const handler = createMessagesHandler({
      getClient: fakeClient(executeWorkflow),
    });

    const response = await handler(
      makeRequest({ ...validBody, ticketId: "SB-FORGED99" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Ticket identifier is not valid.",
    });
    expect(executeWorkflow).not.toHaveBeenCalled();
  });

  it("always uses the session-derived ticket ID for initial submissions", async () => {
    const executeWorkflow = vi.fn(async () => ({
      execution_id: "exec_abc12345",
      status: "running",
    }));
    const handler = createMessagesHandler({
      getClient: fakeClient(executeWorkflow),
    });

    const response = await handler(makeRequest(validBody));

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      ticketId: deriveTicketId("sess_123"),
    });
  });

  it("rejects non-JSON content types with 415", async () => {
    const executeWorkflow = vi.fn();
    const handler = createMessagesHandler({
      getClient: fakeClient(executeWorkflow),
    });

    const response = await handler(
      makeRequest("message=hi", { contentType: "text/plain" }),
    );

    expect(response.status).toBe(415);
    expect(executeWorkflow).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON with 400", async () => {
    const handler = createMessagesHandler({
      getClient: fakeClient(vi.fn()),
    });

    const response = await handler(makeRequest("{not json"));

    expect(response.status).toBe(400);
  });

  it("rejects oversized bodies with 413", async () => {
    const handler = createMessagesHandler({
      getClient: fakeClient(vi.fn()),
    });

    const response = await handler(
      makeRequest({ ...validBody, padding: "x".repeat(20_000) }),
    );

    expect(response.status).toBe(413);
  });

  it("rejects invalid input with 400 and a customer-safe error", async () => {
    const handler = createMessagesHandler({
      getClient: fakeClient(vi.fn()),
    });

    const response = await handler(makeRequest({ sessionId: "sess_123" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "A message is required." });
  });

  it("maps upstream timeouts to 504", async () => {
    const handler = createMessagesHandler({
      getClient: fakeClient(
        vi.fn(async () => {
          throw new LyzrTimeoutError();
        }),
      ),
    });

    const response = await handler(makeRequest(validBody));

    expect(response.status).toBe(504);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("Lyzr");
  });

  it("maps upstream failures to 502 without leaking details", async () => {
    const handler = createMessagesHandler({
      getClient: fakeClient(
        vi.fn(async () => {
          throw new LyzrUpstreamError(500);
        }),
      ),
    });

    const response = await handler(makeRequest(validBody));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "The support service is temporarily unavailable. Please try again.",
    });
  });

  it("maps malformed upstream responses to 502", async () => {
    const handler = createMessagesHandler({
      getClient: fakeClient(
        vi.fn(async () => {
          throw new LyzrMalformedResponseError();
        }),
      ),
    });

    const response = await handler(makeRequest(validBody));

    expect(response.status).toBe(502);
  });

  it("maps unexpected errors to 500 without leaking details", async () => {
    const handler = createMessagesHandler({
      getClient: fakeClient(
        vi.fn(async () => {
          throw new Error("secret internal detail");
        }),
      ),
    });

    const response = await handler(makeRequest(validBody));

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain(
      "secret internal detail",
    );
  });
});
