#!/bin/bash
# Script to add AUTO_CONFIRM_SECRET environment variables to .env.local

set -e

ENV_FILE=".env.local"

# Generate a secure random secret (32 characters)
generate_secret() {
  openssl rand -hex 16
}

echo "🔐 Adding AUTO_CONFIRM_SECRET environment variables..."
echo ""

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  .env.local not found. Creating it..."
  touch "$ENV_FILE"
fi

# Check if AUTO_CONFIRM_SECRET already exists
if grep -q "^AUTO_CONFIRM_SECRET=" "$ENV_FILE"; then
  echo "⚠️  AUTO_CONFIRM_SECRET already exists in .env.local"
  echo "   Skipping to avoid overwriting existing value."
else
  SECRET=$(generate_secret)
  echo "AUTO_CONFIRM_SECRET=$SECRET" >> "$ENV_FILE"
  echo "✅ Added AUTO_CONFIRM_SECRET to .env.local"
fi

# Check if NEXT_PUBLIC_AUTO_CONFIRM_SECRET already exists
if grep -q "^NEXT_PUBLIC_AUTO_CONFIRM_SECRET=" "$ENV_FILE"; then
  echo "⚠️  NEXT_PUBLIC_AUTO_CONFIRM_SECRET already exists in .env.local"
  echo "   Skipping to avoid overwriting existing value."
else
  # Use the same secret value (read from AUTO_CONFIRM_SECRET if it exists, otherwise generate new)
  if grep -q "^AUTO_CONFIRM_SECRET=" "$ENV_FILE"; then
    EXISTING_SECRET=$(grep "^AUTO_CONFIRM_SECRET=" "$ENV_FILE" | cut -d '=' -f2)
    echo "NEXT_PUBLIC_AUTO_CONFIRM_SECRET=$EXISTING_SECRET" >> "$ENV_FILE"
    echo "✅ Added NEXT_PUBLIC_AUTO_CONFIRM_SECRET to .env.local (using same value as AUTO_CONFIRM_SECRET)"
  else
    SECRET=$(generate_secret)
    echo "NEXT_PUBLIC_AUTO_CONFIRM_SECRET=$SECRET" >> "$ENV_FILE"
    echo "✅ Added NEXT_PUBLIC_AUTO_CONFIRM_SECRET to .env.local"
  fi
fi

echo ""
echo "✅ Environment variables added successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify the values in .env.local"
echo "   2. Add the same values to Vercel environment variables:"
echo "      - AUTO_CONFIRM_SECRET (same value)"
echo "      - NEXT_PUBLIC_AUTO_CONFIRM_SECRET (same value)"
echo "   3. Restart your dev server if it's running"
echo ""
