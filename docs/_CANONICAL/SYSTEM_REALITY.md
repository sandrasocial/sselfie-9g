# SSELFIE SYSTEM REALITY

**Last Updated**: 2026-01-19 (Nano Banana Pro Optimization)  
**Purpose**: Single source of truth for how SSELFIE actually works today  
**Audience**: Founder, future contributors, decision-makers  
**Tone**: Clear, calm, founder-readable, no jargon

---

## WHAT THIS DOCUMENT IS

This is the **authoritative** document about how SSELFIE works right now. When in doubt, this document is correct.

**What it covers**:
- How prompts are generated (the actual system)
- How images and videos are created
- How quality is monitored
- What is legacy vs. current
- What NOT to touch

**What it does NOT cover**:
- Future plans or wishlists
- Technical implementation details (see code for that)
- Historical changes (see git history)

---

## 1. HOW PROMPTS ARE GENERATED (NOW)

### The Prompt Authority Layer

**The Prompt Authority Layer** (`lib/maya/prompt-authority.ts`) is the **only decision layer** for prompt generation.

**How it works**:
1. Maya chat, Feed Planner, or other features request a prompt
2. They call `generatePrompt()` from Prompt Authority
3. Prompt Authority routes to the appropriate builder based on:
   - **Mode**: Classic, Pro, Blueprint, Video
   - **Feature**: Concept card, Feed prompt, Image generation, Video generation
4. The builder creates the prompt
5. Prompt Authority validates and returns it

**Key principle**: Prompt Authority **never calls models directly**. It only creates prompts. Models are called separately.

### Current Prompt Builders

**Classic Mode** (FLUX LoRA):
- Uses `prompt-constructor.ts` for concept cards
- Uses stored concept prompts for image generation
- Validates prompts before generation

**Pro Mode** (NanoBanana Pro):
- Uses `nano-banana-prompt-builder.ts`
- Handles complex compositions (carousels, product mockups, etc.)
- Supports multiple input images and text elements

**Video Mode** (WAN):
- Uses Prompt Authority for motion prompt enhancement
- Motion prompts describe how images should move
- Video generation happens separately

### What Maya Chat Does

Maya chat (the AI assistant):
1. Talks to users in natural language
2. Creates concept ideas and descriptions
3. **Delegates prompt creation** to Prompt Authority
4. Never builds prompts directly

**Maya does NOT**:
- Call image models directly
- Build prompts without Prompt Authority
- Bypass the routing layer

### What Feed Planner Does

Feed Planner:
1. Plans content calendars
2. Creates post concepts
3. **Delegates prompt creation** to Prompt Authority (`lib/feed-planner/prompt-shaper.ts`)
4. Generates images using those prompts (via Nano Banana Pro)

**Feed Planner does NOT**:
- Build prompts directly
- Call models without prompts
- Bypass Prompt Authority

**Recent Optimization (2026-01-19)**:
- Feed preview prompts optimized from ~760 words to ~300-450 words for Nano Banana Pro
- Preview mode uses concise scene blocks (25-35 words each) for multi-scene grid generation
- Single scene mode remains detailed (200-270 words) for single image quality
- See `NANO_BANANA_PRO_OPTIMIZATION_SUMMARY.md` for details

### Legacy Paths (Behind Feature Flags)

Some old code paths still exist but are **gated behind feature flags**:
- Old prompt builders (if any) are disabled by default
- Legacy routes return errors unless flags are enabled
- These exist for emergency rollback only

**Do NOT use legacy paths** unless explicitly debugging a production issue.

---

## 2. HOW IMAGES ARE GENERATED

### Classic Mode: FLUX LoRA

**What it is**: User's custom-trained model + FLUX base model

**How it works**:
1. User uploads 10-20 photos
2. Model trains for 3-5 minutes
3. Creates a LoRA (Low-Rank Adaptation) file
4. This LoRA is used with FLUX.1-dev base model

**When it's used**:
- Maya Classic Mode image generation
- Studio mode (4 variants)
- Feed Planner (membership users)
- Photoshoots (9-image carousels)

