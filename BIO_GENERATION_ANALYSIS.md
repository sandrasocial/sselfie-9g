# Instagram Bio Generation - Complete Analysis

## 📋 Overview
The bio generation system uses Claude Sonnet 4 to create personalized Instagram bios based on the user's brand profile and personal information.

---

## 🔄 Flow Diagram

```
User clicks "Write Bio" 
    ↓
/app/api/feed/[feedId]/generate-bio (POST)
    ↓
Fetches:
  - Feed layout (brand_vibe, business_type)
  - User's brand profile (user_personal_brand table)
  - Optional: Research data
    ↓
Calls: generateInstagramBio()
    ↓
/lib/instagram-bio-strategist/bio-logic.ts
    ↓
Fetches additional data:
  - user_profiles (instagram_handle, full_name)
  - brand_onboarding (business_name, instagram_handle)
  - user_personal_brand (name)
    ↓
Builds AI prompt with:
  - Business type
  - Brand vibe
  - Brand voice
  - Target audience
  - Business goals
  - Business name
  - Instagram handle
  - Research data (optional)
    ↓
Calls Claude Sonnet 4 with:
  - System prompt: INSTAGRAM_BIO_STRATEGIST_PERSONALITY
  - User prompt: Detailed bio generation instructions
    ↓
Returns generated bio
    ↓
Saves to instagram_bios table
    ↓
Returns to frontend
```

---

## 📁 Key Files

### 1. API Endpoint
**File:** `app/api/feed/[feedId]/generate-bio/route.ts`

**What it does:**
- Authenticates user
- Verifies feed ownership
- Fetches brand profile from `user_personal_brand` table
- Calls `generateInstagramBio()` function
- Saves bio to `instagram_bios` table

**Data it passes to bio generator:**
```typescript
{
  userId: neonUser.id.toString(),
  businessType: brandProfile.business_type || feedLayout.business_type || "creator",
  brandVibe: brandProfile.brand_vibe || feedLayout.brand_vibe || "authentic",
  brandVoice: brandProfile.brand_voice || "authentic and relatable",
  targetAudience: brandProfile.target_audience || "general audience",
  businessGoals: brandProfile.business_goals || null,
  researchData: researchData || null,
}
```

---

### 2. Bio Generation Logic
**File:** `lib/instagram-bio-strategist/bio-logic.ts`

**What it does:**
1. Fetches user data from database:
   - `user_profiles` → instagram_handle, full_name
   - `brand_onboarding` → business_name, instagram_handle
   - `user_personal_brand` → name

2. Builds the AI prompt with:
   - Brand profile information
   - Business details
   - Market intelligence (if available)
   - Example format
   - Critical requirements
   - Writing style guidelines

3. Calls Claude Sonnet 4:
   - Model: `anthropic/claude-sonnet-4`
   - System prompt: `INSTAGRAM_BIO_STRATEGIST_PERSONALITY`
   - Temperature: 0.7
   - User prompt: Detailed bio generation instructions

4. Validates and returns:
   - Truncates if > 150 characters
   - Returns clean bio text

---

### 3. System Personality
**File:** `lib/instagram-bio-strategist/personality.ts`

**What it contains:**
- Expert persona definition
- Bio formula (WHO | WHAT | HOW)
- Best practices
- Example bios
- Writing style guidelines

**Key instructions:**
- 150 characters max
- Lead with value, not credentials
- Use keywords for searchability
- Include clear CTA
- Strategic emoji use (2-3 max)
- Simple, direct language
- Active voice
- Benefit-focused

---

## 📝 Current Prompt Structure

The prompt sent to Claude includes:

1. **Brand Profile Section:**
   - Business Type
   - Brand Vibe
   - Brand Voice (optional)
   - Target Audience (optional)
   - Business Goals (optional)
   - Business Name (optional)
   - Instagram Handle (optional)

