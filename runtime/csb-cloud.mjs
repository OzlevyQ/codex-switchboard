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
const DEFAULT_API_URL = 'http://127.0.0.1:4318';

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

function isPidRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getApiUrl() {
  return process.env.CSB_API_URL || getCloudConfig()?.apiUrl || DEFAULT_API_URL;
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
    console.error('Generate a link token from the CSB dashboard: http://localhost:5173/dashboard/devices');
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

    console.log(`\n${cyan}  Your device is now connected to CSB Cloud.${reset}`);
    console.log(`  Run ${bold}csb sync${reset} to push local changes.`);
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
  if (!config) {
    console.log('Not linked to CSB Cloud.');
    return;
  }

  rmSync(CSB_CLOUD_FILE, { force: true });

  console.log('\n  ✓ Device unlinked from CSB Cloud.\n');
}

function startDaemon() {
  import('node:child_process').then(({ spawn }) => {
    const existingPid = readDaemonPid();
    if (isPidRunning(existingPid)) {
      console.log(`\n  ✓ CSB Local Daemon already running (pid ${existingPid}) on port 4317.\n`);
      return;
    }

    console.log('\n  ⌁ Starting CSB Local Daemon on port 4317...');
    const child = spawn('node', [SERVER_MJS], {
      stdio: 'ignore',
      detached: true,
    });
    child.on('error', (err) => console.error('  ✗ Failed to start daemon:', err.message));
    child.unref();
    writeDaemonPid(child.pid);

    // Auto-sync heartbeat on start
    cmdSync(true).catch(() => {});

    console.log(`  ✓ Started with pid ${child.pid}\n`);
  });
}

function stopDaemon() {
  const pid = readDaemonPid();
  if (!isPidRunning(pid)) {
    clearDaemonPid();
    console.log('\n  No CSB Local Daemon is currently tracked as running.\n');
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
    clearDaemonPid();
    console.log(`\n  ✓ Stopped CSB Local Daemon (pid ${pid}).\n`);
  } catch (err) {
    console.error(`\n  ✗ Failed to stop daemon: ${err.message}\n`);
  }
}

function restartDaemon() {
  const pid = readDaemonPid();
  if (isPidRunning(pid)) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {}
    clearDaemonPid();
  }
  startDaemon();
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
    case 'unlink':
      await cmdUnlink();
      break;
    case 'daemon':
      if (args[1] === 'start') startDaemon();
      else if (args[1] === 'stop') stopDaemon();
      else if (args[1] === 'restart') restartDaemon();
      else console.error('  Usage: csb daemon <start|stop|restart>');
      break;
    default:
      console.log(`
  CSB — CLI SwitchBoard Cloud

  Usage:
    csb link <token>    Link this device to your CSB cloud account
    csb sync             Sync local profiles to the cloud
    csb status           Show cloud connection status
    csb unlink           Disconnect this device from the cloud
    csb daemon start     Run local Switchboard GUI & API proxy (port 4317)
    csb daemon stop      Stop the local Switchboard daemon
    csb daemon restart   Restart the local Switchboard daemon

  Generate a link token from the dashboard:
    http://localhost:5173/dashboard/devices
`);
      break;
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