**Technical details**:
- Base model: `black-forest-labs/flux-dev` (via Replicate)
- LoRA scale: 0.6-0.8 (adjustable)
- Extra LoRA: Super Realism (optional, 0.4 scale)
- Quality presets: Category-specific (portrait, lifestyle, fashion, etc.)

**Prompt Authority role**: Creates the prompt, never calls Replicate directly.

### Pro Mode: NanoBanana Pro

**What it is**: Advanced composition model for complex images

**How it works**:
1. User provides base images, product images, text elements
2. Prompt Authority creates composition prompt
3. NanoBanana Pro generates final image
4. Supports carousels, product mockups, brand partnerships

**When it's used**:
- Maya Pro Mode
- Feed Planner (free users, paid blueprint users)
- Complex compositions requiring multiple inputs

**Technical details**:
- Model: NanoBanana Pro (via custom client)
- Supports multiple input images
- Handles text overlays and brand assets
- More expensive (2 credits vs. 1 credit)

**Prompt Authority role**: Creates composition prompts, delegates to NanoBanana client.

### Image Generation Flow

```
User Request
    ↓
Maya Chat / Feed Planner / Studio
    ↓
Prompt Authority Layer (generates prompt)
    ↓
Model Selection (Classic = FLUX, Pro = NanoBanana)
    ↓
Replicate / NanoBanana API (generates image)
    ↓
Blob Storage (saves image)
    ↓
Database (saves metadata)
    ↓
Quality Monitoring (assesses quality - Phase 2C-4-3)
    ↓
User sees image
```

**Key point**: Prompt Authority is in the middle. It doesn't call models, it creates prompts that others use.

---

## 3. HOW VIDEOS ARE GENERATED

### WAN Model (Image-to-Video)

**What it is**: Converts static images into 5-second videos

**How it works**:
1. User selects an image from gallery
2. Maya analyzes image and creates motion prompt
3. Prompt Authority enhances motion prompt
4. WAN model generates video from image + motion prompt
5. Video saved to gallery

**When it's used**:
- B-Roll video generation
- Maya Videos tab
- User-initiated video creation

**Technical details**:
- Model: `wan-video/wan-2.5-i2v-fast` (via Replicate)
- Duration: 5 seconds (optimal quality)
- Resolution: 1080p
- No LoRA support (character consistency via input image)
- Motion prompts describe natural movement

**Prompt Authority role**: Enhances motion prompts, never calls WAN directly.

### Video Generation Flow

```
User selects image
    ↓
Maya analyzes image (vision model)
    ↓
Maya creates motion prompt
    ↓
Prompt Authority enhances motion prompt
    ↓
WAN model generates video
    ↓
Blob Storage (saves video)
    ↓
Database (saves metadata)
    ↓
User sees video
```

---

## 4. HOW QUALITY IS MONITORED

### Prompt Quality Baseline System (Phase 2C-4-3)

**What it is**: Observability layer that tracks image quality over time

**How it works**:
1. Image is generated and saved
2. Quality hook fires (fire-and-forget, async)
3. Quality metrics computed:
   - Face consistency score (placeholder - not yet implemented)
   - Realism score (basic heuristic)
   - Stability score (not implemented)
4. Metrics saved to `prompt_quality_metrics` table
5. Weekly reports generated for founder

**When it's used**:
- All image generations (Maya, Studio, Feed, Photoshoot)
- Automatic, silent, non-blocking
- Never affects user experience

**Founder question answered**: "Are we degrading, stable, or improving?"

**Access**: Admin API endpoint `/api/admin/quality-report`

**Current status**: Baseline collection phase (all metrics tagged `is_baseline=true`)

---

## 5. WHAT IS LEGACY / ARCHIVED

### Files That Are NOT Deprecated (Despite Comments)

**`lib/maya/prompt-generator.ts`**:
- **Status**: ✅ **ACTIVELY USED**
- **Used by**: 
  - `app/api/maya/generate-prompt-suggestions/route.ts` (PromptGenerator class)
  - Components importing types: `PromptSuggestion`, `NanoBananaCapability`
- **Note**: Header comment says "deprecated" but file is actively used
- **Action**: Keep file, update comment if needed

