# Vercel Gateway Tool Serialization Issue

## Problem

The admin agent email tools are not working due to a serialization error when the Vercel AI Gateway routes through AWS Bedrock.

**Error:**
```
The value at toolConfig.tools.0.toolSpec.inputSchema.json.type must be one of the following: object.
```

**Root Cause:**
- Vercel AI SDK automatically routes through the Vercel Gateway when tools are present
- The Gateway then routes to AWS Bedrock for Claude models
- AWS Bedrock has stricter tool schema requirements than the direct Anthropic API
- The AI SDK's Zod-to-JSON-Schema conversion doesn't properly serialize for Bedrock's requirements

## Current Status

**Tools are temporarily disabled** in `app/api/admin/agent/chat/route.ts` to allow basic chat functionality.

All 5 email tools are properly defined and ready:
- `compose_email` ✅
- `schedule_campaign` ✅
- `check_campaign_status` ✅
- `get_resend_audience_data` ✅
- `analyze_email_strategy` ✅

## Solutions to Try

### Option 1: Use Anthropic SDK Directly (Recommended)

Install and use `@anthropic-ai/sdk` directly to bypass the Vercel Gateway:

```bash
npm install @anthropic-ai/sdk
```

Then refactor the route to use the Anthropic SDK's streaming API directly instead of the AI SDK.

### Option 2: Fix Tool Schema Serialization

Manually ensure tool schemas are serialized correctly for Bedrock:
- Ensure all tool parameters use `z.object({...})` (already done)
- Verify no `.default()` on enum/boolean fields (already fixed)
- May need to manually construct JSON Schema that Bedrock accepts

### Option 3: Wait for Vercel Fix

Monitor Vercel AI SDK updates for gateway/Bedrock compatibility improvements.

## Testing

To test if tools work:
1. Uncomment `tools,` in `app/api/admin/agent/chat/route.ts` (line ~1066)
2. Send a message like "Create a welcome email"
3. Check terminal for the serialization error

## Related Files

- `app/api/admin/agent/chat/route.ts` - Main route with tools (currently disabled)
- `components/admin/admin-agent-chat-new.tsx` - UI components ready for tool results
- `components/admin/email-quick-actions.tsx` - Quick action buttons
- `components/admin/email-preview-card.tsx` - Email preview UI
- `components/admin/segment-selector.tsx` - Segment selection UI
- `components/admin/campaign-status-cards.tsx` - Campaign status UI

