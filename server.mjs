import http from "node:http";
import { spawn } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join } from "node:path";
import os from "node:os";
import {
  listPools,
  getActivePoolName,
  getProfileState,
  createPool,
  deletePool,
  addProfileToPool,
  removeProfileFromPool,
  setActivePool,
  setPoolAutoSwitch,
  resetProfileExhausted,
  resetAllExhaustedInPool,
} from "./runtime/pool-manager.mjs";
import {
  exportProfileBundle,
  importProfileBundle,
  exportPoolBundle,
  decodePoolBundle,
} from "./runtime/share-manager.mjs";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4317);
const noListen = process.env.SWITCHBOARD_NO_LISTEN === "1";
const shouldOpenBrowser = process.argv.includes("--open-browser");
const appDir = new URL(".", import.meta.url).pathname;
const publicDir = join(appDir, "public");
const codexDir = process.env.CODEX_DIR || join(os.homedir(), ".codex");
const authFile = join(codexDir, "auth.json");
const stateDir = process.env.SWITCHBOARD_STATE_DIR || join(os.homedir(), ".codex-switchboard");
const profilesDir = join(stateDir, "profiles");
const metaFile = join(stateDir, "meta.json");

mkdirSync(profilesDir, { recursive: true });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, GET, POST, DELETE, PUT",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function sendJson(res, status, data) {
  // Always set CORS headers
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }
  res.writeHead(status, { "Content-Type": contentType });
  res.end(text);
}

function dashboardUrl() {
  return `http://${host}:${port}`;
}

function browserDashboardUrl() {
  const browserHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  return `http://${browserHost}:${port}`;
}

function networkDashboardUrls() {
  if (host !== "0.0.0.0") {
    return [];
  }

  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => `http://${entry.address}:${port}`)
    .sort();
}

