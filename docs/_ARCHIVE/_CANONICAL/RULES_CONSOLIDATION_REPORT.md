# Cursor Rules Consolidation Report
**Date:** 2026-01-16  
**Phase:** 2R - Implementation  
**Status:** Step A Complete - Inventory

---

## EXECUTIVE SUMMARY

Found **7 Cursor rule files** across multiple locations with significant duplication and conflicts. Current state creates confusion about which rules are authoritative.

**Key Findings:**
- ✅ No active `.cursorrules` file in root (good - clean slate)
- ⚠️ Multiple backup files with overlapping content
- ⚠️ Active rules in `.cursor/rules/` directory
- ⚠️ Conflicting directives about autonomous behavior
- ⚠️ Duplicate business invariants across files

---

## INVENTORY OF CURSOR RULE FILES

### 1. `.cursorrules.backup-20260104` (503 lines)
**Location:** `/Users/MD760HA/sselfie-9g-1/.cursorrules.backup-20260104`  
**Status:** Backup file (not active)  
**Purpose:** Comprehensive rules covering cost optimization, safety, testing, migrations, AI API standards  
**Key Content:**
- Cost optimization goals (70-85% reduction)
- ALEX vs MAYA API differences
- Migration handling
- Virtual dev team rules (proactive scanning, daily responsibilities)
- Weekly optimization guidelines

**Conflicts/Issues:**
- ❌ Encourages "proactive scanning" and "daily health checks" (too autonomous for live product)
- ❌ Includes "VIRTUAL DEV TEAM RULES" section that encourages broad autonomous changes
- ⚠️ Mixes Phase AO concepts with older optimization-focused rules
- ⚠️ Contains outdated cost reduction targets that may not be current

---

### 2. `.cursor/rules/CURSOR_RULES_PHASE_AO.md` (315 lines)
**Location:** `/Users/MD760HA/sselfie-9g-1/.cursor/rules/CURSOR_RULES_PHASE_AO.md`  
**Status:** Active (likely being used by Cursor)  
**Purpose:** Phase AO (Autonomous Operations Mode) rules - most current and aligned with live product  
**Key Content:**
- Primary directive (Sandra is non-technical, autonomous execution)
- Business invariants (free users, paid blueprint, members, payments)
- Critical files list (edit requires approval)
- Autonomous workflow (Observe → Diagnose → Implement → Verify → Report)
- Stop conditions
- Migration rules
- Testing strategy
- Output format requirements

**Conflicts/Issues:**
- ✅ Most aligned with current system state
- ⚠️ References `SYSTEM.md` which exists but may not be canonical
- ⚠️ Mentions `docs/_CANONICAL/EXECUTION_STATUS.md` as authoritative (good)
- ⚠️ No explicit mention of 3 MODES (AUDIT/IMPLEMENT/REFACTOR)

---

