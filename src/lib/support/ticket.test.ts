// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deriveTicketId } from "./ticket";
import { TICKET_ID_PATTERN } from "./validation";

describe("deriveTicketId", () => {
  it("produces customer-safe references matching the ticket pattern", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(deriveTicketId(`sess_${i}`)).toMatch(TICKET_ID_PATTERN);
    }
  });

  it("is deterministic for the same session", () => {
    expect(deriveTicketId("sess_abc")).toBe(deriveTicketId("sess_abc"));
  });

  it("produces distinct references across sessions", () => {
    const ids = new Set(
      Array.from({ length: 100 }, (_, i) => deriveTicketId(`sess_${i}`)),
    );
    expect(ids.size).toBe(100);
  });
});
