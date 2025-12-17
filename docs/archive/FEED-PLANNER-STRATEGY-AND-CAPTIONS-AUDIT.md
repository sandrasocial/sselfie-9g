# Feed Planner Strategy & Captions Audit

## Executive Summary

The Feed Planner's strategy and caption generation is **significantly underutilizing available resources** and **missing critical best practices** from 2025 Instagram strategy. While the codebase contains sophisticated tools (caption writer with Hook-Story-Value-CTA framework, Instagram strategist personality, comprehensive strategy agent), the current implementation uses a basic template approach that doesn't leverage these assets or incorporate modern Instagram best practices.

---

## Current Architecture Analysis

### 1. Strategy Generation (`/api/feed-planner/create-strategy`)

**Current Implementation:**
- Uses basic `generateText` with minimal system prompt
- Only includes basic brand profile fields (business_name, business_type, brand_vibe, brand_voice, target_audience, core_values)
- Generic instructions: "Make captions engaging with strong hooks and clear CTAs"
- No structured framework or best practices
- No user context (memory, brand assets, styling preferences)
- No knowledge base integration
- No 2025 Instagram algorithm considerations

**Code Location:** `app/api/feed-planner/create-strategy/route.ts` (lines 98-135)

**Issues:**
- ❌ **No Hook-Story-Value-CTA framework** - Despite having this framework available
- ❌ **No user context** - Doesn't use `getUserContextForMaya` which includes memory, brand assets, styling preferences
- ❌ **No knowledge base** - `admin_knowledge_base` table exists but isn't queried
- ❌ **No 2025 best practices** - Doesn't incorporate saves, shares, DMs, algorithm signals
- ❌ **Generic instructions** - "Make captions engaging" is too vague
- ❌ **No storytelling structure** - Doesn't create narrative arc across 9 posts
- ❌ **No content pillar strategy** - Doesn't strategically distribute content types
- ❌ **No engagement psychology** - Missing proven engagement frameworks

---

### 2. Caption Generation

**Current Implementation:**
- Captions are generated as part of strategy creation (not separately)
- Uses same basic prompt as strategy
- No structured framework applied
- No variety in hook styles, lengths, or energy

**Available But Unused:**
- ✅ `lib/feed-planner/caption-writer.ts` - Sophisticated caption writer with Hook-Story-Value-CTA
- ✅ `lib/instagram-strategist/personality.ts` - Detailed framework and best practices
- ✅ Both have web search capabilities for current trends

**Issues:**
- ❌ **Not using existing caption writer** - Better tool exists but isn't used
- ❌ **No Hook-Story-Value-CTA structure** - Captions don't follow proven framework
- ❌ **No caption variety** - All captions likely sound similar
- ❌ **No strategic formatting** - Missing line breaks, emoji strategy
- ❌ **No hashtag research** - Generic hashtags without strategy

---

### 3. Available Resources (Currently Unused)

#### A. Sophisticated Caption Writer (`lib/feed-planner/caption-writer.ts`)
- ✅ Hook-Story-Value-CTA framework
- ✅ Web search for best practices
- ✅ Strategic formatting (line breaks, emojis)
- ✅ Hashtag research capabilities
- ✅ Length optimization based on research

#### B. Instagram Strategist Personality (`lib/instagram-strategist/personality.ts`)
- ✅ Detailed Hook-Story-Value-CTA framework
- ✅ Formatting rules (line breaks, emojis, hashtags)
- ✅ Writing voice guidelines
- ✅ Caption variety strategies
- ✅ Examples of good vs bad captions

#### C. Instagram Strategy Agent (`lib/feed-planner/instagram-strategy-agent.ts`)
- ✅ Comprehensive strategy generation
- ✅ Posting times, frequency
- ✅ Story and Reel strategies
- ✅ Carousel strategies
- ✅ Trend strategies
- ✅ Growth tactics

#### D. User Context System (`lib/maya/get-user-context.ts`)
- ✅ Personal memory (preferred topics, conversation style, successful patterns)
- ✅ Brand assets
- ✅ Visual aesthetics
- ✅ Fashion style preferences
- ✅ Communication voice
- ✅ Signature phrases
- ✅ Physical preferences
- ✅ Color palette (with strict enforcement)

#### E. Admin Knowledge Base (`admin_knowledge_base` table)
- ✅ Exists in database schema
- ✅ Can store best practices, templates, case studies
- ❌ **Not being queried or used**

---

## Comparison: Current vs Best Practices

### Current Strategy Generation

**System Prompt:**
```
You are an expert Instagram strategist. Create a comprehensive 9-post Instagram feed strategy.
CRITICAL: Return ONLY valid JSON.
```

