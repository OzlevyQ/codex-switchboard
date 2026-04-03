# Codex Switchboard

Codex Switchboard is a multi-account management layer for the `codex` CLI. It wraps the real `codex` binary so you can save, switch, and auto-rotate between multiple Codex accounts — without losing local conversation history, workspace context, or folder state.

## What It Does

- Wraps the real `codex` binary with a launcher that shows your active account and saved profiles
- Lets you switch accounts in under 200ms (press a number when the launcher appears)
- Saves newly used accounts automatically after each session
- Groups accounts into **pools** and rotates automatically when quota is exhausted on one account
- Lets you **share encrypted profile bundles** and pool configs with teammates
- Runs a **local dashboard** at `http://127.0.0.1:4317` for full visual management
- Optionally links to **CSB Cloud** to sync your device, profiles, and pools to a web dashboard
- Includes a **marketplace** for sharing pool templates, workflow packs, and team presets

---

## Quick Install

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.sh | bash
```

### Windows PowerShell

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/OzlevyQ/codex-switchboard/main/scripts/bootstrap.ps1 | iex"
```

The installer replaces the active `codex` binary in place. No new shell needed — it works immediately.

---

## How It Works

### First Session

```bash
codex login      # log in to your Codex account
codex            # run Codex normally — Switchboard auto-saves your login as a profile
```

### Second Account

```bash
codex login      # log in to a different account
codex            # this login is also auto-saved
```

From now on, every `codex` launch shows the Switchboard launcher. Press a number within 5 seconds to switch accounts, or wait for the default to start.

### Direct Switch (no launcher)

```bash
codex-swap 2                        # switch by profile number
codex-swap ozlevy@gmail.com         # switch by email
```

---

## Local Dashboard

The local dashboard gives you a full UI for managing profiles and pools.

```bash
codex ui         # starts the dashboard server and opens the browser
```

Or access directly at `http://127.0.0.1:4317`.

The dashboard has four tabs:

| Tab | What it does |
|-----|-------------|
| **Profiles** | Save, activate, and delete profiles. Shows active identity. |
| **Pools** | Create pools, add/remove profiles, toggle auto-switch, reset exhaustion. |
| **Share** | Export encrypted profile bundles and plain pool bundles to share with teammates. |
| **Status** | Auth file stats, active pool state, Codex login status output. |

---

## Profile Pools and Auto-Rotation

Pools let you group multiple accounts together. When `codex` exits because an account hits its quota or rate limit, Switchboard automatically:

1. Marks that profile as exhausted
2. Finds the next available profile in the active pool
3. Switches to it and retries — up to 10 times per session

No manual action needed. You keep working and Switchboard handles the rotation.

### Creating a Pool

**From the dashboard → Pools tab:**
- Click "Create pool", name it, save
- Use the dropdown on the pool card to add profiles
- Toggle "Auto-switch" on

**From `codex-swap` (coming soon):** CLI pool management commands.

### Resetting Exhaustion

When all profiles in a pool are exhausted (e.g. next day, quotas reset), open the dashboard → Pools tab → click "Reset" on the pool or an individual profile.

---

## Sharing Profiles and Pools

### Profile Bundles (encrypted)

Profile bundles contain the full `auth.json` of a saved profile, encrypted with AES-256-GCM. The key is derived from a passphrase you choose using scrypt.

**Export:**
```
Dashboard → Share tab → Export Profile → choose profile → enter passphrase → copy bundle string (SWB1_...)
```

**Import (teammate side):**
```
Dashboard → Share tab → Import Profile → paste bundle → enter passphrase → activate
```

Bundle format: `SWB1_<base64url>` — version byte + scrypt salt + AES-GCM IV + encrypted payload + auth tag.

### Pool Bundles (plain)

Pool bundles contain only the pool structure (name, strategy, profile list). No credentials are included.

**Export:**
```
Dashboard → Share tab → Export Pool → choose pool → copy bundle string (SWP1_...)
```

**Import:**
```
Dashboard → Share tab → Import Pool → paste bundle → done
```

---

## Cloud Sync (CSB Cloud)

CSB Cloud lets you view all your linked devices, synced profiles, and pools from a web dashboard.

### Link a Machine

1. Open the cloud dashboard: `https://cbs.yadbarzel.info/dashboard/devices`
2. Click **Generate Link Token** — valid for 15 minutes
3. On your machine:

```bash
csb link <token>
```

This starts the local daemon, registers the device, and starts background sync.

### Unlink

```bash
csb unlink
```

Stops the sync worker, unlinks the device from cloud, and stops the local daemon.

### Other Commands

