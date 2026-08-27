import type { SupportApiClient } from "@/lib/support/api-client";
import type {
  ExecutionStatusResponse,
  SubmitMessageRequest,
  SubmitMessageResponse,
} from "@/lib/support/api-contract";

export interface RecordedSubmission {
  request: SubmitMessageRequest;
  response: SubmitMessageResponse;
}

export type ExecutionScript = ExecutionStatusResponse[];

/**
 * Deterministic in-memory implementation of the internal support API used
 * only by automated tests. Each submission consumes the next scripted
 * execution: an ordered list of statuses returned by successive polls
 * (the last entry repeats once the script is exhausted).
 */
export class MockSupportApiClient implements SupportApiClient {
  readonly submissions: RecordedSubmission[] = [];
  readonly pollCounts = new Map<string, number>();
  private scripts: ExecutionScript[] = [];
  private submitFailures = 0;
  private nextId = 0;
  private executions = new Map<string, ExecutionScript>();
  private ticketByRequest = new Map<string, string>();

  enqueueExecution(script: ExecutionScript): this {
    this.scripts.push(script);
    return this;
  }

  failNextSubmit(times = 1): this {
    this.submitFailures += times;
    return this;
  }

  async submitMessage(
    request: SubmitMessageRequest,
  ): Promise<SubmitMessageResponse> {
    if (this.submitFailures > 0) {
      this.submitFailures -= 1;
      throw new Error("submit_failed");
    }
    const script = this.scripts.shift();
    if (!script) {
      throw new Error("MockSupportApiClient: no scripted execution enqueued");
    }
    this.nextId += 1;
    const executionId = `exec-${this.nextId}`;
    const ticketId = request.ticketId ?? `SB-TICKET${this.nextId}00`;
    this.executions.set(executionId, script);
    const response: SubmitMessageResponse = {
      status: "processing",
      ticketId,
      executionId,
    };
    this.submissions.push({ request, response });
    return response;
  }

  async getExecution(executionId: string): Promise<ExecutionStatusResponse> {
    const script = this.executions.get(executionId);
    if (!script) {
      throw new Error(`MockSupportApiClient: unknown execution ${executionId}`);
    }
    const count = this.pollCounts.get(executionId) ?? 0;
    this.pollCounts.set(executionId, count + 1);
    return script[Math.min(count, script.length - 1)];
  }
}

export const ANSWERED: ExecutionStatusResponse = {
  status: "answered",
  message:
    "You can manage your account from the account menu in the top-right of SpreadBliss.",
  sources: ["SpreadBliss Help Center · Account Settings"],
};

export const NEEDS_EMAIL: ExecutionStatusResponse = {
  status: "needs_email",
  message:
    "I've received your question, but it needs review by our support team. Please provide your email address so we can send you the outcome.",
};

export const AWAITING_REVIEW: ExecutionStatusResponse = {
  status: "awaiting_human_review",
  message:
    "Thanks — your question has been sent to our support team. We'll email you the outcome as soon as it has been reviewed.",
};

export const FAILED: ExecutionStatusResponse = {
  status: "failed",
  message:
    "Something went wrong while processing your question. Please try again in a moment.",
  retryable: true,
};

export const PROCESSING: ExecutionStatusResponse = { status: "processing" };