function openBrowser(url) {
  const platform = process.platform;
  let command;
  let args;

  if (platform === "darwin") {
    command = "open";
    args = [url];
  } else if (platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function safeName(name) {
  return String(name || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function profileAuthPath(name) {
  return join(profilesDir, safeName(name), "auth.json");
}

function ensureProfileDir(name) {
  const dir = join(profilesDir, safeName(name));
  mkdirSync(dir, { recursive: true });
  return dir;
}

function readMeta() {
  if (!existsSync(metaFile)) {
    return { activeProfile: null };
  }

  try {
    return JSON.parse(readFileSync(metaFile, "utf8"));
  } catch {
    return { activeProfile: null };
  }
}

function writeMeta(meta) {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
}

function currentAuthInfo() {
  if (!existsSync(authFile)) {
    return { exists: false };
  }

  try {
    const raw = JSON.parse(readFileSync(authFile, "utf8"));
    const mode = raw.auth_mode || "unknown";
    const accountId = raw?.tokens?.account_id || null;
    const lastRefresh = raw.last_refresh || null;
    return {
      exists: true,
      authMode: mode,
      accountId,
      lastRefresh,
      size: statSync(authFile).size,
    };
  } catch {
    return { exists: true, invalid: true };
  }
}

function listProfiles() {
  const meta = readMeta();
  return readdirSync(profilesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const authPath = join(profilesDir, entry.name, "auth.json");
      const info = existsSync(authPath) ? readAuthSummary(authPath) : { exists: false };
      return {
        name: entry.name,
        active: meta.activeProfile === entry.name,
        ...info,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function readAuthSummary(filePath) {
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf8"));
    return {
      exists: true,
      authMode: raw.auth_mode || "unknown",
      accountId: raw?.tokens?.account_id || null,
      lastRefresh: raw.last_refresh || null,
      size: statSync(filePath).size,
    };
  } catch {
    return { exists: true, invalid: true };
  }
}

function runCodexStatus() {
  return new Promise((resolve) => {
    const child = spawn("codex", ["login", "status"], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("close", (code) => {
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

function decodeCurrentIdentity() {
  if (!existsSync(authFile)) {
    return null;
  }

  try {
    const raw = JSON.parse(readFileSync(authFile, "utf8"));
    const idToken = raw?.tokens?.id_token;
    if (!idToken) {
      return null;
    }

    const payload = idToken.split(".")[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(Buffer.from(padded, "base64url").toString("utf8"));
    return {
      name: decoded.name || null,
      email: decoded.email || null,
      sub: decoded.sub || null,
    };
  } catch {
    return null;
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fileName = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const filePath = join(publicDir, fileName);

  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    sendText(res, 404, "Not found");
    return true;
  }

  const typeByExt = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  };

  sendText(res, 200, readFileSync(filePath, "utf8"), typeByExt[extname(filePath)] || "text/plain; charset=utf-8");
  return true;
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      res.setHeader(key, value);
    }
    res.writeHead(204);
    res.end();
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    const codexStatus = await runCodexStatus();
    const profiles = listProfiles();
    const pools = listPools();
    const profilesWithState = profiles.map((p) => ({
      ...p,
      state: getProfileState(p.name),
    }));
    sendJson(res, 200, {
      currentAuth: currentAuthInfo(),
      identity: decodeCurrentIdentity(),
      profiles: profilesWithState,
      pools,
      activePool: getActivePoolName(),
      meta: readMeta(),
      codexStatus,
      paths: {
        codexDir,
        authFile,
        profilesDir,
      },
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/profiles/save-current") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const name = safeName(body.name);

    if (!name) {
      sendJson(res, 400, { error: "Profile name is required" });
      return true;
    }

    if (!existsSync(authFile)) {
      sendJson(res, 400, { error: "No ~/.codex/auth.json found. Run codex login first." });
      return true;
    }

    const dir = ensureProfileDir(name);
    copyFileSync(authFile, join(dir, "auth.json"));
    sendJson(res, 200, { ok: true, profile: name });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/profiles/activate") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const name = safeName(body.name);
    const source = profileAuthPath(name);

    if (!name || !existsSync(source)) {
      sendJson(res, 404, { error: "Profile not found" });
      return true;
    }

    mkdirSync(codexDir, { recursive: true });
    copyFileSync(source, authFile);
    writeMeta({ activeProfile: name });
    sendJson(res, 200, { ok: true, profile: name });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/profiles/delete") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const name = safeName(body.name);
    const dir = join(profilesDir, name);

    if (!name || !existsSync(dir)) {
      sendJson(res, 404, { error: "Profile not found" });
      return true;
    }

    rmSync(dir, { recursive: true, force: true });
    const meta = readMeta();
    if (meta.activeProfile === name) {
      writeMeta({ activeProfile: null });
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/current/clear-auth") {
    rmSync(authFile, { force: true });
    const meta = readMeta();
    writeMeta({ activeProfile: meta.activeProfile || null });
    sendJson(res, 200, { ok: true });
    return true;
  }

  // ─── Pool endpoints ────────────────────────────────────────────────────────

  if (req.method === "GET" && url.pathname === "/api/pools") {
    sendJson(res, 200, { pools: listPools(), activePool: getActivePoolName() });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pools/create") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const name = safeName(body.name);
    if (!name) {
      sendJson(res, 400, { error: "Pool name is required" });
      return true;
    }
    try {
      createPool(name, body.strategy || "round-robin");
      sendJson(res, 200, { ok: true, name });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pools/delete") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const name = safeName(body.name);
    if (!name) {
      sendJson(res, 400, { error: "Pool name is required" });
      return true;
    }
    deletePool(name);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pools/add-profile") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const pool = safeName(body.pool);
    const profile = safeName(body.profile);
    if (!pool || !profile) {
      sendJson(res, 400, { error: "pool and profile are required" });
      return true;
    }
    try {
      addProfileToPool(pool, profile);
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 404, { error: err.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pools/remove-profile") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const pool = safeName(body.pool);
    const profile = safeName(body.profile);
    if (!pool || !profile) {
      sendJson(res, 400, { error: "pool and profile are required" });
      return true;
    }
    try {
      removeProfileFromPool(pool, profile);
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 404, { error: err.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pools/set-active") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const name = body.name ? safeName(body.name) : null;
    try {
      setActivePool(name);
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 404, { error: err.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pools/set-autoswitch") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const name = safeName(body.name);
    if (!name) {
      sendJson(res, 400, { error: "Pool name is required" });
      return true;
    }
    try {
      setPoolAutoSwitch(name, Boolean(body.enabled));
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 404, { error: err.message });
    }
    return true;
  }

  // ─── Share endpoints ───────────────────────────────────────────────────────

  if (req.method === "POST" && url.pathname === "/api/profiles/export") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const name = safeName(body.name);
    const passphrase = String(body.passphrase || "").trim();
    if (!name) { sendJson(res, 400, { error: "Profile name is required" }); return true; }
    if (!passphrase) { sendJson(res, 400, { error: "Passphrase is required" }); return true; }
    try {
      const result = await exportProfileBundle(name, passphrase);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.code === "ENOENT" ? 404 : 400, { error: err.message });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/profiles/import") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const bundle = String(body.bundle || "").trim();
    const passphrase = String(body.passphrase || "").trim();
    const nameOverride = body.name ? safeName(body.name) : null;
    if (!bundle) { sendJson(res, 400, { error: "Bundle is required" }); return true; }
    if (!passphrase) { sendJson(res, 400, { error: "Passphrase is required" }); return true; }
    try {
      const result = await importProfileBundle(bundle, passphrase, nameOverride, profilesDir);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.conflict ? 409 : 400, { error: err.message, suggestion: err.suggestion });
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pools/export") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const name = safeName(body.name);
    if (!name) { sendJson(res, 400, { error: "Pool name is required" }); return true; }
    const pools = listPools();
    const pool = pools.find((p) => p.name === name);
    if (!pool) { sendJson(res, 404, { error: "Pool not found" }); return true; }
    sendJson(res, 200, { ok: true, ...exportPoolBundle(pool) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pools/import") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const bundle = String(body.bundle || "").trim();
    const nameOverride = body.name ? safeName(body.name) : null;
    if (!bundle) { sendJson(res, 400, { error: "Bundle is required" }); return true; }
    let pool;
    try {
      pool = decodePoolBundle(bundle);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
      return true;
    }
    const finalName = nameOverride || pool.name;
    try {
      createPool(finalName, pool.strategy);
    } catch {
      // pool already exists — update it in place
    }
    // Add profiles that exist locally; skip unknown ones and report them
    const allProfiles = listProfiles();
    const knownNames = new Set(allProfiles.map((p) => p.name));
    const added = [], skipped = [];
    for (const pName of pool.profiles) {
      if (knownNames.has(pName)) {
        try { addProfileToPool(finalName, pName); added.push(pName); } catch {}
      } else {
        skipped.push(pName);
      }
    }
    try { setPoolAutoSwitch(finalName, pool.autoSwitch); } catch {}
    sendJson(res, 200, { ok: true, poolName: finalName, added, skipped });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pools/reset-exhausted") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const pool = body.pool ? safeName(body.pool) : null;
    const profile = body.profile ? safeName(body.profile) : null;
    if (pool) {
      resetAllExhaustedInPool(pool);
    } else if (profile) {
      resetProfileExhausted(profile);
    } else {
      sendJson(res, 400, { error: "pool or profile is required" });
      return true;
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/trigger-sync") {
    spawn("csb", ["sync"], { stdio: "ignore", detached: true }).unref();
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      const handled = await handleApi(req, res);
      if (!handled) {
        sendJson(res, 404, { error: "Not found" });
      }
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});

if (noListen) {
  console.log("Codex Switchboard loaded without listening");
} else {
  server.on("error", (error) => {
    if (error && error.code === "EADDRINUSE") {
      console.log(`Codex Switchboard already running at ${browserDashboardUrl()}`);
      for (const url of networkDashboardUrls()) {
        console.log(`Network access: ${url}`);
      }
      if (shouldOpenBrowser) {
        try {
          openBrowser(browserDashboardUrl());
        } catch {
          // Ignore browser open failures and keep the process exit code clean.
        }
      }
      process.exit(0);
      return;
    }

    throw error;
  });

  server.listen(port, host, () => {
    console.log(`Codex Switchboard running at ${browserDashboardUrl()}`);
    for (const url of networkDashboardUrls()) {
      console.log(`Network access: ${url}`);
    }
    if (shouldOpenBrowser) {
      try {
        openBrowser(browserDashboardUrl());
      } catch {
        // Ignore browser open failures so the dashboard server can still run.
      }
    }
  });
}
