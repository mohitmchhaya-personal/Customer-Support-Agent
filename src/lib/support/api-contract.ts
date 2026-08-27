/**
 * Normalized internal API contract between the support UI and the server.
 * These are the only shapes the frontend may depend on; raw Lyzr structures
 * never cross this boundary.
 */

import type { SupportStatus } from "./types";

export interface SubmitMessageRequest {
  message: string;
  customerName?: string;
  customerEmail?: string;
  sessionId: string;
  ticketId?: string;
}

export interface SubmitMessageResponse {
  status: "processing";
  ticketId: string;
  executionId: string;
}

export type ExecutionStatusResponse =
  | { status: "processing" }
  | { status: "answered"; message: string; sources: string[] }
  | { status: "needs_email"; message: string }
  | { status: "awaiting_human_review"; message: string; ticketId?: string }
  | { status: "failed"; message: string; retryable: true };

export interface ApiErrorResponse {
  error: string;
}

export const SUPPORT_STATUSES: readonly SupportStatus[] = [
  "processing",
  "answered",
  "needs_email",
  "awaiting_human_review",
  "failed",
];
