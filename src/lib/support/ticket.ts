import { createHash } from "node:crypto";

const TICKET_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const TICKET_SUFFIX_LENGTH = 8;

/**
 * Derives the customer-safe ticket reference (e.g. `SB-7KQ2M9XW`) for a
 * session. Deriving the reference from the session identifier binds each
 * ticket to its conversation, so a client-supplied ticket ID can be
 * verified statelessly instead of trusted. Uses an unambiguous alphabet
 * (no 0/O, 1/I/L) so customers can read the reference back to support
 * agents.
 */
export function deriveTicketId(sessionId: string): string {
  const digest = createHash("sha256")
    .update(`spreadbliss-ticket:${sessionId}`)
    .digest();
  let suffix = "";
  for (let i = 0; i < TICKET_SUFFIX_LENGTH; i++) {
    suffix += TICKET_ALPHABET[digest[i] % TICKET_ALPHABET.length];
  }
  return `SB-${suffix}`;
}
