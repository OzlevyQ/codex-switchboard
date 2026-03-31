#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${HOME}/.codex-switchboard/app"
BIN_DIR="${HOME}/.local/bin"
CONFIG_DIR="${HOME}/.codex-switchboard"
CONFIG_FILE="${CONFIG_DIR}/config.json"

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

REAL_CODEX="$(detect_real_codex)"
if [[ "${REAL_CODEX}" == *".codex-switchboard"* ]]; then
  echo "Resolved codex points to Codex Switchboard itself. Reinstall with CODEX_SWITCHBOARD_REAL_CODEX=/path/to/real/codex." >&2
  exit 1
fi

mkdir -p "${APP_DIR}" "${BIN_DIR}" "${CONFIG_DIR}" "${HOME}/.codex-switchboard/profiles"
rm -rf "${APP_DIR}/runtime" "${APP_DIR}/public"
mkdir -p "${APP_DIR}/runtime"
cp "${ROOT_DIR}/server.mjs" "${APP_DIR}/server.mjs"
mkdir -p "${APP_DIR}/public"
cp -R "${ROOT_DIR}/public/." "${APP_DIR}/public/"
cp -R "${ROOT_DIR}/runtime/." "${APP_DIR}/runtime/"

cat > "${CONFIG_FILE}" <<EOF
{
  "version": "1.1.0",
  "installedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platform": "$(uname -s)",
  "realCodex": "${REAL_CODEX}",
  "appDir": "${APP_DIR}",
  "binDir": "${BIN_DIR}"
}
EOF

cat > "${BIN_DIR}/codex" <<EOF
#!/usr/bin/env bash
exec node "${APP_DIR}/runtime/codex-wrapper.mjs" "\$@"
EOF

cat > "${BIN_DIR}/codex-swap" <<EOF
#!/usr/bin/env bash
exec node "${APP_DIR}/runtime/codex-swap.mjs" "\$@"
EOF

cat > "${BIN_DIR}/codex-switchboard-dashboard" <<EOF
#!/usr/bin/env bash
exec node "${APP_DIR}/server.mjs" "\$@"
EOF

chmod +x "${BIN_DIR}/codex" "${BIN_DIR}/codex-swap" "${BIN_DIR}/codex-switchboard-dashboard"

for rc in "${HOME}/.zshrc" "${HOME}/.bashrc"; do
  touch "${rc}"
  if ! grep -q 'codex-switchboard PATH' "${rc}"; then
    cat >> "${rc}" <<EOF

# codex-switchboard PATH
export PATH="\$HOME/.local/bin:\$PATH"
EOF
  fi
done

mkdir -p "${HOME}/.config/fish/conf.d"
cat > "${HOME}/.config/fish/conf.d/codex-switchboard.fish" <<'EOF'
if not contains $HOME/.local/bin $PATH
    set -gx PATH $HOME/.local/bin $PATH
end
EOF

echo "Codex Switchboard installed."
echo "real codex: ${REAL_CODEX}"
echo "commands: codex, codex-swap, codex-switchboard-dashboard"
echo "If needed, restart the shell or run: source ~/.zshrc"
