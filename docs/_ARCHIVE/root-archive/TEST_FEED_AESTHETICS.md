# Test Guide: Feed Aesthetic Expertise

**Purpose:** Verify that Maya uses specific aesthetic expertise when creating feeds  
**Time:** 30 minutes  
**Priority:** HIGH - This affects feed quality directly

---

## 🎯 What We're Testing

**The Issue:**
- Feeds might be too generic without aesthetic guidance
- System prompt may not include feed planner context when on Feed tab
- `x-active-tab` header is sent, but might not load the right context

**What Should Happen:**
- When you ask for a "Dark & Moody feed," Maya should use specific Dark & Moody aesthetic knowledge
- Prompts should reflect the aesthetic (lighting, colors, mood)
- Captions should align with the aesthetic
- Posts should have cohesive aesthetic identity

---

## 📋 Test Scenarios

### Test 1: Dark & Moody Feed

1. **Open Maya Chat → Feed Tab**
2. **Send this message:**
   ```
   Create a Dark & Moody Instagram feed for my brand
   ```

3. **Wait for Maya's response**

4. **Check Maya's Response:**
   - [ ] Does Maya mention "Dark & Moody" aesthetic?
   - [ ] Does she describe specific characteristics (moody lighting, deep shadows, rich tones)?
   - [ ] Does the feed strategy include aesthetic-specific guidance?

5. **Check the Feed Card (if it appears):**
   - [ ] Look at the prompts for each post
   - [ ] Do they mention moody lighting, shadows, dark tones?
   - [ ] Are they cohesive and aesthetic-specific?

**Example of GOOD response:**
```
Perfect! Creating a Dark & Moody feed for you ✨

This aesthetic is characterized by:
- Deep, dramatic shadows
- Rich, muted color palette
- Moody, cinematic lighting
- Professional editorial feel

Let me create 9 posts with this cohesive aesthetic...
```

**Example of BAD (generic) response:**
```
Sure! Creating an Instagram feed for you.

Here are 9 posts for your brand...
```

---

### Test 2: Minimalist Chic Feed

1. **In the same Feed tab, send:**
   ```
   Create a Minimalist Chic Instagram feed
   ```

2. **Check:**
   - [ ] Does Maya mention "Minimalist Chic" aesthetic?
   - [ ] Does she describe clean lines, neutral palette, simplicity?
   - [ ] Are the prompts minimalist-specific?

**Example prompts should include:**
- "Clean white background"
- "Minimal composition"
- "Neutral color palette"
- "Soft natural lighting"
- "Simple, elegant styling"

---

### Test 3: Warm & Earthy Feed

1. **Send:**
   ```
   Create a Warm & Earthy Instagram feed
   ```

2. **Check:**
   - [ ] Mentions warm tones, natural elements?
   - [ ] Prompts include earthy colors, organic textures?
   - [ ] Cohesive warm, natural aesthetic?

---

## 🔍 Where to Look for Issues

### 1. Check Console Logs

**Open browser console (F12 → Console)**

Look for this log when you send the feed request:
```
[Maya Chat API] ✅ FEED TAB DETECTED - Will load aesthetic expertise
```

**If you see this instead:**
```
[Maya Chat API] ⚠️ NOT feed tab - activeTabHeader: photos
```
→ **PROBLEM:** `x-active-tab` header isn't being sent correctly

### 2. Check System Prompt Loading

**Look for logs like:**
```
[Maya Chat API] x-active-tab header: feed
[Maya Chat API] Loading feed planner context
```

**If you DON'T see these:**
→ **PROBLEM:** Feed context isn't being loaded

### 3. Check Maya's Response Quality

**Good signs:**
- ✅ Mentions specific aesthetic by name
- ✅ Describes aesthetic characteristics
- ✅ Prompts are detailed and aesthetic-specific
- ✅ Captions match the aesthetic vibe
- ✅ All 9 posts feel cohesive

**Bad signs:**
- ❌ Generic "creating a feed" response
- ❌ No mention of the requested aesthetic
- ❌ Prompts are generic (no aesthetic details)
- ❌ Posts feel random/disconnected
- ❌ Captions don't match aesthetic

---

## 📊 Test Results

### Test 1: Dark & Moody
- [ ] ✅ PASS - Aesthetic expertise present
- [ ] ❌ FAIL - Generic response
- **Notes:**

### Test 2: Minimalist Chic
- [ ] ✅ PASS - Aesthetic expertise present
- [ ] ❌ FAIL - Generic response
- **Notes:**

### Test 3: Warm & Earthy
- [ ] ✅ PASS - Aesthetic expertise present
- [ ] ❌ FAIL - Generic response
- **Notes:**

---

## 🐛 If Tests Fail (Aesthetic Expertise Missing)

### Step 1: Verify x-active-tab Header

**Check in console:**
```
[Maya Chat API] x-active-tab header: feed
```

**If missing or says "photos":**
- Problem: Header not being sent
- Location: `components/sselfie/maya/hooks/use-maya-chat.ts` (line 141)
- Fix: Verify `activeTab` prop is passed correctly

### Step 2: Check System Prompt Loading

**File to check:** `app/api/maya/chat/route.ts`

**Look for around lines 128-136:**
```typescript
const activeTabHeader = headers.get("x-active-tab")
if (activeTabHeader === "feed") {
  console.log("[Maya Chat API] ✅ FEED TAB DETECTED - Will load aesthetic expertise")
  // System prompt should include feed context here
}
```

**Verify:**
- [ ] Does the code actually load feed-specific system prompt?
- [ ] Is feed planner context included?
- [ ] Are aesthetic descriptions loaded?

### Step 3: Verify Feed Context File

**Check if this file exists and is being imported:**
```
lib/maya/feed-planner-context.ts
```

**It should contain:**
- Aesthetic descriptions (Dark & Moody, Minimalist Chic, etc.)
- Grid layout understanding
- Caption writing guidance
- Post type explanations

---

## 📝 What to Report

If tests fail, please provide:

1. **Console logs** (copy all `[Maya Chat API]` logs)
2. **Maya's response** (exact text she sent)
3. **Which aesthetic you tested**
4. **Whether header is detected** (from console)
5. **Any errors in console**

---

## ✅ Success Criteria

Tests pass if:
- ✅ Maya mentions the specific aesthetic requested
- ✅ She describes aesthetic characteristics
- ✅ Prompts are detailed and aesthetic-specific
- ✅ Feed feels cohesive and professional
- ✅ All 3 test scenarios pass

---

## 🎯 Next Steps

### If All Tests Pass ✅
- Great! Feed aesthetic expertise is working
- Move to: End-to-end testing (full feed creation flow)
- Document: Which aesthetics work best

### If Tests Fail ❌
- Investigate system prompt loading
- Fix feed context integration
- Re-test after fixes
- Document what was fixed

---

**Created:** January 4, 2026  
**Status:** Ready to test  
**Estimated Time:** 30 minutes



