# MAYA PRO MODE: IMPLEMENTATION START GUIDE
## Step-by-Step Implementation Order & Focus Management

**Status:** 📋 READY TO START  
**Created:** 2025-01-XX  
**Last Updated:** 2025-01-XX

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### **PHASE 0: PREPARATION (Do First)**
**Goal:** Clean workspace, verify context, set up tracking

1. **Clean Up Root Documents** ✅ START HERE
   - Review root-level `.md` files
   - Move outdated docs to `docs/archive/` if needed
   - Keep only active setup guides (STRIPE_SETUP.md, REPLICATE_SETUP.md, etc.)

2. **Create Feature Branch**
   ```bash
   git checkout -b pro-mode-sophisticated-cleanup
   ```

3. **Set Up Progress Tracking**
   - Open `docs/MAYA-PRO-MODE-IMPLEMENTATION-CHECKLIST.md`
   - We'll check off tasks as we complete them

4. **Verify Current State**
   - Test Classic Mode works
   - Note any current issues
   - Document baseline behavior

---

### **PHASE 1: CLEANUP & SEPARATION** 🧹
**Goal:** Remove dead code, separate Classic from Pro

**Order:**
1. Remove unused components (13 files)
2. Remove workbench/workflow code from `maya-chat-screen.tsx`
3. Clean up `pro-personality.ts`
4. Simplify API routes
5. Test Classic Mode after each step

**Why This Order:**
- Removing unused files first reduces confusion
- Cleaning `maya-chat-screen.tsx` reduces complexity
- Testing after each step catches issues early

---

### **PHASE 2: SOPHISTICATED UX** 🎨
**Goal:** Build new Pro Mode experience

**Order:**
1. Create design system file
2. Build 4-step image upload flow
3. Build concept cards (sophisticated)
4. Build library management modal
5. Build Pro Mode chat interface

**Why This Order:**
- Design system first ensures consistency
- Upload flow is entry point
- Concept cards are core feature
- Library management supports workflow
- Chat interface ties everything together

---

### **PHASE 3: LOGIC & INTEGRATION** ⚙️
**Goal:** Wire everything together

**Order:**
1. Category system
2. Prompt builder
3. State management hooks
4. API routes
5. Chat flow logic
6. End-to-end testing

**Why This Order:**
- Category system is foundation
- Prompt builder uses categories
- State management connects UI to logic
- API routes handle data
- Chat flow orchestrates everything
- Testing verifies complete flow

---

## 🔍 ROOT DOCUMENT CLEANUP

### **Files in Root to Review:**

```
RLS-IMPLEMENTATION-GUIDE.md      → Keep (active guide)
SCALING-GUIDE.md                 → Review (may be outdated)
STRIPE_SETUP.md                  → Keep (active setup)
CRON-SETUP.md                    → Keep (active setup)
REPLICATE_SETUP.md               → Keep (active setup)
README.md                        → Keep (project readme)
```

### **Action:**
1. Review each file
2. If outdated → Move to `docs/archive/`
3. If active → Keep in root
4. Document decision in this file

---

## 🎯 FOCUS MANAGEMENT STRATEGY

### **How to Keep Me Focused:**

#### **1. One Task at a Time**
- ✅ Give me ONE specific task per message
- ✅ Wait for completion before next task
- ✅ Example: "Remove workbench-strip.tsx and its imports"

#### **2. Reference Specific Files**
- ✅ Always mention file paths
- ✅ Point to specific line numbers if relevant
- ✅ Example: "In maya-chat-screen.tsx line 35, remove WorkbenchStrip import"

#### **3. Verify Before Moving On**
- ✅ Ask me to verify after each change
- ✅ Test Classic Mode after deletions
- ✅ Example: "After removing this, test Classic Mode concept generation"

#### **4. Use Checklists**
- ✅ Reference `MAYA-PRO-MODE-IMPLEMENTATION-CHECKLIST.md`
- ✅ Check off tasks as we complete them
- ✅ Example: "Mark task 1.2.1 as complete"

