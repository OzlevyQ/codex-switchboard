#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${HOME}/.codex-switchboard/app"
CONFIG_DIR="${HOME}/.codex-switchboard"
CONFIG_FILE="${CONFIG_DIR}/config.json"
BACKUP_DIR="${HOME}/.codex-switchboard/original"

detect_real_codex() {
  if [[ -f "${CONFIG_FILE}" ]]; then
    local configured
    configured="$(python3 - <<'PY' "${CONFIG_FILE}"
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
if p.exists():
    data = json.loads(p.read_text())
    print(data.get("realCodex", ""))
PY
)"
    if [[ -n "${configured}" && -x "${configured}" && "${configured}" != *".codex-switchboard"* && "${configured}" != "${HOME}/.local/bin/codex" ]]; then
      printf "%s" "${configured}"
      return
    fi
  fi

  while IFS= read -r candidate; do
    if [[ -z "${candidate}" ]]; then
      continue
    fi
    if [[ "${candidate}" == "${HOME}/.local/bin/codex" ]]; then
      continue
    fi
    if [[ "${candidate}" == *".codex-switchboard"* ]]; then
      continue
    fi
    if [[ -x "${candidate}" ]]; then
      printf "%s" "${candidate}"
      return
    fi
  done < <(which -a codex 2>/dev/null || true)

  for candidate in \
    "${HOME}/Library/pnpm/codex" \
    "${HOME}/.local/share/pnpm/codex" \
    "/usr/local/bin/codex" \
    "/opt/homebrew/bin/codex"
  do
    if [[ -x "${candidate}" && "${candidate}" != "${HOME}/.local/bin/codex" ]]; then
      printf "%s" "${candidate}"
      return
    fi
  done

  echo "Could not find the real codex binary." >&2
  exit 1
}

REAL_CODEX="${CODEX_SWITCHBOARD_REAL_CODEX:-$(detect_real_codex)}"
if [[ "${REAL_CODEX}" == *".codex-switchboard"* ]]; then
  echo "Resolved codex points to Codex Switchboard itself. Reinstall with CODEX_SWITCHBOARD_REAL_CODEX=/path/to/real/codex." >&2
  exit 1
fi

TARGET_BIN_DIR="$(dirname "${REAL_CODEX}")"
TARGET_CODEX="${TARGET_BIN_DIR}/codex"
BACKUP_CODEX="${BACKUP_DIR}/codex"

mkdir -p "${APP_DIR}" "${CONFIG_DIR}" "${HOME}/.codex-switchboard/profiles" "${BACKUP_DIR}"
rm -rf "${APP_DIR}/runtime" "${APP_DIR}/public"
mkdir -p "${APP_DIR}/runtime"

cp "${ROOT_DIR}/server.mjs" "${APP_DIR}/server.mjs"
mkdir -p "${APP_DIR}/public"
cp -R "${ROOT_DIR}/public/." "${APP_DIR}/public/"
cp -R "${ROOT_DIR}/runtime/." "${APP_DIR}/runtime/"

if [[ ! -w "${TARGET_BIN_DIR}" ]]; then
  echo "Target bin directory is not writable: ${TARGET_BIN_DIR}" >&2
  echo "Set CODEX_SWITCHBOARD_REAL_CODEX to a writable Codex path and retry." >&2
  exit 1
fi

if [[ ! -f "${BACKUP_CODEX}" ]]; then
  cp -P "${TARGET_CODEX}" "${BACKUP_CODEX}"
fi

rm -f "${TARGET_CODEX}"

cat > "${CONFIG_FILE}" <<EOF
{
  "version": "1.1.0",
  "installedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platform": "$(uname -s)",
  "realCodex": "${BACKUP_CODEX}",
  "appDir": "${APP_DIR}",
  "binDir": "${TARGET_BIN_DIR}",
  "managedCodex": "${TARGET_CODEX}",
  "backupCodex": "${BACKUP_CODEX}"
}
EOF

cat > "${TARGET_CODEX}" <<EOF
#!/usr/bin/env bash
exec node "${APP_DIR}/runtime/codex-wrapper.mjs" "\$@"
EOF

cat > "${TARGET_BIN_DIR}/codex-swap" <<EOF
#!/usr/bin/env bash
exec node "${APP_DIR}/runtime/codex-swap.mjs" "\$@"
EOF

cat > "${TARGET_BIN_DIR}/codex-switchboard-dashboard" <<EOF
#!/usr/bin/env bash
exec node "${APP_DIR}/server.mjs" --open-browser "\$@"
EOF

chmod +x "${TARGET_CODEX}" "${TARGET_BIN_DIR}/codex-swap" "${TARGET_BIN_DIR}/codex-switchboard-dashboard"

echo "Codex Switchboard installed."
echo "real codex backup: ${BACKUP_CODEX}"
echo "commands: codex, codex-swap, codex-switchboard-dashboard"
echo "installed in: ${TARGET_BIN_DIR}"
echo "It should work immediately in the current environment."
