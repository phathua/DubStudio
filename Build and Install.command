#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/share/pnpm:$HOME/Library/pnpm:$HOME/.cargo/bin:$PATH"
trap 'echo; echo "Build or installation failed. See the message above."; read -r -p "Press Return to close..."' ERR
command -v pnpm >/dev/null || { echo 'pnpm is required. Install the prerequisites listed in README.md.'; exit 1; }
pnpm install --frozen-lockfile
pnpm tauri build --bundles app
source_app="$PWD/src-tauri/target/release/bundle/macos/DubStudio.app"
target_dir="/Applications"
target_app="$target_dir/DubStudio.app"
staged_app="$target_dir/.DubStudio-install-$$.app"
backup_app="$target_dir/.DubStudio-backup-$$.app"
if [ ! -w "$target_dir" ]; then
  echo "Cannot write to /Applications. Grant your account permission and try again."
  exit 1
fi
[ -d "$source_app" ] || { echo "Built application not found: $source_app"; exit 1; }
ditto "$source_app" "$staged_app"
if [ -e "$target_app" ]; then mv "$target_app" "$backup_app"; fi
if ! mv "$staged_app" "$target_app"; then
  [ ! -e "$backup_app" ] || mv "$backup_app" "$target_app"
  echo 'Installation failed; the previous app was restored.'
  exit 1
fi
[ ! -e "$backup_app" ] || rm -rf "$backup_app"
echo "Installed: $target_app"
read -r -p 'Press Return to close...'