**`lib/maya/direct-prompt-generation.ts`**:
- **Status**: ✅ **ACTIVELY USED**
- **Used by**: 
  - `app/api/maya/generate-concepts/route.ts` (applyProgrammaticFixes, validatePromptLight, DirectPromptContext)
- **Note**: Purpose unclear from name, but actively used
- **Action**: Keep file, consider renaming for clarity

### Gated Routes (Legacy Behind Flags)

**`/api/blueprint/generate-concept-image`**:
- **Status**: Disabled unless `ENABLE_BLUEPRINT_CONCEPT_IMAGE=true`
- **Purpose**: Legacy blueprint concept generation
- **Action**: Do not use unless debugging production issue

### Archived Files

**Location**: `docs/_ARCHIVE/` (if any exist)

**Note**: No files have been archived yet in Phase 2D. Files marked "deprecated" are still in use.

---

## 6. WHAT A NEW CONTRIBUTOR SHOULD NOT TOUCH

### Critical Systems (Do Not Modify)

**Prompt Authority Layer** (`lib/maya/prompt-authority.ts`):
- Central routing layer for all prompts
- Changing this affects everything
- Only modify if explicitly instructed

**Prompt Constructors** (`lib/maya/prompt-constructor.ts`, `lib/maya/nano-banana-prompt-builder.ts`):
- These build the actual prompts
- Changing output format breaks generations
- Only modify prompts if explicitly instructed

**NanoBanana Builder** (`lib/maya/nano-banana-prompt-builder.ts`):
- Complex composition logic
- Handles multiple input types
- Very fragile, do not touch

**Feed Planner Orchestrator** (`lib/feed-planner/`):
- Coordinates multi-post generation
- Complex state management
- Prompt generation: `lib/feed-planner/prompt-shaper.ts` (SINGLE SOURCE OF TRUTH)
- Optimized for Nano Banana Pro (concise preview prompts, detailed single scene prompts)
- Do not refactor without approval

**Quality Monitoring Hooks** (`lib/quality/hooks.ts`):
- Fire-and-forget async system
- Changing breaks data collection
- Only modify if fixing bugs

### Systems That Can Be Modified (With Care)

**Maya Chat Interface** (`components/sselfie/maya-chat-screen.tsx`):
- UI can be improved
- Chat logic can be enhanced
- But prompt generation must go through Authority

**Quality Reporting** (`lib/quality/reporting.ts`):
- Reports can be enhanced
- New metrics can be added
- But don't change data collection

**Admin APIs** (`app/api/admin/`):
- Can add new endpoints
- Can improve existing ones
- But don't change core generation logic

---

## 7. SYSTEM ARCHITECTURE SUMMARY

### The Flow (Simplified)

```
User
  ↓
Maya Chat / Feed Planner / Studio
  ↓
Prompt Authority Layer (routes to builder)
  ↓
Prompt Builder (creates prompt)
  ↓
Model API (Replicate / NanoBanana / WAN)
  ↓
Image/Video Generated
  ↓
Blob Storage + Database
  ↓
Quality Monitoring (silent)
  ↓
User sees result
```

### Key Principles

1. **Prompt Authority is the only decision layer** - All prompt generation goes through it
2. **Prompt Authority never calls models** - It only creates prompts
3. **Models are called separately** - By API routes, not by Authority
4. **Quality monitoring is silent** - Fire-and-forget, never blocks
5. **Legacy paths are gated** - Behind feature flags, disabled by default

---

## 8. COMMON QUESTIONS ANSWERED

### "Where do prompts come from?"

**Answer**: Prompt Authority Layer routes to builders (prompt-constructor for Classic, nano-banana-builder for Pro).

### "Can I change how prompts are generated?"

**Answer**: Only if you modify Prompt Authority routing or the builders. Do not bypass Authority.

### "What model does SSELFIE use?"

**Answer**: 
- Classic Mode: FLUX.1-dev + user's LoRA
- Pro Mode: NanoBanana Pro
- Video: WAN 2.5

### "How do I add a new prompt type?"

**Answer**: 
1. Add feature type to Prompt Authority
2. Create builder function (or use existing)
3. Route through Authority
4. Never bypass Authority

