import { isValidEmail } from "./email";
import type { SubmitMessageRequest } from "./api-contract";

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_CUSTOMER_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_REQUEST_BODY_BYTES = 16 * 1024;

export const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
export const TICKET_ID_PATTERN = /^SB-[A-Z0-9]{4,16}$/;
export const EXECUTION_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export type ValidationResult =
  | { ok: true; value: SubmitMessageRequest }
  | { ok: false; error: string };

function invalid(error: string): ValidationResult {
  return { ok: false, error };
}

/**
 * Validates the untrusted JSON body of POST /api/support/messages and
 * narrows it to the typed request. Error strings are customer-safe.
 */
export function parseSubmitMessageRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return invalid("Request body must be a JSON object.");
  }

  const record = body as Record<string, unknown>;

  const message = record.message;
  if (typeof message !== "string" || message.trim().length === 0) {
    return invalid("A message is required.");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return invalid(
      `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    );
  }

  const sessionId = record.sessionId;
  if (typeof sessionId !== "string" || !SESSION_ID_PATTERN.test(sessionId)) {
    return invalid("A valid session identifier is required.");
  }

  let customerName: string | undefined;
  if (record.customerName !== undefined) {
    if (typeof record.customerName !== "string") {
      return invalid("Name must be text.");
    }
    customerName = record.customerName.trim();
    if (customerName.length === 0) {
      customerName = undefined;
    } else if (customerName.length > MAX_CUSTOMER_NAME_LENGTH) {
      return invalid(
        `Name must be ${MAX_CUSTOMER_NAME_LENGTH} characters or fewer.`,
      );
    }
  }

  let customerEmail: string | undefined;
  if (record.customerEmail !== undefined) {
    if (typeof record.customerEmail !== "string") {
      return invalid("Email must be text.");
    }
    customerEmail = record.customerEmail.trim();
    if (customerEmail.length === 0) {
      customerEmail = undefined;
    } else if (
      customerEmail.length > MAX_EMAIL_LENGTH ||
      !isValidEmail(customerEmail)
    ) {
      return invalid("Email address is not valid.");
    }
  }

  let ticketId: string | undefined;
  if (record.ticketId !== undefined) {
    if (
      typeof record.ticketId !== "string" ||
      !TICKET_ID_PATTERN.test(record.ticketId)
    ) {
      return invalid("Ticket identifier is not valid.");
    }
    ticketId = record.ticketId;
  }

  return {
    ok: true,
    value: {
      message: message.trim(),
      customerName,
      customerEmail,
      sessionId,
      ticketId,
    },
  };
}

export function isValidExecutionId(value: string): boolean {
  return EXECUTION_ID_PATTERN.test(value);
}
