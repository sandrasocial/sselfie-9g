# MAYA PRO MODE: CONTEXT MANAGEMENT GUIDE
## How to Keep AI Assistant Focused & Prevent Errors

**Status:** 📋 ACTIVE GUIDE  
**Created:** 2025-01-XX  
**Last Updated:** 2025-01-XX

---

## 🎯 THE PROBLEM

When working on large refactors, AI assistants can:
- ❌ Lose context across long conversations
- ❌ Make assumptions about code logic
- ❌ Miss important details
- ❌ Skip verification steps
- ❌ Break existing functionality

---

## ✅ THE SOLUTION

### **1. ONE TASK PER MESSAGE**

**❌ BAD:**
```
"Remove all workbench files, clean up maya-chat-screen.tsx, 
update pro-personality.ts, and create the new design system"
```

**✅ GOOD:**
```
"Remove workbench-strip.tsx and all its imports from maya-chat-screen.tsx"
```

**Why:** One task = focused attention = fewer mistakes

---

### **2. SPECIFIC FILE REFERENCES**

**❌ BAD:**
```
"Remove the workbench code"
```

**✅ GOOD:**
```
"In maya-chat-screen.tsx, remove:
- Line 35: import WorkbenchStrip
- Line 38: import isWorkbenchModeEnabled
- Lines 202-238: workbench state variables
- Lines 4786-4787: workbench rendering"
```

**Why:** Specific references = no guessing = accurate changes

---

### **3. VERIFY BEFORE ASSUMING**

**❌ BAD:**
```
AI: "I'll remove this code" [assumes it's safe]
```

**✅ GOOD:**
```
AI: "Before removing, let me check if this is used in Classic Mode"
You: "Yes, verify first"
AI: [Checks code] "Found 3 usages, all in Pro Mode only. Safe to remove."
```

**Why:** Verification = safety = no breaking changes

---

### **4. USE CHECKLISTS**

**❌ BAD:**
```
"Work through the cleanup"
```

**✅ GOOD:**
```
"Complete task 1.2.1 from MAYA-PRO-MODE-IMPLEMENTATION-CHECKLIST.md:
- Remove workbench-strip.tsx
- Remove imports from maya-chat-screen.tsx
- Test Classic Mode
- Mark task complete"
```

**Why:** Checklists = structure = nothing missed

---

### **5. TEST AFTER EACH CHANGE**

**❌ BAD:**
```
"Remove all files, then test at the end"
```

**✅ GOOD:**
```
"Remove workbench-strip.tsx → Test Classic Mode → 
Remove next file → Test Classic Mode → Continue"
```

**Why:** Incremental testing = catch issues early = easier fixes

---

## 📋 WORKFLOW TEMPLATE

### **For Every Task:**

```
┌─────────────────────────────────────────┐
│ 1. READ                                 │
│    - Read relevant files                │
│    - Understand current state           │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 2. VERIFY                               │
│    - Check for usages                   │
│    - Verify safety                      │
│    - Ask if unsure                      │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 3. PLAN                                 │
│    - Explain what I'll do               │
│    - List specific changes              │
│    - Wait for confirmation              │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 4. IMPLEMENT                            │
│    - Make changes                       │
│    - One file at a time                 │
│    - Clear commit messages              │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 5. VERIFY                               │
│    - Test Classic Mode                  │
│    - Check for errors                   │
│    - Verify functionality               │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 6. DOCUMENT                             │
│    - Update checklist                   │
│    - Note what was done                 │
│    - Report results                     │
└─────────────────────────────────────────┘
```

---

## 🚨 RED FLAGS (Stop Me If You See These)

### **1. I'm Making Assumptions**
```
❌ "I'll assume this is safe to remove"
✅ "Let me check if this is used first"
```

### **2. I'm Rushing**
```
❌ "I'll remove all files at once"
✅ "Let's do one file at a time"
```

### **3. I'm Not Testing**
```
❌ "Changes complete, moving on"
✅ "Changes complete, testing Classic Mode now"
```

