/**
 * Minimal typed view of Lyzr SuperFlow API payloads. Only the fields the
 * server integration relies on are modelled; everything else is treated as
 * opaque and never forwarded to customers.
 */

export interface LyzrExecuteAck {
  execution_id: string;
  status: string;
}

export interface LyzrSourceRef {
  document?: unknown;
  section?: unknown;
}

/** Shape of a single node output item produced by the chat SuperFlow. */
export interface LyzrNodeOutputItem {
  status?: unknown;
  message?: unknown;
  sources?: unknown;
  ticket_id?: unknown;
  [key: string]: unknown;
}

/**
 * `outputs` maps node name -> branch index -> array of output items, e.g.
 * `{ "Answer Complete": { "0": [ { status: "answered", ... } ] } }`.
 */
export type LyzrOutputs = Record<
  string,
  Record<string, LyzrNodeOutputItem[]>
>;

export interface LyzrExecution {
  execution_id?: string;
  status: string;
  outputs?: LyzrOutputs;
  errors?: string[];
}