2. **Market Intelligence Section** (if researchData available):
   - Competitive insights
   - Trending keywords
   - Pain points
   - Market positioning

3. **Example Format:**
   ```
   "Personal brand strategy for ambitious entrepreneurs ✨ | Founder @SSELFIE STUDIO | Transform your story into influence | Link below 📈"
   ```

4. **Critical Requirements:**
   - Simple language
   - Use " | " separators
   - 2-3 strategic emojis
   - Max 150 characters
   - Structure: WHAT YOU DO | WHO YOU ARE | VALUE PROP | CTA
   - Sound like real person, not AI
   - Specific and benefit-focused

5. **Writing Style Guidelines:**
   - Write how people talk on Instagram
   - Short, punchy phrases
   - Authentic and relatable
   - NO corporate jargon

---

## 🔍 Data Sources

### From Database:
1. **user_personal_brand** table:
   - `brand_voice`
   - `brand_vibe`
   - `business_type`
   - `target_audience`
   - `content_pillars`
   - `business_goals`
   - `name`

2. **user_profiles** table:
   - `instagram_handle`
   - `full_name`

3. **brand_onboarding** table:
   - `business_name`
   - `instagram_handle`

4. **feed_layouts** table (fallback):
   - `brand_vibe`
   - `business_type`

5. **content_research** table (optional):
   - `research_summary`
   - `best_hooks`
   - `trending_hashtags`
   - `competitive_insights`

---

## ⚠️ Current Issues / Areas to Update

### 1. Hardcoded Example
**Line 81 in bio-logic.ts:**
```typescript
"Personal brand strategy for ambitious entrepreneurs ✨ | Founder @SSELFIE STUDIO | Transform your story into influence | Link below 📈"
```
- Uses "SSELFIE STUDIO" as example
- Should use user's actual business name

### 2. Business Name Formatting
**Line 88 & 102:**
- Forces business name to UPPERCASE
- Uses `businessName.toUpperCase().replace(/\s+/g, " ")`
- May not match user's preferred formatting

### 3. Missing User Display Name
- Currently uses `businessName` from brand_onboarding or personal_brand
- Doesn't use `user.display_name` from users table
- Should prioritize user's actual name

### 4. Username Formatting
- Uses Instagram handle if available
- But doesn't use the feed's username field
- Should check feed's username first

---

## 🎯 Recommended Updates

1. **Use User's Display Name:**
   - Fetch `display_name` from `users` table
   - Use as primary source for name in bio
   - Fallback to business_name if not available

2. **Update Example Format:**
   - Remove hardcoded "SSELFIE STUDIO"
   - Use dynamic example based on user's data

3. **Improve Name Handling:**
   - Don't force UPPERCASE
   - Preserve user's preferred formatting
   - Use feed's username if available

4. **Better Integration:**
   - Pass user's display name from API endpoint
   - Use in bio generation prompt
   - Include in bio structure

---

## 📊 Current Bio Structure

```
WHAT YOU DO | WHO YOU ARE (@BUSINESSNAME) | VALUE PROP | CTA
```

Example output:
```
Personal brand strategy for ambitious entrepreneurs ✨ | Founder @SSELFIE STUDIO | Transform your story into influence | Link below 📈
```

---

## 🔧 Where to Make Changes

### To Update Bio Generation:
1. **`lib/instagram-bio-strategist/bio-logic.ts`** - Main generation logic
2. **`lib/instagram-bio-strategist/personality.ts`** - System prompt
3. **`app/api/feed/[feedId]/generate-bio/route.ts`** - Pass additional user data

### To Change Bio Format:
- Modify the prompt in `bio-logic.ts` (lines 55-104)
- Update system personality in `personality.ts`
- Adjust requirements and examples

---

## 💡 Next Steps

1. Identify what specific changes you want to make
2. Update the prompt structure
3. Modify data fetching to include user's display name
4. Remove hardcoded "SSELFIE STUDIO" references
5. Test with different user profiles

