#!/bin/bash
# Script to set STRIPE_PAID_BLUEPRINT_PRICE_ID in Vercel
# 
# Usage:
#   bash scripts/set-vercel-env-paid-blueprint.sh
# 
# Or if you have VERCEL_TOKEN set:
#   VERCEL_TOKEN=your_token bash scripts/set-vercel-env-paid-blueprint.sh

PRICE_ID="price_1SnlJEEVJvME7vkw1thdr7WK"

echo "🔧 Setting STRIPE_PAID_BLUEPRINT_PRICE_ID in Vercel..."
echo ""

# Check if VERCEL_TOKEN is set
if [ -n "$VERCEL_TOKEN" ]; then
  echo "Using VERCEL_TOKEN from environment"
  echo "$PRICE_ID" | vercel env add STRIPE_PAID_BLUEPRINT_PRICE_ID production --token "$VERCEL_TOKEN"
  echo "$PRICE_ID" | vercel env add STRIPE_PAID_BLUEPRINT_PRICE_ID preview --token "$VERCEL_TOKEN"
  echo "$PRICE_ID" | vercel env add STRIPE_PAID_BLUEPRINT_PRICE_ID development --token "$VERCEL_TOKEN"
else
  echo "⚠️  VERCEL_TOKEN not set. Running interactively..."
  echo "You'll need to authenticate with Vercel CLI first:"
  echo "  1. Run: vercel login"
  echo "  2. Then run this script again"
  echo ""
  echo "Or set VERCEL_TOKEN and run:"
  echo "  VERCEL_TOKEN=your_token bash scripts/set-vercel-env-paid-blueprint.sh"
  echo ""
  echo "Setting for production (you'll be prompted):"
  echo "$PRICE_ID" | vercel env add STRIPE_PAID_BLUEPRINT_PRICE_ID production
  echo ""
  echo "Setting for preview:"
  echo "$PRICE_ID" | vercel env add STRIPE_PAID_BLUEPRINT_PRICE_ID preview
  echo ""
  echo "Setting for development:"
  echo "$PRICE_ID" | vercel env add STRIPE_PAID_BLUEPRINT_PRICE_ID development
fi

echo ""
echo "✅ Done! Verify with: vercel env ls"
