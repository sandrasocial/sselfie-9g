#!/bin/bash

# Run all three monitoring scripts and output results

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/Users/MD760HA/ACTIVE/sselfie-9g"
REPORT_DIR="$HOME/stella/reports/codebase-health"
TIMESTAMP=$(date '+%Y-%m-%d')

echo "🚀 Running all codebase health checks..."
echo ""

# Ensure report directory exists
mkdir -p "$REPORT_DIR"

# Script 1: Dead Routes Audit (Weekly)
echo "1️⃣  Running Dead-Routes Audit..."
node "$SCRIPT_DIR/1-dead-routes-audit.mjs" || true
echo ""

# Script 2: Critical-Path Check (Daily)
echo "2️⃣  Running Critical-Path Check..."
BASE_URL="${VERCEL_URL:-https://www.sselfie.ai}"
node "$SCRIPT_DIR/2-critical-path-check.mjs" "$BASE_URL" || true
echo ""

# Script 3: Cron Status Report (Weekly)
echo "3️⃣  Running Cron Status Report..."
node "$SCRIPT_DIR/3-cron-status-report.mjs" || true
echo ""

echo "✅ All health checks complete!"
echo ""
echo "📂 Reports saved to: $REPORT_DIR/"
echo ""
ls -lh "$REPORT_DIR"/*-$TIMESTAMP* 2>/dev/null || echo "No reports found for today"
