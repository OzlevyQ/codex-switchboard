# Codex Switchboard

Codex Switchboard is a multi-account layer for the `codex` CLI.

It lets you switch between Codex identities without moving to a different `CODEX_HOME`, so the machine keeps using the same local history, workspace memory, and folder context you already built up.

## What It Does

- Wraps the real `codex` command with a launcher.
- Switches accounts by swapping only `~/.codex/auth.json`.
- Saves newly used accounts automatically after a normal `codex` session.
- Opens a local dashboard for profile management, pools, and sharing.
- Supports automatic fallback to another profile when the current one is exhausted or rate-limited.

## Why It Exists

Using separate `CODEX_HOME` directories works, but it fragments the local Codex experience.

That usually means:

- missing conversation history
- missing local state
- a workspace that feels fresh every time you switch accounts

Codex Switchboard keeps the default `~/.codex` state in place and rotates only the authentication file.

## Feature Set

### Core switching

- `codex` shows a launcher before the real CLI starts.
- You can switch users by pressing `1`, `2`, `3`, and so on without pressing Enter.
- `codex-swap` switches profiles directly by menu, profile name, or email.
- `codex ui` opens the dashboard in the default browser.

### Automatic profile capture

After each `codex` run, Switchboard reads the active `~/.codex/auth.json`, extracts the identity, and stores or updates a reusable profile automatically.

That means a new account added through `codex login` becomes available in future launches without any manual export step.

### Pools and automatic fallback

Switchboard can group profiles into pools and mark profiles as exhausted when Codex exits with quota or rate-limit style failures.

With an active pool:

- exhausted profiles are marked automatically
- Switchboard can move to the next available profile
- the same command is retried with the replacement account

### Share and import flows

- export encrypted profile bundles
- import profile bundles with a passphrase
- export and import pool definitions

This is useful for moving profile sets between machines or sharing team-ready pool definitions without exposing raw auth files in normal workflow.

### Local dashboard

The dashboard runs on `http://127.0.0.1:4317` by default and includes:

- current Codex identity summary
- profile list and activation
- delete and reset actions
- pool management
- share/import tools
- loading states on actions so the UI does not race ahead of long operations

## Quick Start

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.sh | bash
```

### Windows PowerShell

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.ps1 | iex"
```

The installer is designed to make `codex` work immediately in the current shell by replacing the active Codex launcher in place.

## Commands

| Command | Purpose |
| --- | --- |
| `codex` | Show the launcher, optionally switch profiles, then run the real Codex CLI |
| `codex ui` | Start the dashboard server and open it in the default browser |
| `codex-swap` | Switch directly between saved profiles |
| `codex-switchboard-dashboard` | Start the dashboard explicitly |

## Typical Flow

1. Install Codex Switchboard.
2. Run `codex login` with one account.
3. Use `codex` normally.
4. Run `codex login` with another account later.
5. Use `codex` again and let Switchboard auto-capture it.
6. Next launch, press a number in the launcher to swap accounts instantly.

## Installation

### macOS / Linux

#### One-line installer

```bash
curl -fsSL https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.sh | bash
```

#### Fallback archive installer

```bash
tmp="$(mktemp -d)" && curl -fsSL https://codeload.github.com/OzlevyQ/codex-switchboard/tar.gz/refs/heads/main | tar -xzf - -C "$tmp" && bash "$(find "$tmp" -type f -path '*/scripts/install.sh' | head -n 1)" && rm -rf "$tmp"
```

#### Local install

```bash
bash ./scripts/install.sh
```

Or:

```bash
npm run install:unix
```

### Windows

#### One-line installer

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.ps1 | iex"
```

#### Local install

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

Or:

```powershell
npm run install:windows
```

## Daily Usage

### Start Codex with the launcher

```bash
codex
```

### Open the local dashboard

```bash
codex ui
```

### Switch directly from the terminal

```bash
codex-swap
```

You can also target a profile directly:

```bash
codex-swap work
codex-swap ozlevy6@gmail.com
```

## Dashboard

Start it with:

```bash
npm start
```

or:

```bash
codex ui
```

The server listens on:

```text
http://127.0.0.1:4317
```

To expose it to your network:

```bash
HOST=0.0.0.0 PORT=4317 npm start
```

or:

```bash
HOST=0.0.0.0 codex ui
```

When started with `HOST=0.0.0.0`, Switchboard prints the detected network URLs in the terminal.

## State and Data Layout

| Path | Purpose |
| --- | --- |
| `~/.codex/auth.json` | Active Codex auth used by the real CLI |
| `~/.codex-switchboard/config.json` | Install metadata and real Codex path |
| `~/.codex-switchboard/meta.json` | Active profile metadata |
| `~/.codex-switchboard/profiles/` | Saved profile auth files and state |
| `~/.codex-switchboard/pools.json` | Pool definitions and active pool |
| `<real-codex-dir>/codex-switchboard-real` | Backup of the original Codex launcher |

## Advanced Notes

- On Unix, the installer replaces the active `codex` executable path directly.
- If the original Codex command is a symlink or shim, uninstall restores it correctly.
- The real launcher is backed up next to the original command so package-manager shims keep working.
- The dashboard can open the browser automatically.
- Profile bundles are encrypted before export.
- Pool bundles do not contain secrets and can be shared as plain configuration bundles.

## Development

Install dependencies:

```bash
npm install
```

Run the dashboard locally:

```bash
npm start
```

Available scripts:

```bash
npm run bootstrap:unix
npm run install:unix
npm run uninstall:unix
npm run install:windows
npm run uninstall:windows
npm run stitch:generate-commercial-plan
npm run stitch:generate-website
```

## Related Docs

- [Website PRD](./docs/website-prd.md)
- [Stitch generation notes](./STITCH.md)
- [Claude project notes](./CLAUDE.md)

## Uninstall

### Keep saved profiles

macOS / Linux:

```bash
bash ./scripts/uninstall.sh
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

### Remove everything

macOS / Linux:

```bash
bash ./scripts/uninstall.sh --purge-data
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1 --purge-data
```

## Repository

GitHub:

https://github.com/OzlevyQ/codex-switchboard
