import { describe, expect, it } from "vitest";
import { isValidEmail, maskEmail } from "./email";

describe("isValidEmail", () => {
  it.each([
    "user@example.org",
    "first.last@sub.domain.com",
    "  padded@example.org  ",
  ])("accepts %s", (value) => {
    expect(isValidEmail(value)).toBe(true);
  });

  it.each(["", "   ", "plain", "missing@domain", "@example.org", "a b@c.org"])(
    "rejects %j",
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );
});

describe("maskEmail", () => {
  it("keeps the first character and the domain", () => {
    expect(maskEmail("support@example.org")).toBe("s••••••@example.org");
  });

  it("returns the input unchanged when there is no domain", () => {
    expect(maskEmail("not-an-email")).toBe("not-an-email");
  });
});
