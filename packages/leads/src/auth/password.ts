import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Credential primitives — scrypt password hashing and session-token peppering.
 * Node's built-in crypto only: no auth framework, no native build deps.
 */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64, saltBytes: 16 } as const;
const MIN_PASSWORD_LENGTH = 12;

/** `scrypt$N$r$p$saltB64$hashB64` — self-describing so params can evolve. */
export function hashPassword(password: string): string {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  const salt = randomBytes(SCRYPT.saltBytes);
  const derived = scryptSync(password.normalize("NFKC"), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 64 * 1024 * 1024,
  });
  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltB64 = parts[4];
  const expectedB64 = parts[5];
  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    !saltB64 ||
    !expectedB64
  ) {
    return false;
  }
  try {
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(expectedB64, "base64");
    const derived = scryptSync(password.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters");
  }
  // Development/test fallback — never acceptable in production builds.
  return secret || "ibtatech-dev-only-secret-do-not-use-in-production";
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Peppered token digest — the raw token is never stored. */
export function hashSessionToken(token: string): string {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const PASSWORD_MIN_LENGTH = MIN_PASSWORD_LENGTH;
