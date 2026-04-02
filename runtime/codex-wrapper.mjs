#!/usr/bin/env node
import {
  activateProfile,
  formatLauncherLines,
  getMeta,
  printLauncherScreen,
  runDashboard,
  runRealCodex,
  saveCurrentProfileAuto,
  waitForSingleKey,
} from "./common.mjs";
import {
  classifyExit,
  findNextAvailableProfile,
  markProfileExhausted,
} from "./pool-manager.mjs";

const MAX_POOL_SWITCHES = 10;

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "ui") {
    const result = await runDashboard();
    if (result.signal) process.kill(process.pid, result.signal);
    process.exit(result.code);
  }

  const state = formatLauncherLines();
  printLauncherScreen({ identity: state.identity, profiles: state.profiles, seconds: 5 });

  const key = await waitForSingleKey(5000);
  if (key && /^[1-9]$/.test(key)) {
    const index = Number(key) - 1;
    if (state.profiles[index]) {
      const selected = activateProfile(state.profiles[index].name);
      process.stdout.write(`Switched to ${selected.email}\n`);
    }
  }

  // Read once before the loop; update from activateProfile() result on rotation.
  let currentProfile = getMeta().activeProfile;

  for (let switches = 0; switches <= MAX_POOL_SWITCHES; switches++) {
    const result = await runRealCodex(args);
    const exitType = classifyExit(result.code, result.stderr);

    if ((exitType === "exhausted" || exitType === "rate_limit") && switches < MAX_POOL_SWITCHES) {
      if (currentProfile) markProfileExhausted(currentProfile, exitType);
      const next = findNextAvailableProfile(currentProfile);
      if (next) {
        const activated = activateProfile(next.name);
        currentProfile = activated.name;
        process.stdout.write(`\n↻ Codex exited (${exitType}). Switched to ${activated.email} — retrying...\n\n`);
        continue;
      }
      process.stdout.write(`\n✗ All profiles in the active pool are exhausted.\n`);
    }

    try { saveCurrentProfileAuto(); } catch {}
    if (result.signal) process.kill(process.pid, result.signal);
    process.exit(result.code);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