### "What if Prompt Authority fails?"

**Answer**: Some routes have fallback logic, but Authority should not fail. If it does, that's a bug.

### "Can I use the old prompt system?"

**Answer**: No. Old systems are deprecated or gated. Use Prompt Authority.

---

## 9. WHAT TO DO WHEN...

### Adding a New Feature That Needs Prompts

1. **Do**: Call `generatePrompt()` from Prompt Authority
2. **Do**: Specify mode and feature type
3. **Do**: Pass all required context
4. **Don't**: Build prompts directly
5. **Don't**: Bypass Authority

### Debugging Prompt Issues

1. Check Prompt Authority logs (`[PROMPT-AUTHORITY]`)
2. Check which builder was used
3. Check input/output hashes
4. Check quality metrics (if available)
5. **Don't**: Modify Authority without understanding impact

### Changing Prompt Output

1. **Only if explicitly instructed**
2. Modify the appropriate builder
3. Test thoroughly
4. Monitor quality metrics
5. **Don't**: Change Authority routing logic

---

## 10. FILES REFERENCE

### Core Prompt System

- `lib/maya/prompt-authority.ts` - **The Authority Layer** (routing)
- `lib/maya/prompt-constructor.ts` - Classic Mode builder
- `lib/maya/nano-banana-prompt-builder.ts` - Pro Mode builder
- `lib/maya/flux-prompting-principles.ts` - FLUX prompt guidelines

### Active (But Confusing) Files

- `lib/maya/prompt-generator.ts` - **ACTIVELY USED** (despite "deprecated" comment)
  - Used by: `app/api/maya/generate-prompt-suggestions/route.ts`
  - Exports types used by components
  - **Do not archive**

- `lib/maya/direct-prompt-generation.ts` - **ACTIVELY USED** (despite unclear name)
  - Used by: `app/api/maya/generate-concepts/route.ts`
  - Provides validation and fixes
  - **Do not archive**

### Quality Monitoring

- `lib/quality/prompt-quality-baseline.ts` - Quality assessment
- `lib/quality/reporting.ts` - Quality reports
- `lib/quality/hooks.ts` - Integration hooks

### Model Clients

- `lib/replicate-client.ts` - Replicate API client
- `lib/nano-banana-client.ts` - NanoBanana API client

---

## 11. WHAT NOT TO DO

### ❌ Do NOT:

1. **Bypass Prompt Authority** - Always route through it
2. **Modify prompt builders without approval** - They're fragile
3. **Change Prompt Authority routing** - Affects everything
4. **Archive files marked "deprecated"** - Check usage first

---

## 6. GUARDRAILS (PREVENTING REGRESSIONS)

### CI Check (Phase 4A)

**Automated Check**: `npm run check:prompt-authority`

**What it prevents**:
- New API routes bypassing Authority Layer
- Direct builder imports in routes
- Inline prompt templates

**How to run**: `npm run check:prompt-authority`

**If check fails**: Route through Authority Layer or add to allowlist with justification

---

### Internal-Only Enforcement (Phase 4A)

**Flag**: `ENFORCE_INTERNAL_ONLY_ENDPOINTS=true` (default: `false`)

**When enabled**: Requires internal API secret header for protected routes

**When disabled** (default): Allows all requests (non-breaking)

**Protected Routes**: See `PROMPT_SURFACE_MAP.md` "Should Be Internal Only" section

**Usage**: See `lib/maya/internal-only-guard.ts`

---

### Standardized Audit Logging (Phase 4A)

**Helper**: `createAuthorityAudit()` in `lib/maya/prompt-authority.ts`

**Purpose**: Ensures consistent audit logging format across all Authority wrappers

**Usage**: All Authority wrapper functions use this helper for audit logging

---

**Guardrails now prevent bypass regressions** ✅

**Status**: Prompt authority check now passes clean (0 violations) ✅

---

## 7. PROMPT HEALTH DASHBOARD (Phase 5A)

### Admin Dashboard

**Location**: `/admin/prompt-health`

**Purpose**: Monitor prompt generation health, detect fingerprint drift, and track audit events.

