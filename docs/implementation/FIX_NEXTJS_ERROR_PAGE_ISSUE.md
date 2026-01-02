# Fix: Next.js 404 Error Page Appearing in Chat

## Problem
Chat responses were showing Next.js 404 error page HTML instead of email content.

## Root Cause
Claude was somehow including Next.js error page HTML in its responses, likely due to:
1. Confusion about what HTML to return
2. Possibly trying to fetch a URL that returns 404
3. Context pollution from error pages

## Solution Applied

### 1. Added Validation in `compose_email` Tool
- Detects Next.js error page markers in generated HTML
- Rejects invalid HTML and throws error to retry
- Prevents saving error pages as email content

### 2. Added Filtering in `onFinish` Callback
- Detects Next.js error pages in message text
- Filters out error page HTML before saving
- Extracts valid text content or uses fallback message

### 3. Enhanced System Prompt
- Explicitly instructs Claude NOT to include Next.js error pages
- Tells Claude NOT to fetch URLs
- Emphasizes generating email HTML directly

## Validation Markers Detected
- `<title>404: This page could not be found.</title>`
- `next-error-h1`
- `/_next/static/chunks`
- `self.__next_f`
- `turbopack`

## Files Changed
- `app/api/admin/agent/chat/route.ts`
  - Added validation in `compose_email` tool (lines ~410-430)
  - Added filtering in `onFinish` callback (lines ~1390-1430)
  - Enhanced system prompt (line ~390)

## Testing
1. Try creating an email - should no longer see 404 pages
2. If error page detected, should see fallback message instead
3. Tool should retry if invalid HTML detected

## Next Steps
If issue persists:
1. Check server logs for tool execution errors
2. Verify Claude isn't trying to access URLs
3. Check if there's context pollution in system prompt

