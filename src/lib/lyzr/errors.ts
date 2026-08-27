/**
 * Typed errors thrown by the server-side Lyzr client and adapter.
 * Messages are intentionally generic — they must never contain API keys,
 * request payloads, or raw upstream responses.
 */

export class LyzrConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LyzrConfigError";
  }
}

export class LyzrTimeoutError extends Error {
  constructor() {
    super("Upstream request timed out");
    this.name = "LyzrTimeoutError";
  }
}

export class LyzrUpstreamError extends Error {
  constructor(readonly statusCode: number) {
    super(`Upstream request failed with status ${statusCode}`);
    this.name = "LyzrUpstreamError";
  }
}

export class LyzrMalformedResponseError extends Error {
  constructor() {
    super("Upstream response could not be interpreted");
    this.name = "LyzrMalformedResponseError";
  }
}
