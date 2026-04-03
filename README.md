# Codex Switchboard

Codex Switchboard is a local multi-account layer for the `codex` CLI.

It keeps the normal `~/.codex` machine history and workspace context, and only rotates the active `auth.json`. The result is simple: you can switch identities without moving to a different `CODEX_HOME` and without starting from a "fresh" Codex state every time.

## What It Handles

- wraps the real `codex` binary with a launcher
- shows the active user before Codex starts
- lets you switch users instantly from the launcher or with `codex-swap`
- auto-saves newly used accounts after a normal `codex` session
- runs a local dashboard on `127.0.0.1:4317`
- supports profile pools and automatic fallback when a profile is exhausted
- can link the local machine to CSB Cloud with `csb link <token>`

## Why It Exists

Using separate `CODEX_HOME` folders works, but it splits the experience:

- local conversation history gets fragmented
- project context gets split between environments
- the same folder feels "new" when you swap accounts

Codex Switchboard keeps the machine-local Codex state in place and swaps only the authentication layer.

## How It Works

### Local mode

1. `codex` starts through the Switchboard wrapper.
2. The launcher shows the active account and saved profiles.
3. If you press a number within 5 seconds, Switchboard swaps to that profile.
4. The real Codex CLI starts with the selected auth.
5. When the session ends, the active login is auto-saved back into `~/.codex-switchboard/profiles`.

### Pool mode

Profiles can be grouped into pools. If Codex exits due to exhaustion or rate-limit style failures:

- the current profile is marked exhausted
- the next available profile in the active pool is selected
- the same command is retried automatically

### Cloud-linked mode

When you run `csb link <token>`:

- the local daemon is started automatically if needed
- the machine is linked to CSB Cloud
- an initial sync is performed
- a background worker starts sending heartbeats and profile sync updates

When you run `csb unlink`:

- the cloud link is removed
- the background sync worker is stopped
- the local daemon is stopped

## Quick Start

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.sh | bash
```

### Windows PowerShell

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.ps1 | iex"
```

The installer replaces the active `codex` launcher in place, so the commands should work immediately in the current shell.

## Daily Flow

### First login capture

```bash
codex login
codex
```

After the first normal session, the active login is auto-saved as a reusable profile.

### Add another account later

```bash
codex login
codex
```

That login is also auto-saved. On the next launch, both accounts appear in the launcher.

### Link the machine to CSB Cloud

```bash
csb link <token>
```

You generate the token from the cloud dashboard at:

```text
https://cbs.yadbarzel.info/dashboard/devices
```

`link` is the main setup command now; it handles daemon startup for you.

### Disconnect fully

```bash
csb unlink
```

This disconnects the machine from CSB Cloud and stops the local daemon.

## Commands

### Core CLI

| Command | What it does |
| --- | --- |
| `codex` | Shows the launcher, allows quick profile switching, then runs the real Codex CLI |
| `codex ui` | Starts the local dashboard server and opens it in the default browser |
| `codex-swap` | Switches directly between saved profiles by menu, profile name, or email |

### Cloud / daemon CLI

| Command | What it does |
| --- | --- |
| `csb link <token>` | Starts the local daemon if needed, links the machine to CSB Cloud, runs initial sync, and starts background live sync |
| `csb unlink` | Unlinks the machine from CSB Cloud, stops background sync, and stops the local daemon |
| `csb status` | Shows current CSB Cloud link status, device ID, API URL, and whether live sync is running |
| `csb sync` | Pushes current local profiles and pools to CSB Cloud |
| `csb up` | Starts the local daemon and runs sync if the machine is already linked |
| `csb daemon start` | Starts the local daemon on port `4317` |
| `csb daemon stop` | Stops the local daemon |
| `csb daemon restart` | Restarts the local daemon |

## Command Notes

- `codex` waits 5 seconds on the launcher screen.
- `codex-swap` accepts:
  - a number
  - a profile name
  - an email
- `csb link <token>` is the preferred setup command. You do not need to run `csb daemon start` first.
- `csb unlink` now also stops the local daemon even if no active cloud link exists.
- `csb up` is a convenience command, not the required setup flow.

## Dashboard

### Cloud dashboard

```text
https://cbs.yadbarzel.info/dashboard
```

### Local dashboard

The local dashboard runs on:

```text
http://127.0.0.1:4317
```

Open it with:

```bash
codex ui
```

Or run the server directly:

```bash
npm start
```

### Expose the local dashboard to your network

```bash
HOST=0.0.0.0 codex ui
```

or:

```bash
HOST=0.0.0.0 PORT=4317 npm start
```

When started with `HOST=0.0.0.0`, Switchboard still opens the browser locally on `127.0.0.1`, but the server is reachable from the local network as well.

## Installation

### Local install from the repo

```bash
bash ./scripts/install.sh
```

or:

```bash
npm run install:unix
```

### Fallback archive installer

```bash
tmp="$(mktemp -d)" && curl -fsSL https://codeload.github.com/OzlevyQ/codex-switchboard/tar.gz/refs/heads/main | tar -xzf - -C "$tmp" && bash "$(find "$tmp" -type f -path '*/scripts/install.sh' | head -n 1)" && rm -rf "$tmp"
```

## Uninstall

### Remove the app but keep profiles

```bash
bash ./scripts/uninstall.sh
```

### Remove everything, including profiles and metadata

```bash
bash ./scripts/uninstall.sh --purge-data
```

## Local Data Layout

| Path | Purpose |
| --- | --- |
| `~/.codex/auth.json` | Active Codex auth used by the real CLI |
| `~/.codex-switchboard/profiles/` | Saved profile auth snapshots |
| `~/.codex-switchboard/meta.json` | Active profile metadata |
| `~/.codex-switchboard/csb-cloud.json` | Current cloud link config |
| `~/.codex-switchboard/csb-daemon.pid` | Local daemon PID |
| `~/.codex-switchboard/csb-watch.pid` | Background cloud sync worker PID |
| `~/.codex-switchboard/app/` | Installed local app files |

## Development

### Run the local dashboard server from the repo

```bash
npm start
```

### Reinstall the local runtime after changes

```bash
bash ./scripts/install.sh
```

## Current Command Inventory

This is the current local command surface in the repo:

- `codex`
- `codex ui`
- `codex-swap`
- `csb link <token>`
- `csb unlink`
- `csb status`
- `csb sync`
- `csb up`
- `csb daemon start`
- `csb daemon stop`
- `csb daemon restart`
- `bash ./scripts/install.sh`
- `bash ./scripts/uninstall.sh`
- `bash ./scripts/uninstall.sh --purge-data`

## Important Scope Note

This repository is the local runtime and installer layer.

The separate `csb-web/` application is intentionally not part of this GitHub package.
