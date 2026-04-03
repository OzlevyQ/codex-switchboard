# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

Codex Switchboard wraps the `codex` CLI to enable account switching without losing local history, workspace state, or folder context. It swaps only `~/.codex/auth.json` between saved profiles.

## Commands

```bash
npm start                          # Run the dashboard server (port 4317)
npm run install:unix               # Install launchers on macOS/Linux
npm run uninstall:unix             # Remove launchers, keep profiles
bash ./scripts/install.sh          # Same as install:unix
```

### Stitch UI generation (requires `STITCH_API_KEY`)
```bash
npm install
export STITCH_API_KEY="your-key"
npm run stitch:generate-commercial-plan   # Generate commercial plan page designs
npm run stitch:generate-website           # Generate website designs
```

## Architecture

```
bin/codex               Shell wrapper — resolves real codex path, delegates to codex-wrapper.mjs
bin/codex-swap          Shell wrapper — delegates to codex-swap.mjs
runtime/common.mjs      Shared logic: profile list/activate/save, identity decode, launcher UI
runtime/codex-wrapper.mjs  Launcher: shows account picker, waits 5s for keypress, runs real codex, auto-saves profile
runtime/codex-swap.mjs  Direct account switcher (no interactive launcher)
server.mjs              HTTP server for the local dashboard (port 4317, serves /public, REST API at /api/*)
public/index.html       Dashboard SPA (vanilla JS, no build step)
scripts/install.sh      Replaces the active `codex` binary with the switchboard launcher in-place
scripts/bootstrap.sh    curl/wget one-liner that clones/downloads the repo and runs install.sh
```

### Key data paths (runtime)

| Path | Purpose |
|------|---------|
| `~/.codex/auth.json` | Active Codex auth (swapped on profile switch) |
| `~/.codex-switchboard/profiles/<name>/auth.json` | Saved profiles |
| `~/.codex-switchboard/meta.json` | Active profile name |
| `~/.codex-switchboard/config.json` | Install metadata (`realCodex` path) |
| `~/.codex-switchboard/app/` | Installed copy of the runtime |

### Profile identity

Profiles are named by slugifying the email from the JWT `id_token` in `auth.json`. The `decodeIdentityFromAuth()` function in `runtime/common.mjs` decodes the token without a library — it base64url-decodes the middle segment of the JWT.

### Dashboard API (`server.mjs`)

- `GET /api/state` — returns current auth, identity, all profiles, meta, and `codex login status` output
- `POST /api/profiles/save-current` — saves `~/.codex/auth.json` as a named profile
- `POST /api/profiles/activate` — copies a profile's auth.json to `~/.codex/auth.json`
- `POST /api/profiles/delete` — removes a profile directory
- `POST /api/current/clear-auth` — deletes `~/.codex/auth.json`

### Installation mechanism

The installer (`scripts/install.sh`) locates the active `codex` binary (via `which codex`), backs it up as `codex-switchboard-real` alongside it, then writes the switchboard launcher in its place. The real codex path is stored in `~/.codex-switchboard/config.json` as `realCodex`.

## Module system

The project uses ES modules (`"type": "module"` in package.json). All runtime files use `.mjs` extension. No build step or bundler.


---

# MANDATORY: Post-Task Documentation (SR-PTD)

**CRITICAL: After completing ANY task that modifies files, you MUST invoke this skill:**

```
Skill tool -> skill: "sr-ptd-skill"
```

**This is NOT optional. Skipping this skill means the task is INCOMPLETE.**

When planning ANY development task, add as the FINAL item in your task list:
```
[ ] Create SR-PTD documentation
```

### Before Starting Any Task:
1. Create your task plan as usual
2. Add SR-PTD documentation as the last task item
3. This step is MANDATORY for: features, bug fixes, refactors, maintenance, research

### When Completing the SR-PTD Task:
1. Read `~/.claude/skills/sr-ptd-skill/SKILL.md` for full instructions
2. Choose template: Full (complex tasks) or Quick (simple tasks)
3. Create file: `SR-PTD_YYYY-MM-DD_[task-id]_[description].md`
4. Save to: `C:/projects/Skills/Dev_doc_for_skills`
5. Fill all applicable sections thoroughly

### Task Completion Criteria:
A task is NOT complete until SR-PTD documentation exists.

### If Conversation Continues After Task:
Update the existing SR-PTD document instead of creating a new one.

---
