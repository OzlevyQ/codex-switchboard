import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  SWITCHBOARD_DIR,
  PROFILES_DIR,
  listProfiles,
  readJson,
  writeJson,
} from "./common.mjs";

const POOLS_FILE = path.join(SWITCHBOARD_DIR, "pools.json");
const STATE_FILE_NAME = "state.json";

function readPoolsFile() {
  return readJson(POOLS_FILE, { pools: [], activePool: null });
}

function writePoolsFile(data) {
  writeJson(POOLS_FILE, data);
}

// Shared helper: find a pool by name, apply updater, write back.
function updatePool(name, updater) {
  const data = readPoolsFile();
  const pool = data.pools.find((p) => p.name === name);
  if (!pool) throw new Error(`Pool "${name}" not found`);
  updater(pool, data);
  writePoolsFile(data);
}

// ─── Pool CRUD ───────────────────────────────────────────────────────────────

export function listPools() {
  return readPoolsFile().pools;
}

export function getActivePoolName() {
  return readPoolsFile().activePool;
}

export function getActivePool() {
  const data = readPoolsFile();
  if (!data.activePool) return null;
  return data.pools.find((p) => p.name === data.activePool) || null;
}

export function createPool(name, strategy = "round-robin") {
  const data = readPoolsFile();
  if (data.pools.find((p) => p.name === name)) {
    throw new Error(`Pool "${name}" already exists`);
  }
  data.pools.push({ name, profiles: [], autoSwitch: true, strategy });
  writePoolsFile(data);
  return name;
}

export function deletePool(name) {
  const data = readPoolsFile();
  data.pools = data.pools.filter((p) => p.name !== name);
  if (data.activePool === name) data.activePool = null;
  writePoolsFile(data);
}

export function addProfileToPool(poolName, profileName) {
  updatePool(poolName, (pool) => {
    if (!pool.profiles.includes(profileName)) pool.profiles.push(profileName);
  });
}

export function removeProfileFromPool(poolName, profileName) {
  updatePool(poolName, (pool) => {
    pool.profiles = pool.profiles.filter((p) => p !== profileName);
  });
}

export function setActivePool(name) {
  const data = readPoolsFile();
  if (name && !data.pools.find((p) => p.name === name)) {
    throw new Error(`Pool "${name}" not found`);
  }
  data.activePool = name || null;
  writePoolsFile(data);
}

export function setPoolAutoSwitch(poolName, enabled) {
  updatePool(poolName, (pool) => {
    pool.autoSwitch = Boolean(enabled);
  });
}

// ─── Profile state (exhaustion tracking) ─────────────────────────────────────

export function getProfileState(profileName) {
  const stateFile = path.join(PROFILES_DIR, profileName, STATE_FILE_NAME);
  return readJson(stateFile, { exhausted: false, exhaustedAt: null, exhaustionType: null });
}

function setProfileState(profileName, state) {
  const stateFile = path.join(PROFILES_DIR, profileName, STATE_FILE_NAME);
  mkdirSync(path.dirname(stateFile), { recursive: true });
  writeJson(stateFile, state);
}

export function markProfileExhausted(profileName, exhaustionType) {
  setProfileState(profileName, {
    exhausted: true,
    exhaustedAt: new Date().toISOString(),
    exhaustionType: exhaustionType || "unknown",
  });
}

export function resetProfileExhausted(profileName) {
  setProfileState(profileName, { exhausted: false, exhaustedAt: null, exhaustionType: null });
}

export function resetAllExhaustedInPool(poolName) {
  const pool = listPools().find((p) => p.name === poolName);
  if (pool) pool.profiles.forEach(resetProfileExhausted);
}

// ─── Rotation ─────────────────────────────────────────────────────────────────

export function findNextAvailableProfile(currentProfileName) {
  const pool = getActivePool();
  if (!pool || !pool.autoSwitch || !pool.profiles.length) return null;

  const knownProfiles = listProfiles();
  return pool.profiles
    .filter((name) => name !== currentProfileName)
    .map((name) => knownProfiles.find((p) => p.name === name))
    .filter((p) => p && !getProfileState(p.name).exhausted)[0] || null;
}

// ─── Exit classification ──────────────────────────────────────────────────────

const EXHAUSTION_PATTERNS = [
  "insufficient_quota",
  "exceeded your current quota",
  "check your plan and billing details",
  "Your refresh token has already been used",
];

const RATE_LIMIT_PATTERNS = [
  "429 Too Many Requests",
  "exceeded retry limit",
  "rate_limit_exceeded",
];

export function classifyExit(exitCode, stderr) {
  if (exitCode === 0) return "ok";
  if (EXHAUSTION_PATTERNS.some((p) => stderr.includes(p))) return "exhausted";
  if (RATE_LIMIT_PATTERNS.some((p) => stderr.includes(p))) return "rate_limit";
  return "error";
}
