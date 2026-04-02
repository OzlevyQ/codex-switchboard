#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { StitchToolClient } from "@google/stitch-sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(__dirname, "stitch-website-prompts.json");
const outputDir = path.join(repoRoot, ".tmp", "stitch-website");

function extractGeneratedScreens(raw) {
  const outputComponents = Array.isArray(raw?.outputComponents) ? raw.outputComponents : [];
  return outputComponents.flatMap((component) => component?.design?.screens || []);
}

async function main() {
  if (!process.env.STITCH_API_KEY) {
    throw new Error("Missing STITCH_API_KEY. Export it first, then rerun.");
  }

  const config = JSON.parse(await readFile(configPath, "utf8"));
  await mkdir(outputDir, { recursive: true });

  const client = new StitchToolClient();

  try {
    const project = await client.callTool("create_project", { title: config.projectTitle });
    const projectId = String(project?.name || "").replace(/^projects\//, "");
    if (!projectId) {
      throw new Error("Failed to resolve Stitch project ID from create_project response.");
    }

    const results = [];

    for (const item of config.prompts) {
      console.log(`Generating ${item.id}...`);
      const raw = await client.callTool("generate_screen_from_text", {
        projectId,
        prompt: item.prompt,
        deviceType: config.deviceType || "DESKTOP"
      });

      const screens = extractGeneratedScreens(raw);
      if (!screens.length) {
        const debugPath = path.join(outputDir, `${item.id}-raw.json`);
        await writeFile(debugPath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
        throw new Error(`No screens returned for ${item.id}. Raw response saved to ${debugPath}`);
      }

      const screen = screens[0];
      const screenId =
        screen?.id ||
        (typeof screen?.name === "string" ? screen.name.split("/screens/")[1] : "");

      if (!screenId) {
        throw new Error(`Missing screen id for ${item.id}`);
      }

      const details = await client.callTool("get_screen", {
        projectId,
        screenId,
        name: `projects/${projectId}/screens/${screenId}`
      });

      results.push({
        id: item.id,
        title: item.title,
        prompt: item.prompt,
        screenId,
        htmlUrl: details?.htmlCode?.downloadUrl || "",
        imageUrl: details?.screenshot?.downloadUrl || "",
        rawPath: `${item.id}-raw.json`
      });

      await writeFile(path.join(outputDir, `${item.id}-raw.json`), `${JSON.stringify(raw, null, 2)}\n`, "utf8");
      await writeFile(path.join(outputDir, `${item.id}-screen.json`), `${JSON.stringify(details, null, 2)}\n`, "utf8");
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      projectId,
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
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