**User Prompt:**
```
Create a complete Instagram feed strategy for:
Brand: {name}
Type: {type}
Vibe: {vibe}
Voice: {voice}
Audience: {audience}
Values: {values}
User Request: {request}

Make captions engaging with strong hooks and clear CTAs.
Include 10-15 relevant hashtags per post.
```

**Issues:**
- Too generic
- No framework
- No best practices
- No user context
- No storytelling structure

---

### 2025 Instagram Best Practices (From Research)

#### 1. **Engagement Signals (Algorithm Priority)**
- **Saves** - Highest value signal (indicates lasting value)
- **Shares via DMs** - Strong indicator of quality
- **Direct Messages** - Algorithm favors posts that generate DMs
- **Quality Comments** - Thoughtful discussions > generic comments
- **Carousel Posts** - 35% increase in reach vs single images

#### 2. **Caption Framework (Hook-Story-Value-CTA)**
- **Hook (1 line)** - Stop the scroll with bold statement, question, or curiosity gap
- **Story (2-4 sentences)** - Personal moment that builds connection
- **Value (1-3 sentences)** - Insight, lesson, or takeaway
- **CTA (1 question)** - Engaging question that invites conversation

#### 3. **Storytelling Structure (9-Post Narrative Arc)**
- **Origin/Why** - Introduce purpose or background
- **Conflict/Tension** - Present challenge or problem
- **Process/Struggle** - Show journey to overcome
- **Outcome/Resolution** - Reveal solution or success
- **Invitation/Next Step** - Encourage further engagement

#### 4. **Content Pillars Strategy**
- 3-5 foundational themes
- Educational, Inspirational, Personal/BTS, UGC, Promotional
- Balanced distribution across feed

#### 5. **Caption Best Practices**
- **Length:** 80-150 words (varies by post type)
- **Formatting:** Strategic line breaks every 1-2 sentences
- **Emojis:** 2-4 total, naturally placed
- **Hashtags:** 5-10 strategic (mix of large, medium, niche)
- **Voice:** Conversational, like texting a friend
- **Variety:** Different hook styles, lengths, energy levels

#### 6. **Engagement CTAs**
- "Save this post for later"
- "Share this with someone who needs it"
- "DM me 'guide' for the free checklist"
- "Comment your biggest challenge below"
- "Tag a friend who needs this tip"

---

## Gap Analysis

### What's Missing

1. **No Structured Framework**
   - Current: Generic "make captions engaging"
   - Needed: Hook-Story-Value-CTA framework

2. **No User Context**
   - Current: Only basic brand profile fields
   - Needed: Memory, brand assets, styling preferences, signature phrases

3. **No Knowledge Base Integration**
   - Current: No knowledge base queries
   - Needed: Query `admin_knowledge_base` for best practices

4. **No 2025 Algorithm Considerations**
   - Current: No mention of saves, shares, DMs
   - Needed: Strategy optimized for algorithm signals

5. **No Storytelling Structure**
   - Current: 9 independent posts
   - Needed: Narrative arc across 9 posts

6. **No Content Pillar Strategy**
   - Current: Random content distribution
   - Needed: Strategic 3-5 pillar distribution

7. **No Caption Variety**
   - Current: Likely similar captions
   - Needed: Different hooks, lengths, energy levels

8. **No Engagement Psychology**
   - Current: Generic CTAs
   - Needed: Proven engagement frameworks

9. **Not Using Available Tools**
   - Current: Basic generateText
   - Needed: Use caption-writer.ts and instagram-strategist personality

---

## Strategic Recommendations

### Option 1: Comprehensive Overhaul (Recommended)

**Approach:** Replace current basic strategy generation with sophisticated multi-step process using all available resources.

**Implementation:**
1. **Step 1: Gather User Context**
   - Use `getUserContextForMaya` to get full user context
   - Include memory, brand assets, styling preferences
   - Get signature phrases and communication voice

2. **Step 2: Query Knowledge Base**
   - Query `admin_knowledge_base` for Instagram best practices
   - Get 2025 algorithm insights
   - Get proven caption frameworks
   - Get engagement strategies

3. **Step 3: Generate Strategy Document**
   - Use enhanced system prompt with:
     - User context
     - Knowledge base insights
     - 2025 best practices
     - Storytelling framework
     - Content pillar strategy
   - Create narrative arc for 9 posts
   - Define content pillar distribution

