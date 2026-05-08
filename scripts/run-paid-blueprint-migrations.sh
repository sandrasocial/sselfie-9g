#!/bin/bash
# Run Paid Blueprint Migrations
# This script runs all 3 blueprint migrations in order

set -e

echo "🚀 Running Paid Blueprint Migrations"
echo "===================================="
echo ""

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set in .env.local"
  exit 1
fi

echo "📝 Migration 1: Create blueprint_subscribers table"
psql "$DATABASE_URL" -f scripts/create-blueprint-subscribers-table.sql
echo "✅ Migration 1 complete"
echo ""

echo "📝 Migration 2: Add generation tracking columns"
psql "$DATABASE_URL" -f scripts/migrations/add-blueprint-generation-tracking.sql
echo "✅ Migration 2 complete"
echo ""

echo "📝 Migration 3: Add paid blueprint tracking columns"
psql "$DATABASE_URL" -f scripts/migrations/add-paid-blueprint-tracking.sql
echo "✅ Migration 3 complete"
echo ""

echo "✨ All migrations complete!"
echo ""
echo "Next steps:"
echo "1. Start dev server: pnpm dev"
echo "2. Run tests: pnpm exec tsx scripts/test-paid-blueprint-pr4-simple.ts"
