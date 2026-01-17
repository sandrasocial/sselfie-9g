# PROMPT BYPASS PREVENTION GUIDE

**Purpose**: Prevent new prompt entry points from bypassing the Prompt Authority Layer.

**Last Updated**: 2026-01-17 (Phase 4A)

---

## 🚫 BANNED PATTERNS (DO NOT USE)

### ❌ Direct Builder Imports in API Routes

**BANNED**:
```typescript
// ❌ DO NOT DO THIS
import { buildNanoBananaPrompt } from '@/lib/maya/nano-banana-prompt-builder'
import { buildPrompt } from '@/lib/maya/prompt-constructor'
import { PromptGenerator } from '@/lib/maya/prompt-generator'

export async function POST(req: NextRequest) {
  const prompt = await buildNanoBananaPrompt({ ... }) // ❌ BYPASS
  // or
  const prompt = buildPrompt({ ... }) // ❌ BYPASS
  // or
  const generator = new PromptGenerator()
  const suggestions = await generator.generatePromptSuggestions({ ... }) // ❌ BYPASS
}
```

**WHY**: Bypasses Authority Layer, no audit logging, no fingerprint tracking

---

### ❌ Direct Model SDK Calls Without Authority

**BANNED**:
```typescript
// ❌ DO NOT DO THIS
import { generateText } from 'ai'

export async function POST(req: NextRequest) {
  const systemPrompt = `You are Maya...` // ❌ Inline template
  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4",
    system: systemPrompt, // ❌ BYPASS - no Authority routing
    prompt: userRequest,
  })
}
```

**WHY**: Prompt construction happens outside Authority Layer

---

### ❌ Inline Prompt Templates in Routes

**BANNED**:
```typescript
// ❌ DO NOT DO THIS
export async function POST(req: NextRequest) {
  const prompt = `You are Maya, an expert...
  
  ${userContext}
  
  Generate a prompt for: ${userRequest}` // ❌ Inline template
  
  const result = await generateText({ prompt })
}
```

**WHY**: No Authority routing, no audit logging

---

## ✅ REQUIRED PATTERNS (USE THESE)

### ✅ Use Authority Wrapper Functions

**REQUIRED**:
```typescript
// ✅ DO THIS
import { generateFeedSinglePromptViaAuthority } from '@/lib/maya/prompt-authority'
// or
import { generateMayaFeedPromptSystemPrompt } from '@/lib/maya/prompt-authority'
// or
import { generatePrompt } from '@/lib/maya/prompt-authority' // For canonical features

export async function POST(req: NextRequest) {
  // Route through Authority Layer
  const authorityResult = await generateFeedSinglePromptViaAuthority({
    templatePrompt,
    position,
    context: { userId, feedId, postId },
  })
  
  const prompt = authorityResult.prompt // ✅ Uses Authority
  
  // Then use prompt with model/provider
  const result = await generateWithNanoBanana({ prompt })
}
```

**WHY**: Routes through Authority Layer, includes audit logging and fingerprint tracking

---

### ✅ Create New Authority Wrapper for New Entry Points

**REQUIRED** (for new routes):
```typescript
// ✅ DO THIS
// 1. Create wrapper in lib/maya/prompt-authority.ts
export function generateMyNewFeatureViaAuthority(context: {
  userRequest: string
  // ... other inputs
}): {
  prompt: string
  metadata: { routeId, promptKind, fingerprint, timestamp }
} {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  // Build prompt (preserve existing logic)
  const prompt = buildExistingBuilder({ ... }) // Call existing builder
  
  // Compute fingerprint
  const fingerprint = createHash('sha256')
    .update(prompt)
    .digest('hex')
    .substring(0, 16)
  
  // Audit logging
  logAudit({
    timestamp,
    mode: 'pro',
    feature: 'my-new-feature',
    userId: context.userId,
    builder: 'existing-builder',
    executionTimeMs: Date.now() - startTime,
    success: true,
    promptLength: prompt.length,
    outputHash: fingerprint,
    pathUsed: 'authority',
  })
  
  return { prompt, metadata: { routeId: 'EP-XX', promptKind: 'my-feature', fingerprint, timestamp } }
}

// 2. Use wrapper in route
import { generateMyNewFeatureViaAuthority } from '@/lib/maya/prompt-authority'

export async function POST(req: NextRequest) {
  const authorityResult = generateMyNewFeatureViaAuthority({ ... })
  const prompt = authorityResult.prompt
  // Use prompt...
}
```

