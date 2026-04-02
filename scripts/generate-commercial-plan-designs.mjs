#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stitch } from "@google/stitch-sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(__dirname, "stitch-commercial-prompts.json");
const outputDir = path.join(repoRoot, ".tmp", "stitch-commercial-plan");

async function main() {
  if (!process.env.STITCH_API_KEY) {
    throw new Error("Missing STITCH_API_KEY. Export it first, then rerun.");
  }

  const config = JSON.parse(await readFile(configPath, "utf8"));
  await mkdir(outputDir, { recursive: true });

  const project = await stitch.createProject(config.projectTitle);
  const results = [];

  for (const item of config.prompts) {
    console.log(`Generating ${item.id}...`);
    const screen = await project.generate(item.prompt, config.deviceType || "DESKTOP");
    const htmlUrl = await screen.getHtml();
    const imageUrl = await screen.getImage();

    results.push({
      id: item.id,
      title: item.title,
      prompt: item.prompt,
      screenId: screen.id,
      htmlUrl,
      imageUrl
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    projectId: project.id,
    projectTitle: config.projectTitle,
    results
  };

  const manifestPath = path.join(outputDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Saved manifest: ${manifestPath}`);
  for (const item of results) {
    console.log(`- ${item.title}`);
    console.log(`  html: ${item.htmlUrl}`);
    console.log(`  image: ${item.imageUrl}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
