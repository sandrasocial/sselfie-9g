# Debug Logging Added - Template Injection System

## Summary

Added comprehensive debug logging throughout the template injection flow to trace and fix issues with placeholder replacement.

## Changes Made

### 1. Enhanced Logging in `generate-single/route.ts`

#### Placeholder Detection (Lines 302-330)
- Added detailed logging when checking if `post.prompt` contains placeholders
- Logs placeholder keys found, prompt length, user type, and layout type
- Helps identify when placeholders are detected vs missed

#### Template Selection (Lines 575-583)
- Added logging for template selection logic
- Shows whether using saved template with placeholders or fresh template from library
- Logs category, mood, and source used

#### Injection Process (Lines 617-650)
- Added comprehensive logging before, during, and after injection
- Logs vibe key, fashion style, template length
- Logs injection result with placeholder count after injection
- Validates no placeholders remain after injection
- Logs final prompt preview

#### Final Validation (Lines 1135-1155)
- Added final validation before sending prompt to Replicate
- Checks for any remaining placeholders
- Logs critical errors if placeholders found
- Logs prompt preview before generation

### 2. Enhanced Logging in `dynamic-template-injector.ts`

#### Injection Function (Lines 201-240)
- Added logging at start of injection
- Logs template preview, vibe, fashion style
- Logs placeholder count and keys after building
- Validates all placeholders were replaced
- Logs result length and remaining placeholders

## Debug Output Format

All debug logs follow this format:
```
[v0] [GENERATE-SINGLE] [DEBUG] <section>: { ... }
[Dynamic Injector] [DEBUG] <section>: { ... }
```

## What to Look For

### Successful Flow:
1. ✅ Placeholder detection: `placeholderKeysFound: X` (should be > 0 for templates with placeholders)
2. ✅ Template selection: Shows which template is being used
3. ✅ Injection start: Logs vibe key and fashion style
4. ✅ Placeholders built: Shows placeholder count
5. ✅ Injection complete: `remainingPlaceholders: 0`
6. ✅ Final validation: `No placeholders in prompt sent to Replicate`

### Error Indicators:
- ❌ `placeholderKeysFound: 0` when template should have placeholders
- ❌ `remainingPlaceholders: X` where X > 0 after injection
- ❌ `CRITICAL ERROR: About to send prompt with X unreplaced placeholders`

## Next Steps

1. **Test Preview Feed Generation:**
   - Create a preview feed as free user
   - Generate an image
   - Check console logs for debug output
   - Verify all placeholders are replaced

2. **Check Logs for:**
   - Placeholder detection working correctly
   - Vibe key construction correct
   - Fashion style mapping correct
   - All placeholders replaced
   - No placeholders in final prompt

3. **If Issues Found:**
   - Debug logs will show exactly where the issue occurs
   - Check vibe key format matches vibe library keys
   - Check fashion style mapping
   - Check placeholder replacement logic

## Files Modified

1. `app/api/feed/[feedId]/generate-single/route.ts`
   - Added debug logging at 5 key points
   - Added final validation before Replicate call

2. `lib/feed-planner/dynamic-template-injector.ts`
   - Added debug logging in injection function
   - Added validation for remaining placeholders

## Expected Behavior

When generating a preview feed:
1. System detects placeholders in saved template
2. System selects correct vibe library based on feed style
3. System builds placeholders from vibe library
4. System replaces all placeholders in template
5. System validates no placeholders remain
6. System sends clean prompt to Replicate

If any step fails, debug logs will show exactly where and why.
