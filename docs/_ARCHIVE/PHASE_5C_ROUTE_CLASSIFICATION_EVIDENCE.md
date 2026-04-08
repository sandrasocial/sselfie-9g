# PHASE 5C ROUTE CLASSIFICATION EVIDENCE

**Date**: 2026-01-17  
**Phase**: 5C - Internal-Only Enforcement Rollout  
**Purpose**: Evidence-based classification of routes as PUBLIC/INTERNAL/ADMIN

---

## CLASSIFICATION RATIONALE

### PUBLIC Routes
Routes used by **user-facing app flows** (Maya chat, Feed Planner, Blueprint, etc.)

**Criteria**:
- Called directly from UI components
- Part of core product features
- User-initiated actions
- No internal-only use case

**Routes**: EP-01, EP-03, EP-04, EP-05, EP-06, EP-07, EP-08, EP-09, EP-10

---

### INTERNAL Routes
Routes used by **backend jobs, internal tools, or admin-only features** (not user-facing)

**Criteria**:
- Called only from internal systems
- Not part of public API surface
- Tightly coupled to specific UI components
- No external use case

**Routes**: EP-02

**Evidence**:
- EP-02 (`/api/maya/generate-prompt-suggestions`): Used only by workbench UI (`components/sselfie/maya-chat-screen.tsx`), not documented as public API

---

### ADMIN Routes
Routes under `/api/admin/**` - **must be admin-only**

**Criteria**:
- Path starts with `/api/admin/`
- Requires admin authentication
- Used only by admin dashboard

**Routes**: All `/api/admin/**` routes

**Evidence**: Admin routes use `checkAdminAccess()` pattern (Supabase auth + user role check)

---

## TRAFFIC INVENTORY (FROM PROMPT_AUDIT_EVENTS)

**Note**: Traffic inventory should be run against production `prompt_audit_events` table to confirm actual usage patterns.

**Query**:
```sql
SELECT 
  route_id,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM prompt_audit_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY route_id
ORDER BY event_count DESC;
```

**Expected Results** (to be verified):
- EP-01 through EP-10: Should show user-facing traffic (many events, many unique users)
- EP-02: May show lower traffic if internal-only (fewer events, fewer unique users)

**Action**: If EP-02 shows significant public usage, reclassify as PUBLIC.

---

## CLASSIFICATION TABLE

| EP ID | Route | Classification | Reason | Evidence |
|-------|-------|----------------|--------|----------|
| EP-01 | `/api/maya/generate-concepts` | **PUBLIC** | Used by Maya chat UI (user-facing) | `components/sselfie/maya-chat-screen.tsx:461-788` |
| EP-02 | `/api/maya/generate-prompt-suggestions` | **INTERNAL** | Used only by workbench UI, not public API | `components/sselfie/maya-chat-screen.tsx` (workbench only) |
| EP-03 | `/api/maya/generate-feed-prompt` | **PUBLIC** | Used by feed generation (user-facing) | Feed generation flow |
| EP-04 | `/api/maya/pro/generate-image` | **PUBLIC** | Used by Pro Mode image generation (user-facing) | Pro Mode generation flow |
| EP-05 | `/api/feed/[feedId]/generate-single` | **PUBLIC** | Used by feed single post generation (user-facing) | Feed single post flow |
| EP-06 | `/api/blueprint/generate-concepts` | **PUBLIC** | Used by blueprint onboarding (user-facing) | `components/blueprint/blueprint-concept-card.tsx:23-30` |
| EP-07 | `/api/maya/generate-studio-pro-prompts` | **PUBLIC** | Used by Studio Pro feature (user-facing) | Studio Pro flow |
| EP-08 | `/api/feed-planner/create-strategy` | **PUBLIC** | Used by Feed Planner (user-facing, though deprecated) | Feed Planner flow |
| EP-09 | `/api/feed/[feedId]/generate-profile` | **PUBLIC** | Used by feed profile generation (user-facing) | Feed profile flow |
| EP-10 | `/api/maya/generate-video` | **PUBLIC** | Used by video generation (user-facing) | `components/sselfie/b-roll-screen.tsx:172,198` |

---

## ADMIN ROUTES CLASSIFICATION

**Pattern**: All routes under `/api/admin/**` are **ADMIN** (enforced)

**Examples**:
- `/api/admin/prompt-health` - Admin dashboard
- `/api/admin/quality-report` - Admin quality reports
- `/api/admin/academy/**` - Admin academy management
- `/api/admin/agent/**` - Admin agent tools

**Evidence**: All admin routes use `checkAdminAccess()` pattern or `ADMIN_EMAIL` check

---

## ENFORCEMENT DECISION

**INTERNAL Routes to Enforce**:
- EP-02 (`/api/maya/generate-prompt-suggestions`) - Add internal-only guard

**ADMIN Routes to Enforce**:
- All `/api/admin/**` routes - Ensure admin auth is consistent

**PUBLIC Routes**:
- No enforcement (remain public)

---

## VALIDATION PLAN

1. **Before Enforcement**: Run traffic inventory query to confirm EP-02 is truly internal-only
2. **After Enforcement**: Monitor prompt-health dashboard for 401/403 spikes
3. **Rollback**: If EP-02 shows public usage, reclassify as PUBLIC and remove enforcement

---

**Last Updated**: 2026-01-17  
**Status**: ✅ Classification complete, awaiting traffic inventory validation
