// @vitest-environment node
import { describe, expect, it } from "vitest";
import { generateTicketId } from "./ticket";
import { TICKET_ID_PATTERN } from "./validation";

describe("generateTicketId", () => {
  it("produces customer-safe references matching the ticket pattern", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateTicketId()).toMatch(TICKET_ID_PATTERN);
    }
  });

  it("produces distinct references", () => {
    const ids = new Set(
      Array.from({ length: 100 }, () => generateTicketId()),
    );
    expect(ids.size).toBe(100);
  });
});
