import { LyzrConfigError } from "./errors";
import { assertServerOnly } from "./server-only";

assertServerOnly("lyzr/config");

export const DEFAULT_LYZR_API_BASE_URL = "https://inference.studio.lyzr.ai/api";

export interface LyzrConfig {
  apiKey: string;
  workflowId: string;
  baseUrl: string;
}

/**
 * Reads Lyzr configuration from server-side environment variables.
 * Throws when required values are missing so misconfiguration fails fast
 * instead of sending unauthenticated upstream requests.
 */
export function getLyzrConfig(
  env: Record<string, string | undefined> = process.env,
): LyzrConfig {
  const apiKey = env.LYZR_API_KEY?.trim();
  const workflowId = env.LYZR_CHAT_WORKFLOW_ID?.trim();
  const baseUrl = (env.LYZR_API_BASE_URL?.trim() || DEFAULT_LYZR_API_BASE_URL)
    // Keep URL joining predictable regardless of configured trailing slash.
    .replace(/\/+$/, "");

  if (!apiKey) {
    throw new LyzrConfigError("LYZR_API_KEY is not configured");
  }
  if (!workflowId) {
    throw new LyzrConfigError("LYZR_CHAT_WORKFLOW_ID is not configured");
  }
  if (!/^https:\/\//.test(baseUrl)) {
    throw new LyzrConfigError("LYZR_API_BASE_URL must be an https URL");
  }

  return { apiKey, workflowId, baseUrl };
}