#### **5. Ask Questions When Unsure**
- ✅ If I'm unsure, I'll ask before assuming
- ✅ If you see me assuming, correct me immediately
- ✅ Example: "Wait, don't assume that - check the actual code first"

---

## 📋 CONTEXT PRESERVATION

### **What I Need to Remember:**

#### **Critical Rules:**
1. **DO NOT touch Classic Mode** - Only Pro Mode changes
2. **Test Classic Mode after every change** - Safety first
3. **Follow vision exactly** - No emojis in UI, editorial quality
4. **One task at a time** - Don't rush, verify each step

#### **Current State:**
- Classic Mode: Works, don't break it
- Pro Mode: Needs cleanup and rebuild
- Workbench: Remove (not in vision)
- Workflows: Remove (not in vision)

#### **Vision Principles:**
- Editorial quality throughout
- Clean UI (no emojis except Maya's chat)
- Professional typography (Canela, Hatton, Inter)
- Visible expertise (categories, brands, templates)
- Transparent systems

---

## 🚨 PREVENTING ASSUMPTIONS

### **When I Should Ask:**

1. **Before Removing Code:**
   - "Is this still used in Classic Mode?"
   - "Should I check for other usages first?"

2. **Before Creating New Files:**
   - "Does this match the vision exactly?"
   - "Should I reference the design system?"

3. **Before Changing Logic:**
   - "How does Classic Mode handle this?"
   - "Should Pro Mode work differently?"

4. **When Unsure:**
   - "I'm not 100% certain - should I verify first?"
   - "This might affect Classic Mode - should I test?"

---

## 📝 WORKFLOW TEMPLATE

### **For Each Task:**

```
1. READ: Read relevant files
2. VERIFY: Check current state
3. PLAN: Explain what I'll do
4. ASK: Confirm if unsure
5. IMPLEMENT: Make changes
6. VERIFY: Test Classic Mode
7. DOCUMENT: Update checklist
8. REPORT: Summarize what was done
```

### **Example Task Flow:**

**Task:** Remove workbench-strip.tsx

1. **READ:** Check workbench-strip.tsx and its imports
2. **VERIFY:** Search for all usages in codebase
3. **PLAN:** "I'll remove the file and all imports from maya-chat-screen.tsx"
4. **ASK:** "Should I also remove related state variables?"
5. **IMPLEMENT:** Delete file, remove imports, remove state
6. **VERIFY:** Test Classic Mode still works
7. **DOCUMENT:** Mark task complete in checklist
8. **REPORT:** "Removed workbench-strip.tsx and cleaned up 3 imports"

---

## ✅ STARTING CHECKLIST

### **Before We Begin:**

- [ ] Review this document
- [ ] Review root documents (move outdated ones)
- [ ] Create feature branch
- [ ] Open implementation checklist
- [ ] Test Classic Mode (baseline)
- [ ] Confirm you're ready to start

### **First Task:**

- [ ] Clean up root documents (if any outdated)
- [ ] Verify current state
- [ ] Start Phase 1, Step 1: Remove unused components

---

## 🎯 NEXT STEPS

1. **You:** Review root documents, move outdated ones to archive
2. **You:** Create feature branch
3. **You:** Tell me "Start with Phase 1, Step 1: Remove unused components"
4. **Me:** I'll follow the workflow template above
5. **We:** Work through tasks one at a time, verifying as we go

---

## 📚 REFERENCE DOCUMENTS

- **Main Plan:** `docs/MAYA-PRO-MODE-CLEANUP-PLAN.md`
- **Checklist:** `docs/MAYA-PRO-MODE-IMPLEMENTATION-CHECKLIST.md`
- **Quick Reference:** `docs/MAYA-PRO-MODE-QUICK-REFERENCE.md`
- **Files to Remove:** `docs/MAYA-PRO-MODE-FILES-TO-REMOVE.md`
- **Vision Alignment:** `docs/MAYA-PRO-MODE-VISION-ALIGNMENT.md`

---

**Ready to start? Let's begin with root document cleanup! 🚀**
