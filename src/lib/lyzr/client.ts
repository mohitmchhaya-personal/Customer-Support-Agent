import { getLyzrConfig, type LyzrConfig } from "./config";
import {
  LyzrMalformedResponseError,
  LyzrTimeoutError,
  LyzrUpstreamError,
} from "./errors";
import { assertServerOnly } from "./server-only";
import type { LyzrExecuteAck, LyzrExecution } from "./types";

assertServerOnly("lyzr/client");

export const DEFAULT_LYZR_TIMEOUT_MS = 15_000;

export interface LyzrWorkflowInput {
  message: string;
  customer_name?: string;
  customer_email?: string;
  session_id: string;
  ticket_id: string;
}

export interface LyzrClientOptions {
  config?: LyzrConfig;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Server-only HTTP client for the Lyzr SuperFlow API. Holds the API key,
 * enforces request timeouts, and validates upstream payloads before they
 * reach the rest of the application.
 */
export class LyzrClient {
  private readonly config: LyzrConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: LyzrClientOptions = {}) {
    this.config = options.config ?? getLyzrConfig();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_LYZR_TIMEOUT_MS;
  }

  async executeWorkflow(input: LyzrWorkflowInput): Promise<LyzrExecuteAck> {
    const payload = await this.request("/workflows/execute", {
      method: "POST",
      body: JSON.stringify({
        workflow_id: this.config.workflowId,
        input: [input],
      }),
    });

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as LyzrExecuteAck).execution_id !== "string" ||
      (payload as LyzrExecuteAck).execution_id.length === 0 ||
      typeof (payload as LyzrExecuteAck).status !== "string"
    ) {
      throw new LyzrMalformedResponseError();
    }

    return payload as LyzrExecuteAck;
  }

  async getExecution(executionId: string): Promise<LyzrExecution> {
    const payload = await this.request(
      `/executions/${encodeURIComponent(executionId)}`,
      { method: "GET" },
    );

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as LyzrExecution).status !== "string"
    ) {
      throw new LyzrMalformedResponseError();
    }

    return payload as LyzrExecution;
  }

  private async request(
    path: string,
    init: { method: string; body?: string },
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.baseUrl}${path}`, {
        method: init.method,
        headers: {
          "x-api-key": this.config.apiKey,
          "content-type": "application/json",
        },
        body: init.body,
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new LyzrTimeoutError();
      }
      throw new LyzrUpstreamError(0);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new LyzrUpstreamError(response.status);
    }

    try {
      return await response.json();
    } catch {
      throw new LyzrMalformedResponseError();
    }
  }
}
