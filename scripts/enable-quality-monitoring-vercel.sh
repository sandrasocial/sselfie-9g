#!/bin/bash
# Enable Quality Monitoring in Vercel
# This script adds ENABLE_QUALITY_MONITORING=true to all Vercel environments

echo "🚀 Enabling Quality Monitoring in Vercel..."
echo ""

# Check if logged in to Vercel
if ! vercel whoami &>/dev/null; then
  echo "❌ Not logged in to Vercel CLI"
  echo ""
  echo "Please run:"
  echo "  vercel login"
  echo ""
  echo "Then run this script again."
  exit 1
fi

echo "✅ Logged in to Vercel as: $(vercel whoami)"
echo ""

# Add to production
echo "Adding ENABLE_QUALITY_MONITORING to production..."
echo "true" | vercel env add ENABLE_QUALITY_MONITORING production

# Add to preview
echo ""
echo "Adding ENABLE_QUALITY_MONITORING to preview..."
echo "true" | vercel env add ENABLE_QUALITY_MONITORING preview

# Add to development
echo ""
echo "Adding ENABLE_QUALITY_MONITORING to development..."
echo "true" | vercel env add ENABLE_QUALITY_MONITORING development

echo ""
echo "✅ Quality monitoring enabled in all Vercel environments!"
echo ""
echo "Next steps:"
echo "1. ✅ Database migration complete"
echo "2. ✅ Environment variable set"
echo "3. ⏭️  Deploy: git push origin main"
echo ""
