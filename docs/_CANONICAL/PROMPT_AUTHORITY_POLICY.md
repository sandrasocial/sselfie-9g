# PROMPT AUTHORITY POLICY

**Last Updated**: 2026-01-17  
**Phase**: 4A - Prompt Authority Enforcement  
**Status**: ✅ ACTIVE POLICY  
**Enforcement**: CI Check + Internal-Only Guards (Phase 4A)

---

## THE SINGLE RULE

**All new prompt generation MUST route through Prompt Authority Layer.**

```typescript
// ✅ CORRECT - Use Prompt Authority
import { generatePrompt } from '@/lib/maya/prompt-authority'

const result = await generatePrompt(mode, feature, context)
```

```typescript
// ❌ WRONG - Do NOT call builders directly
import { buildPrompt } from '@/lib/maya/prompt-constructor'

const prompt = buildPrompt(params) // BYPASSES AUTHORITY
```

---

## DEFINITIONS

### Canonical Entry Point ✅

**Definition**: An API route or function that routes prompt generation through Prompt Authority Layer.

**Characteristics**:
- Calls `generatePrompt()` from `lib/maya/prompt-authority.ts`
- Logs all operations for audit trail
- Returns validated prompts with metadata
- Follows architectural intent

**Examples**:
- ✅ `/api/maya/generate-video` - Uses `generatePrompt('video', 'video-generation', ...)`
- ✅ `/api/feed/[feedId]/generate-profile` - Uses `generatePrompt('profile-image', 'profile-image', ...)`

**Count**: 2 / 10 API routes (20%)

---

### Legacy-But-Live Entry Point ⚠️

**Definition**: An API route or function that bypasses Prompt Authority and calls builders directly. Still active and functional, but not following canonical pattern.

**Characteristics**:
- Calls builders directly (`buildPrompt()`, `buildNanoBananaPrompt()`, etc.)
- Bypasses Prompt Authority Layer
- No centralized audit logging
- Works correctly but increases technical debt

**Examples**:
- ⚠️ `/api/maya/generate-concepts` - Calls `buildPrompt()` directly
- ⚠️ `/api/maya/generate-feed-prompt` - Direct Claude generation
- ⚠️ `/api/feed/[feedId]/generate-single` - Calls `buildNanoBananaPrompt()` directly

**Count**: 7 / 10 API routes (70%)

**Status**: 
- ✅ Safe to use (they work correctly)
- ⚠️ Do NOT add more (increases debt)
- 🎯 Migration target for Phase 3+

---

### Internal-Only Endpoint 🔒

**Definition**: An API route that should only be called by internal UI components, not exposed as a public API.

**Characteristics**:
- Used by specific UI components only
- Should not be documented as public API
- Should have internal-only guards (future enhancement)
- Not intended for external consumption

**Examples**:
- 🔒 `/api/maya/generate-prompt-suggestions` - Workbench UI only
- 🔒 `/api/maya/generate-motion-prompt` - B-Roll UI only

**Recommendation**: Add internal-only guards in Phase 3+

---

## HOW TO ADD A NEW PROMPT TYPE SAFELY

### Step 1: Define Your Mode and Feature

