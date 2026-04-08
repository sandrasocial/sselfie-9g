# Feed Strategy Document Audit

## Current State

### Where Strategy Document is Stored
- **Database Field**: `feed_layouts.description` 
- **API Response**: Available as `feedData.feed.description` in `/api/feed/[feedId]`
- **Current Display**: Strategy tab shows `feedData.strategy?.brand_positioning` OR `feedData.feed.feed_story` (which is just the user's request, not the strategy document)

### Current Strategy Document Content
The strategy document is generated with a very basic template:

```
"strategyDocument": "Instagram Feed Strategy\\n\\nOverview\\n[Full strategy document with sections: Brand Positioning, Content Pillars, Visual Aesthetic, Engagement Strategy, Growth Tactics, Posting Schedule, Narrative Arc]\\n\\n9-Post Narrative Arc\\n[Explain the story being told across all 9 posts]\\n\\nContent Pillar Strategy\\n[Explain how content pillars are distributed]"
```

**Issues:**
1. ❌ Very generic placeholder template
2. ❌ No specific guidance on post types (single image, carousel, reel)
3. ❌ No recommendations on which photos to use for reel covers, carousel covers
4. ❌ No storytelling guidance
5. ❌ No Instagram best practices
6. ❌ No audio tips
7. ❌ Not displayed in strategy tab (wrong field being accessed)
8. ❌ Not rendered as markdown (showing raw markdown syntax)

## Required Enhancements

### 1. Comprehensive Strategy Document Content
The strategy document should be a **mini personalized Instagram strategy guide** that includes:

#### A. Overall Strategy
- Brand positioning
- Content pillars distribution
- Visual aesthetic guidelines
- Engagement strategy
- Growth tactics overview

#### B. Post Type Recommendations
For EACH of the 9 posts, specify:
- **Single Image**: Which posts work best as single images
- **Carousel**: Which posts should become carousels, with slide-by-slide breakdown
- **Reel**: Which posts should become reels, with:
  - Reel concept
  - Cover photo tips (using feed image)
  - Audio recommendations (trending sounds for the niche)
  - Hook suggestions for first 3 seconds
  - Text overlay strategies

#### C. Photo Usage Guide
- Which feed images should be used as:
  - Reel covers (maintain aesthetic)
  - Carousel slide 1 (visual consistency)
  - Single posts
- How to maintain visual consistency across formats

#### D. Storytelling Strategy
- How to tell the story across the 9 posts
- Narrative arc explanation
- When to be vulnerable vs educational vs inspirational
- Story sequences for each post (Stories content)

#### E. Instagram Best Practices (2025)
- Posting times and frequency
- Hashtag strategy (main + rotating)
- Engagement tactics
- Growth tactics
- Trend utilization (when to jump on trends vs stay original)
- Audio tips (trending sounds, when to use original audio)

#### F. Content Mix Strategy
- When to SELL (soft/hard CTAs)
- When to EDUCATE (value without asking)
- When to STORY-TELL (vulnerability)
- When to INSPIRE (aspirational)

### 2. Display Fixes
- ✅ Access `feedData.feed.description` (not `feed_story`)
- ✅ Render as styled markdown using `ReactMarkdown`
- ✅ Show full strategy document (not just summary)

### 3. Generation Prompt Enhancement
- Update the strategy document prompt to be comprehensive (1000+ words)
- Include all sections above
- Make it actionable and specific to the user's brand/niche
- Use markdown formatting for better readability

## Implementation Plan

1. **Enhance Strategy Document Prompt** (`create-strategy/route.ts`)
   - Expand the `strategyDocument` field in the JSON schema
   - Add comprehensive instructions for generating the full guide
   - Include all required sections

2. **Update Strategy Tab Display** (`instagram-feed-view.tsx`)
   - Change from `feedData.feed.feed_story` to `feedData.feed.description`
   - Add `ReactMarkdown` rendering
   - Style the markdown appropriately

3. **Test**
   - Verify strategy document is comprehensive
   - Verify markdown renders correctly
   - Verify all sections are included

