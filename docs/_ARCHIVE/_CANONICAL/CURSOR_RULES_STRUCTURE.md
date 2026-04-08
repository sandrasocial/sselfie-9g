# Cursor Rules Structure

**Date:** 2026-01-17  
**Status:** Active

## Current Structure

SSELFIE Studio uses a dual-pointer approach for Cursor rules:

### 1. Entry Point (Root)
- **File:** `.cursorrules` (root of project)
- **Purpose:** Legacy format entry point that Cursor automatically picks up
- **Content:** Points to the authoritative constitution document

### 2. Modern Project Rules
- **Location:** `.cursor/rules/sselfie-constitution.md`
- **Purpose:** Modern Cursor project rules format
- **Content:** Quick reference + pointer to full constitution

### 3. Authoritative Source
- **Location:** `docs/_CANONICAL/CURSOR_CONSTITUTION.md`
- **Purpose:** Single source of truth for all Cursor AI behavior
- **Content:** Complete rules, operating modes, business invariants, workflows

## Why This Structure?

1. **Backward Compatibility:** `.cursorrules` ensures older Cursor versions work
2. **Modern Best Practice:** `.cursor/rules/` follows new Cursor project rules standard
3. **Maintainability:** All actual rules in one well-documented location
4. **Version Control:** Everything is committed and tracked

## How It Works

```
User opens Cursor
    ↓
Cursor reads .cursorrules (root)
    ↓
Also reads .cursor/rules/sselfie-constitution.md
    ↓
Both point to docs/_CANONICAL/CURSOR_CONSTITUTION.md
    ↓
AI reads full constitution
    ↓
AI operates according to rules
```

## Files Deleted During Cleanup

### Backup Files (Removed)
- `.cursorrules-directory-backup/` (folder)
- `.cursorrules.backup/` (folder)
- `.cursorrules.backup-20260104` (file)
- `.cursor/rules/CURSOR_RULES_PHASE_AO.md` (superseded by constitution)
- `CURSOR_RULES_LEGACY_BUILD_MODE.md` (root, legacy)

### Archived (Still in repo but archived)
- `docs/_ARCHIVE/cursor-rules/2026-01-16/` - Historical versions preserved

## Rules Hierarchy

1. **AUTHORITATIVE** (single source of truth):
   - `docs/_CANONICAL/CURSOR_CONSTITUTION.md`

2. **POINTERS** (reference the authoritative doc):
   - `.cursorrules` (root)
   - `.cursor/rules/sselfie-constitution.md`

3. **SUPPORTING DOCS** (context):
   - `docs/_CANONICAL/SYSTEM_REALITY.md`
   - `docs/_CANONICAL/EXECUTION_STATUS.md`
   - `docs/_CANONICAL/NEXT_PHASE.md`
   - `docs/_CANONICAL/DRIFT_RULES.md`

## Maintenance

### To Update Rules
1. Edit `docs/_CANONICAL/CURSOR_CONSTITUTION.md` only
2. Do NOT edit the pointer files unless structure changes
3. Increment version number in constitution
4. Document changes in constitution changelog

### To Add Domain-Specific Rules
If needed in the future:
1. Create new file in `.cursor/rules/domain-name.md`
2. Use for scoped rules (e.g., frontend-only, admin-only)
3. Still reference constitution for global rules

## Verification

✅ Root `.cursorrules` exists and points to constitution  
✅ `.cursor/rules/sselfie-constitution.md` exists and points to constitution  
✅ `docs/_CANONICAL/CURSOR_CONSTITUTION.md` is complete and authoritative  
✅ All backup files removed  
✅ Legacy files archived or removed  
✅ Root directory clean (only essential MD files)

---

**Last Updated:** 2026-01-17  
**Next Review:** When major Cursor updates occur or structure needs change