**Features**:
- Summary cards: Events (24h), Errors (24h), Unique fingerprints, Top routes
- Event table: Last 200 events with filters (route ID, status, time range)
- Drift detection: Shows routes where prompt fingerprints have changed
- Filters: Route ID dropdown, status dropdown, time range (24h/7d/30d)

**Data Source**: `prompt_audit_events` table (stores audit events from Authority Layer)

**Access**: Admin only (ssa@ssasocial.com)

---

### Audit Event Storage

**Table**: `prompt_audit_events`

**Storage**: Database (Neon PostgreSQL)

**Retention**: No automatic cleanup (can be added later)

**Fields**: route_id, fingerprint, status, timestamp, provider, model, etc.

**Indexes**: created_at DESC, route_id + created_at, status + created_at, fingerprint + created_at

---

### How It Works

1. **Event Collection**: When prompts are generated via Authority Layer, audit events are logged to console AND persisted to database
2. **Non-Blocking**: Database persistence fails silently (doesn't break prompt generation)
3. **Dashboard**: Admin page queries database and displays events with filters
4. **Drift Detection**: Compares current vs previous fingerprints per route to detect prompt changes

---

**Prompt Health Dashboard now available** ✅

---

### Health Signals & Alert Rules (Phase 5B)

**Alert System**: `lib/maya/prompt-health-alerts.ts`

**Alert Severities**:
- **RED**: Critical issues requiring immediate attention
  - Route error rate >= 20% AND volume >= 20 in last 24h
  - Provider/model has >= 10 errors in last 1h
- **ORANGE**: Elevated issues requiring monitoring
  - Route error count >= 10 in last 24h
  - Route drift count >= 3 in last 24h
- **YELLOW**: Informational alerts
  - Drift detected in stable routes
  - General fingerprint drift detected

**Dashboard Features**:
- Active alerts section (sorted by severity)
- Top error rate routes table
- Drift watchlist (fingerprint changes per route)
- Provider/model error tracking

---

### Stable Routes Watchlist

**Purpose**: Routes expected to have consistent fingerprints (used for drift severity weighting)

**Stable Routes**:
- `EP-03` - Feed prompt generation (`/api/maya/generate-feed-prompt`)
- `EP-06` - Blueprint concepts (`/api/blueprint/generate-concepts`)
- `EP-05` - Feed single post (`/api/feed/[feedId]/generate-single`)

**Usage**: Drift in stable routes triggers YELLOW alerts (may indicate accidental prompt edits)

**Location**: `lib/maya/prompt-health-alerts.ts` → `STABLE_ROUTES` constant

---

**Health Signals & Alert Rules now available** ✅

---

## 8. SAFE MODE + INCIDENT LOG (Phase 6A)

### Safe Mode System

**Purpose**: Reduce generation blast radius during incidents while maintaining system availability.

**Environment Variable**: `SAFE_MODE` (default: `false` - non-breaking)

**When Enabled** (`SAFE_MODE=true`):
1. **Rate Limits**: Reduced by 50% for routes that already rate limit
2. **Internal Endpoints**: Protected even if `ENFORCE_INTERNAL_ONLY_ENDPOINTS=false`
3. **Error Logging**: Enhanced with safe mode context

**Activation**: Set `SAFE_MODE=true` in Vercel environment variables (takes effect immediately)

**Deactivation**: Set `SAFE_MODE=false` in Vercel (takes effect immediately)

**Documentation**: `docs/_CANONICAL/SAFE_MODE_POLICY.md`

---

### Incident Recording

**Table**: `incident_events`

**Auto-Creation**: RED alerts automatically create incident events (with deduplication)

**Deduplication**: Incidents deduplicated within 60 minutes using route/provider/fingerprint key

**Storage**: Database (Neon PostgreSQL)

**Access**: `/admin/prompt-health` dashboard

**Fields**: id, created_at, severity, title, detail, snapshot, resolved_at, resolution_note, dedupe_key

---

### Incident Recorder

**Module**: `lib/maya/incident-recorder.ts`

**Functions**:
- `recordIncidentEvent()` - Record incident (non-blocking)
- `hasRecentIncident()` - Check for recent duplicate
- `resolveIncident()` - Mark incident as resolved

**Rules**: Non-blocking, fails silently (doesn't break requests)

---

**Safe Mode + Incident Log now available** ✅

---

### Safe Mode + Incident Logging (Phase 6A)

**Purpose**: Reduce generation blast radius during incidents and automatically record incident notes.

**Safe Mode Flag**: `SAFE_MODE` environment variable (default: `false`)

**When Enabled** (`SAFE_MODE=true`):
- Tightens rate limits for high-cost routes (only those that already rate limit)
- Protects internal-only endpoints even if enforcement flag is off
- Adds extra logging to `prompt_audit_events` for errors

**Incident Recording**: Auto-recorded from RED alerts with deduplication (30-60 minute window)

**Storage**: `incident_events` table

**Dashboard**: `/admin/prompt-health` shows Safe Mode badge and Incidents section

**Documentation**: `docs/_CANONICAL/SAFE_MODE_POLICY.md`

---

**Safe Mode + Incident Logging now available** ✅
5. **Delete files without confirming** - Many are still used
6. **Touch NanoBanana builder** - Very complex, breaks easily
7. **Modify quality hooks** - Breaks data collection
8. **Change model versions** - Without explicit approval
9. **Refactor Feed Planner** - Without understanding state
10. **Optimize prematurely** - System works, don't break it

### ✅ Do:

1. **Use Prompt Authority** - For all prompt generation
2. **Check file usage** - Before archiving or deleting
3. **Read this document** - Before making changes
4. **Test thoroughly** - Before deploying
5. **Monitor quality metrics** - After changes
6. **Ask questions** - If unsure

---

## 12. FOUNDER'S QUICK REFERENCE

### FOUNDER QUICK ANSWERS ⚡

**Updated**: 2026-01-17 (Phase 2F)

#### "Where do prompts enter the system?"

**Answer**: 19 entry points total
- 10 API routes (external)
- 5 lib functions (internal builders)
- 4 component triggers (UI)

**Details**: See `docs/_CANONICAL/PROMPT_SURFACE_MAP.md`

---

#### "What's canonical today?"

**Answer**: 10 API routes use Prompt Authority correctly (100% of primary routes)
- ✅ `/api/maya/generate-video` - Video motion prompts
- ✅ `/api/feed/[feedId]/generate-profile` - Profile images
- ✅ `/api/maya/generate-prompt-suggestions` - Prompt suggestions (Migrated Phase 3A P0-1 - 2026-01-17)
- ✅ `/api/maya/generate-concepts` - Concept cards (Migrated Phase 3A P0-2 - 2026-01-17)
- ✅ `/api/blueprint/generate-concepts` - Blueprint concepts (Migrated Phase 3A P0-3 - 2026-01-17)
- ✅ `/api/maya/generate-feed-prompt` - Feed prompts (Migrated Phase 3B P1-1 - 2026-01-17)
- ✅ `/api/feed/[feedId]/generate-single` - Feed single post (Migrated Phase 3B P1-2 - 2026-01-17)
- ✅ `/api/maya/generate-studio-pro-prompts` - Studio Pro prompts (Migrated Phase 3B P1-3 - 2026-01-17)
- ✅ `/api/feed-planner/create-strategy` - Feed strategy (Migrated Phase 3B P1-4 - 2026-01-17)
- ✅ `/api/maya/pro/generate-image` - Pro Mode image generation (Migrated Phase 3C P0-1 - 2026-01-17)

**All primary routes now use Authority** ✅

---

#### "What's legacy but live?"

**Answer**: 13 of 19 entry points bypass Prompt Authority (68%)
- 7 API routes call builders directly
- 3 lib functions bypass Authority
- 3 component triggers bypass Authority

**Status**: ⚠️ Safe to use (they work), but don't add more

**Documented**: `docs/_CANONICAL/PROMPT_SURFACE_MAP.md` (full list with evidence)

---

#### "What files should NEVER be deleted?"

**Critical Files** (DO NOT DELETE):

1. **`lib/maya/prompt-generator.ts`**
   - Header says "deprecated" but it's ACTIVELY USED
   - Used by: 4 files (1 API, 3 components)
   - Purpose: Prompt suggestions for workbench
   - Status: ✅ ACTIVELY USED - DO NOT DELETE

2. **`lib/maya/direct-prompt-generation.ts`**
   - Name is misleading (sounds like builder, but it's validation helpers)
   - Used by: generate-concepts route
   - Purpose: Validation and fixes
   - Status: ✅ ACTIVELY USED - DO NOT DELETE

3. **`lib/maya/prompt-authority.ts`**
   - The canonical routing layer
   - Only 20% of routes use it, but it's the architectural intent
   - Status: ✅ CANONICAL - DO NOT TOUCH

4. **`lib/maya/prompt-constructor.ts`**
   - Classic Mode (FLUX LoRA) builder
   - Used by: 4 API routes
   - Status: ✅ ACTIVELY USED - DO NOT TOUCH

5. **`lib/maya/nano-banana-prompt-builder.ts`**
   - Pro Mode (NanoBanana) builder
   - Used by: 4 API routes
   - Status: ✅ ACTIVELY USED - DO NOT TOUCH

**Check Before Deleting**: Always check `PROMPT_SURFACE_MAP.md` for usage

---

#### "Where do I look first when confused?"

**Documentation Hierarchy**:

1. **This file** (`SYSTEM_REALITY.md`) - How things work NOW
2. **`PROMPT_SURFACE_MAP.md`** - All entry points mapped
3. **`PROMPT_AUTHORITY_POLICY.md`** - Rules for new work
4. **Phase 2E Report** - Detailed findings with evidence

**Code References**:
- `lib/maya/prompt-authority.ts` - The canonical layer
- File header comments - Status labels (✅/⚠️/❌)

---

### "What actually runs SSELFIE today?"

**Answer**: 
- Prompt Authority Layer is canonical (but only 20% use it)
- FLUX LoRA for Classic Mode (user's trained model)
- NanoBanana Pro for Pro Mode (complex compositions)
- WAN for videos (image-to-video)
- Quality monitoring tracks everything silently

### "Can I trust the 'deprecated' comments?"

**Answer**: ❌ NO. Files marked "deprecated" may still be in use. 

**Example**: `lib/maya/prompt-generator.ts` says "deprecated" but is actively used by 4 files.

**Always check**:
1. `PROMPT_SURFACE_MAP.md` for usage
2. File header comments (updated Phase 2F)
3. Grep for imports before deleting

### "What should I never touch?"

**Answer**: 
- Prompt Authority routing logic
- Prompt builders (constructor, nano-banana)
- NanoBanana builder (very fragile)
- Quality monitoring hooks
- Feed Planner orchestrator

**See**: "Do Not Touch List" in `PROMPT_SURFACE_MAP.md`

### "How do I know if something is legacy?"

**Answer**: 
- Check `PROMPT_SURFACE_MAP.md` - Lists all legacy-but-live entry points
- Check file header comments - Status labels (✅/⚠️/❌)
- Check if it bypasses Prompt Authority
- Check this document's "Legacy But Live" section

---

## 13. DOCUMENTATION HIERARCHY

**This document** (`SYSTEM_REALITY.md`):
- **What**: How things work NOW
- **Who**: Founder, decision-makers
- **When**: Always consult this first

**Other canonical docs** (`docs/_CANONICAL/`):
- Technical implementation details
- Historical context
- Deep dives

**Archive** (`docs/_ARCHIVE/`):
- Deprecated systems (if any)
- Historical documentation
- Old plans

---

## 14. MAINTENANCE

**When to update this document**:
- When prompt system changes
- When new models are added
- When legacy systems are removed
- When architecture shifts

**How to update**:
1. Make the change
2. Update this document immediately
3. Keep it accurate
4. Don't speculate

**Who maintains it**:
- Founder (final authority)
- Contributors (keep updated)
- AI assistant (suggest updates)

---

## END OF DOCUMENT

**Remember**: This is the single source of truth. When in doubt, this document is correct.

**Last verified**: 2026-01-17  
**Next review**: When system changes

---

**Status**: ✅ Current and accurate
