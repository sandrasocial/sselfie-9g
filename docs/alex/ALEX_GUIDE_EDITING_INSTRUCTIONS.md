# How to Ask Alex to Edit Prompt Guides

## The Problem
Alex needs the **guide ID** to update a guide. He can't update by name alone - he must first find the guide ID, then use it to update.

## Step-by-Step Process

### Step 1: Ask Alex to Find the Guide
**Say:**
```
"Find my Christmas prompt guide and show me the details"
```

**What Alex Should Do:**
- Use `get_prompt_guides({ searchTerm: "Christmas", includePrompts: true })`
- This returns the guide with its ID

**What You'll See:**
Alex will show you:
- Guide ID (e.g., `id: 1`)
- Current upsell text
- Current upsell link
- Welcome message
- etc.

### Step 2: Ask Alex to Update It
**Say:**
```
"Update the Christmas guide (ID 1) with this new upsell text: '⚡ Generate These Photos Yourself – Join 2,700+ creators using SSELFIE Studio for unlimited Christmas content' and add UTM parameters to the link"
```

**OR be more specific:**
```
"Update guide ID 1: Change the upsell text to '⚡ Generate These Photos Yourself – Join 2,700+ creators using SSELFIE Studio for unlimited Christmas content' and set the upsell link to '/checkout/membership?utm_source=christmas_guide&utm_medium=prompt_guide&utm_campaign=christmas_2024&utm_content=sticky_cta'"
```

**What Alex Should Do:**
- Use `update_prompt_guide({ guideId: 1, pageUpdates: { upsellText: "...", upsellLink: "..." } })`

### Step 3: Verify Success

**What Alex Should Return:**
When successful, Alex will show you:
```json
{
  "success": true,
  "message": "Prompt guide updated successfully",
  "guide": {
    "id": 1,
    "title": "Seasonal Christmas Prompts",
    "page": {
      "upsellText": "⚡ Generate These Photos Yourself...",
      "upsellLink": "/checkout/membership?utm_source=christmas_guide...",
      "publicUrl": "https://sselfie.ai/prompt-guides/seasonal-christmas-prompts"
    }
  }
}
```

**How to Verify:**
1. **Check Alex's Response** - Look for `"success": true` and the updated values
2. **Check the Database** - Run the verification script:
   ```bash
   node check-christmas-guide.js
   ```
3. **Visit the Page** - Go to the public URL and see if the changes are live

## Common Issues

### Issue 1: Alex Says He Updated But Didn't
**Symptom:** Alex describes changes but doesn't show a success response with updated data

**Solution:** Ask Alex to "actually update the guide using the update_prompt_guide tool, not just describe what you would change"

### Issue 2: Alex Can't Find the Guide
**Symptom:** Alex says "I can't find the guide"

**Solution:** Ask Alex to "use get_prompt_guides to search for all guides and show me the list"

### Issue 3: Changes Not Showing
**Symptom:** Alex says success but the page doesn't show changes

**Possible Causes:**
- Guide status is 'draft' instead of 'published'
- Page status is 'draft' instead of 'published'
- Browser cache (hard refresh: Cmd+Shift+R)

**Solution:** Ask Alex to "make sure both the guide and page are set to 'published' status"

## Best Practice: Two-Step Process

**Always do this in two steps:**

1. **First:** "Find my Christmas guide and show me the current settings"
2. **Then:** "Now update guide ID [X] with these changes: [specific changes]"

This ensures Alex has the correct guide ID before attempting to update.

## Example Complete Conversation

**You:** "Find my Christmas prompt guide"

**Alex:** [Uses get_prompt_guides, shows guide ID 1 with current settings]

**You:** "Update guide ID 1: Change the upsell text to '⚡ Generate These Photos Yourself – Join 2,700+ creators using SSELFIE Studio for unlimited Christmas content' and update the upsell link to include UTM parameters: '/checkout/membership?utm_source=christmas_guide&utm_medium=prompt_guide&utm_campaign=christmas_2024&utm_content=sticky_cta'"

**Alex:** [Uses update_prompt_guide, shows success response with updated data]

**You:** "Verify the changes were saved"

**Alex:** [Uses get_prompt_guides again with guideId: 1, shows updated values]

## What Gets Saved

The `update_prompt_guide` tool:
1. ✅ Updates the database directly (no draft mode)
2. ✅ Returns the updated data immediately
3. ✅ Logs the update in server console: `[v0] ✅ Updated page for guide X`
4. ✅ Changes are live immediately (if status is 'published')

## How to Know It Worked

**Success Indicators:**
1. ✅ Alex shows `"success": true` in the response
2. ✅ Alex shows the updated `upsellText` and `upsellLink` values
3. ✅ Server logs show `[v0] ✅ Updated page for guide X`
4. ✅ Verification script shows the new values
5. ✅ Public page shows the new text/link

**Failure Indicators:**
1. ❌ Alex shows `"success": false` or an error message
2. ❌ Alex describes changes but doesn't show a tool result
3. ❌ Verification script shows old values
4. ❌ Server logs show an error

## Quick Verification Command

After Alex updates, run:
```bash
node check-christmas-guide.js
```

This will show you:
- Current upsell text
- Current upsell link
- Whether UTM parameters are present
- Whether the new messaging is there