**Mode**: What generation system?
- `'classic'` - FLUX LoRA (user's trained model)
- `'pro'` - NanoBanana Pro (composition model)
- `'video'` - WAN (image-to-video)
- `'blueprint-preview'` - Blueprint preview generation
- `'profile-image'` - Profile image generation

**Feature**: What's the use case?
- `'concept-card'` - Concept card generation
- `'feed-prompt'` - Feed post prompt
- `'image-generation'` - Direct image generation
- `'video-generation'` - Video motion prompt
- `'profile-image'` - Profile image prompt

### Step 2: Check If Mode/Feature Exists

Look in `lib/maya/prompt-authority.ts`:

```typescript
export type PromptMode = 'classic' | 'pro' | 'blueprint-preview' | 'video' | 'profile-image'
export type PromptFeature = 
  | 'concept-card'
  | 'feed-prompt'
  | 'image-generation'
  | 'video-generation'
  | 'profile-image'
  | 'blueprint-preview'
  | 'feed-planner-batch'
```

**If your mode/feature exists**: Use it (Step 3)  
**If it doesn't exist**: Add it to Prompt Authority (Step 2a)

### Step 2a: Add New Mode/Feature to Authority (If Needed)

1. Add type to `PromptMode` or `PromptFeature` enum
2. Add routing logic in `generatePrompt()` function
3. Test thoroughly
4. Document in this file

**Example**:
```typescript
// In lib/maya/prompt-authority.ts

export type PromptFeature = 
  | 'concept-card'
  | 'feed-prompt'
  | 'my-new-feature' // NEW

// In generatePrompt() function
if (mode === 'classic') {
  if (feature === 'my-new-feature') {
    // Route to appropriate builder
    prompt = buildMyNewFeaturePrompt(context)
    builder = 'my-new-feature-builder'
    success = true
  }
}
```

### Step 3: Call Prompt Authority from Your API Route

```typescript
import { generatePrompt } from '@/lib/maya/prompt-authority'

export async function POST(req: NextRequest) {
  // ... authentication, validation, etc.
  
  // Call Prompt Authority
  const result = await generatePrompt(mode, feature, {
    userId: user.id,
    triggerWord: model.trigger_word,
    userGender: user.gender,
    // ... other context
  })
  
  // Use the prompt
  const { prompt, metadata } = result
  
  // ... call model API, save results, etc.
}
```

### Step 4: Document Your New Entry Point

Add to `docs/_CANONICAL/PROMPT_SURFACE_MAP.md`:
- New EP-XX entry in the table
- What it does
- Evidence (file path + line number)
- Mark as ✅ Canonical (uses Authority)

### Step 5: Test

1. Test prompt generation works correctly
2. Check audit logs appear in console (`[PROMPT-AUTHORITY]`)
3. Verify metadata is returned correctly
4. Test error handling

---

## WHAT NOT TO DO

### ❌ Do NOT Call Builders Directly

```typescript
// ❌ WRONG
import { buildPrompt } from '@/lib/maya/prompt-constructor'
const prompt = buildPrompt(params)
```

**Why**: Bypasses Authority Layer, no audit logging, increases technical debt

**Instead**: Use `generatePrompt()` from Authority Layer

---

### ❌ Do NOT Create New Prompt Builders Outside Authority

```typescript
// ❌ WRONG
// lib/maya/my-new-prompt-builder.ts
export function buildMyNewPrompt() { ... }
```

**Why**: Creates new bypass pattern, fragments prompt logic

**Instead**: Add routing logic to Prompt Authority, reuse existing builders if possible

---

### ❌ Do NOT Add "Direct" Prompt Generation Functions

```typescript
// ❌ WRONG
export async function generatePromptDirect() { ... }
```

**Why**: "Direct" suggests bypassing Authority, creates confusion

**Instead**: Route through Authority, use clear naming

---

### ❌ Do NOT Mark Files as "Deprecated" If They're Active

```typescript
// ❌ WRONG
// This file is deprecated
// TODO: Remove this file
```

**Why**: Causes confusion, risks accidental deletion

**Instead**: Use accurate status labels:
- `STATUS: ✅ ACTIVELY USED`
- `STATUS: ⚠️ LEGACY-BUT-LIVE`
- `STATUS: ❌ DEPRECATED (safe to remove after X date)`

---

### ❌ Do NOT Create Public APIs for Internal-Only Features

```typescript
// ❌ WRONG - Public API for internal feature
// app/api/internal-feature/route.ts
export async function POST() { ... } // No guards
```

**Why**: Exposes internal features, creates maintenance burden

**Instead**: Add internal-only guards (future enhancement)

---

## REFERENCE LINKS

### Canonical Documentation

- **System Reality**: `docs/_CANONICAL/SYSTEM_REALITY.md`
  - How SSELFIE actually works today
  - Prompt generation flow
  - Model selection logic

- **Prompt Surface Map**: `docs/_CANONICAL/PROMPT_SURFACE_MAP.md`
  - All 19 entry points mapped
  - Canonical vs legacy breakdown
  - Do Not Touch list

- **Phase 2E Report**: `docs/PHASE_2E_PROMPT_SURFACE_SIMPLIFICATION_REPORT.md`
  - Detailed findings
  - Evidence for all claims
  - Confusion drivers identified

### Code References

- **Prompt Authority Layer**: `lib/maya/prompt-authority.ts`
  - The canonical routing layer
  - All modes and features defined
  - Audit logging system

- **Classic Mode Builder**: `lib/maya/prompt-constructor.ts`
  - FLUX LoRA prompt builder
  - Used for Classic Mode

- **Pro Mode Builder**: `lib/maya/nano-banana-prompt-builder.ts`
  - NanoBanana Pro prompt builder
  - Used for Pro Mode

---

## MIGRATION PLAN (PHASE 3+)

### Priority 1: High-Traffic Routes

1. `/api/maya/generate-concepts` (EP-01)
   - Most used Classic Mode route
   - Migrate to `generatePrompt('classic', 'concept-card', ...)`

2. `/api/maya/generate-feed-prompt` (EP-03)
   - Feed generation route
   - Migrate to `generatePrompt()` with appropriate mode

3. `/api/feed/[feedId]/generate-single` (EP-05)
   - Single post generation
   - Migrate to `generatePrompt()` routing

### Priority 2: Pro Mode Routes

4. `/api/maya/pro/generate-image` (EP-04)
   - Already uses audit logging
   - Migrate to full Authority usage

5. `/api/maya/generate-studio-pro-prompts` (EP-07)
   - Studio Pro prompt generation
   - Migrate to `generatePrompt('pro', ...)`

### Priority 3: Specialized Routes

6. `/api/blueprint/generate-concepts` (EP-06)
   - Blueprint generation
   - Migrate to `generatePrompt('blueprint-preview', ...)`

7. `/api/feed-planner/create-strategy` (EP-08)
   - Deprecated route
   - Decide: Migrate or remove

8. `/api/maya/generate-prompt-suggestions` (EP-02)
   - Prompt suggestions
   - Migrate `PromptGenerator` class to route through Authority

---

## ENFORCEMENT

### CI Check (Phase 4A)

**Automated Check**: `npm run check:prompt-authority`

**What it checks**:
- Banned imports (`buildNanoBananaPrompt`, `buildPrompt`, `PromptGenerator`, etc.) in `app/api/**/route.ts`
- Direct builder calls without Authority wrappers
- Inline prompt templates in routes

**If check fails**:
- Fix by routing through Authority Layer
- Or add to allowlist (`scripts/prompt-authority-allowlist.json`) with justification

**Integration**: Run before committing, add to CI pipeline if available

---

### Internal-Only Enforcement (Phase 4A)

**Flag**: `ENFORCE_INTERNAL_ONLY_ENDPOINTS=true` (default: `false`)

**When enabled**:
- Requires `x-sselfie-internal` header matching `INTERNAL_API_SECRET` env var
- Returns 403 for unauthorized requests

**When disabled** (default):
- Allows all requests (non-breaking behavior)

**Usage**:
```typescript
import { checkInternalOnly } from '@/lib/maya/internal-only-guard'

export async function POST(req: NextRequest) {
  const internalCheck = checkInternalOnly(req)
  if (!internalCheck.allowed) {
    return NextResponse.json({ error: internalCheck.error }, { status: 403 })
  }
  // ... rest of route
}
```

**Internal-Only Routes** (see `PROMPT_SURFACE_MAP.md`):
- `/api/maya/generate-prompt-suggestions` (EP-02) - Workbench UI only

---

### For New Code (Immediate)

- ✅ All new prompt generation MUST use Prompt Authority
- ✅ CI check must pass (`npm run check:prompt-authority`)
- ✅ Code reviews must check for Authority usage
- ✅ No new bypass patterns allowed

### For Existing Code (Phase 3+)

- ✅ All primary routes migrated (Phase 3C complete)
- ⚠️ Legacy routes remain functional (no breaking changes)
- 🎯 Remaining routes: Helper/internal functions (low priority)

---

## QUESTIONS & ANSWERS

### "Why can't I just call the builder directly?"

**Answer**: Bypassing Authority:
- Loses audit logging
- Fragments prompt logic
- Makes debugging harder
- Increases technical debt
- Breaks architectural intent

### "What if I need a custom prompt?"

**Answer**: Add routing to Authority Layer:
1. Define your mode/feature
2. Add routing logic in `generatePrompt()`
3. Reuse existing builders if possible
4. Document in PROMPT_SURFACE_MAP.md

### "Can I use legacy routes for new features?"

**Answer**: No. Legacy routes exist for backward compatibility only. All new work must use Authority.

### "What if Authority doesn't support my use case?"

**Answer**: Extend Authority Layer:
1. Add new mode or feature type
2. Add routing logic
3. Test thoroughly
4. Document changes
5. Update this policy

### "How do I know if a file is safe to delete?"

**Answer**: Check these docs:
1. PROMPT_SURFACE_MAP.md - Lists all active entry points
2. SYSTEM_REALITY.md - Lists legacy/archived files
3. File header comments - Status labels (✅/⚠️/❌)

**Never delete a file marked**:
- `STATUS: ✅ ACTIVELY USED`
- `STATUS: ⚠️ LEGACY-BUT-LIVE`

---

## POLICY UPDATES

**This policy is living documentation.**

Update this file when:
- New modes or features added to Authority
- Migration progress changes
- New bypass patterns discovered
- Enforcement rules change

**Last Updated**: 2026-01-17 (Phase 4A)  
**Next Review**: Phase 4B+ (Additional hardening if needed)

---

## STATUS

✅ **ACTIVE POLICY** - Mandatory for all new work

**Compliance**:
- New work: 100% required
- Existing work: Migration in progress (Phase 3+)

**Enforcement**: 
- CI Check (`npm run check:prompt-authority`) - **Must pass before merge**
- Internal-Only Guards (optional, behind flag)
- Code reviews, documentation checks, founder approval

---

## END OF POLICY

For questions or clarifications, see:
- `docs/_CANONICAL/SYSTEM_REALITY.md`
- `docs/_CANONICAL/PROMPT_SURFACE_MAP.md`
- `lib/maya/prompt-authority.ts`