4. **Step 4: Generate Captions (Per Post)**
   - Use `lib/feed-planner/caption-writer.ts` for each post
   - Apply Hook-Story-Value-CTA framework
   - Ensure variety (different hooks, lengths, energy)
   - Research hashtags per post
   - Optimize for saves, shares, DMs

5. **Step 5: Generate Comprehensive Strategy**
   - Use `lib/feed-planner/instagram-strategy-agent.ts`
   - Get posting times, story strategies, reel ideas
   - Get growth tactics and engagement boosts

**Benefits:**
- ✅ Uses all available sophisticated tools
- ✅ Incorporates user context fully
- ✅ Leverages knowledge base
- ✅ Follows 2025 best practices
- ✅ Creates narrative storytelling
- ✅ Optimized for algorithm signals

**Complexity:** High (requires refactoring strategy generation)

---

### Option 2: Enhance Current System (Faster Implementation)

**Approach:** Keep current structure but significantly enhance the prompts and add missing elements.

**Implementation:**
1. **Enhance System Prompt**
   - Add user context from `getUserContextForMaya`
   - Add knowledge base queries
   - Add Hook-Story-Value-CTA framework
   - Add 2025 algorithm best practices
   - Add storytelling structure requirements

2. **Enhance User Prompt**
   - Include narrative arc structure
   - Specify content pillar distribution
   - Require caption variety
   - Include engagement signal optimization
   - Add specific CTA types

3. **Add Post-Processing**
   - Validate captions follow Hook-Story-Value-CTA
   - Ensure variety across 9 posts
   - Optimize hashtags per post

**Benefits:**
- ✅ Faster to implement
- ✅ Improves quality significantly
- ✅ Maintains current architecture
- ✅ Can be done incrementally

**Complexity:** Medium (enhance existing code)

---

### Option 3: Hybrid Approach (Best Balance)

**Approach:** Use sophisticated caption writer for captions, enhance strategy generation with context and best practices.

**Implementation:**
1. **Strategy Generation (Enhanced)**
   - Add user context
   - Add knowledge base queries
   - Add storytelling framework
   - Add content pillar strategy
   - Generate post concepts (not full captions)

2. **Caption Generation (Use Existing Tool)**
   - For each post, call `lib/feed-planner/caption-writer.ts`
   - Pass post context, brand profile, user context
   - Get Hook-Story-Value-CTA captions
   - Ensure variety across posts

3. **Strategy Document (Use Existing Tool)**
   - Call `lib/feed-planner/instagram-strategy-agent.ts`
   - Get comprehensive strategy
   - Include posting times, stories, reels

**Benefits:**
- ✅ Uses best available tools
- ✅ Maintains separation of concerns
- ✅ Easier to maintain
- ✅ Can improve each component independently

**Complexity:** Medium-High (integrate existing tools)

---

## Detailed Implementation Plan (Recommended: Option 3 - Hybrid)

### Phase 1: Enhance Strategy Generation (2-3 hours)

#### 1.1 Add User Context
```typescript
// Get full user context
const userContext = await getUserContextForMaya(user.id)

// Include in system prompt:
- Personal memory (preferred topics, successful patterns)
- Brand assets and styling preferences
- Signature phrases
- Communication voice
- Visual aesthetics
- Fashion style
```

#### 1.2 Query Knowledge Base
```typescript
// Query admin_knowledge_base for Instagram best practices
const bestPractices = await sql`
  SELECT content FROM admin_knowledge_base
  WHERE category = 'instagram'
  AND knowledge_type IN ('best_practice', 'strategy', 'case_study')
  AND is_active = true
  ORDER BY confidence_level DESC
  LIMIT 10
`
```

#### 1.3 Enhanced System Prompt
```typescript
const systemPrompt = `You are an elite Instagram Growth Strategist with expertise in:
- 2025 Instagram algorithm (saves, shares, DMs, comments)
- Hook-Story-Value-CTA caption framework
- Narrative storytelling across 9-post feeds
- Content pillar strategy (3-5 pillars)
- Engagement psychology and proven CTAs
- Personal brand storytelling

USER CONTEXT:
${userContext}

KNOWLEDGE BASE INSIGHTS:
${bestPractices.map(p => p.content).join('\n\n')}

YOUR TASK:
Create a comprehensive 9-post Instagram feed strategy that:
1. Tells a cohesive story across all 9 posts (narrative arc)
2. Distributes content across 3-5 strategic pillars
3. Optimizes for algorithm signals (saves, shares, DMs)
4. Uses Hook-Story-Value-CTA framework for each caption
5. Ensures caption variety (different hooks, lengths, energy)
6. Incorporates user's personal brand, voice, and context
7. Includes strategic CTAs that drive engagement
8. Uses 5-10 strategic hashtags per post (mix of sizes)

