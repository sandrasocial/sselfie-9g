#!/bin/bash

# SCRIPT 2: Daily Critical-Path Health Check
# Test these 4 endpoints (expect 200/redirect):
#   * https://sselfie.ai/checkout/membership
#   * https://sselfie.ai/checkout/blueprint
#   * https://sselfie.ai/api/auth (auth status)
#   * https://sselfie.ai/api/maya-generate (simple generation test)
# Output: ~/stella/reports/codebase-health/critical-path-YYYY-MM-DD.txt (PASS/FAIL per endpoint)
# Schedule: Daily 08:00 CET

set -e

REPORT_DIR="$HOME/stella/reports/codebase-health"
TODAY=$(date +%Y-%m-%d)
REPORT_PATH="$REPORT_DIR/critical-path-$TODAY.txt"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Ensure report directory exists
mkdir -p "$REPORT_DIR"

# Test endpoints
declare -a ENDPOINTS=(
  "https://sselfie.ai/checkout/membership"
  "https://sselfie.ai/checkout/blueprint"
  "https://sselfie.ai/api/auth"
  "https://sselfie.ai/api/maya-generate"
)

# Initialize report
{
  echo "# Critical Path Health Check"
  echo "Generated: $TIMESTAMP"
  echo ""
  echo "## Results"
  echo ""
} > "$REPORT_PATH"

PASS_COUNT=0
FAIL_COUNT=0

for endpoint in "${ENDPOINTS[@]}"; do
  echo "[CRITICAL-PATH] Testing $endpoint..."
  
  # Make request with timeout, follow redirects, get status code
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 --location "$endpoint" 2>&1 || echo "000")
  
  if [[ "$HTTP_CODE" =~ ^(200|301|302|303|304|307|308)$ ]]; then
    STATUS="✅ PASS"
    ((PASS_COUNT++))
  else
    STATUS="❌ FAIL"
    ((FAIL_COUNT++))
  fi
  
  echo "- $endpoint: $STATUS (HTTP $HTTP_CODE)" >> "$REPORT_PATH"
done

# Summary
echo "" >> "$REPORT_PATH"
echo "## Summary" >> "$REPORT_PATH"
echo "- Total Tests: ${#ENDPOINTS[@]}" >> "$REPORT_PATH"
echo "- Passed: $PASS_COUNT" >> "$REPORT_PATH"
echo "- Failed: $FAIL_COUNT" >> "$REPORT_PATH"
echo "" >> "$REPORT_PATH"

if [ $FAIL_COUNT -eq 0 ]; then
  echo "Status: ✅ ALL PASS" >> "$REPORT_PATH"
  FINAL_STATUS="PASS"
else
  echo "Status: ❌ FAILURES DETECTED" >> "$REPORT_PATH"
  FINAL_STATUS="FAIL"
fi

echo "[CRITICAL-PATH] Report written to $REPORT_PATH"
echo "[CRITICAL-PATH] Result: $FINAL_STATUS ($PASS_COUNT/$((PASS_COUNT + FAIL_COUNT)) passed)"

# Exit with appropriate code
if [ "$FINAL_STATUS" = "PASS" ]; then
  exit 0
else
  exit 1
fi
