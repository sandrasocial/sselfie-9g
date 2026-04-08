# Verify Nano Banana Fix

## Quick Verification Commands

### 1. Check Builder Selection Logic Exists

```bash
cd /Users/MD760HA/sselfie-9g-1
grep -A 5 "if (context?.generationMode === 'pro')" lib/maya/prompt-authority.ts
```

**Expected:** Should show the new builder routing logic.

---

### 2. Check Adapter File Exists

```bash
ls -lh lib/feed-planner/nano-banana-adapter.ts
```

**Expected:** File should exist (~7KB).

---

### 3. Check TypeScript Compilation (Modified Files Only)

```bash
npx tsc --noEmit lib/maya/prompt-authority.ts
npx tsc --noEmit lib/feed-planner/nano-banana-adapter.ts
```

**Expected:** No errors in these files (pre-existing errors elsewhere are OK).

---

### 4. Search for System Labels (Should Not Appear in Nano Banana Path)

```bash
# Search for "Scene:" label in Nano Banana builder (should NOT find it)
grep -r "Scene:" lib/maya/nano-banana-prompt-builder.ts

# Search for "Composition:" label in Nano Banana builder (should NOT find it)
grep -r "Composition:" lib/maya/nano-banana-prompt-builder.ts
```

**Expected:** No results. System labels only exist in `buildSingleImagePrompt()`.

---

## Runtime Verification (After Deploy)

### 1. Generate a Feed Planner Image

1. Open app
2. Go to Feed Planner
3. Click "Generate" on any post

### 2. Check Console Logs

Look for these log messages:

```
[PROMPT-AUTHORITY] EP-05 Using buildNanoBananaPrompt for Pro Mode
[NANO-BANANA-ADAPTER] Converting Feed Planner template to natural language
[NANO-BANANA-ADAPTER] Natural language prompt: { length: XX, preview: "..." }
```

**Expected:**
- Builder: `buildNanoBananaPrompt` (not `buildSingleImagePrompt`)
- Prompt length: ~100-150 words (not 250+)
- Preview: Natural language (no "Scene:", "Composition:" labels)

### 3. Check Audit Logs

Query your audit log database:

```sql
SELECT 
  builder,
  prompt_length,
  timestamp
FROM prompt_audit_events
WHERE route_id = 'EP-05'
ORDER BY timestamp DESC
LIMIT 10;
```

**Expected:**
- `builder = 'build-nano-banana-prompt'` (not `'build-single-image-prompt'`)
- `prompt_length` ~100-150 (not 250+)

---

## Visual Verification

### Before/After Prompt Comparison

**Test:** Generate the same feed post position twice (once before fix, once after).

**Compare:**

| Metric | Before (Wrong) | After (Correct) |
|--------|---------------|-----------------|
| Builder | `buildSingleImagePrompt` | `buildNanoBananaPrompt` |
| Length | 250+ words | 100-150 words |
| Format | System labels | Natural language |
| Labels | "Scene:", "Composition:", etc. | None |

---

## Image Quality Verification

### A/B Testing

1. **Generate 10 images before fix** (save prompts and image URLs)
2. **Generate 10 images after fix** (save prompts and image URLs)
3. **Compare:**
   - Identity preservation (does face look like user?)
   - Scene accuracy (does scene match template?)
   - Composition quality (is framing correct?)
   - Overall aesthetic (does it match brand?)

### Success Criteria

- ✅ Identity: Better likeness to reference photos
- ✅ Scene: More accurate interpretation of template
- ✅ Composition: Cleaner, less confused framing
- ✅ Aesthetic: More cohesive overall feel

---

## Rollback Verification

If you need to rollback, verify these commands work:

### 1. Revert Authority File

```bash
cd /Users/MD760HA/sselfie-9g-1
git diff lib/maya/prompt-authority.ts
git checkout lib/maya/prompt-authority.ts
```

### 2. Remove Adapter File

```bash
rm lib/feed-planner/nano-banana-adapter.ts
```

### 3. Verify System Works

```bash
npm run build
```

**Expected:** Build succeeds, system falls back to old behavior.

---

## Success Indicators

### ✅ Code Level

- [x] Builder routing logic exists
- [x] Adapter file exists
- [x] TypeScript compiles without errors (in modified files)
- [x] No system labels in Nano Banana builder

### ⏳ Runtime Level (Requires Testing)

- [ ] Logs show `buildNanoBananaPrompt` used
- [ ] Prompt length ~100-150 words
- [ ] Prompt format is natural language
- [ ] Audit logs track correct builder

### ⏳ Quality Level (Requires Testing)

- [ ] Identity preservation improved
- [ ] Scene accuracy improved
- [ ] Composition quality improved
- [ ] User satisfaction increased

---

## Troubleshooting

### Issue: Still seeing system labels

**Check:**
1. Is `generationMode = 'pro'` in generate-single route?
2. Is `context.generationMode` passed to Authority function?
3. Are logs showing correct builder?

**Fix:** Verify routing logic is active and mode is detected correctly.

---

### Issue: TypeScript errors

**Check:**
1. Are errors in modified files or pre-existing?
2. Run: `npx tsc --noEmit <specific-file>`

**Fix:** Modified files should have no errors. Pre-existing errors elsewhere are OK.

---

### Issue: Images don't generate

**Check:**
1. Console logs for error messages
2. Network tab for API failures
3. Audit logs for prompt generation success

**Fix:** Check adapter logic, ensure frame extraction works correctly.

---

## Quick Health Check

Run this one-liner to verify the fix is active:

```bash
cd /Users/MD760HA/sselfie-9g-1 && \
grep -q "if (context?.generationMode === 'pro')" lib/maya/prompt-authority.ts && \
[ -f lib/feed-planner/nano-banana-adapter.ts ] && \
echo "✅ Fix is active" || echo "❌ Fix is not active"
```

**Expected:** `✅ Fix is active`

---

**Generated:** January 18, 2026  
**Purpose:** Verification checklist for Nano Banana builder fix
