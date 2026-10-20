#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

if [ ! -d node_modules ]; then
  echo "First-time setup: installing required files..."
  npm install
fi

echo ""
echo "Starting Digital Polthel Pahana..."
echo "Keep this window open during the event."
echo "Press Ctrl+C here when the event is finished."
echo ""
npm start
