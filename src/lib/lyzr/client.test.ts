// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { LyzrClient } from "./client";
import type { LyzrConfig } from "./config";
import {
  LyzrMalformedResponseError,
  LyzrTimeoutError,
  LyzrUpstreamError,
} from "./errors";

const config: LyzrConfig = {
  apiKey: "test-key",
  workflowId: "wf_123",
  baseUrl: "https://lyzr.example.test/api",
};

const input = {
  message: "Hello",
  session_id: "sess_1",
  ticket_id: "SB-TEST01",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("LyzrClient.executeWorkflow", () => {
  it("posts the workflow payload with the API key header", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ execution_id: "exec_1", status: "running" }),
    );
    const client = new LyzrClient({ config, fetchImpl });

    const ack = await client.executeWorkflow(input);

    expect(ack).toEqual({ execution_id: "exec_1", status: "running" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://lyzr.example.test/api/workflows/execute");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe(
      "test-key",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      workflow_id: "wf_123",
      input: [input],
    });
  });

  it("throws LyzrUpstreamError on non-2xx responses", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "nope" }, 403));
    const client = new LyzrClient({ config, fetchImpl });

    await expect(client.executeWorkflow(input)).rejects.toBeInstanceOf(
      LyzrUpstreamError,
    );
  });

  it("throws LyzrMalformedResponseError when the ack is missing fields", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: "running" }));
    const client = new LyzrClient({ config, fetchImpl });

    await expect(client.executeWorkflow(input)).rejects.toBeInstanceOf(
      LyzrMalformedResponseError,
    );
  });

  it("throws LyzrMalformedResponseError on non-JSON responses", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("<html>oops</html>", { status: 200 }),
    );
    const client = new LyzrClient({ config, fetchImpl });

    await expect(client.executeWorkflow(input)).rejects.toBeInstanceOf(
      LyzrMalformedResponseError,
    );
  });

  it("throws LyzrTimeoutError when the request exceeds the timeout", async () => {
    const fetchImpl = vi.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(
              Object.assign(new Error("aborted"), { name: "AbortError" }),
            );
          });
        }),
    );
    const client = new LyzrClient({ config, fetchImpl, timeoutMs: 10 });

    await expect(client.executeWorkflow(input)).rejects.toBeInstanceOf(
      LyzrTimeoutError,
    );
  });

  it("wraps network failures as upstream errors", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const client = new LyzrClient({ config, fetchImpl });

    await expect(client.executeWorkflow(input)).rejects.toBeInstanceOf(
      LyzrUpstreamError,
    );
  });
});

describe("LyzrClient.getExecution", () => {
  it("fetches the execution status endpoint", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ execution_id: "exec_1", status: "running" }),
    );
    const client = new LyzrClient({ config, fetchImpl });

    const execution = await client.getExecution("exec_1");

    expect(execution.status).toBe("running");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://lyzr.example.test/api/executions/exec_1");
    expect(init.method).toBe("GET");
  });

  it("URL-encodes the execution ID", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ execution_id: "a/b", status: "running" }),
    );
    const client = new LyzrClient({ config, fetchImpl });

    await client.getExecution("a/b");

    const [url] = fetchImpl.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://lyzr.example.test/api/executions/a%2Fb");
  });

  it("throws LyzrMalformedResponseError when status is missing", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ outputs: {} }));
    const client = new LyzrClient({ config, fetchImpl });

    await expect(client.getExecution("exec_1")).rejects.toBeInstanceOf(
      LyzrMalformedResponseError,
    );
  });
});
