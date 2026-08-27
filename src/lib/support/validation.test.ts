// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  MAX_CUSTOMER_NAME_LENGTH,
  MAX_MESSAGE_LENGTH,
  isValidExecutionId,
  parseSubmitMessageRequest,
} from "./validation";

const validBody = {
  message: "How do I create a profile?",
  sessionId: "sess_123",
};

describe("parseSubmitMessageRequest", () => {
  it("accepts a minimal valid body", () => {
    const result = parseSubmitMessageRequest(validBody);
    expect(result).toEqual({
      ok: true,
      value: {
        message: "How do I create a profile?",
        customerName: undefined,
        customerEmail: undefined,
        sessionId: "sess_123",
        ticketId: undefined,
      },
    });
  });

  it("accepts optional fields when valid", () => {
    const result = parseSubmitMessageRequest({
      ...validBody,
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.com",
      ticketId: "SB-ABCD1234",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.customerName).toBe("Ada Lovelace");
      expect(result.value.customerEmail).toBe("ada@example.com");
      expect(result.value.ticketId).toBe("SB-ABCD1234");
    }
  });

  it.each([null, [], "text", 42])("rejects non-object bodies (%s)", (body) => {
    expect(parseSubmitMessageRequest(body).ok).toBe(false);
  });

  it("rejects a missing or empty message", () => {
    expect(parseSubmitMessageRequest({ sessionId: "s" }).ok).toBe(false);
    expect(
      parseSubmitMessageRequest({ ...validBody, message: "   " }).ok,
    ).toBe(false);
  });

  it("rejects messages over the maximum length", () => {
    const result = parseSubmitMessageRequest({
      ...validBody,
      message: "a".repeat(MAX_MESSAGE_LENGTH + 1),
    });
    expect(result.ok).toBe(false);
  });

  it("rejects missing or malformed session identifiers", () => {
    expect(parseSubmitMessageRequest({ message: "hi" }).ok).toBe(false);
    expect(
      parseSubmitMessageRequest({ message: "hi", sessionId: "bad session!" })
        .ok,
    ).toBe(false);
  });

  it("rejects names over the maximum length", () => {
    const result = parseSubmitMessageRequest({
      ...validBody,
      customerName: "a".repeat(MAX_CUSTOMER_NAME_LENGTH + 1),
    });
    expect(result.ok).toBe(false);
  });

  it("treats empty optional fields as omitted", () => {
    const result = parseSubmitMessageRequest({
      ...validBody,
      customerName: "  ",
      customerEmail: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.customerName).toBeUndefined();
      expect(result.value.customerEmail).toBeUndefined();
    }
  });

  it("rejects invalid email addresses", () => {
    expect(
      parseSubmitMessageRequest({ ...validBody, customerEmail: "not-email" })
        .ok,
    ).toBe(false);
  });

  it("rejects malformed ticket identifiers", () => {
    expect(
      parseSubmitMessageRequest({ ...validBody, ticketId: "TICKET-1" }).ok,
    ).toBe(false);
    expect(
      parseSubmitMessageRequest({ ...validBody, ticketId: "SB-ab" }).ok,
    ).toBe(false);
  });
});

describe("isValidExecutionId", () => {
  it("accepts hex and prefixed execution IDs", () => {
    expect(isValidExecutionId("1caeef4f731fb4bcc66866542a3f2851")).toBe(true);
    expect(isValidExecutionId("exec_5b7d3e99")).toBe(true);
  });

  it("rejects short or unsafe values", () => {
    expect(isValidExecutionId("short")).toBe(false);
    expect(isValidExecutionId("../../etc/passwd")).toBe(false);
    expect(isValidExecutionId("")).toBe(false);
  });
});
