import { NextResponse } from "next/server";
import { LyzrClient, type LyzrWorkflowInput } from "@/lib/lyzr/client";
import {
  LyzrConfigError,
  LyzrMalformedResponseError,
  LyzrTimeoutError,
  LyzrUpstreamError,
} from "@/lib/lyzr/errors";
import type { SubmitMessageResponse } from "@/lib/support/api-contract";
import { generateTicketId } from "@/lib/support/ticket";
import {
  MAX_REQUEST_BODY_BYTES,
  parseSubmitMessageRequest,
} from "@/lib/support/validation";

export interface MessagesRouteDeps {
  getClient?: () => LyzrClient;
  generateTicketId?: () => string;
}

function errorResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Factory used for dependency injection in tests; the Route Handler uses
 * the defaults, constructing the client lazily so configuration is read
 * per-request rather than at build time.
 */
export function createMessagesHandler(deps: MessagesRouteDeps = {}) {
  const getClient = deps.getClient ?? (() => new LyzrClient());
  const newTicketId = deps.generateTicketId ?? generateTicketId;

  return async function POST(request: Request): Promise<NextResponse> {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return errorResponse(415, "Content-Type must be application/json.");
    }

    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return errorResponse(400, "Request body could not be read.");
    }

    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BODY_BYTES) {
      return errorResponse(413, "Request body is too large.");
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return errorResponse(400, "Request body must be valid JSON.");
    }

    const parsed = parseSubmitMessageRequest(body);
    if (!parsed.ok) {
      return errorResponse(400, parsed.error);
    }

    const ticketId = parsed.value.ticketId ?? newTicketId();

    const input: LyzrWorkflowInput = {
      message: parsed.value.message,
      session_id: parsed.value.sessionId,
      ticket_id: ticketId,
    };
    if (parsed.value.customerName !== undefined) {
      input.customer_name = parsed.value.customerName;
    }
    if (parsed.value.customerEmail !== undefined) {
      input.customer_email = parsed.value.customerEmail;
    }

    try {
      const ack = await getClient().executeWorkflow(input);
      const response: SubmitMessageResponse = {
        status: "processing",
        ticketId,
        executionId: ack.execution_id,
      };
      return NextResponse.json(response, { status: 202 });
    } catch (error) {
      return mapUpstreamError(error);
    }
  };
}

export function mapUpstreamError(error: unknown): NextResponse {
  if (error instanceof LyzrTimeoutError) {
    return errorResponse(
      504,
      "The support service took too long to respond. Please try again.",
    );
  }
  if (
    error instanceof LyzrUpstreamError ||
    error instanceof LyzrMalformedResponseError ||
    error instanceof LyzrConfigError
  ) {
    return errorResponse(
      502,
      "The support service is temporarily unavailable. Please try again.",
    );
  }
  return errorResponse(500, "An unexpected error occurred. Please try again.");
}
