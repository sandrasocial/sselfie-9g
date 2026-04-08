# Feature Flag Diagnostic Guide

## Issue
The `USE_DIRECT_PROMPT_GENERATION` feature flag is not activating, even though it's set to `true` in `.env.local`.

## Changes Made

### 1. Added Helper Function
Created `isDirectPromptGenerationEnabled()` that:
- Checks env var at runtime (not just module load)
- Handles multiple string formats ('true', '1', 'True', 'TRUE')
- Logs diagnostic information when disabled

### 2. Enhanced Logging
Added comprehensive logging at:
- **Module load time** - Shows env var value when file is first imported
- **Runtime** - Shows env var value when API route is called
- **Helper function** - Logs when flag is disabled

### 3. Runtime Check
The feature flag is now checked:
1. At module load (when server starts)
2. At runtime (when API route is called)

This ensures we catch env vars even if Next.js cached them.

## How to Diagnose

### Step 1: Check Server Startup Logs
Look for:
```
[v0] [FEATURE-FLAG] [MODULE-LOAD] Environment check: { ... }
```

This shows if the env var is loaded when the server starts.

### Step 2: Check API Call Logs
When generating concepts, look for:
```
🔵🔵🔵 DIRECT PROMPT GENERATION CHECK 🔵🔵🔵
[v0] [DIRECT] [RUNTIME-CHECK] Environment variable check: { ... }
```

This shows if the env var is available at runtime.

### Step 3: Verify .env.local
```bash
grep USE_DIRECT_PROMPT_GENERATION .env.local
```
Should show: `USE_DIRECT_PROMPT_GENERATION=true`

### Step 4: Restart Server Completely
Next.js caches environment variables. You need to:
1. Stop the server completely (Ctrl+C)
2. Wait a few seconds
3. Start it again (`npm run dev`)

**DO NOT** just reload - you need a full restart.

## Common Issues

### Issue 1: Env Var Not Loaded
**Symptoms:**
- Logs show `envVar: undefined`
- `enabled: false`

**Solution:**
- Check `.env.local` file exists
- Verify variable name is exactly `USE_DIRECT_PROMPT_GENERATION`
- Restart server completely

### Issue 2: Env Var Loaded But Flag Still False
**Symptoms:**
- Logs show `envVar: "true"` but `enabled: false`

**Solution:**
- Check for extra spaces or quotes
- Should be: `USE_DIRECT_PROMPT_GENERATION=true`
- NOT: `USE_DIRECT_PROMPT_GENERATION="true"` or `USE_DIRECT_PROMPT_GENERATION = true`

### Issue 3: Next.js Caching
**Symptoms:**
- Changed `.env.local` but server still shows old value

**Solution:**
- Stop server completely
- Delete `.next` folder: `rm -rf .next`
- Restart server

## Expected Log Output (When Working)

### At Server Startup:
```
[v0] [FEATURE-FLAG] [MODULE-LOAD] Environment check: {
  envVar: 'true',
  envVarType: 'string',
  envVarLength: 4,
  enabled: true,
  allEnvKeys: 'USE_DIRECT_PROMPT_GENERATION'
}
[v0] [FEATURE-FLAG] [MODULE-LOAD] ✅ Direct Prompt Generation ENABLED - using new simplified system
```

### During API Call:
```
🔵🔵🔵 DIRECT PROMPT GENERATION CHECK 🔵🔵🔵
[v0] [DIRECT] [RUNTIME-CHECK] Environment variable check: {
  envVar: 'true',
  envVarRaw: '"true"',
  moduleLoadValue: true,
  runtimeValue: true,
  finalValue: true,
  conceptsLength: 6,
  willRun: true
}
🚀🚀🚀 [v0] [DIRECT] Using direct prompt generation system 🚀🚀🚀
```

## Next Steps

1. **Restart server completely**
2. **Check startup logs** for `[FEATURE-FLAG] [MODULE-LOAD]`
3. **Generate concepts** and check for `[DIRECT]` logs
4. **Report findings** - what do the logs show?

---

XoXo Auto 🤖💋