...`
```

#### 1.4 Enhanced User Prompt
```typescript
const userPrompt = `Create a complete Instagram feed strategy with:

NARRATIVE ARC STRUCTURE:
- Posts 1-3: Origin/Why (introduce brand, purpose, background)
- Posts 4-6: Conflict/Process (challenges, journey, behind-the-scenes)
- Posts 7-9: Outcome/Invitation (solutions, success, next steps)

CONTENT PILLAR DISTRIBUTION:
- Educational: 2-3 posts
- Inspirational: 2-3 posts
- Personal/BTS: 2-3 posts
- [Add based on brand profile]

ENGAGEMENT OPTIMIZATION:
- Include "Save this post" CTAs for valuable content
- Include "Share with someone" CTAs for relatable content
- Include "DM me" CTAs for lead generation
- Include "Comment below" CTAs for discussion

CAPTION REQUIREMENTS (Hook-Story-Value-CTA):
- Hook: Bold statement, question, or curiosity gap (1 line)
- Story: Personal moment that builds connection (2-4 sentences)
- Value: Insight, lesson, or takeaway (1-3 sentences)
- CTA: Engaging question or action (1 line)
- Hashtags: 5-10 strategic (mix of large, medium, niche)

CAPTION VARIETY:
- Rotate hook styles: bold statement, question, confession, observation
- Vary lengths: 80-150 words
- Mix energy: calm, excited, vulnerable, bold
- Different story types: personal moment, lesson, BTS, transformation

...`
```

---

### Phase 2: Use Caption Writer for Captions (1-2 hours)

#### 2.1 Generate Post Concepts in Strategy
Instead of full captions in strategy, generate:
- Post concepts
- Content pillar assignment
- Emotional tone
- Purpose/goal

#### 2.2 Generate Captions Separately
For each post, call the caption writer:
```typescript
import { generateInstagramCaption } from '@/lib/feed-planner/caption-writer'

for (const postConcept of strategy.posts) {
  const { caption } = await generateInstagramCaption({
    postPosition: postConcept.position,
    shotType: postConcept.postType,
    purpose: postConcept.purpose,
    emotionalTone: postConcept.tone,
    brandProfile: brandProfile,
    targetAudience: brandProfile.target_audience,
    brandVoice: brandProfile.brand_voice,
    contentPillar: postConcept.contentPillar,
  })
  
  // Use this caption instead of strategy-generated caption
}
```

**Benefits:**
- ✅ Uses sophisticated caption writer
- ✅ Applies Hook-Story-Value-CTA framework
- ✅ Researches best practices
- ✅ Optimizes hashtags
- ✅ Ensures variety

---

### Phase 3: Add Knowledge Base Integration (1-2 hours)

#### 3.1 Create Knowledge Base Queries
```typescript
// Query for Instagram best practices
const instagramBestPractices = await sql`
  SELECT title, content, confidence_level
  FROM admin_knowledge_base
  WHERE category = 'instagram'
  AND knowledge_type IN ('best_practice', 'strategy', 'case_study')
  AND is_active = true
  ORDER BY confidence_level DESC
  LIMIT 15
`

// Query for caption frameworks
const captionFrameworks = await sql`
  SELECT title, content
  FROM admin_knowledge_base
  WHERE category = 'instagram'
  AND knowledge_type = 'template'
  AND related_tags && ARRAY['caption', 'hook', 'cta']
  AND is_active = true
  LIMIT 5
`
```

#### 3.2 Include in Prompts
Add knowledge base content to system prompts to inform AI with proven strategies.

---

### Phase 4: Add Comprehensive Strategy (1 hour)

#### 4.1 Use Instagram Strategy Agent
After generating basic strategy, enhance with comprehensive strategy:
```typescript
import { generateInstagramStrategy } from '@/lib/feed-planner/instagram-strategy-agent'

const comprehensiveStrategy = await generateInstagramStrategy({
  userId: neonUser.id,
  feedLayoutId: feedLayout.id,
  brandProfile: brandProfile,
  feedPosts: strategy.posts,
  targetAudience: brandProfile.target_audience,
  businessType: brandProfile.business_type,
  niche: brandProfile.business_type, // or extract from brand
})
```

**Add to strategy document:**
- Posting times and frequency
- Story strategies for each post
- Reel concepts
- Carousel ideas
- Growth tactics
- Hashtag strategy

---

## Expected Improvements

### Before (Current)
- Generic captions without framework
- No storytelling structure
- No user context
- No 2025 best practices
- No algorithm optimization
- Similar captions across posts

