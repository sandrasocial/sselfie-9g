# GPT Actions API - Schema Fix Guide

## Issues Found in Your Schema

Your original schema had these issues that prevented authentication/connection:

### ❌ Issue 1: Wrong Property Names

**Your Schema Used:**
```yaml
properties:
  path:  # ❌ Wrong!
    type: string
```

**API Actually Expects:**
- `read_file`: `filePath` (not `path`)
- `list_files`: `directoryPath` (not `path`)  
- `file_stat`: `filePath` (not `path`)

### ❌ Issue 2: Missing Response Fields

Your schema was missing the actual response structure. The API returns:
- `success: true`
- `filePath` (relative path)
- `content` (for read_file)
- `size` (for read_file)
- `files` array (for list_files)
- `count` (for list_files)
- etc.

### ❌ Issue 3: Missing Error Responses

No error response schemas defined.

---

## ✅ Corrected Schema

I've created a complete, corrected schema at:

**`docs/gpt-actions-openapi.yaml`**

### Key Changes:

1. **Correct Property Names:**
   ```yaml
   # read_file request
   filePath:  # ✅ Correct!
   
   # list_files request  
   directoryPath:  # ✅ Correct!
   
   # file_stat request
   filePath:  # ✅ Correct!
   ```

2. **Complete Response Schemas:**
   ```yaml
   # read_file response
   success: true
   filePath: "app/components/my-component.tsx"
   content: "# file contents here..."
   size: 1234
   
   # list_files response
   success: true
   directoryPath: "app/components"
   files: [{name, type, path}]
   count: 15
   
   # file_stat response
   success: true
   filePath: "package.json"
   isFile: true
   isDirectory: false
   size: 1234
   modifiedAt: "2026-01-07T12:00:00.000Z"
   createdAt: "2026-01-07T12:00:00.000Z"
   readable: true
   ```

3. **Error Responses:**
   - 400: Bad request
   - 401: Unauthorized (missing/invalid API key)
   - 403: Forbidden (access denied)
   - 404: Not found
   - 413: File too large
   - 500: Server error

4. **Complete Security Setup:**
   ```yaml
   security:
     - GPTActionsKey: []
   
   components:
     securitySchemes:
       GPTActionsKey:
         type: apiKey
         in: header
         name: x-gpt-actions-key
   ```

---

## How to Use the Corrected Schema

### Step 1: Copy the Schema

Use the schema from `docs/gpt-actions-openapi.yaml` in your ChatGPT Codex Connector.

### Step 2: Configure Authentication

In ChatGPT Codex Connector settings:

1. **Add Header:**
   - Header name: `x-gpt-actions-key`
   - Header value: Your `GPT_ACTIONS_API_KEY` (from `.env.local` or Vercel)

2. **Verify Environment Variable:**
   - Make sure `GPT_ACTIONS_API_KEY` is set in your environment
   - Local: `.env.local` file
   - Production: Vercel environment variables

### Step 3: Test Connection

Test each endpoint:

**Read File:**
```json
POST /read_file
{
  "filePath": "package.json"
}
```

**List Files:**
```json
POST /list_files
{
  "directoryPath": "app"
}
```

**File Stat:**
```json
POST /file_stat
{
  "filePath": "package.json"
}
```

---

## Quick Reference: Property Names

| Tool | Request Property | Response Properties |
|------|-----------------|---------------------|
| `read_file` | `filePath` | `success`, `filePath`, `content`, `size` |
| `list_files` | `directoryPath` (optional) | `success`, `directoryPath`, `files[]`, `count` |
| `file_stat` | `filePath` | `success`, `filePath`, `isFile`, `isDirectory`, `size`, `modifiedAt`, `createdAt`, `readable` |

---

## Common Authentication Issues

### "Unauthorized: Invalid or missing x-gpt-actions-key header"

**Causes:**
1. Header name is wrong (must be exactly `x-gpt-actions-key`)
2. Header value doesn't match `GPT_ACTIONS_API_KEY` environment variable
3. Environment variable not set

**Fix:**
1. Check header name in ChatGPT connector (lowercase with hyphens)
2. Verify header value matches your `.env.local` file
3. Restart dev server after adding to `.env.local`
4. For production: Add to Vercel and redeploy

### "GPT_ACTIONS_API_KEY not configured in environment"

**Cause:** Environment variable not set

**Fix:**
1. Generate a key: `openssl rand -hex 32`
2. Add to `.env.local`: `GPT_ACTIONS_API_KEY=your-key-here`
3. Add to Vercel for production
4. Restart dev server / redeploy

---

## Summary

**Main Fix:** Changed `path` to `filePath`/`directoryPath` in all request schemas.

**Full Schema:** Use `docs/gpt-actions-openapi.yaml` - it's complete and matches your API exactly.

**Authentication:** Make sure `x-gpt-actions-key` header matches `GPT_ACTIONS_API_KEY` environment variable.

---

**Next Steps:**
1. Copy schema from `docs/gpt-actions-openapi.yaml`
2. Update ChatGPT Codex Connector with corrected schema
3. Set header: `x-gpt-actions-key: YOUR_GPT_ACTIONS_API_KEY`
4. Test with simple request like `read_file` on `package.json`

