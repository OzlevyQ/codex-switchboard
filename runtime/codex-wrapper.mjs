#!/usr/bin/env node
import {
  activateProfile,
  formatLauncherLines,
  printLauncherScreen,
  runDashboard,
  runRealCodex,
  saveCurrentProfileAuto,
  waitForSingleKey,
} from "./common.mjs";

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "ui") {
    const result = await runDashboard();
    if (result.signal) {
      process.kill(process.pid, result.signal);
    }
    process.exit(result.code);
  }

  const state = formatLauncherLines();

  printLauncherScreen({
    identity: state.identity,
    profiles: state.profiles,
    seconds: 5,
  });

  const key = await waitForSingleKey(5000);
  if (key && /^[1-9]$/.test(key)) {
    const index = Number(key) - 1;
    if (state.profiles[index]) {
      const selected = activateProfile(state.profiles[index].name);
      process.stdout.write(`Switched to ${selected.email}\n`);
    }
  }

  const result = await runRealCodex(args);
  try {
    saveCurrentProfileAuto();
  } catch {
    // Ignore profile persistence failures so the Codex exit code stays authoritative.
  }

  if (result.signal) {
    process.kill(process.pid, result.signal);
  }
  process.exit(result.code);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
