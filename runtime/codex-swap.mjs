#!/usr/bin/env node
import readline from "node:readline";
import { activateProfile, listProfiles } from "./common.mjs";

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const profiles = listProfiles();
  if (!profiles.length) {
    console.error("No saved profiles found.");
    process.exit(1);
  }

  const direct = process.argv[2];
  if (direct) {
    const selected = activateProfile(direct);
    console.log(`Active: ${selected.email} (${selected.name})`);
    return;
  }

  console.log("Available users:");
  profiles.forEach((profile, index) => {
    console.log(`${index + 1}. ${profile.email}`);
  });

  const answer = await prompt("Select profile number: ");
  if (!/^[0-9]+$/.test(answer)) {
    console.error("Selection must be a number.");
    process.exit(1);
  }

  const selected = activateProfile(answer);
  console.log(`Active: ${selected.email} (${selected.name})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
