# Stitch Design Generation

This repo includes a Stitch SDK runner for generating multiple design directions
for the commercial plan page.

## Setup

```bash
cd /Users/mymac/code/codex-switchboard
npm install
export STITCH_API_KEY="your-key"
```

## Generate Options

```bash
npm run stitch:generate-commercial-plan
```

The generator reads:

- [`scripts/stitch-commercial-prompts.json`](/Users/mymac/code/codex-switchboard/scripts/stitch-commercial-prompts.json)

It writes a manifest to:

- [`.tmp/stitch-commercial-plan/manifest.json`](/Users/mymac/code/codex-switchboard/.tmp/stitch-commercial-plan/manifest.json)

## Current Prompt Directions

- `editorial-brief`
- `terminal-ops`
- `product-memo`

These are intended to produce three very different desktop directions for the
same commercial planning page.
