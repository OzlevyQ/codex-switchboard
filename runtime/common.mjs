import { spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

export const SWITCHBOARD_VERSION = "1.1.0";
export const HOME = os.homedir();
export const SWITCHBOARD_DIR = path.join(HOME, ".codex-switchboard");
export const CONFIG_FILE = path.join(SWITCHBOARD_DIR, "config.json");
export const META_FILE = path.join(SWITCHBOARD_DIR, "meta.json");
export const PROFILES_DIR = path.join(SWITCHBOARD_DIR, "profiles");
export const CODEX_DIR = path.join(HOME, ".codex");
export const AUTH_FILE = path.join(CODEX_DIR, "auth.json");

export function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function slugifyProfileName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "default";
}

export function decodeIdentityFromAuth(authPath = AUTH_FILE) {
  if (!existsSync(authPath)) {
    return null;
  }

  try {
    const auth = readJson(authPath, {});
    const payload = auth.tokens.id_token.split(".")[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(Buffer.from(padded, "base64url").toString("utf8"));
    return {
      email: decoded.email || null,
      name: decoded.name || null,
      sub: decoded.sub || null,
      accountId: auth?.tokens?.account_id || null,
      authMode: auth?.auth_mode || null,
    };
  } catch {
    return null;
  }
}

export function getMeta() {
  return readJson(META_FILE, { activeProfile: null });
}

export function setActiveProfile(profileName) {
  writeJson(META_FILE, { activeProfile: profileName });
}

export function listProfiles() {
  mkdirSync(PROFILES_DIR, { recursive: true });
  const deduped = new Map();
  for (const name of readDirSafe(PROFILES_DIR)) {
    const authPath = path.join(PROFILES_DIR, name, "auth.json");
    if (!existsSync(authPath)) {
      continue;
    }
    const identity = decodeIdentityFromAuth(authPath);
    const entry = {
      name,
      authPath,
      email: identity?.email || "-",
      identity,
    };
    const key = identity?.accountId || identity?.email || name;
    const existing = deduped.get(key);
    if (!existing || shouldReplaceProfileEntry(existing, entry)) {
      deduped.set(key, entry);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => a.email.localeCompare(b.email));
}

function shouldReplaceProfileEntry(existing, next) {
  const existingPreferred = existing.name === slugifyProfileName(existing.email);
  const nextPreferred = next.name === slugifyProfileName(next.email);
  if (nextPreferred && !existingPreferred) {
    return true;
  }

  if (existingPreferred && !nextPreferred) {
    return false;
  }

  return next.name.localeCompare(existing.name) < 0;
}

function readDirSafe(dirPath) {
  try {
    return readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

export function activateProfile(identifier) {
  const profiles = listProfiles();
  const selected = profiles.find(
    (profile) =>
      profile.name === identifier ||
      profile.email === identifier ||
      String(profiles.indexOf(profile) + 1) === String(identifier)
  );

  if (!selected) {
    throw new Error(`No profile matched: ${identifier}`);
  }

  mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  copyFileSync(selected.authPath, AUTH_FILE);
  setActiveProfile(selected.name);
  return selected;
}

export function saveCurrentProfileAuto() {
  const identity = decodeIdentityFromAuth(AUTH_FILE);
  if (!identity?.email) {
    return null;
  }

  const profileName = slugifyProfileName(identity.email);
  const profileDir = path.join(PROFILES_DIR, profileName);
  mkdirSync(profileDir, { recursive: true });
  copyFileSync(AUTH_FILE, path.join(profileDir, "auth.json"));
  setActiveProfile(profileName);
  return { profileName, identity };
}

export function resolveRealCodex() {
  const config = readJson(CONFIG_FILE, {});
  const realCodex = process.env.CODEX_SWITCHBOARD_REAL_CODEX || config.realCodex;
  if (!realCodex) {
    throw new Error(`Missing real Codex path. Reinstall Codex Switchboard.`);
  }
  return realCodex;
}

export function formatLauncherLines() {
  const identity = decodeIdentityFromAuth(AUTH_FILE);
  const meta = getMeta();
  const profiles = listProfiles();
  const activeProfile =
    meta.activeProfile ||
    profiles.find((profile) => profile.identity?.accountId === identity?.accountId)?.name ||
    "-";

  return {
    identity: {
      email: identity?.email || "not logged in",
      name: identity?.name || "-",
      accountId: identity?.accountId || "-",
      profile: activeProfile,
    },
    profiles,
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function printLauncherScreen({ identity, profiles, seconds }) {
  const cyan = "\u001b[38;5;45m";
  const bold = "\u001b[1m";
  const reset = "\u001b[0m";

  const lines = [
    `${cyan}${bold}╭──────────────── Codex Launcher ────────────────╮${reset}`,
    `${cyan}${bold}│${reset} ${bold}active user${reset}   ${identity.email}`,
    `${cyan}${bold}│${reset} ${bold}name${reset}          ${identity.name}`,
    `${cyan}${bold}│${reset} ${bold}profile${reset}       ${identity.profile}`,
    `${cyan}${bold}│${reset} ${bold}account id${reset}    ${identity.accountId}`,
  ];

  if (profiles.length) {
    lines.push(`${cyan}${bold}│${reset}`);
    lines.push(`${cyan}${bold}│${reset} ${bold}available users${reset}`);
    profiles.forEach((profile, index) => {
      lines.push(`${cyan}${bold}│${reset}   ${index + 1}. ${profile.email}`);
    });
    lines.push(`${cyan}${bold}│${reset}`);
    lines.push(
      `${cyan}${bold}│${reset} press ${bold}1-${profiles.length}${reset} within ${bold}${seconds}s${reset} to switch, or wait`
    );
  } else {
    lines.push(`${cyan}${bold}│${reset}`);
    lines.push(`${cyan}${bold}│${reset} no saved profiles found`);
  }

  lines.push(`${cyan}${bold}╰────────────────────────────────────────────────╯${reset}`);
  process.stdout.write(`${lines.join("\n")}\n`);
}

export async function waitForSingleKey(timeoutMs) {
  if (!process.stdin.isTTY) {
    await sleep(timeoutMs);
    return null;
  }

  return new Promise((resolve) => {
    const onData = (buffer) => {
      cleanup();
      resolve(String(buffer).slice(0, 1));
    };

    const cleanup = () => {
      clearTimeout(timer);
      process.stdin.off("data", onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

export async function runRealCodex(args) {
  const realCodex = resolveRealCodex();
  const finalArgs = args.includes("--no-alt-screen") ? args : ["--no-alt-screen", ...args];

  return new Promise((resolve) => {
    const child = spawn(realCodex, finalArgs, {
      // stderr is piped so we can capture it for exhaustion detection.
      // stdin and stdout stay inherited so the terminal experience is unchanged.
      stdio: ["inherit", "inherit", "pipe"],
      env: process.env,
    });

    const stderrChunks = [];
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk);
      process.stderr.write(chunk); // forward to terminal in real-time
    });

    child.on("exit", (code, signal) => {
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (signal) {
        resolve({ code: 1, signal, stderr });
      } else {
        resolve({ code: code ?? 0, signal: null, stderr });
      }
    });
  });
}

export async function runDashboard() {
  return new Promise((resolve) => {
    const serverPath = path.join(SWITCHBOARD_DIR, "app", "server.mjs");
    const child = spawn(process.execPath, [serverPath, "--open-browser"], {
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        resolve({ code: 1, signal });
      } else {
        resolve({ code: code ?? 0, signal: null });
      }
    });
  });
}