### 3. `.cursorrules.backup/cursor rules` (503 lines)
**Location:** `/Users/MD760HA/sselfie-9g-1/.cursorrules.backup/cursor rules`  
**Status:** Backup file (duplicate of #1)  
**Purpose:** Identical content to `.cursorrules.backup-20260104`  
**Conflicts/Issues:**
- ❌ Exact duplicate - should be archived

---

### 4. `.cursorrules-directory-backup/cursor rules` (498 lines)
**Location:** `/Users/MD760HA/sselfie-9g-1/.cursorrules-directory-backup/cursor rules`  
**Status:** Backup file (slightly different version)  
**Purpose:** Similar to #1 but missing "ALWAYS CREATE BACKUPS" section  
**Conflicts/Issues:**
- ❌ Near-duplicate with minor differences
- ⚠️ Missing backup creation rule (inconsistent)

---

### 5. `CURSOR_RULES_LEGACY_BUILD_MODE.md` (60 lines)
**Location:** `/Users/MD760HA/sselfie-9g-1/CURSOR_RULES_LEGACY_BUILD_MODE.md`  
**Status:** Legacy (root-level, not active)  
**Purpose:** Legacy build mode rules - minimal content  
**Key Content:**
- File size limits (components max 300 lines, API routes max 400 lines)
- Testing requirements
- Communication style

**Conflicts/Issues:**
- ⚠️ File size limits conflict with reality (many files exceed these limits)
- ⚠️ Not referenced anywhere - likely obsolete

---

### 6. `SYSTEM.md` (220 lines)
**Location:** `/Users/MD760HA/sselfie-9g-1/SYSTEM.md`  
**Status:** Root-level system doc (referenced by Phase AO rules)  
**Purpose:** System architecture overview, not a Cursor rule file  
**Key Content:**
- Tech stack overview
- Main subsystems
- Critical files list
- High-risk areas
- AI-safe boundaries

**Conflicts/Issues:**
- ⚠️ Referenced by Phase AO rules but not in `docs/_CANONICAL/`
- ⚠️ May conflict with `docs/_CANONICAL/SYSTEM_REALITY.md`
- ✅ Useful reference but should not be treated as Cursor rules

---

### 7. `docs/_CANONICAL/SYSTEM_REALITY.md` (56 lines)
**Location:** `/Users/MD760HA/sselfie-9g-1/docs/_CANONICAL/SYSTEM_REALITY.md`  
**Status:** Canonical (authoritative)  
**Purpose:** Verified system state, not Cursor rules  
**Key Content:**
- Authority declaration (`docs/_CANONICAL/` is authoritative)
- Verified system state
- Phase B/C enforcement details
- Gated endpoints

**Conflicts/Issues:**
- ✅ Correctly positioned as canonical
- ⚠️ Not a Cursor rule file, but should reference where Cursor rules live

---

## CONFLICT ANALYSIS

### Major Conflicts

1. **Autonomous Behavior Level**
   - **Backup files (#1, #3, #4):** Encourage "proactive scanning", "daily health checks", "automatic fixes"
   - **Phase AO (#2):** More conservative, requires explicit workflow steps
   - **Resolution Needed:** Phase AO approach is safer for live product

2. **Business Invariants**
   - **All files:** Contain similar but slightly different lists of invariants
   - **Phase AO (#2):** Most complete and current
   - **Resolution Needed:** Consolidate into single authoritative list

3. **Critical Files Lists**
   - **Backup files:** Generic critical files list
   - **Phase AO (#2):** More specific, aligned with current system
   - **SYSTEM.md (#6):** Different list with risk levels
   - **Resolution Needed:** Single authoritative list in constitution

4. **Migration Rules**
   - **Backup files:** Generic migration template
   - **Phase AO (#2):** More specific about when migrations are allowed
   - **Resolution Needed:** Phase AO rules are more appropriate

5. **Output Format**
   - **Phase AO (#2):** Requires specific output format (✅/⚠️/❌ table, etc.)
   - **Backup files:** Less structured
   - **Resolution Needed:** Keep Phase AO format requirement

### Duplications

- Files #1, #3, #4 are essentially duplicates (503, 503, 498 lines)
- Business invariants repeated across all files
- Critical files lists repeated with variations
- Migration rules repeated with variations

---

## RECOMMENDATIONS

### Immediate Actions

1. **Archive all backup files** to `docs/_ARCHIVE/cursor-rules/2026-01-16/`
2. **Create single authoritative constitution** at `docs/_CANONICAL/CURSOR_CONSTITUTION.md`
3. **Update Phase AO file** to point to constitution (or replace it)
4. **Create minimal `.cursorrules`** that points to constitution
5. **Update SYSTEM_REALITY.md** to reference constitution location

### Design Principles for New Constitution

1. **3 Explicit Modes:** AUDIT / IMPLEMENT / REFACTOR (mutually exclusive)
2. **Business Invariants:** Single authoritative list from Phase AO
3. **Stop Conditions:** Clear, unambiguous
4. **Output Format:** Required for every response
5. **No Proactive Scanning:** Remove autonomous "daily health check" language
6. **Suggest-Only:** Convert proactive improvements to suggestions requiring approval

---

## NEXT STEPS

✅ **Step A Complete** - Inventory finished  
⏭️ **Step B Next** - Design `CURSOR_CONSTITUTION.md`  
⏭️ **Step C** - Archive legacy files  
⏭️ **Step D** - Final report

---

## FILES TO ARCHIVE

1. `.cursorrules.backup-20260104` → `docs/_ARCHIVE/cursor-rules/2026-01-16/.cursorrules.backup-20260104`
2. `.cursorrules.backup/cursor rules` → `docs/_ARCHIVE/cursor-rules/2026-01-16/.cursorrules.backup-cursor-rules`
3. `.cursorrules-directory-backup/cursor rules` → `docs/_ARCHIVE/cursor-rules/2026-01-16/.cursorrules-directory-backup-cursor-rules`
4. `CURSOR_RULES_LEGACY_BUILD_MODE.md` → `docs/_ARCHIVE/cursor-rules/2026-01-16/CURSOR_RULES_LEGACY_BUILD_MODE.md`
5. `.cursor/rules/CURSOR_RULES_PHASE_AO.md` → `docs/_ARCHIVE/cursor-rules/2026-01-16/CURSOR_RULES_PHASE_AO.md` (after extracting good parts)

---

**Report Complete - Ready for Step B**