**WHY**: Ensures new entry points follow Authority pattern

---

## 🔍 QUICK "WHAT TO DO INSTEAD"

### Scenario 1: New API Route Needs Prompt Generation

**❌ Don't**:
- Import builders directly
- Build prompts inline
- Call model SDKs without Authority

**✅ Do**:
1. Check if existing Authority wrapper exists (`lib/maya/prompt-authority.ts`)
2. If yes, use it
3. If no, create new wrapper function in Authority Layer
4. Route through wrapper in your route
5. Update `PROMPT_SURFACE_MAP.md` with new entry point

---

### Scenario 2: Existing Route Needs Prompt Generation

**❌ Don't**:
- Add direct builder imports
- Add inline prompt templates

**✅ Do**:
1. Check `PROMPT_SURFACE_MAP.md` for existing Authority wrappers
2. Use existing wrapper if available
3. If route bypasses Authority, migrate it (see Phase 3 migration reports)

---

### Scenario 3: Component Needs Prompt Suggestions

**❌ Don't**:
- Import `PromptGenerator` directly in component
- Call prompt APIs directly from component

**✅ Do**:
- Use existing API route (`/api/maya/generate-prompt-suggestions`)
- Route is already canonical (uses Authority)

---

## 🛡️ ENFORCEMENT

### CI Check

Run before committing:
```bash
npm run check:prompt-authority
```

**What it checks**:
- Banned imports in `app/api/**/route.ts` files
- Direct builder calls without Authority wrappers
- Inline prompt templates in routes

**If check fails**:
- Fix by routing through Authority Layer
- Or add to allowlist (with justification) in `scripts/prompt-authority-allowlist.json`

---

### Manual Review Checklist

Before merging PRs that add/modify prompt generation:

- [ ] Does route use Authority wrapper?
- [ ] Is new wrapper added to `lib/maya/prompt-authority.ts`?
- [ ] Is entry point added to `PROMPT_SURFACE_MAP.md`?
- [ ] Does wrapper include audit logging?
- [ ] Does wrapper compute fingerprint hash?
- [ ] Is prompt content unchanged (routing only)?

---

## 📚 REFERENCE

**Canonical Docs**:
- `docs/_CANONICAL/PROMPT_AUTHORITY_POLICY.md` - Authority Layer policy
- `docs/_CANONICAL/PROMPT_SURFACE_MAP.md` - All entry points map
- `docs/_CANONICAL/SYSTEM_REALITY.md` - System architecture

**Migration Examples**:
- `docs/PHASE_3A_P0_1_EP02_MIGRATION_REPORT.md`
- `docs/PHASE_3B_P1_1_EP03_MIGRATION_REPORT.md`
- `docs/PHASE_3C_P0_1_EP04_MIGRATION_REPORT.md`

---

## ⚠️ EXCEPTIONS

**Allowed Exceptions** (must be documented):
- Internal-only routes (behind `ENFORCE_INTERNAL_ONLY_ENDPOINTS` flag)
- Helper functions (validation, fixes) - these are not entry points
- Legacy routes being deprecated (documented in `PROMPT_SURFACE_MAP.md`)

**To Add Exception**:
1. Add to `scripts/prompt-authority-allowlist.json`
2. Document reason in `PROMPT_SURFACE_MAP.md`
3. Add migration plan if temporary

---

## 🎯 GOAL

**100% of new prompt entry points must route through Authority Layer.**

No exceptions without explicit approval and documentation.
