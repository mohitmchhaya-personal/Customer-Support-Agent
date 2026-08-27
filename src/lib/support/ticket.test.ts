// @vitest-environment node
import { describe, expect, it } from "vitest";
import { generateTicketId, verifyTicketId } from "./ticket";
import { TICKET_ID_PATTERN } from "./validation";

const SECRET = "test-secret";

describe("generateTicketId", () => {
  it("produces customer-safe references matching the ticket pattern", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateTicketId(`sess_${i}`, SECRET)).toMatch(TICKET_ID_PATTERN);
    }
  });

  it("produces distinct references for the same session", () => {
    const ids = new Set(
      Array.from({ length: 100 }, () => generateTicketId("sess_abc", SECRET)),
    );
    expect(ids.size).toBe(100);
  });
});

describe("verifyTicketId", () => {
  it("accepts tickets issued for the same session", () => {
    const ticket = generateTicketId("sess_abc", SECRET);
    expect(verifyTicketId(ticket, "sess_abc", SECRET)).toBe(true);
  });

  it("rejects tickets issued for a different session", () => {
    const ticket = generateTicketId("sess_abc", SECRET);
    expect(verifyTicketId(ticket, "sess_other", SECRET)).toBe(false);
  });

  it("rejects tickets signed with a different secret", () => {
    const ticket = generateTicketId("sess_abc", "other-secret");
    expect(verifyTicketId(ticket, "sess_abc", SECRET)).toBe(false);
  });

  it("rejects well-formed but forged references", () => {
    expect(verifyTicketId("SB-FORGED99AAAA", "sess_abc", SECRET)).toBe(false);
  });

  it("rejects references with the wrong shape", () => {
    expect(verifyTicketId("SB-SHORT", "sess_abc", SECRET)).toBe(false);
    expect(verifyTicketId("XX-AAAAAAAABBBB", "sess_abc", SECRET)).toBe(false);
  });
});