| Command | What it does |
|---------|-------------|
| `csb status` | Show current link status, device ID, sync state |
| `csb sync` | Force a manual profile/pool sync to cloud |
| `csb up` | Start daemon + sync if already linked |
| `csb daemon start` | Start the local daemon on port 4317 |
| `csb daemon stop` | Stop the local daemon |
| `csb daemon restart` | Restart the local daemon |

---

## Full Command Reference

### Core CLI

| Command | Description |
|---------|-------------|
| `codex [args]` | Launcher → profile select → real Codex CLI. Auto-rotates on exhaustion. |
| `codex ui` | Start local dashboard server, open in browser |
| `codex-swap [id]` | Switch profile directly by number, name, or email |

### Cloud / Daemon CLI

| Command | Description |
|---------|-------------|
| `csb link <token>` | Start daemon → link machine → initial sync → start live sync |
| `csb unlink` | Stop sync → unlink device → stop daemon |
| `csb status` | Show link status, device ID, API URL |
| `csb sync` | Push current profiles and pools to cloud |
| `csb up` | Start daemon and sync (if already linked) |
| `csb daemon start` | Start local daemon |
| `csb daemon stop` | Stop local daemon |
| `csb daemon restart` | Restart local daemon |

---

## Architecture

```
codex (wrapper)                     bin/codex
 └── codex-wrapper.mjs              Shows launcher, rotates on exhaustion, runs real codex

codex-swap                          bin/codex-swap
 └── codex-swap.mjs                 Direct profile switcher

csb                                 bin/csb
 └── csb-cloud.mjs                  Cloud daemon: link, sync, heartbeat, unlink

Local Daemon (port 4317)
 └── server.mjs                     REST API + SSE for local dashboard

Shared Runtime
 ├── common.mjs                     Profile CRUD, identity decode, launcher UI
 ├── pool-manager.mjs               Pool CRUD, exhaustion tracking, auto-rotation
 └── share-manager.mjs             Encrypted profile + plain pool bundle export/import
```

### Key Data Paths

| Path | Purpose |
|------|---------|
| `~/.codex/auth.json` | Active Codex auth — swapped on profile switch |
| `~/.codex-switchboard/profiles/<name>/auth.json` | Saved profile snapshots |
| `~/.codex-switchboard/pools.json` | Pool definitions |
| `~/.codex-switchboard/meta.json` | Active profile name |
| `~/.codex-switchboard/config.json` | Install metadata (real codex path) |
| `~/.codex-switchboard/csb-cloud.json` | Cloud link config + device API key |
| `~/.codex-switchboard/csb-daemon.pid` | Local daemon PID |
| `~/.codex-switchboard/csb-watch.pid` | Background sync worker PID |
| `~/.codex-switchboard/app/` | Installed app files |

### How Exhaustion Detection Works

When `codex` exits, Switchboard captures its stderr and matches against known error patterns:

- `"exceeded your current quota"` → exhausted
- `"insufficient_quota"` → exhausted
- `"Your refresh token has already been used"` → exhausted
- `"429 Too Many Requests"` → rate_limit
- `"rate_limit_exceeded"` → rate_limit

On exhaustion, the current profile is marked in `state.json` with `exhausted: true` and a timestamp. The next non-exhausted profile in the active pool is selected.

### Profile Identity

Profiles are named by slugifying the email from the JWT `id_token` in `auth.json`. The `decodeIdentityFromAuth()` function in `common.mjs` decodes the JWT without any library — it base64url-decodes the middle segment.

---

## Cloud Web Dashboard

The cloud web dashboard (`csb-web/`) is a full-stack React + Express app:

- **Frontend**: React 19, Zustand, Tailwind CSS, Vite
- **Backend**: Express.js, Firebase Auth, JSON file storage (→ MongoDB in production)
- **Auth**: Google Sign-in via Firebase, with device API key auth for the CLI

### Dashboard Screens

| Screen | What it shows |
|--------|--------------|
| Overview | Device count, profile count, active pool stats |
| Devices | Linked machines, connection status, link new device |
| Profiles | All synced profiles across devices |
| Pools | Pool configs with auto-switch settings |
| Marketplace | Browse and purchase pool templates / workflow packs |
| My Listings | Sell your own pool templates |

### Security Model

| Data | Storage | Encryption |
|------|---------|-----------|
| Local auth.json | Machine filesystem only | OS-level |
| Profile bundles (shared) | Exported as text strings | AES-256-GCM + scrypt |
| Pool bundles (shared) | Exported as text strings | None (no secrets) |
| Synced profiles (cloud) | Metadata only — name, email, accountId | TLS in transit |
| Device API keys | Stored server-side | Stored hashed (HMAC-SHA-256) in production |
| Link tokens | Server-side, 15-min TTL | Stored hashed in production |

**Raw `auth.json` is never sent to the cloud.** Only metadata (name, email, accountId, pool membership, exhaustion flag) is synced.

