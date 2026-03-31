#!/usr/bin/env bash
set -euo pipefail

PURGE_DATA=0
if [[ "${1:-}" == "--purge-data" ]]; then
  PURGE_DATA=1
fi

CONFIG_DIR="${HOME}/.codex-switchboard"
APP_DIR="${CONFIG_DIR}/app"
BIN_DIR="${HOME}/.local/bin"

rm -f "${BIN_DIR}/codex" "${BIN_DIR}/codex-swap" "${BIN_DIR}/codex-switchboard-dashboard"
rm -rf "${APP_DIR}"
rm -f "${CONFIG_DIR}/config.json"

for rc in "${HOME}/.zshrc" "${HOME}/.bashrc"; do
  if [[ -f "${rc}" ]]; then
    python3 - <<'PY' "${rc}"
from pathlib import Path
import sys
p = Path(sys.argv[1])
text = p.read_text()
text = text.replace("\n# codex-switchboard PATH\nexport PATH=\"$HOME/.local/bin:$PATH\"\n", "\n")
p.write_text(text)
PY
  fi
done

rm -f "${HOME}/.config/fish/conf.d/codex-switchboard.fish"

if [[ "${PURGE_DATA}" -eq 1 ]]; then
  rm -rf "${CONFIG_DIR}"
fi

echo "Codex Switchboard removed."
if [[ "${PURGE_DATA}" -eq 1 ]]; then
  echo "Profiles and metadata were also removed."
else
  echo "Profiles were preserved in ${CONFIG_DIR}."
fi
