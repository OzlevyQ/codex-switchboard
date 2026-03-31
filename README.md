# Codex Switchboard

<p align="center">
  Account switching for <code>codex</code> without losing local history, workspace state, or folder context.
</p>

<p align="center">
  <a href="https://github.com/OzlevyQ/codex-switchboard"><img alt="repo" src="https://img.shields.io/badge/GitHub-codex--switchboard-111111?logo=github"></a>
  <img alt="platforms" src="https://img.shields.io/badge/platforms-macOS%20%7C%20Linux%20%7C%20Windows-0f766e">
  <img alt="install" src="https://img.shields.io/badge/install-one--line-2563eb">
  <img alt="codex" src="https://img.shields.io/badge/Codex-compatible-f59e0b">
</p>

Codex Switchboard wraps the existing `codex` CLI and swaps only
`~/.codex/auth.json`.

That means you keep:

- the same local Codex history
- the same workspace memory
- the same folder context

## Highlights

- one-key account switching before Codex opens
- automatic profile capture after every `codex` session
- active account preview on launch
- direct switching with `codex-swap`
- local dashboard with `codex-switchboard-dashboard`
- install and uninstall support for macOS, Linux, and Windows

## Why It Exists

Using separate `CODEX_HOME` folders isolates accounts, but it also fragments the
local experience. In practice, that often means a workspace feels "empty" when
you switch.

Codex Switchboard takes a different approach:

- it keeps the default `~/.codex` state
- it swaps only the auth file
- it preserves the machine-level Codex history you already built up

## Quick Start

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.sh | bash
```

### Windows PowerShell

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.ps1 | iex"
```

After installation, `codex` should work immediately in the same shell session.

## What Happens When You Run `codex`

Before Codex starts, the launcher:

1. shows the active account
2. shows saved account emails
3. waits 5 seconds
4. lets you press `1`, `2`, `3`, and so on without Enter to switch
5. opens the real Codex CLI automatically if you do nothing

When Codex exits, the current login is saved automatically as a reusable
profile.

## Commands

| Command | Purpose |
| --- | --- |
| `codex` | Shows the launcher, optionally switches account, then starts Codex |
| `codex-swap` | Switches directly between saved accounts |
| `codex-switchboard-dashboard` | Starts the local dashboard on `http://127.0.0.1:4317` |

## Installation

### macOS / Linux

#### One-line install

```bash
curl -fsSL https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.sh | bash
```

#### Fallback archive install

```bash
tmp="$(mktemp -d)" && curl -fsSL https://codeload.github.com/OzlevyQ/codex-switchboard/tar.gz/refs/heads/main | tar -xzf - -C "$tmp" && bash "$(find "$tmp" -type f -path '*/scripts/install.sh' | head -n 1)" && rm -rf "$tmp"
```

#### Local install

```bash
cd codex-switchboard
bash ./scripts/install.sh
```

Or:

```bash
npm run install:unix
```

Notes:

- `bootstrap.sh` supports `curl` or `wget`
- the installer replaces the active `codex` launcher in-place
- no `source ~/.zshrc`, `hash -r`, or new shell should be required

### Windows

#### One-line install

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.ps1 | iex"
```

Alternative:

```powershell
powershell -ExecutionPolicy Bypass -Command "iwr https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.ps1 -UseBasicParsing | iex"
```

#### Local install

```powershell
cd codex-switchboard
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

Or:

```powershell
npm run install:windows
```

## Daily Usage

### Launch normally

```bash
codex
```

### Switch accounts directly

```bash
codex-swap
```

### Open the dashboard

```bash
codex-switchboard-dashboard
```

## Automatic Profile Capture

After each `codex` run, Codex Switchboard:

1. reads `~/.codex/auth.json`
2. extracts the active identity
3. saves or updates a profile automatically
4. marks that profile as active

So if you use `codex login` with a new account, that account becomes available
automatically on future launches.

## Uninstall

### Remove launchers, keep saved profiles

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

## Data Layout

| Path | Purpose |
| --- | --- |
| `~/.codex-switchboard/app` | Runtime files |
| `~/.codex-switchboard/config.json` | Installation metadata |
| `~/.codex-switchboard/original` | Backup of the original Codex launcher |
| `~/.codex-switchboard/profiles` | Saved auth profiles |
| `~/.codex-switchboard/meta.json` | Active profile metadata |

## Implementation Notes

- Unix install replaces the active `codex` executable path directly
- if the original `codex` path is a symlink, uninstall restores it correctly
- Windows install replaces the active `codex.cmd` shim
- managed and backup paths are stored in `~/.codex-switchboard/config.json`

## Repository

GitHub: `https://github.com/OzlevyQ/codex-switchboard`