### After (Recommended Implementation)
- ✅ Hook-Story-Value-CTA framework for all captions
- ✅ Narrative arc across 9 posts
- ✅ Full user context (memory, brand, styling)
- ✅ 2025 best practices (saves, shares, DMs)
- ✅ Algorithm-optimized CTAs
- ✅ Caption variety (different hooks, lengths, energy)
- ✅ Strategic content pillar distribution
- ✅ Knowledge base insights
- ✅ Comprehensive strategy document

---

## Success Metrics

### Caption Quality
- [ ] All captions follow Hook-Story-Value-CTA structure
- [ ] Captions vary in hook style, length, and energy
- [ ] CTAs optimized for engagement signals (saves, shares, DMs)
- [ ] Hashtags are strategic (5-10, mixed sizes)
- [ ] Captions sound human and conversational

### Strategy Quality
- [ ] 9 posts tell cohesive story (narrative arc)
- [ ] Content pillars are strategically distributed
- [ ] Strategy document is comprehensive (500+ words)
- [ ] Includes posting times, story strategies, reel ideas
- [ ] Optimized for 2025 algorithm signals

### User Context Integration
- [ ] Personal memory is reflected in captions
- [ ] Brand assets and styling are incorporated
- [ ] Signature phrases are used naturally
- [ ] Communication voice matches brand

### Engagement Optimization
- [ ] CTAs encourage saves, shares, DMs
- [ ] Captions designed for algorithm signals
- [ ] Strategic use of engagement psychology
- [ ] Variety prevents algorithm fatigue

---

## Implementation Priority

### Priority 1: Quick Wins (1-2 hours)
1. Add trigger word validation (already done for prompts)
2. Enhance system prompt with Hook-Story-Value-CTA framework
3. Add user context to strategy generation
4. Add caption variety requirements

### Priority 2: Medium Impact (3-4 hours)
1. Use caption writer for individual captions
2. Add knowledge base queries
3. Add narrative arc structure
4. Add content pillar distribution

### Priority 3: Comprehensive (5-6 hours)
1. Integrate Instagram strategy agent
2. Add comprehensive strategy document
3. Add posting times and frequency
4. Add story and reel strategies

---

## Risks and Mitigation

### Risk 1: Performance Impact
- **Risk:** Multiple API calls (caption writer per post) could slow down strategy creation
- **Mitigation:** 
  - Generate captions in parallel
  - Cache knowledge base queries
  - Use faster model for caption generation (claude-haiku-4.5)

### Risk 2: Cost Increase
- **Risk:** More API calls = higher costs
- **Mitigation:**
  - Use haiku model for captions (cheaper)
  - Cache knowledge base content
  - Batch operations where possible

### Risk 3: Complexity
- **Risk:** More complex system = harder to maintain
- **Mitigation:**
  - Keep components separate (strategy, captions, comprehensive strategy)
  - Add comprehensive logging
  - Document each component

---

## Questions to Consider

1. **Should we regenerate strategies for existing feeds?**
   - Option: Add "Regenerate Strategy" button
   - Option: Auto-enhance on next use

2. **Knowledge Base Population:**
   - Who will populate `admin_knowledge_base`?
   - What content should be added first?
   - How to keep it updated?

3. **Caption Generation Timing:**
   - Generate during strategy creation? (slower but complete)
   - Generate on-demand when viewing post? (faster but requires API call)

4. **User Context Updates:**
   - How often to refresh user context?
   - Should we cache it?
   - How to handle context changes?

---

## Conclusion

The Feed Planner has **sophisticated tools available** but is **not using them**. The current implementation is basic and doesn't incorporate:
- ✅ Hook-Story-Value-CTA framework (available but unused)
- ✅ User context system (available but unused)
- ✅ Knowledge base (exists but not queried)
- ✅ 2025 Instagram best practices (not incorporated)
- ✅ Storytelling structure (not implemented)
- ✅ Algorithm optimization (not considered)

**Recommended Approach:** Option 3 (Hybrid) - Use existing sophisticated tools (caption writer, strategy agent) while enhancing strategy generation with user context and knowledge base integration.

This will result in:
- **Better captions** - Hook-Story-Value-CTA framework, variety, optimization
- **Better strategy** - Narrative arc, content pillars, algorithm optimization
- **More personalization** - User context, memory, brand assets
- **Better engagement** - Optimized for saves, shares, DMs
- **Consistency** - Uses same tools as rest of platform

**Estimated Implementation Time:** 5-6 hours for full implementation, or 2-3 hours for Priority 1 & 2 improvements.