---

## Marketplace

The marketplace lets the community share and sell:

- **Pool templates** — pre-configured rotation pools for common workflows
- **Workflow packs** — optimized switching configs for freelancers, agencies, CI pipelines
- **Team presets** — pool isolation configs, audit policies, bundle validation rules

Marketplace items contain **pool/workflow configuration only** — no credentials, no auth tokens.

### Selling a Template

1. Open cloud dashboard → My Listings
2. Click "New Listing"
3. Fill title, description, category, price (0 = free), and optional bundle data
4. Publish

### Buying a Template

1. Open cloud dashboard → Marketplace
2. Browse or search by category
3. Click "Get" (free) or "Purchase"
4. Download the bundle config and apply locally

---

## Installation Details

### What `install.sh` Does

1. Finds the current `codex` binary via `which codex`
2. Backs it up as `codex-switchboard-real` in the same directory
3. Writes the Switchboard launcher in its place
4. Creates `csb` and `codex-swap` commands
5. Copies the runtime to `~/.codex-switchboard/app/`
6. Saves the real codex path to `~/.codex-switchboard/config.json`

### Local Install from Repo

```bash
bash ./scripts/install.sh
# or:
npm run install:unix
```

### Reinstall After Code Changes

```bash
bash ./scripts/install.sh
```

---

## Uninstall

```bash
bash ./scripts/uninstall.sh              # Remove Switchboard, keep profiles
bash ./scripts/uninstall.sh --purge-data # Remove everything including profiles
```

---

## Development

### Run the Local Dashboard

```bash
npm start        # starts server.mjs on port 4317
```

### Run the Cloud Web App

```bash
cd csb-web
pnpm install
cp .env.example .env   # fill in Firebase config
pnpm run dev:all       # starts both Vite (port 5173) and Express backend (port 4318)
```

### Expose the Dashboard to Your Network

```bash
HOST=0.0.0.0 codex ui
# or:
HOST=0.0.0.0 PORT=4317 npm start
```

The browser opens on `127.0.0.1` but the server accepts connections from the local network.

### Module System

Everything is ES modules (`"type": "module"` in package.json). All runtime files use `.mjs`. No build step or bundler for the local runtime.

---

## Environment Variables

### Local Daemon (`server.mjs`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `4317` | Dashboard port |
| `HOST` | `127.0.0.1` | Dashboard bind address |
| `SWITCHBOARD_NO_LISTEN` | — | Set to `1` to load without binding (syntax check) |

### Cloud Daemon (`csb-cloud.mjs`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `CSB_DASHBOARD_URL` | `https://cbs.yadbarzel.info` | Cloud dashboard base URL |
| `CSB_API_URL` | same as dashboard URL | Cloud API base URL |

### Cloud Backend (`csb-web/server/`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `CSB_PORT` | No (4318) | Backend port |
| `CSB_HOST` | No (127.0.0.1) | Backend bind address |
| `NODE_ENV` | Yes in prod | `development` or `production` |
| `MONGODB_URI` | Yes in prod | Atlas connection string |
| `MONGODB_DB_NAME` | Yes in prod | `csb_dev` or `csb_prod` |
| `CSB_TOKEN_PEPPER` | Yes in prod | HMAC secret for hashing tokens |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes in prod | Firebase Admin credentials path |

---

## What's Missing / Roadmap

| Area | Status | Notes |
|------|--------|-------|
| MongoDB backend | Planned | Current: JSON files. Migration plan ready. |
| Payment integration | Planned | Marketplace records purchases but no payment gateway |
| Two-factor auth | Not started | Firebase supports it but not wired |
| Team/org accounts | Not started | Currently all accounts are individual |
| Rate limiting | Not started | No request throttling on backend routes |
| Pagination | Not started | All lists loaded in full |
| CLI pool commands | Partial | `csb pool create/add/remove` not yet exposed |
| Bundle versioning | Not started | No version tracking for marketplace templates |

---

## Repository Structure

```
/
├── bin/                    Shell wrappers (codex, codex-swap, csb)
├── runtime/                Node.js runtime (common, wrapper, swap, pool, share, cloud)
├── public/                 Static files for local dashboard (index.html)
├── server.mjs              Local daemon HTTP server (port 4317)
├── scripts/                install.sh, bootstrap.sh, uninstall.sh
├── package.json            Root dependencies
└── csb-web/                Cloud web app (not installed locally, see below)
    ├── src/                React frontend
    ├── server/             Express backend
    └── package.json        csb-web dependencies
```

> **Note**: `csb-web/` is excluded from this repository's git history. It is deployed separately to the cloud. The local runtime (`runtime/`, `server.mjs`, `bin/`) is what gets installed on user machines.
