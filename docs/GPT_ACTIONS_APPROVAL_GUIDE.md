# GPT Actions Approval Guide

## "The requested action requires approval" Message

This message means ChatGPT is working correctly and is asking you to **approve the action** before it executes.

---

## Why ChatGPT Requires Approval

ChatGPT Codex Connector has security features that require approval for:
- ✅ **First-time actions** (new actions you haven't approved yet)
- ✅ **Consequential actions** (actions that might modify data or access sensitive info)
- ✅ **High-risk actions** (reading files, accessing APIs, etc.)

This is a **security feature**, not an error!

---

## How to Approve Actions

### Method 1: Approve in ChatGPT UI

When you see the approval message:

1. **Look for an approval button or prompt** in the ChatGPT interface
2. **Click "Approve"** or "Allow" when prompted
3. **The action will then execute**

### Method 2: Configure Auto-Approval (Optional)

If you trust the actions and want to auto-approve:

1. **Go to ChatGPT Codex Connector Settings**
2. **Find "Action Settings" or "Security Settings"**
3. **Enable "Auto-approve actions"** (if available)
4. **Or whitelist specific operations**

**⚠️ Warning:** Only enable auto-approval if you trust the API and understand the security implications.

---

## Verify It's Working

After approval, you should see:

```
✅ Action approved
📄 Reading file: README.md
📋 Content: [file contents here]
```

If you get an error after approval, check:

1. **API Key is correct** in ChatGPT settings
2. **API endpoint is accessible** (`https://sselfie.ai/api/gpt-actions`)
3. **File path exists** and isn't denied

---

## Test the Endpoint Directly

To verify the API is working (bypassing ChatGPT approval):

```bash
curl -X POST https://sselfie.ai/api/gpt-actions/read_file \
  -H "x-gpt-actions-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filePath": "README.md"}'
```

**Expected response:**
```json
{
  "success": true,
  "filePath": "README.md",
  "content": "# SSELFIE...",
  "size": 1234
}
```

If this works, the API is fine - ChatGPT just needs approval.

---

## Troubleshooting

### "The requested action requires approval" keeps appearing

**Solution:** Approve the action in ChatGPT UI, or enable auto-approval for trusted actions.

---

### Action approved but still failing

**Check these:**

1. **API Key mismatch:**
   ```bash
   # Verify your API key matches
   echo $GPT_ACTIONS_API_KEY  # Should match the header value in ChatGPT
   ```

2. **Endpoint accessibility:**
   ```bash
   # Test the endpoint
   curl https://sselfie.ai/api/gpt-actions
   # Should return: {"status": "healthy", ...}
   ```

3. **File path is denied:**
   - Can't read `.env*` files
   - Can't read `node_modules`
   - Can't read `.git` files
   - Can't read `.next` files

---

## Summary

✅ **"Requires approval" = Normal behavior**  
✅ **Approve the action in ChatGPT UI**  
✅ **Action will execute after approval**  
✅ **This is a security feature, not an error**

---

**Next Steps:**
1. Look for approval prompt in ChatGPT
2. Click "Approve" or "Allow"
3. Action should execute successfully
4. (Optional) Enable auto-approval for trusted actions

