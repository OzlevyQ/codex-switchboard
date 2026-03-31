#!/usr/bin/env bash
set -euo pipefail

REPO_OWNER="${CODEX_SWITCHBOARD_REPO_OWNER:-OzlevyQ}"
REPO_NAME="${CODEX_SWITCHBOARD_REPO_NAME:-codex-switchboard}"
REPO_REF="${CODEX_SWITCHBOARD_REPO_REF:-main}"
TMP_DIR="$(mktemp -d /tmp/codex-switchboard-bootstrap.XXXXXX)"
ARCHIVE_URL="https://codeload.github.com/${REPO_OWNER}/${REPO_NAME}/tar.gz/refs/heads/${REPO_REF}"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  echo "tar is required." >&2
  exit 1
fi

echo "Downloading Codex Switchboard from ${REPO_OWNER}/${REPO_NAME}@${REPO_REF}..."
curl -fsSL "${ARCHIVE_URL}" -o "${TMP_DIR}/codex-switchboard.tar.gz"
tar -xzf "${TMP_DIR}/codex-switchboard.tar.gz" -C "${TMP_DIR}"

INSTALL_SCRIPT="$(find "${TMP_DIR}" -type f -path '*/scripts/install.sh' | head -n 1)"
if [[ -z "${INSTALL_SCRIPT}" ]]; then
  echo "Failed to locate scripts/install.sh inside the downloaded archive." >&2
  exit 1
fi

bash "${INSTALL_SCRIPT}"