### **4. I'm Not Asking**
```
❌ "I'll change this logic"
✅ "Should I change this logic, or keep it for Classic Mode?"
```

### **5. I'm Losing Context**
```
❌ "What were we doing again?"
✅ "Let me re-read the current task from the checklist"
```

---

## 💬 COMMUNICATION PATTERNS

### **When You Give Me a Task:**

**✅ GOOD:**
```
"Task 1.2.1: Remove workbench-strip.tsx
- File: components/studio-pro/workbench-strip.tsx
- Also remove imports from maya-chat-screen.tsx (line 35)
- Test Classic Mode after
- Mark complete in checklist"
```

**Why:** Clear, specific, includes verification step

---

### **When I Complete a Task:**

**✅ GOOD:**
```
"✅ Task 1.2.1 Complete

Removed:
- components/studio-pro/workbench-strip.tsx
- Import from maya-chat-screen.tsx line 35
- Related state variables (lines 202-238)

Verified:
- Classic Mode concept generation works
- No console errors
- No TypeScript errors

Next: Task 1.2.2 - Remove workbench-input-strip.tsx"
```

**Why:** Clear summary, verification results, next step

---

### **When I'm Unsure:**

**✅ GOOD:**
```
"⚠️ Question: I found workbench code in maya-chat-screen.tsx
but I'm not 100% sure if it's used in Classic Mode.

Should I:
A) Remove it (if Pro Mode only)
B) Keep it (if Classic Mode uses it)
C) Check usages first (recommended)

What do you prefer?"
```

**Why:** Asks before assuming, offers options

---

## 📝 CONTEXT CHECKPOINTS

### **After Each Phase:**

1. **Review What We Did:**
   - List all changes made
   - Note any issues found
   - Document decisions made

2. **Verify State:**
   - Classic Mode still works
   - No broken imports
   - No TypeScript errors

3. **Update Documentation:**
   - Update checklist
   - Note any deviations from plan
   - Document learnings

4. **Plan Next Phase:**
   - Review next phase tasks
   - Identify dependencies
   - Set expectations

---

## 🎯 BEST PRACTICES

### **For You (Sandra):**

1. **Be Specific:**
   - Give file paths
   - Mention line numbers
   - Reference checklist tasks

2. **One Task at a Time:**
   - Wait for completion
   - Verify results
   - Then give next task

3. **Correct Me Immediately:**
   - If I assume something wrong
   - If I skip a step
   - If I'm not following the plan

4. **Use Checklists:**
   - Reference task numbers
   - Check off as we go
   - Keep track of progress

### **For Me (AI):**

1. **Always Verify:**
   - Check usages before removing
   - Test after changes
   - Ask if unsure

2. **Be Explicit:**
   - Explain what I'm doing
   - List specific changes
   - Report results clearly

3. **Follow the Workflow:**
   - Read → Verify → Plan → Implement → Verify → Document
   - Don't skip steps
   - Don't rush

4. **Preserve Context:**
   - Reference previous tasks
   - Note dependencies
   - Track state changes

---

## 📚 REFERENCE

### **Key Documents:**
- Implementation Checklist: `MAYA-PRO-MODE-IMPLEMENTATION-CHECKLIST.md`
- Main Plan: `MAYA-PRO-MODE-CLEANUP-PLAN.md`
- Quick Reference: `MAYA-PRO-MODE-QUICK-REFERENCE.md`

### **Critical Rules:**
1. DO NOT touch Classic Mode
2. Test Classic Mode after every change
3. One task at a time
4. Verify before assuming
5. Follow the workflow template

---

## ✅ READY TO START?

**First Message Should Be:**
```
"Start with Phase 1, Step 1: Remove unused components.
Begin with workbench-strip.tsx (task 1.2.1 from checklist).
Follow the workflow: Read → Verify → Plan → Implement → Verify → Document"
```

**I'll respond with:**
1. What I'm reading
2. What I found
3. My plan
4. Confirmation request
5. Implementation
6. Verification results
7. Next step

---

**Let's work together systematically and safely! 🚀**
