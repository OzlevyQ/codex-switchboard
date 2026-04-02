import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PROFILES_DIR, readJson, writeJson } from "./common.mjs";

const POOL_PREFIX = "SWP1_";

const ALGO = "aes-256-gcm";
const BUNDLE_PREFIX = "SWB1_";
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

// Promisify crypto.scrypt
function deriveKey(passphrase, salt) {
  return new Promise((resolve, reject) =>
    scrypt(passphrase, salt, 32, SCRYPT_PARAMS, (err, key) =>
      err ? reject(err) : resolve(key)
    )
  );
}

/**
 * Encrypt a local profile into a shareable bundle string.
 * Returns { bundle, hint } where hint is the account email.
 */
export async function exportProfileBundle(profileName, passphrase) {
  const authPath = path.join(PROFILES_DIR, profileName, "auth.json");
  if (!existsSync(authPath)) {
    const err = new Error(`Profile "${profileName}" not found`);
    err.code = "ENOENT";
    throw err;
  }

  const auth = readJson(authPath, null);
  if (!auth) throw new Error("Could not read profile auth file");

  // Decode identity for hint (best-effort)
  let hint = "unknown";
  try {
    const payload = auth.tokens.id_token.split(".")[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(Buffer.from(padded, "base64url").toString("utf8"));
    hint = decoded.email || "unknown";
  } catch {}

  const salt = randomBytes(32);
  const iv = randomBytes(12);
  const key = await deriveKey(passphrase, salt);

  const meta = Buffer.from(JSON.stringify({ v: 1, hint, exportedAt: new Date().toISOString() }), "utf8");
  const metaLen = Buffer.alloc(2);
  metaLen.writeUInt16BE(meta.length, 0);

  const payload = Buffer.from(JSON.stringify({ profileName, auth }), "utf8");
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Layout: version(1) + salt(32) + iv(12) + metaLen(2) + meta(N) + ciphertext(M) + tag(16)
  const bundle = Buffer.concat([Buffer.from([0x01]), salt, iv, metaLen, meta, ciphertext, tag]);
  return { bundle: BUNDLE_PREFIX + bundle.toString("base64url"), hint };
}

/**
 * Decrypt and save an imported bundle as a local profile.
 * Returns { profileName, hint }.
 */
export async function importProfileBundle(bundleStr, passphrase, nameOverride, profilesDir) {
  if (!bundleStr.startsWith(BUNDLE_PREFIX)) {
    const err = new Error("Invalid bundle format — must start with SWB1_");
    err.format = true;
    throw err;
  }

  let buf;
  try {
    buf = Buffer.from(bundleStr.slice(BUNDLE_PREFIX.length), "base64url");
  } catch {
    const err = new Error("Invalid bundle encoding");
    err.format = true;
    throw err;
  }

  if (buf.length < 1 + 32 + 12 + 2 + 16) {
    const err = new Error("Bundle too short — likely corrupted");
    err.format = true;
    throw err;
  }

  const version = buf[0];
  if (version !== 0x01) {
    const err = new Error(`Unsupported bundle version: ${version}`);
    err.format = true;
    throw err;
  }

  // Parse fixed-length header fields
  const salt = buf.subarray(1, 33);
  const iv = buf.subarray(33, 45);
  const metaLen = buf.readUInt16BE(45);
  const metaEnd = 47 + metaLen;

  if (buf.length < metaEnd + 16) {
    const err = new Error("Bundle structure invalid — likely corrupted");
    err.format = true;
    throw err;
  }

  let hint = "unknown";
  try {
    const meta = JSON.parse(buf.subarray(47, metaEnd).toString("utf8"));
    hint = meta.hint || "unknown";
  } catch {}

  // ciphertext is everything between meta and the last 16 bytes (auth tag)
  const ciphertext = buf.subarray(metaEnd, buf.length - 16);
  const tag = buf.subarray(buf.length - 16);

  const key = await deriveKey(passphrase, salt);

  let payload;
  try {
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    payload = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"));
  } catch {
    const err = new Error("Decryption failed — wrong passphrase or corrupted bundle");
    err.format = true;
    throw err;
  }

  if (!payload.auth || !payload.profileName) {
    const err = new Error("Bundle payload is missing required fields");
    err.format = true;
    throw err;
  }

  const baseName = nameOverride || payload.profileName;
  const resolvedName = resolveProfileName(baseName, profilesDir);

  if (nameOverride && resolvedName !== nameOverride) {
    const err = new Error(`Profile name "${nameOverride}" is already taken`);
    err.conflict = true;
    err.suggestion = resolvedName;
    throw err;
  }

  const profileDir = path.join(profilesDir, resolvedName);
  mkdirSync(profileDir, { recursive: true });
  writeJson(path.join(profileDir, "auth.json"), payload.auth);

  return { profileName: resolvedName, hint };
}

/**
 * Return the first available name: baseName, baseName-2, baseName-3, …
 */
export function resolveProfileName(baseName, profilesDir) {
  if (!existsSync(path.join(profilesDir, baseName))) return baseName;
  for (let i = 2; i <= 20; i++) {
    const candidate = `${baseName}-${i}`;
    if (!existsSync(path.join(profilesDir, candidate))) return candidate;
  }
  return `${baseName}-${Date.now()}`;
}

// ─── Pool sharing (no encryption — pools contain no secrets) ──────────────────

/**
 * Encode a pool config as a shareable string.
 * Pool bundles are not encrypted — they contain only profile names and settings.
 * Returns { bundle, poolName }.
 */
export function exportPoolBundle(pool) {
  const payload = {
    v: 1,
    exportedAt: new Date().toISOString(),
    pool: {
      name: pool.name,
      profiles: pool.profiles,
      autoSwitch: pool.autoSwitch,
      strategy: pool.strategy || "round-robin",
    },
  };
  return {
    bundle: POOL_PREFIX + Buffer.from(JSON.stringify(payload), "utf8").toString("base64url"),
    poolName: pool.name,
  };
}

/**
 * Decode a pool bundle string.
 * Returns the decoded pool object { name, profiles, autoSwitch, strategy }.
 * Throws on invalid format.
 */
export function decodePoolBundle(bundleStr) {
  if (!bundleStr.startsWith(POOL_PREFIX)) {
    const err = new Error("Invalid pool bundle — must start with SWP1_");
    err.format = true;
    throw err;
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(bundleStr.slice(POOL_PREFIX.length), "base64url").toString("utf8"));
  } catch {
    const err = new Error("Invalid pool bundle encoding");
    err.format = true;
    throw err;
  }
  if (!payload.pool || !payload.pool.name || !Array.isArray(payload.pool.profiles)) {
    const err = new Error("Pool bundle is missing required fields");
    err.format = true;
    throw err;
  }
  return payload.pool;
}
