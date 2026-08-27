import { describe, expect, it } from "vitest";
import { MockSupportService } from "./service";

const service = new MockSupportService(0);

describe("MockSupportService", () => {
  it("returns a grounded answer for a covered profile question", async () => {
    const reply = await service.submitMessage(
      "How do I create an organization profile?",
    );
    expect(reply.kind).toBe("grounded");
  });

  it("returns a grounded answer for a covered account question", async () => {
    const reply = await service.submitMessage("How do I manage my account?");
    expect(reply.kind).toBe("grounded");
  });

  it("escalates unsupported questions", async () => {
    const reply = await service.submitMessage("I'm having a technical issue");
    expect(reply.kind).toBe("escalate");
  });

  it("throws for the transient failure trigger", async () => {
    await expect(service.submitMessage("my network is down")).rejects.toThrow(
      "request_failed",
    );
  });
});
