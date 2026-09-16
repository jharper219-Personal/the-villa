#!/usr/bin/env bash
# Usage:  bash publish.sh YOUR-GITHUB-USERNAME [repo-name]
# Connects this folder to a GitHub repo you already created, then pushes.
set -e
USER="${1:?Usage: bash publish.sh YOUR-GITHUB-USERNAME [repo-name]}"
REPO="${2:-the-villa}"
cd "$(dirname "$0")"
if git remote | grep -q '^origin$'; then
  git remote set-url origin "https://github.com/$USER/$REPO.git"
else
  git remote add origin "https://github.com/$USER/$REPO.git"
fi
git add -A
git diff --cached --quiet || git commit -m "Update The Villa"
echo "Pushing... a browser window may open to sign in to GitHub."
git push -u origin main
echo
echo "Done. Now import the repo at https://vercel.com/new"
