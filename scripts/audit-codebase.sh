#!/bin/bash

# SSELFIE Codebase Audit Script
# Produces a clear map of what's alive, dead, and half-finished
# Run from project root: bash scripts/audit-codebase.sh

PROJECT="/Users/MD760HA/sselfie-9g"
OUTPUT="$PROJECT/CODEBASE_AUDIT_$(date +%Y-%m-%d).md"

echo "# 🔍 SSELFIE CODEBASE AUDIT" > $OUTPUT
echo "**Generated:** $(date)" >> $OUTPUT
echo "**Purpose:** Map what's live, dead, and half-finished" >> $OUTPUT
echo "" >> $OUTPUT

# ============================================================
# SECTION 1: HIGH LEVEL COUNTS
# ============================================================
echo "## 📊 High Level Counts" >> $OUTPUT
echo "" >> $OUTPUT

TS_FILES=$(find $PROJECT/app -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | wc -l | tr -d ' ')
API_ROUTES=$(find $PROJECT/app/api -type d | grep -v node_modules | wc -l | tr -d ' ')
CRON_JOBS=$(find $PROJECT/app/api/cron -type d | grep -v "^$PROJECT/app/api/cron$" | wc -l | tr -d ' ')
ADMIN_PAGES=$(find $PROJECT/app/admin -maxdepth 1 -type d | grep -v "^$PROJECT/app/admin$" | wc -l | tr -d ' ')
COMPONENTS=$(find $PROJECT/components -name "*.tsx" | grep -v node_modules | wc -l | tr -d ' ')
LIB_FILES=$(find $PROJECT/lib -name "*.ts" | grep -v node_modules | wc -l | tr -d ' ')
TOTAL_LINES=$(find $PROJECT/app $PROJECT/lib $PROJECT/components -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')

echo "| Metric | Count |" >> $OUTPUT
echo "|--------|-------|" >> $OUTPUT
echo "| TypeScript files | $TS_FILES |" >> $OUTPUT
echo "| API route directories | $API_ROUTES |" >> $OUTPUT
echo "| Cron jobs | $CRON_JOBS |" >> $OUTPUT
echo "| Admin pages | $ADMIN_PAGES |" >> $OUTPUT
echo "| Components | $COMPONENTS |" >> $OUTPUT
echo "| Lib files | $LIB_FILES |" >> $OUTPUT
echo "| Total lines of code | $TOTAL_LINES |" >> $OUTPUT
echo "" >> $OUTPUT

# ============================================================
# SECTION 2: ADMIN PAGES — size and content check
# ============================================================
echo "## 🖥️ Admin Pages (with line counts)" >> $OUTPUT
echo "" >> $OUTPUT
echo "| Page | Lines | Has Content? |" >> $OUTPUT
echo "|------|-------|-------------|" >> $OUTPUT

for dir in $PROJECT/app/admin/*/; do
  page=$(basename "$dir")
  page_file="$dir/page.tsx"
  if [ -f "$page_file" ]; then
    lines=$(wc -l < "$page_file" | tr -d ' ')
    if [ "$lines" -lt 30 ]; then
      status="⚠️ Likely placeholder"
    elif [ "$lines" -lt 100 ]; then
      status="🟡 Minimal"
    else
      status="✅ Has content"
    fi
    echo "| /admin/$page | $lines | $status |" >> $OUTPUT
  else
    echo "| /admin/$page | NO page.tsx | ❌ Missing entry point |" >> $OUTPUT
  fi
done
echo "" >> $OUTPUT

# ============================================================
# SECTION 3: CRON JOBS — what's in vercel.json vs what exists
# ============================================================
echo "## ⏰ Cron Jobs" >> $OUTPUT
echo "" >> $OUTPUT

echo "### All cron directories in /app/api/cron:" >> $OUTPUT
echo "" >> $OUTPUT
for dir in $PROJECT/app/api/cron/*/; do
  cron=$(basename "$dir")
  route_file="$dir/route.ts"
  if [ -f "$route_file" ]; then
    lines=$(wc -l < "$route_file" | tr -d ' ')
    echo "- \`$cron\` — $lines lines" >> $OUTPUT
  else
    echo "- \`$cron\` — ❌ NO route.ts" >> $OUTPUT
  fi
done
echo "" >> $OUTPUT

echo "### Crons registered in vercel.json:" >> $OUTPUT
echo "" >> $OUTPUT
if [ -f "$PROJECT/vercel.json" ]; then
  grep -o '"path".*"' $PROJECT/vercel.json | grep cron | sed 's/"path": "/- `/g' | sed 's/",/`/g' >> $OUTPUT
else
  echo "⚠️ No vercel.json found" >> $OUTPUT
fi
echo "" >> $OUTPUT

# ============================================================
# SECTION 4: API ROUTES — find dead ones (not imported anywhere)
# ============================================================
echo "## 🔌 API Routes — Potentially Unused" >> $OUTPUT
echo "" >> $OUTPUT
echo "Routes with no fetch() calls pointing to them in the codebase:" >> $OUTPUT
echo "" >> $OUTPUT

UNUSED_COUNT=0
for dir in $(find $PROJECT/app/api -type d | grep -v node_modules | grep -v .next | grep -v ".removed"); do
  route_path=$(echo "$dir" | sed "s|$PROJECT/app||")
  # Check if this route path is referenced anywhere in app/components/lib
  refs=$(grep -r "\"$route_path" $PROJECT/app $PROJECT/components $PROJECT/lib --include="*.ts" --include="*.tsx" -l 2>/dev/null | grep -v node_modules | grep -v .next | grep -v "route.ts" | wc -l | tr -d ' ')
  if [ "$refs" -eq 0 ] && [ "$route_path" != "/api" ]; then
    echo "- \`$route_path\`" >> $OUTPUT
    UNUSED_COUNT=$((UNUSED_COUNT + 1))
  fi
done
echo "" >> $OUTPUT
echo "**Total potentially unused API routes: $UNUSED_COUNT**" >> $OUTPUT
echo "" >> $OUTPUT

# ============================================================
# SECTION 5: LIB FILES — size map
# ============================================================
echo "## 📚 Lib Files (size)" >> $OUTPUT
echo "" >> $OUTPUT
echo "| File | Lines |" >> $OUTPUT
echo "|------|-------|" >> $OUTPUT
for f in $PROJECT/lib/*.ts; do
  fname=$(basename "$f")
  lines=$(wc -l < "$f" | tr -d ' ')
  echo "| $fname | $lines |" >> $OUTPUT
done
echo "" >> $OUTPUT

# ============================================================
# SECTION 6: COMPONENTS — large ones to review
# ============================================================
echo "## 🧩 Large Components (100+ lines)" >> $OUTPUT
echo "" >> $OUTPUT
echo "| Component | Lines |" >> $OUTPUT
echo "|-----------|-------|" >> $OUTPUT
find $PROJECT/components -name "*.tsx" | grep -v node_modules | while read f; do
  lines=$(wc -l < "$f" | tr -d ' ')
  if [ "$lines" -gt 100 ]; then
    fname=$(echo "$f" | sed "s|$PROJECT/components/||")
    echo "| $fname | $lines |" >> $OUTPUT
  fi
done
echo "" >> $OUTPUT

# ============================================================
# SECTION 7: DUPLICATE/SIMILAR FILE NAMES
# ============================================================
echo "## 🔁 Potential Duplicates (similar names)" >> $OUTPUT
echo "" >> $OUTPUT
find $PROJECT/app $PROJECT/lib $PROJECT/components -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | xargs -I{} basename {} | sort | uniq -d | while read fname; do
  echo "- \`$fname\` appears multiple times" >> $OUTPUT
done
echo "" >> $OUTPUT

# ============================================================
# SECTION 8: MARKDOWN DOC BLOAT
# ============================================================
echo "## 📄 Markdown Files in Root (doc bloat)" >> $OUTPUT
echo "" >> $OUTPUT
MD_COUNT=$(find $PROJECT -maxdepth 1 -name "*.md" | wc -l | tr -d ' ')
echo "**$MD_COUNT markdown files in root directory**" >> $OUTPUT
echo "" >> $OUTPUT
find $PROJECT -maxdepth 1 -name "*.md" | while read f; do
  echo "- $(basename $f)" >> $OUTPUT
done
echo "" >> $OUTPUT

# ============================================================
# DONE
# ============================================================
echo "---" >> $OUTPUT
echo "## ✅ Audit Complete" >> $OUTPUT
echo "Next step: Review this with Claude to create DECISIONS.md" >> $OUTPUT

echo "✅ Audit complete. Output: $OUTPUT"
