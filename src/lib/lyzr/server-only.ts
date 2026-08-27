/**
 * Guard that prevents Lyzr modules (which handle the API key) from being
 * bundled into or executed in browser code.
 */
export function assertServerOnly(moduleName: string): void {
  if (typeof window !== "undefined") {
    throw new Error(
      `${moduleName} is server-only and must not be imported from browser code`,
    );
  }
}
