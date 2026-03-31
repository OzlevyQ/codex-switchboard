# Codex Switchboard

Codex account switching system with:

- automatic profile capture after `codex` exits
- `codex` launcher that shows the active user before starting
- one-key profile switching during launch
- `codex-swap` for direct account switching
- optional local dashboard
- install and uninstall scripts

The system keeps using the default `~/.codex` history and workspace state.
Only `~/.codex/auth.json` is swapped.

## Commands

After installation:

- `codex`
  - shows the active account, saved accounts, and waits 5 seconds
  - press `1`, `2`, etc. without Enter to switch before Codex opens
- `codex-swap`
  - lists saved account emails and lets you switch
- `codex-switchboard-dashboard`
  - starts the local dashboard on `http://127.0.0.1:4317`

## Install

### macOS / Linux

Fast install without cloning:

```bash
tmp="$(mktemp -d)" && curl -fsSL https://codeload.github.com/OzlevyQ/codex-switchboard/tar.gz/refs/heads/main | tar -xzf - -C "$tmp" && bash "$(find "$tmp" -type f -path '*/scripts/install.sh' | head -n 1)" && rm -rf "$tmp"
```

Alternative bootstrap URL:

```bash
curl -fsSL https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.sh | bash
```

Local install from a checked-out repo:

```bash
cd codex-switchboard
bash ./scripts/install.sh
```

Or:

```bash
npm run install:unix
```

### Windows

```powershell
cd codex-switchboard
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

Or:

```powershell
npm run install:windows
```

## Uninstall

### Remove launchers but keep saved profiles

macOS / Linux:

```bash
bash ./scripts/uninstall.sh
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

### Remove everything, including saved profiles

macOS / Linux:

```bash
bash ./scripts/uninstall.sh --purge-data
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1 --purge-data
```

## Data layout

- app files: `~/.codex-switchboard/app`
- config: `~/.codex-switchboard/config.json`
- saved profiles: `~/.codex-switchboard/profiles`
- active profile metadata: `~/.codex-switchboard/meta.json`

## Automatic behavior

Whenever you exit `codex`, the launcher:

1. reads the current `~/.codex/auth.json`
2. extracts the active email
3. saves or updates a profile automatically
4. marks that profile as active

That means new accounts added through `codex login` become available
automatically in future runs.

## Notes

- The Unix installer updates `~/.zshrc`, `~/.bashrc`, and Fish `conf.d` so the
  launcher commands are on `PATH`.
- The Windows installer adds the local switchboard `bin` directory to the user
  `PATH`.
- The installer stores the original Codex binary path in
  `~/.codex-switchboard/config.json`.
