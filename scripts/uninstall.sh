#!/usr/bin/env bash
set -euo pipefail

PURGE_DATA=0
if [[ "${1:-}" == "--purge-data" ]]; then
  PURGE_DATA=1
fi

CONFIG_DIR="${HOME}/.codex-switchboard"
APP_DIR="${CONFIG_DIR}/app"
CONFIG_FILE="${CONFIG_DIR}/config.json"

MANAGED_CODEX="$(python3 - <<'PY' "${CONFIG_FILE}"
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
if p.exists():
    data = json.loads(p.read_text())
    print(data.get("managedCodex", ""))
PY
)"
BACKUP_CODEX="$(python3 - <<'PY' "${CONFIG_FILE}"
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
if p.exists():
    data = json.loads(p.read_text())
    print(data.get("backupCodex", ""))
PY
)"
BIN_DIR="$(python3 - <<'PY' "${CONFIG_FILE}"
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
if p.exists():
    data = json.loads(p.read_text())
    print(data.get("binDir", ""))
PY
)"

if [[ -n "${MANAGED_CODEX}" && -n "${BACKUP_CODEX}" && -f "${BACKUP_CODEX}" ]]; then
  rm -f "${MANAGED_CODEX}"
  cp -P "${BACKUP_CODEX}" "${MANAGED_CODEX}"
fi

rm -f "${BIN_DIR}/codex-swap" "${BIN_DIR}/codex-switchboard-dashboard" "${BIN_DIR}/csb" "${BACKUP_CODEX}"
rm -rf "${APP_DIR}"
rm -f "${CONFIG_FILE}"

if [[ "${PURGE_DATA}" -eq 1 ]]; then
  rm -rf "${CONFIG_DIR}"
fi

echo "Codex Switchboard removed."
if [[ "${PURGE_DATA}" -eq 1 ]]; then
  echo "Profiles and metadata were also removed."
else
  echo "Profiles were preserved in ${CONFIG_DIR}."
fi
