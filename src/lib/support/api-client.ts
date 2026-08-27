import type {
  ExecutionStatusResponse,
  SubmitMessageRequest,
  SubmitMessageResponse,
} from "./api-contract";
import { SUPPORT_STATUSES } from "./api-contract";
import type { SupportStatus } from "./types";

/**
 * Boundary between the support UI and the normalized internal API.
 * Component tests substitute deterministic implementations of this
 * interface; production uses {@link HttpSupportApiClient}.
 */
export interface SupportApiClient {
  submitMessage(
    request: SubmitMessageRequest,
    signal?: AbortSignal,
  ): Promise<SubmitMessageResponse>;
  getExecution(
    executionId: string,
    signal?: AbortSignal,
  ): Promise<ExecutionStatusResponse>;
}

export class SupportApiError extends Error {
  constructor(readonly statusCode?: number) {
    super("support_api_error");
    this.name = "SupportApiError";
  }
}

function isSupportStatus(value: unknown): value is SupportStatus {
  return (
    typeof value === "string" &&
    (SUPPORT_STATUSES as readonly string[]).includes(value)
  );
}

function parseSubmitResponse(payload: unknown): SubmitMessageResponse {
  if (typeof payload !== "object" || payload === null) {
    throw new SupportApiError();
  }
  const record = payload as Record<string, unknown>;
  if (
    record.status !== "processing" ||
    typeof record.ticketId !== "string" ||
    typeof record.executionId !== "string"
  ) {
    throw new SupportApiError();
  }
  return {
    status: "processing",
    ticketId: record.ticketId,
    executionId: record.executionId,
  };
}

function parseExecutionResponse(payload: unknown): ExecutionStatusResponse {
  if (typeof payload !== "object" || payload === null) {
    throw new SupportApiError();
  }
  const record = payload as Record<string, unknown>;
  if (!isSupportStatus(record.status)) {
    throw new SupportApiError();
  }
  switch (record.status) {
    case "processing":
      return { status: "processing" };
    case "answered": {
      if (typeof record.message !== "string" || record.message.length === 0) {
        throw new SupportApiError();
      }
      const sources = Array.isArray(record.sources)
        ? record.sources.filter(
            (entry): entry is string => typeof entry === "string",
          )
        : [];
      return { status: "answered", message: record.message, sources };
    }
    case "needs_email": {
      if (typeof record.message !== "string" || record.message.length === 0) {
        throw new SupportApiError();
      }
      return { status: "needs_email", message: record.message };
    }
    case "awaiting_human_review": {
      if (typeof record.message !== "string" || record.message.length === 0) {
        throw new SupportApiError();
      }
      return {
        status: "awaiting_human_review",
        message: record.message,
        ticketId:
          typeof record.ticketId === "string" ? record.ticketId : undefined,
      };
    }
    case "failed": {
      if (typeof record.message !== "string" || record.message.length === 0) {
        throw new SupportApiError();
      }
      return { status: "failed", message: record.message, retryable: true };
    }
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new SupportApiError(response.status);
  }
}

/** Production client for the internal support Route Handlers. */
export class HttpSupportApiClient implements SupportApiClient {
  async submitMessage(
    request: SubmitMessageRequest,
    signal?: AbortSignal,
  ): Promise<SubmitMessageResponse> {
    const response = await fetch("/api/support/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
    if (!response.ok) {
      throw new SupportApiError(response.status);
    }
    return parseSubmitResponse(await readJson(response));
  }

  async getExecution(
    executionId: string,
    signal?: AbortSignal,
  ): Promise<ExecutionStatusResponse> {
    const response = await fetch(
      `/api/support/executions/${encodeURIComponent(executionId)}`,
      { signal },
    );
    if (!response.ok) {
      throw new SupportApiError(response.status);
    }
    return parseExecutionResponse(await readJson(response));
  }
}
