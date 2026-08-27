const TICKET_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const TICKET_SUFFIX_LENGTH = 8;

/**
 * Generates a customer-safe ticket reference such as `SB-7KQ2M9XW`.
 * Uses an unambiguous alphabet (no 0/O, 1/I/L) so customers can read the
 * reference back to support agents.
 */
export function generateTicketId(): string {
  const bytes = new Uint8Array(TICKET_SUFFIX_LENGTH);
  crypto.getRandomValues(bytes);
  let suffix = "";
  for (const byte of bytes) {
    suffix += TICKET_ALPHABET[byte % TICKET_ALPHABET.length];
  }
  return `SB-${suffix}`;
}
