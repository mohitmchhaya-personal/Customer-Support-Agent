// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_LYZR_API_BASE_URL, getLyzrConfig } from "./config";
import { LyzrConfigError } from "./errors";

const validEnv = {
  LYZR_API_KEY: "test-key",
  LYZR_CHAT_WORKFLOW_ID: "wf_123",
};

describe("getLyzrConfig", () => {
  it("returns config with the default base URL", () => {
    expect(getLyzrConfig(validEnv)).toEqual({
      apiKey: "test-key",
      workflowId: "wf_123",
      baseUrl: DEFAULT_LYZR_API_BASE_URL,
    });
  });

  it("uses a configured base URL and strips trailing slashes", () => {
    const config = getLyzrConfig({
      ...validEnv,
      LYZR_API_BASE_URL: "https://example.test/api/",
    });
    expect(config.baseUrl).toBe("https://example.test/api");
  });

  it("throws when the API key is missing", () => {
    expect(() =>
      getLyzrConfig({ LYZR_CHAT_WORKFLOW_ID: "wf_123" }),
    ).toThrow(LyzrConfigError);
  });

  it("throws when the workflow ID is missing", () => {
    expect(() => getLyzrConfig({ LYZR_API_KEY: "k" })).toThrow(
      LyzrConfigError,
    );
  });

  it("rejects non-https base URLs", () => {
    expect(() =>
      getLyzrConfig({ ...validEnv, LYZR_API_BASE_URL: "http://example.test" }),
    ).toThrow(LyzrConfigError);
  });
});
