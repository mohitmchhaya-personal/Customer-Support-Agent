import { createHmac, timingSafeEqual } from "node:crypto";

const TICKET_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const RANDOM_LENGTH = 8;
const CHECKSUM_LENGTH = 4;

function toAlphabet(bytes: Uint8Array, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TICKET_ALPHABET[bytes[i] % TICKET_ALPHABET.length];
  }
  return out;
}

function checksum(secret: string, sessionId: string, randomPart: string): string {
  const digest = createHmac("sha256", secret)
    .update(`spreadbliss-ticket:${sessionId}:${randomPart}`)
    .digest();
  return toAlphabet(digest, CHECKSUM_LENGTH);
}

/**
 * Generates a customer-safe ticket reference such as `SB-7KQ2M9XWABCD`:
 * a random part followed by an HMAC checksum bound to the session, so a
 * client-supplied ticket can be verified statelessly instead of trusted.
 * Uses an unambiguous alphabet (no 0/O, 1/I/L) so customers can read the
 * reference back to support agents.
 */
export function generateTicketId(sessionId: string, secret: string): string {
  const bytes = new Uint8Array(RANDOM_LENGTH);
  crypto.getRandomValues(bytes);
  const randomPart = toAlphabet(bytes, RANDOM_LENGTH);
  return `SB-${randomPart}${checksum(secret, sessionId, randomPart)}`;
}

/**
 * Verifies that a client-supplied ticket reference was issued for the
 * given session by recomputing its HMAC checksum.
 */
export function verifyTicketId(
  ticketId: string,
  sessionId: string,
  secret: string,
): boolean {
  if (!ticketId.startsWith("SB-")) return false;
  const body = ticketId.slice(3);
  if (body.length !== RANDOM_LENGTH + CHECKSUM_LENGTH) return false;
  const randomPart = body.slice(0, RANDOM_LENGTH);
  const expected = checksum(secret, sessionId, randomPart);
  const actual = body.slice(RANDOM_LENGTH);
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
