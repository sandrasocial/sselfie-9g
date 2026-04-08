# Pre-Commit Cleanup Analysis

## 📊 Summary

**Total Uncommitted Files:** 60+ files
**Status:** Most files are actively used. Some cleanup recommended before commit.

## ✅ Files to KEEP (Actively Used)

### Core Studio Pro Implementation
- ✅ `app/api/maya/generate-studio-pro/` - Main generation endpoint (USED)
- ✅ `app/api/maya/generate-studio-pro-prompts/` - Prompt generation (USED)
- ✅ `app/api/maya/check-studio-pro/` - Status polling (USED)
- ✅ `app/api/gallery/images/` - Gallery selection (USED)
- ✅ `components/studio-pro/` - All components are used
- ✅ `components/sselfie/prompt-suggestion-card.tsx` - Used in maya-chat-screen
- ✅ `lib/maya/nano-banana-prompt-builder.ts` - Core prompt building
- ✅ `lib/maya/pro-personality.ts` - Studio Pro personality
- ✅ `lib/maya/studio-pro-system-prompt.ts` - System prompts
- ✅ `lib/maya/type-guards.ts` - Type safety
- ✅ `lib/nano-banana-client.ts` - Nano Banana API client
- ✅ `lib/feature-flags.ts` - Feature flag management

### Prompt Generation System
- ✅ `app/api/maya/generate-prompt-suggestions/` - Used in maya-chat-screen.tsx
- ✅ `lib/maya/prompt-generator.ts` - Used by generate-prompt-suggestions
- ✅ `lib/maya/prompt-templates/` - All templates used by prompt-generator

### Scene Composer (If Still Active)
- ✅ `app/api/scene-composer/` - Used (scene-composer-template.ts imported)
- ✅ `lib/maya/scene-composer-template.ts` - Used by scene-composer routes

### Studio Pro API Routes (Mixed - See Below)
- ✅ `app/api/studio-pro/avatar/` - USED (onboarding, workflows)
- ✅ `app/api/studio-pro/brand-assets/` - USED (onboarding)
- ✅ `app/api/studio-pro/brand-kits/` - USED (onboarding)
- ✅ `app/api/studio-pro/setup/` - USED (status checks)
- ✅ `app/api/studio-pro/generations/` - USED (gallery)
- ⚠️ `app/api/studio-pro/generate/carousel/` - STILL CALLED (but may be deprecated)
- ⚠️ `app/api/studio-pro/generate/reel-cover/` - STILL CALLED (but may be deprecated)
- ⚠️ `app/api/studio-pro/generate/edit-reuse/` - STILL CALLED (but may be deprecated)
- ⚠️ `app/api/studio-pro/workflows/` - Status unclear

### Documentation (Keep All)
- ✅ All `.md` files - Documentation is valuable

### Database Scripts
- ✅ `scripts/11-scene-composer-table.sql` - Migration script
- ✅ `scripts/12-rollback-scene-composer-table.sql` - Rollback script
- ✅ `scripts/migrations/` - Keep migration scripts

## ⚠️ Files Requiring Review

### 1. Deprecated Studio Pro Generate Routes
**Status:** Still being called but marked for deprecation in docs

**Files:**
- `app/api/studio-pro/generate/carousel/route.ts`
- `app/api/studio-pro/generate/reel-cover/route.ts`
- `app/api/studio-pro/generate/edit-reuse/route.ts`

**Current Usage:**
- `maya-chat-screen.tsx` line 684: calls `/api/studio-pro/generate/carousel`
- `maya-chat-screen.tsx` line 770: calls `/api/studio-pro/generate/reel-cover`
- `edit-reuse-workflow.tsx` line 159: calls `/api/studio-pro/generate/edit-reuse`

**Recommendation:**
- **Option A:** Keep for now, migrate to `/api/maya/generate-studio-pro` in next PR
- **Option B:** Remove now and update all callers to use unified endpoint

**Decision Needed:** Are these routes still needed or should they be removed?

### 2. Studio Pro Workflows Route
**File:** `app/api/studio-pro/workflows/route.ts`

**Status:** Marked as deprecated in `STUDIO-PRO-WORKBENCH-REFACTOR-PLAN.md`

**Current Usage:** Not found in codebase search

**Recommendation:** ✅ **SAFE TO REMOVE** - Not being used

## 🗑️ Files to REMOVE (Unused/Deprecated)

### 1. Studio Pro Workflows Route ✅ REMOVED
```bash
# Already removed: app/api/studio-pro/workflows/route.ts
```

**Reason:** Marked deprecated, not used anywhere, verified no references in codebase

## 📝 Files to Review Before Commit

### Documentation Files
All documentation files are fine to commit, but consider:
- Some are planning documents that may be outdated
- Consider moving to `/docs/` folder for organization

**Files:**
- `STUDIO-PRO-ARCHITECTURE-ANALYSIS.md` - Analysis doc
- `STUDIO-PRO-REBUILD-PLAN.md` - Planning doc
- `STUDIO-PRO-WORKBENCH-REFACTOR-PLAN.md` - Planning doc
- `STUDIO-PRO-UX-ANALYSIS.md` - Analysis doc
- `STUDIO-PRO-WORKFLOWS-STATUS.md` - Status doc
- `WORKBENCH-MAYA-INTEGRATION-PLAN.md` - Planning doc
- `SCENE-COMPOSER-CLEANUP-SUMMARY.md` - Cleanup doc
- `STUDIO-PRO-PRODUCTION-READINESS.md` - Production review
- `PROMPT-GENERATOR-TESTING-CHECKLIST.md` - Testing checklist

**Recommendation:** Keep all, but consider organizing into `/docs/` folder

## 🔍 Verification Checklist

Before committing, verify:

- [ ] All Studio Pro components are imported and used
- [ ] All API routes are called from somewhere
- [ ] No broken imports (check for `prompt-suggestion-card` in wrong location)
- [ ] Scene Composer is still an active feature (if not, remove those files)
- [ ] Deprecated routes decision made (keep or remove)

## 🎯 Recommended Actions

### Immediate (Before Commit)
1. ✅ **Removed:** `app/api/studio-pro/workflows/` (unused) - DONE
2. ⚠️ **Decide:** Keep or remove deprecated generate routes (see below)
3. ✅ **Verify:** All imports work (especially prompt-suggestion-card)

### Optional (Can Do Later)
1. Organize documentation into `/docs/` folder
2. Migrate deprecated routes to unified endpoint
3. Add comments marking deprecated routes for future removal

## 📋 Commit Strategy

### Option 1: Clean Commit (Recommended)
```bash
# Unused files already removed (workflows route)

# Commit everything else
git add .
git commit -m "feat: Studio Pro mode with workbench integration

- Add Studio Pro mode with workbench UI
- Implement prompt generation system
- Add Nano Banana Pro integration
- Add multi-prompt and carousel workbenches
- Add production-ready error handling
- Fix user context duplication bug"
```

### Option 2: Commit As-Is
```bash
# Commit everything, clean up later
git add .
git commit -m "feat: Studio Pro mode implementation"
```

**Recommendation:** Use Option 1 - remove unused files first for cleaner history.
