# MAYA PRO MODE: FILES TO REMOVE
## Unused Files That Can Be Safely Deleted

**Status:** ⚠️ REVIEW BEFORE DELETION  
**Created:** 2025-01-XX  
**Last Updated:** 2025-01-XX

---

## 🚨 IMPORTANT NOTES

1. **Backup First:** Create a backup branch before deleting
2. **Test After:** Verify Classic Mode still works after deletions
3. **Archive Option:** Move to `docs/archive/` instead of deleting if unsure
4. **100% Certain Only:** Only delete files you're 100% sure are unused

---

## ✅ FILES TO REMOVE (100% CERTAIN)

### **Workbench Components (NOT in Vision)**
These are NOT part of the sophisticated UX vision. The new Pro Mode uses concept cards, not workbench.

```
components/studio-pro/workbench-strip.tsx
components/studio-pro/workbench-input-strip.tsx
components/studio-pro/workbench-prompt-box.tsx
components/studio-pro/workbench-result-card.tsx
components/studio-pro/workbench-guide-column.tsx
components/studio-pro/multi-prompt-box.tsx
components/studio-pro/multi-prompt-workbench.tsx
components/studio-pro/carousel-workbench.tsx
```

**Reason:** Vision uses sophisticated concept cards, not workbench interface.

---

### **Old Pro Mode Components (NOT in Vision)**
These are replaced by the new sophisticated 4-step flow.

```
components/studio-pro/pro-mode-wrapper.tsx
components/studio-pro/pro-entry-flow.tsx
components/studio-pro/onboarding-flow.tsx
components/studio-pro/pro-dashboard.tsx
```

**Reason:** Vision uses 4-step image upload flow, not onboarding/dashboard.

---

### **Workflow Components (NOT in Vision)**
The vision doesn't include workflow-based generation.

```
components/studio-pro/workflows/edit-reuse-workflow.tsx
```

**Reason:** Vision uses concept cards and direct generation, not workflow forms.

---

## ⚠️ FILES TO REVIEW (NOT 100% CERTAIN)

### **Pro Asset Gallery**
```
components/studio-pro/pro-asset-gallery.tsx
```

**Status:** May be used for image selection in new library management.  
**Action:** Review if needed for "Choose from Gallery" functionality.

---

### **API Routes to Review**

These may still be called from Classic Mode or other parts:

```
app/api/studio-pro/generate/carousel/route.ts
app/api/studio-pro/generate/reel-cover/route.ts
app/api/studio-pro/generate/edit-reuse/route.ts
```

**Status:** Check if still used in `maya-chat-screen.tsx` or elsewhere.  
**Action:** Search codebase for imports/usage before deleting.

---

## 📚 DOCUMENTATION TO ARCHIVE

These docs reference old workbench/workflow systems and should be moved to archive:

```
docs/archive/STUDIO-PRO-WORKBENCH-REFACTOR-PLAN.md (already in archive)
docs/archive/STUDIO-PRO-ARCHITECTURE-ANALYSIS.md (already in archive)
docs/archive/STUDIO-PRO-WORKFLOWS-STATUS.md (already in archive)
docs/archive/STUDIO-PRO-UX-ANALYSIS.md (already in archive)
docs/archive/CONCEPT-CARDS-WORKBENCH-ARCHITECTURE.md (already in archive)
docs/archive/WORKBENCH-MAYA-INTEGRATION-PLAN.md (already in archive)
docs/archive/PROMPT-GENERATOR-TESTING-CHECKLIST.md (already in archive)
```

**Status:** Already in archive, no action needed.

---

## 🔍 VERIFICATION STEPS

Before deleting, verify:

1. **Search for imports:**
   ```bash
   grep -r "workbench-strip" components/
   grep -r "pro-mode-wrapper" components/
   grep -r "onboarding-flow" components/
   ```

2. **Check API usage:**
   ```bash
   grep -r "/api/studio-pro/generate/carousel" .
   grep -r "/api/studio-pro/generate/reel-cover" .
   ```

3. **Test Classic Mode:**
   - Verify Classic Mode still works
   - Verify concept generation still works
   - Verify image generation still works

---

## 📝 DELETION CHECKLIST

### **Before Deletion:**
- [ ] Create backup branch
- [ ] Search for all imports/usages
- [ ] Verify files are truly unused
- [ ] Test Classic Mode works

### **Files to Delete:**
- [ ] `components/studio-pro/workbench-strip.tsx`
- [ ] `components/studio-pro/workbench-input-strip.tsx`
- [ ] `components/studio-pro/workbench-prompt-box.tsx`
- [ ] `components/studio-pro/workbench-result-card.tsx`
- [ ] `components/studio-pro/workbench-guide-column.tsx`
- [ ] `components/studio-pro/multi-prompt-box.tsx`
- [ ] `components/studio-pro/multi-prompt-workbench.tsx`
- [ ] `components/studio-pro/carousel-workbench.tsx`
- [ ] `components/studio-pro/pro-mode-wrapper.tsx`
- [ ] `components/studio-pro/pro-entry-flow.tsx`
- [ ] `components/studio-pro/onboarding-flow.tsx`
- [ ] `components/studio-pro/pro-dashboard.tsx`
- [ ] `components/studio-pro/workflows/edit-reuse-workflow.tsx`

### **After Deletion:**
- [ ] Remove imports from `maya-chat-screen.tsx`
- [ ] Remove workbench state from `maya-chat-screen.tsx`
- [ ] Remove workflow state from `maya-chat-screen.tsx`
- [ ] Test Classic Mode
- [ ] Test Pro Mode (if partially implemented)
- [ ] Commit changes

---

## 🎯 SUMMARY

**Total Files to Remove:** 13 components

**Categories:**
- Workbench components: 8 files
- Old Pro Mode components: 4 files
- Workflow components: 1 file

**Estimated Cleanup:**
- Removes ~5,000+ lines of unused code
- Simplifies `maya-chat-screen.tsx` significantly
- Aligns codebase with sophisticated UX vision

---

**Ready to clean up? Follow the checklist above! 🚀**
