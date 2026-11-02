#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/share/pnpm:$HOME/Library/pnpm:$HOME/.cargo/bin:$PATH"
trap 'echo; echo "Development server stopped with an error."; read -r -p "Press Return to close..."' ERR
command -v pnpm >/dev/null || { echo 'pnpm is required. Install the prerequisites listed in README.md.'; exit 1; }
pnpm install --frozen-lockfile
pnpm tauri dev
