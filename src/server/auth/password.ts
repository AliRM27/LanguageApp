import "server-only";
import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/**
 * `promisify(scrypt)` drops the options overload, so the parameters below could
 * not be passed. A hand-written wrapper keeps them and stays correctly typed.
 */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, derivedKey) =>
      error ? reject(error) : resolve(derivedKey),
    );
  });
}

/**
 * Password hashing with scrypt from Node's standard library.
 *
 * scrypt is deliberately memory-hard, which is what makes a stolen database
 * expensive to attack. Using the built-in avoids a native dependency that would
 * have to compile for whatever platform this is deployed on — a common way for
 * a deploy to break at the worst moment.
 *
 * Stored as `scrypt$N$r$p$salt$hash` so the parameters travel with the hash and
 * can be raised later without invalidating existing passwords.
 */

const N = 16384; // ~16 MB of memory per hash at r=8
const r = 8;
const p = 1;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r,
    p,
  });

  return [
    "scrypt",
    N,
    r,
    p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const salt = Buffer.from(saltRaw, "base64url");
  const expected = Buffer.from(hashRaw, "base64url");

  const key = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
    N: Number(nRaw),
    r: Number(rRaw),
    p: Number(pRaw),
    // Node's default maxmem is 32 MB; raising N later would otherwise throw.
    maxmem: 256 * 1024 * 1024,
  });

  // Constant-time: a length check first, because timingSafeEqual throws on
  // mismatched lengths and that itself would leak information.
  if (key.length !== expected.length) return false;
  return timingSafeEqual(key, expected);
}

/**
 * Wastes roughly as much time as a real verification.
 *
 * Called when no account exists for the address, so that "unknown e-mail" and
 * "wrong password" take the same time. Otherwise the response time alone tells
 * an attacker which addresses are registered.
 */
export async function fakeVerifyDelay(): Promise<void> {
  await scryptAsync("nobody", randomBytes(16), KEY_LENGTH, { N, r, p });
}
