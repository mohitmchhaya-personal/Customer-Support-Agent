import { NextResponse } from "next/server";
import { mapExecutionToPublicStatus } from "@/lib/lyzr/adapter";
import { LyzrClient } from "@/lib/lyzr/client";
import { LyzrUpstreamError } from "@/lib/lyzr/errors";
import { isValidExecutionId } from "@/lib/support/validation";
import { mapUpstreamError } from "./messages-handler";

export interface ExecutionsRouteDeps {
  getClient?: () => LyzrClient;
}

export type ExecutionsRouteContext = {
  params: Promise<{ executionId: string }>;
};

/**
 * Factory used for dependency injection in tests; production uses the
 * default export below with a lazily constructed client.
 */
export function createExecutionsHandler(deps: ExecutionsRouteDeps = {}) {
  const getClient = deps.getClient ?? (() => new LyzrClient());

  return async function GET(
    _request: Request,
    context: ExecutionsRouteContext,
  ): Promise<NextResponse> {
    const { executionId } = await context.params;

    if (!isValidExecutionId(executionId)) {
      return NextResponse.json(
        { error: "Execution identifier is not valid." },
        { status: 400 },
      );
    }

    try {
      const execution = await getClient().getExecution(executionId);
      return NextResponse.json(mapExecutionToPublicStatus(execution));
    } catch (error) {
      if (error instanceof LyzrUpstreamError && error.statusCode === 404) {
        return NextResponse.json(
          { error: "Execution not found." },
          { status: 404 },
        );
      }
      return mapUpstreamError(error);
    }
  };
}
