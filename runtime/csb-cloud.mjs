#!/usr/bin/env node

/**
 * CSB CLI — Cloud SwitchBoard command.
 *
 * Subcommands:
 *   csb link <token>    Link this device to your CSB cloud account
 *   csb sync             Sync local profiles to the cloud
 *   csb status           Show cloud connection status
 *   csb unlink           Disconnect this device from the cloud
 *
 * Uses the existing codex-switchboard runtime for profile data.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {
  SWITCHBOARD_DIR,
  listProfiles,
  decodeIdentityFromAuth,
  readJson,
  writeJson,
} from './common.mjs';
import { listPools, getProfileState } from './pool-manager.mjs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const SERVER_MJS = path.join(ROOT_DIR, 'server.mjs');

const CSB_CLOUD_FILE = path.join(SWITCHBOARD_DIR, 'csb-cloud.json');
const DAEMON_PID_FILE = path.join(SWITCHBOARD_DIR, 'csb-daemon.pid');
const WATCH_PID_FILE = path.join(SWITCHBOARD_DIR, 'csb-watch.pid');
const DEFAULT_API_URL = 'http://127.0.0.1:4318';
const CLOUD_DASHBOARD_URL = process.env.CSB_DASHBOARD_URL || 'https://cbs.yadbarzel.info';
const WATCH_INTERVAL_MS = 4000;

// ── Helpers ──

function getCloudConfig() {
  return readJson(CSB_CLOUD_FILE, null);
}

function saveCloudConfig(config) {
  mkdirSync(SWITCHBOARD_DIR, { recursive: true });
  writeJson(CSB_CLOUD_FILE, config);
}

function removeCloudConfig() {
  try {
    rmSync(CSB_CLOUD_FILE, { force: true });
  } catch {}
}

function readDaemonPid() {
  try {
    const raw = readFileSync(DAEMON_PID_FILE, 'utf8').trim();
    const pid = Number(raw);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function writeDaemonPid(pid) {
  mkdirSync(SWITCHBOARD_DIR, { recursive: true });
  writeFileSync(DAEMON_PID_FILE, `${pid}\n`, 'utf8');
}

function clearDaemonPid() {
  try {
    rmSync(DAEMON_PID_FILE, { force: true });
  } catch {}
}

function readWatchPid() {
  try {
    const raw = readFileSync(WATCH_PID_FILE, 'utf8').trim();
    const pid = Number(raw);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function writeWatchPid(pid) {
  mkdirSync(SWITCHBOARD_DIR, { recursive: true });
  writeFileSync(WATCH_PID_FILE, `${pid}\n`, 'utf8');
}

function clearWatchPid() {
  try {
    rmSync(WATCH_PID_FILE, { force: true });
  } catch {}
}

function isPidRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function findListeningPid(port) {
  try {
    const output = spawnSyncSafe('lsof', ['-ti', `tcp:${port}`]);
    const pid = Number(String(output).trim().split('\n')[0] || '');
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function spawnSyncSafe(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) {
    throw result.error;
  }
  return result.stdout || '';
}

function getApiUrl() {
  return process.env.CSB_API_URL || getCloudConfig()?.apiUrl || DEFAULT_API_URL;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiRequest(path, options = {}) {
  const config = getCloudConfig();
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (config?.apiKey && !headers.Authorization) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

function getDeviceInfo() {
  return {
    hostname: os.hostname(),
    deviceName: `${os.hostname()} — ${os.type()}`,
    os: `${os.type()} ${os.release()}`,
    profileCount: listProfiles().length,
  };
}

function getProfilesForSync() {
  const profiles = listProfiles();
  const pools = listPools();

  return profiles.map((p) => {
    const state = getProfileState(p.name);
    const memberOf = pools
      .filter((pool) => pool.profiles.includes(p.name))
      .map((pool) => pool.name);

    return {
      name: p.name,
      email: p.email || p.identity?.email || null,
      accountId: p.identity?.accountId || null,
      authMode: p.identity?.authMode || null,
      pools: memberOf,
      status: state.exhausted ? 'exhausted' : 'active',
      exhausted: state.exhausted,
    };
  });
}

// ── Commands ──

async function cmdLink(token) {
  if (!token) {
    console.error('Usage: csb link <token>');
    console.error(`Generate a link token from the CSB dashboard: ${CLOUD_DASHBOARD_URL}/dashboard/devices`);
    process.exit(1);
  }

  const cyan = '\u001b[36m';
  const green = '\u001b[32m';
  const bold = '\u001b[1m';
  const reset = '\u001b[0m';

  console.log(`\n${cyan}${bold}⌁ CSB — Linking device to cloud${reset}\n`);

  const deviceInfo = getDeviceInfo();
  console.log(`  Device:   ${deviceInfo.deviceName}`);
  console.log(`  OS:       ${deviceInfo.os}`);
  console.log(`  Profiles: ${deviceInfo.profileCount} local profile(s)`);
  console.log('');

  let daemonReady = await waitForLocalDaemon(4);
  if (!daemonReady) {
    await startDaemon();
    daemonReady = await waitForLocalDaemon();
  }

  if (!daemonReady) {
    console.error(`  ✗ Local daemon could not be started or reached on port 4317.\n`);
    process.exit(1);
  }

  try {
    // Register device with the link token
    const result = await apiRequest('/api/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        linkToken: token,
        ...deviceInfo,
      }),
    });

    // Save cloud config
    saveCloudConfig({
      apiKey: result.apiKey,
      deviceId: result.deviceId,
      apiUrl: getApiUrl(),
      linkedAt: new Date().toISOString(),
      user: result.user,
    });

    console.log(`${green}${bold}  ✓ Device linked successfully!${reset}`);
    console.log(`  Account:  ${result.user?.email || 'unknown'}`);
    console.log(`  Plan:     ${result.user?.plan || 'free'}`);
    console.log(`  Device:   ${result.deviceId}`);
    console.log('');

    // Auto-sync profiles
    console.log('  Syncing profiles...');
    await cmdSync(true);
    await ensureWatchRunning(true);

    console.log(`\n${cyan}  Your device is now connected to CSB Cloud.${reset}`);
    console.log(`  Background live sync is now active.`);
    console.log(`  Run ${bold}csb status${reset} to check connection.\n`);
  } catch (err) {
    console.error(`\n  ✗ Link failed: ${err.message}\n`);
    process.exit(1);
  }
}

async function cmdSync(quiet = false) {
  const config = getCloudConfig();
  if (!config) {
    console.error('Not linked to CSB Cloud. Run: csb link <token>');
    process.exit(1);
  }

  const profiles = getProfilesForSync();
  const pools = listPools();

  try {
    const result = await apiRequest('/api/profiles/sync', {
      method: 'POST',
      body: JSON.stringify({ profiles, pools }),
    });

    if (quiet) {
      console.log(`  ✓ Synced ${result.synced} profile(s) and ${result.syncedPools || 0} pool(s)`);
    } else {
      const green = '\u001b[32m';
      const bold = '\u001b[1m';
      const reset = '\u001b[0m';

      console.log(`\n${green}${bold}  ✓ Synced ${result.synced} profile(s) and ${result.syncedPools || 0} pool(s) to CSB Cloud${reset}\n`);
      profiles.forEach((p) => {
        const status = p.exhausted ? ' [exhausted]' : '';
        const pools = p.pools.length ? ` → ${p.pools.join(', ')}` : '';
        console.log(`    ${p.name} (${p.email || 'no email'})${pools}${status}`);
      });
      console.log('');
    }
  } catch (err) {
    console.error(`  ✗ Sync failed: ${err.message}`);
    if (!quiet) process.exit(1);
  }
}

async function cmdStatus() {
  const config = getCloudConfig();

  const cyan = '\u001b[36m';
  const green = '\u001b[32m';
  const red = '\u001b[31m';
  const bold = '\u001b[1m';
  const reset = '\u001b[0m';

  console.log(`\n${cyan}${bold}⌁ CSB Cloud Status${reset}\n`);

  if (!config) {
    console.log(`  ${red}Not linked${reset}`);
    console.log(`  Run: csb link <token>\n`);
    return;
  }

  console.log(`  ${green}${bold}✓ Linked${reset}`);
  console.log(`  Account:   ${config.user?.email || 'unknown'}`);
  console.log(`  Device ID: ${config.deviceId}`);
  console.log(`  API URL:   ${config.apiUrl}`);
  console.log(`  Linked at: ${config.linkedAt}`);
  let watchPid = readWatchPid();
  if (!isPidRunning(watchPid)) {
    await ensureWatchRunning(true);
    watchPid = readWatchPid();
  }
  console.log(`  Live sync: ${isPidRunning(watchPid) ? `running (pid ${watchPid})` : 'not running'}`);
  console.log('');

  // Try heartbeat
  try {
    const deviceInfo = getDeviceInfo();
    await apiRequest('/api/devices/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ profileCount: deviceInfo.profileCount }),
    });
    console.log(`  ${green}Server reachable — heartbeat OK${reset}\n`);
  } catch (err) {
    console.log(`  ${red}Server unreachable: ${err.message}${reset}\n`);
  }
}

async function cmdUnlink() {
  const config = getCloudConfig();

  if (config) {
    try {
      await apiRequest('/api/devices/self', { method: 'DELETE' });
    } catch {}
  }

  rmSync(CSB_CLOUD_FILE, { force: true });
  stopWatch();
  await stopDaemon(true);

  if (!config) {
    console.log('\n  ✓ No cloud link was active. Local daemon has been stopped.\n');
    return;
  }

  console.log('\n  ✓ Device unlinked from CSB Cloud and local daemon stopped.\n');
}

async function waitForLocalDaemon(maxAttempts = 15) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:4317/api/state');
      if (response.ok) {
        return true;
      }
    } catch {}
    await sleep(250);
  }
  return false;
}

async function startDaemon({ restart = false } = {}) {
  const existingPid = readDaemonPid();
  if (restart && isPidRunning(existingPid)) {
    await stopDaemon(true);
  } else if (isPidRunning(existingPid)) {
    console.log(`\n  ✓ CSB Local Daemon already running (pid ${existingPid}) on port 4317.\n`);
    return existingPid;
  }

  console.log(`\n  ⌁ ${restart ? 'Restarting' : 'Starting'} CSB Local Daemon on port 4317...`);
  const child = spawn('node', [SERVER_MJS], {
    stdio: 'ignore',
    detached: true,
  });
  child.on('error', (err) => console.error('  ✗ Failed to start daemon:', err.message));
  child.unref();
  writeDaemonPid(child.pid);

  const ready = await waitForLocalDaemon();
  if (ready) {
    console.log(`  ✓ Daemon ready on 127.0.0.1:4317 (pid ${child.pid})\n`);
  } else {
    console.log(`  ! Daemon started with pid ${child.pid}, but readiness check timed out.\n`);
  }

  return child.pid;
}

async function terminatePid(pid, label) {
  if (!isPidRunning(pid)) {
    return false;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {}

  for (let attempt = 0; attempt < 12; attempt++) {
    if (!isPidRunning(pid)) {
      return true;
    }
    await sleep(100);
  }

  try {
    process.kill(pid, 'SIGKILL');
  } catch {}

  for (let attempt = 0; attempt < 10; attempt++) {
    if (!isPidRunning(pid)) {
      return true;
    }
    await sleep(100);
  }

  console.error(`\n  ✗ Failed to stop ${label} (pid ${pid}).\n`);
  return false;
}

async function stopDaemon(quiet = false) {
  const trackedPid = readDaemonPid();
  let stopped = false;

  if (isPidRunning(trackedPid)) {
    stopped = (await terminatePid(trackedPid, 'CSB Local Daemon')) || stopped;
  }

  const portPid = findListeningPid(4317);
  if (portPid && portPid !== trackedPid) {
    stopped = (await terminatePid(portPid, 'CSB Local Daemon on port 4317')) || stopped;
  }

  clearDaemonPid();

  if (!quiet) {
    if (stopped) {
      console.log('\n  ✓ Stopped CSB Local Daemon.\n');
    } else {
      console.log('\n  No CSB Local Daemon is currently running.\n');
    }
  }

  return stopped;
}

async function restartDaemon() {
  return startDaemon({ restart: true });
}

function stopWatch() {
  const pid = readWatchPid();
  if (!isPidRunning(pid)) {
    clearWatchPid();
    return false;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {}
  clearWatchPid();
  return true;
}

async function ensureWatchRunning(quiet = false) {
  if (!getCloudConfig()) {
    return false;
  }

  const pid = readWatchPid();
  if (isPidRunning(pid)) {
    if (!quiet) {
      console.log(`  ✓ Cloud live sync already running (pid ${pid})`);
    }
    return true;
  }

  const child = spawn(process.execPath, [__filename, 'watch'], {
    stdio: 'ignore',
    detached: true,
    env: process.env,
  });
  child.unref();
  if (child.pid) {
    writeWatchPid(child.pid);
  }

  await sleep(250);
  const runningPid = readWatchPid() || child.pid;
  const running = isPidRunning(runningPid);

  if (!quiet) {
    if (running) {
      console.log(`  ✓ Started cloud live sync worker (pid ${runningPid})`);
    } else {
      console.log(`  ! Tried to start cloud live sync worker, but it did not stay up`);
    }
  }
  return running;
}

async function runWatchLoop() {
  const shutdown = () => {
    clearWatchPid();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  writeWatchPid(process.pid);

  while (true) {
    if (!getCloudConfig()) {
      clearWatchPid();
      return;
    }

    try {
      const deviceInfo = getDeviceInfo();
      await apiRequest('/api/devices/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ profileCount: deviceInfo.profileCount }),
      });
      await cmdSync(true);
    } catch {}

    await sleep(WATCH_INTERVAL_MS);
  }
}

async function cmdUp() {
  const cyan = '\u001b[36m';
  const green = '\u001b[32m';
  const yellow = '\u001b[33m';
  const bold = '\u001b[1m';
  const reset = '\u001b[0m';

  console.log(`\n${cyan}${bold}⌁ CSB Up${reset}\n`);

  await startDaemon();

  const localReady = await waitForLocalDaemon();
  if (localReady) {
    console.log(`  ${green}Local daemon reachable${reset}`);
  } else {
    console.log(`  ${yellow}Local daemon did not confirm readiness in time${reset}`);
  }

  if (getCloudConfig()) {
    try {
      await cmdSync(true);
      await ensureWatchRunning(true);
      console.log(`  ${green}Cloud sync complete${reset}`);
    } catch {
      console.log(`  ${yellow}Cloud sync skipped or failed${reset}`);
    }
  } else {
    console.log(`  ${yellow}Cloud not linked — run csb link <token> when ready${reset}`);
  }

  console.log(`  Local UI:  http://127.0.0.1:4317`);
  console.log(`  Cloud UI:  ${CLOUD_DASHBOARD_URL}/dashboard\n`);
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case 'link':
      await cmdLink(args[1]);
      break;
    case 'sync':
      await cmdSync();
      break;
    case 'status':
      await cmdStatus();
      break;
    case 'watch':
      await runWatchLoop();
      break;
    case 'unlink':
      await cmdUnlink();
      break;
    case 'up':
      await cmdUp();
      break;
    case 'daemon':
      if (args[1] === 'start') {
        await startDaemon();
        await ensureWatchRunning(true);
      }
      else if (args[1] === 'stop') await stopDaemon();
      else if (args[1] === 'restart') await restartDaemon();
      else console.error('  Usage: csb daemon <start|stop|restart>');
      break;
    default:
      console.log(`
  CSB — CLI SwitchBoard Cloud

  Usage:
    csb link <token>    Link this device and start cloud live sync
    csb up              Start the local daemon and run sync if linked
    csb sync             Sync local profiles to the cloud
    csb status           Show cloud connection status
    csb unlink           Disconnect this device from the cloud
    csb daemon start     Run local Switchboard GUI & API proxy (port 4317)
    csb daemon stop      Stop the local Switchboard daemon
    csb daemon restart   Restart the local Switchboard daemon

  Generate a link token from the dashboard:
    ${CLOUD_DASHBOARD_URL}/dashboard/devices
`);
      break;
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
