import type { ExecutionStatusResponse } from "@/lib/support/api-contract";
import { TICKET_ID_PATTERN } from "@/lib/support/validation";
import { LyzrMalformedResponseError } from "./errors";
import type { LyzrExecution, LyzrNodeOutputItem } from "./types";

/**
 * Maps raw Lyzr execution payloads to the normalized public contract.
 * This is the only place raw Lyzr data is interpreted; internal fields
 * (confidence, evidence quality, escalation reasons, node outputs, approval
 * identifiers) are deliberately dropped and never surfaced.
 */

const IN_PROGRESS_STATUSES = new Set(["running", "paused", "pending", "queued"]);
const COMPLETED_STATUSES = new Set(["success", "completed"]);
const FAILED_STATUSES = new Set(["failed", "cancelled", "error"]);

const TERMINAL_ITEM_STATUSES = new Set([
  "answered",
  "needs_email",
  "awaiting_human_review",
  "acknowledged",
  "escalated",
]);

export const NEEDS_EMAIL_MESSAGE =
  "I've received your question, but it needs review by our support team. Please provide your email address so we can send you the outcome.";

export const HUMAN_REVIEW_MESSAGE =
  "Thanks — your question has been sent to our support team. We'll email you the outcome as soon as it has been reviewed.";

export const FAILED_MESSAGE =
  "Something went wrong while processing your question. Please try again in a moment.";

const MAX_SOURCES = 5;
const MAX_SOURCE_LABEL_LENGTH = 200;

function sanitizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  // Strip control characters so labels are safe to render anywhere.
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (cleaned.length === 0) return undefined;
  return cleaned.slice(0, maxLength);
}

function sanitizeSources(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const labels: string[] = [];
  for (const entry of value) {
    let label: string | undefined;
    if (typeof entry === "string") {
      label = sanitizeText(entry, MAX_SOURCE_LABEL_LENGTH);
    } else if (typeof entry === "object" && entry !== null) {
      const record = entry as Record<string, unknown>;
      const document = sanitizeText(record.document, MAX_SOURCE_LABEL_LENGTH);
      const section = sanitizeText(record.section, MAX_SOURCE_LABEL_LENGTH);
      if (document && section) {
        label = `${document} · ${section}`.slice(0, MAX_SOURCE_LABEL_LENGTH);
      } else {
        label = document ?? section;
      }
    }
    if (label && !labels.includes(label)) {
      labels.push(label);
      if (labels.length >= MAX_SOURCES) break;
    }
  }
  return labels;
}

function findTerminalItem(
  execution: LyzrExecution,
): LyzrNodeOutputItem | undefined {
  const outputs = execution.outputs;
  if (typeof outputs !== "object" || outputs === null) return undefined;

  for (const branches of Object.values(outputs)) {
    if (typeof branches !== "object" || branches === null) continue;
    for (const items of Object.values(branches)) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (
          typeof item === "object" &&
          item !== null &&
          typeof item.status === "string" &&
          TERMINAL_ITEM_STATUSES.has(item.status)
        ) {
          return item;
        }
      }
    }
  }
  return undefined;
}

/**
 * @throws LyzrMalformedResponseError when the execution payload cannot be
 * interpreted (unknown status or completed run without a recognizable
 * terminal output).
 */
export function mapExecutionToPublicStatus(
  execution: LyzrExecution,
): ExecutionStatusResponse {
  const status = execution.status.toLowerCase();

  if (IN_PROGRESS_STATUSES.has(status)) {
    return { status: "processing" };
  }

  if (
    FAILED_STATUSES.has(status) ||
    (Array.isArray(execution.errors) && execution.errors.length > 0)
  ) {
    return { status: "failed", message: FAILED_MESSAGE, retryable: true };
  }

  if (!COMPLETED_STATUSES.has(status)) {
    throw new LyzrMalformedResponseError();
  }

  const item = findTerminalItem(execution);
  if (!item) {
    throw new LyzrMalformedResponseError();
  }

  switch (item.status) {
    case "answered": {
      const message =
        sanitizeText(item.message, Infinity) ??
        sanitizeText(item.answer, Infinity);
      if (!message) {
        throw new LyzrMalformedResponseError();
      }
      return {
        status: "answered",
        message,
        sources: sanitizeSources(item.sources),
      };
    }
    case "needs_email":
      return { status: "needs_email", message: NEEDS_EMAIL_MESSAGE };
    default: {
      // awaiting_human_review / acknowledged / escalated
      const ticketId =
        typeof item.ticket_id === "string" &&
        TICKET_ID_PATTERN.test(item.ticket_id)
          ? item.ticket_id
          : undefined;
      return {
        status: "awaiting_human_review",
        message: HUMAN_REVIEW_MESSAGE,
        ticketId,
      };
    }
  }
}
