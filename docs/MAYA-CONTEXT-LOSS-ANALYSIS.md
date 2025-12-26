# Maya Context Loss & Defaulting to Cozy - Analysis

## Problems Identified

### 1. **Defaulting to "Cozy" Concepts**

**Root Causes:**

#### A. Category Detection Defaults (Line 141)
```typescript
// Default fallback
return 'casual-lifestyle'
```
- If user request doesn't match any patterns, defaults to `'casual-lifestyle'`
- This then maps to `'cozy'` in prompt constructor (line 165-173)

#### B. Prompt Constructor Defaults (Line 218)
```typescript
let category = 'casual'
let vibe = 'casual'
let location = 'street'
```
- If no patterns match, defaults to `'casual'`
- Then "Cozy/Home" pattern (line 253) is too broad:
  ```typescript
  else if (/cozy|home|comfortable|lounge|relax|comfort/.test(combinedText)) {
    category = 'cozy'
  ```
- Words like "comfortable", "relax", "comfort" catch many things unintentionally

#### C. Pattern Matching Order Issue
- "Cozy/Home" pattern (line 253) comes BEFORE "Luxury" pattern (line 259)
- If user says "comfortable luxury outfit", it matches "cozy" first
- Should check more specific patterns first

### 2. **Losing Context in Chat**

**Potential Issues:**

#### A. Empty `userRequest` Parameter
- If `userRequest` is empty/undefined, category detection fails
- Falls back to defaults (cozy/casual)
- Need to check how Maya's tool extracts `userRequest` from conversation

#### B. Conversation Context Not Preserved
- `conversationContext` parameter exists but may not be properly passed
- User's previous requests might not be included in category detection

#### C. Tool Definition May Not Extract Properly
- Need to verify how `generateConcepts` tool extracts `userRequest` from Maya's conversation
- Tool might not be capturing the full user intent

### 3. **Can Maya Generate Based on User Wishes?**

**Current System:**
- ✅ YES - System is designed to generate based on user requests
- ✅ Dynamic prompt constructor uses `userRequest` parameter
- ✅ Category detection uses `userRequest`, `aesthetic`, `context`

**Problems:**
- ❌ If `userRequest` is empty → defaults to cozy
- ❌ If patterns don't match → defaults to cozy
- ❌ "Cozy" pattern is too broad → catches unintended requests

## Solutions

### Fix 1: Improve Category Detection Defaults
- Don't default to "cozy" - use a more neutral default
- Make "cozy" pattern more specific (require "cozy" + context, not just "comfortable")
- Reorder patterns: check specific patterns before broad ones

### Fix 2: Better Context Preservation
- Ensure `userRequest` is properly extracted from conversation
- Include conversation history in category detection
- Log when `userRequest` is empty to debug

### Fix 3: Improve Pattern Matching
- Make "cozy" pattern require explicit "cozy" keyword
- Don't match on generic words like "comfortable", "relax", "comfort" alone
- Add more specific category patterns

### Fix 4: Add Logging
- Log detected category and why
- Log when defaults are used
- Log `userRequest` value to debug context loss
























