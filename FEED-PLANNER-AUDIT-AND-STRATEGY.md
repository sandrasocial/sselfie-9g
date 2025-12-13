# Feed Planner: Complete Audit & Strategy Document

## Executive Summary

The Feed Planner is a feature designed to help users create a strategic 9-post Instagram feed grid with AI-generated images, captions, and a cohesive visual strategy. However, the feature is currently not working effectively for users. This document provides a comprehensive audit of the current implementation and a strategic roadmap to make it powerful and useful.

---

## 1. Current State Analysis

### 1.1 Architecture Overview

**Current Flow:**
1. User enters feed goal/request
2. System creates strategy via `/api/feed-planner/create-strategy`
3. Strategy generates 9 posts with prompts, captions, hashtags
4. Posts are saved to database with `generation_status: 'pending'`
5. User must manually generate each image (or use bulk generation)
6. Images are generated via `/api/feed/[feedId]/generate-single`
7. Feed view displays completed images in a 3x3 grid

**Key Components:**
- `FeedPlannerScreen` - Main UI component
- `InstagramFeedView` - Feed display with grid view
- `orchestrator.ts` - Complex multi-step AI orchestration (NOT currently used)
- `create-strategy/route.ts` - Simplified strategy creation (currently active)
- Database tables: `feed_layouts`, `feed_posts`, `instagram_bios`, `instagram_highlights`

### 1.2 Current Implementation Issues

#### **Critical Issues:**

1. **Two Competing Implementations**
   - `orchestrator.ts` - Complex, comprehensive orchestration (unused)
   - `create-strategy/route.ts` - Simplified version (currently active)
   - **Problem:** The simpler version doesn't leverage the full orchestration logic

2. **No Automatic Image Generation**
   - Strategy creates posts with prompts but doesn't generate images
   - Users must manually click to generate each of 9 images
   - No bulk generation option that works reliably
   - **User Impact:** High friction, unclear workflow

3. **Unclear User Journey**
   - After strategy creation, users see empty grid with "Generate" buttons
   - No clear indication of what happens next
   - No progress tracking for bulk operations
   - **User Impact:** Confusion, abandonment

4. **Missing Error Handling**
   - No retry mechanisms for failed generations
   - No clear error messages when things fail
   - Polling mechanism for image status is complex and error-prone

5. **Credit Cost Confusion**
   - UI says "15 credits" but actual cost is 5 credits for strategy + 9 credits for images = 14 total
   - No clear breakdown of costs
   - **User Impact:** Trust issues, unexpected costs

#### **Technical Issues:**

1. **Database Schema Inconsistencies**
   - Multiple migration scripts with conflicting column names (`feed_layout_id` vs `feed_id`)
   - Missing indexes for performance
   - No proper status tracking for feed completion

2. **API Route Complexity**
   - Multiple endpoints doing similar things
   - Inconsistent error responses
   - No proper validation

3. **State Management**
   - Complex polling logic in `InstagramFeedView`
   - Multiple SWR hooks that can get out of sync
   - No proper loading states

4. **Image Generation Flow**
   - Manual generation per post is tedious
   - No queue system for bulk generation
   - No progress tracking
   - Polling with exponential backoff is complex

---

## 2. User Experience Problems

### 2.1 Onboarding & Discovery

**Issues:**
- Users don't understand what Feed Planner does
- No examples or preview of what they'll get
- No clear value proposition
- Requires personal brand profile completion (barrier)

**User Questions:**
- "What is this?"
- "What will I get?"
- "How long does it take?"
- "What if I don't like it?"

### 2.2 Strategy Creation

**Issues:**
- Auto-filled request from brand profile may not match user intent
- "Enhance with Maya" button is unclear
- No preview of what the strategy will include
- Long wait time with fake progress steps (setTimeout-based)
- No way to cancel once started

**User Pain Points:**
- Unclear what to write in the request
- Don't know if their request is good enough
- Wait time feels arbitrary
- No feedback during creation

### 2.3 Image Generation

**Issues:**
- After strategy creation, users see empty grid
- Must manually generate each of 9 images
- No "Generate All" button that works reliably
- No clear indication of progress
- No way to prioritize which images to generate first

**User Pain Points:**
- Tedious to click 9 times
- Don't know which images are most important
- No batch operation
- Unclear when images will be ready

### 2.4 Feed Viewing & Editing

**Issues:**
- Complex UI with multiple tabs (grid, posts, strategy)
- No clear way to edit captions before generating
- No way to regenerate individual images easily
- Strategy document is hidden in a tab
- No export functionality

**User Pain Points:**
- Overwhelming interface
- Hard to make changes
- Don't know what to do next

---

## 3. Competitive Analysis

### 3.1 What Top Feed Planners Offer

**Planoly:**
- Visual grid preview
- Drag-and-drop reordering
- Bulk upload
- Scheduling
- Analytics integration
- Team collaboration

**Later:**
- Visual calendar
- Media library
- Hashtag suggestions
- Best time to post
- Analytics
- Link in bio tool

**Buffer:**
- Multi-platform
- Content calendar
- Analytics
- Team collaboration
- Engagement tools

### 3.2 What SSELFIE Should Offer (Unique Value)

**Our Competitive Advantages:**
1. **AI-Generated Images** - Unique! No competitor does this
2. **Personalized to User's Face** - Using trained LoRA models
3. **Complete Package** - Images + Captions + Strategy
4. **Brand-Aligned** - Uses personal brand profile

**What We're Missing:**
1. Visual preview before generation
2. Easy editing workflow
3. Scheduling capabilities
4. Analytics/performance tracking
5. Export functionality

---

## 4. Strategic Recommendations

### 4.1 Phase 1: Fix Core Functionality (Immediate)

**Goal:** Make the basic flow work smoothly

**Actions:**

1. **Unify Implementation**
   - Choose ONE approach (recommend simplified `create-strategy` but enhance it)
   - Remove unused `orchestrator.ts` or integrate its best parts
   - Consolidate API routes

2. **Add Automatic Image Generation**
   - After strategy creation, automatically queue all 9 images
   - Show clear progress: "Generating 1/9, 2/9..." 
   - Use background job queue (or sequential with progress updates)
   - Allow users to see progress in real-time

3. **Improve Credit Transparency**
   - Show exact cost breakdown: "Strategy (5) + 9 Images (9) = 14 credits"
   - Update UI to reflect actual costs
   - Show credit balance before starting

4. **Better Error Handling**
   - Retry failed generations automatically (up to 3 times)
   - Clear error messages
   - Allow manual retry for failed posts

5. **Simplify State Management**
   - Use single source of truth for feed status
   - Better loading states
   - Clearer progress indicators

### 4.2 Phase 2: Enhance User Experience (Short-term)

**Goal:** Make it intuitive and delightful

**Actions:**

1. **Onboarding Flow**
   - Add "What is Feed Planner?" modal/tooltip
   - Show example feed before user starts
   - Clear value proposition: "Get 9 AI photos + captions in 5 minutes"
   - Make personal brand requirement clear upfront

2. **Strategy Creation Improvements**
   - Add example requests users can copy/edit
   - Show preview of what will be generated (shot types, themes)
   - Real progress updates (not fake setTimeout)
   - Allow cancellation

3. **Feed View Improvements**
   - Default to grid view (most important)
   - Show strategy summary in sidebar (not hidden tab)
   - Make editing easier (inline caption editing)
   - Add "Regenerate All" option
   - Show which posts are most important (first row)

4. **Visual Feedback**
   - Better loading animations
   - Progress bars for bulk operations
   - Success celebrations when feed is complete
   - Clear CTAs at each step

### 4.3 Phase 3: Add Power Features (Medium-term)

**Goal:** Make it a complete feed planning solution

**Actions:**

1. **Feed Management**
   - Allow multiple feeds (not just one)
   - Save drafts
   - Duplicate feeds
   - Archive old feeds

2. **Editing & Customization**
   - Edit prompts before generation
   - Reorder posts in grid
   - Swap posts between positions
   - Regenerate individual posts with variations
   - Edit captions before/after generation

3. **Smart Features**
   - "Regenerate with different style" option
   - "Make this more [adjective]" quick actions
   - Suggested improvements based on feed analysis
   - Color palette suggestions

4. **Export & Sharing**
   - Download feed as images
   - Export captions as CSV/text
   - Share feed preview link
   - Copy captions to clipboard

5. **Scheduling (Future)**
   - Connect to Instagram API (if possible)
   - Schedule posts
   - Best time to post suggestions
   - Content calendar view

### 4.4 Phase 4: Advanced Features (Long-term)

**Goal:** Make it the best feed planner available

**Actions:**

1. **Analytics Integration**
   - Track which posts perform best
   - Suggest improvements based on performance
   - A/B test different captions/styles

2. **AI Enhancements**
   - Auto-optimize feed based on engagement
   - Suggest content based on trending topics
   - Generate variations automatically

3. **Collaboration**
   - Share feeds with team
   - Get feedback before posting
   - Approval workflows

4. **Templates**
   - Pre-made feed templates
   - Industry-specific templates
   - Seasonal templates

---

## 5. Technical Recommendations

### 5.1 Architecture Improvements

1. **Use Background Jobs**
   - Queue image generation jobs
   - Process sequentially or in small batches
   - Update progress in real-time
   - Retry failed jobs automatically

2. **Simplify API Routes**
   - Consolidate similar endpoints
   - Standardize error responses
   - Add proper validation
   - Use consistent naming

3. **Database Optimizations**
   - Add proper indexes
   - Fix schema inconsistencies
   - Add status tracking columns
   - Add timestamps for debugging

4. **State Management**
   - Use React Query instead of SWR (better for complex state)
   - Single source of truth for feed data
   - Optimistic updates
   - Better error boundaries

### 5.2 Code Quality

1. **Remove Dead Code**
   - Delete unused `orchestrator.ts` or integrate it
   - Remove duplicate logic
   - Clean up migration scripts

2. **Add Tests**
   - Unit tests for strategy generation
   - Integration tests for API routes
   - E2E tests for user flow

3. **Documentation**
   - Document the flow
   - Add code comments
   - Create user guide

---

## 6. User Journey Redesign

### 6.1 Ideal Flow

**Step 1: Discovery**
- User sees Feed Planner in navigation
- Clicks and sees: "Create a cohesive 9-post Instagram feed with AI"
- Example feed preview
- Clear CTA: "Create My Feed"

**Step 2: Onboarding**
- Check if personal brand is complete
- If not, redirect with clear message
- If yes, proceed

**Step 3: Strategy Creation**
- Pre-filled request from brand profile (editable)
- "Enhance with Maya" button (optional)
- Preview: "You'll get 9 posts: 3 selfies, 2 lifestyle, 2 product, 2 behind-the-scenes"
- Cost breakdown: "14 credits (5 strategy + 9 images)"
- CTA: "Create Feed (14 credits)"

**Step 4: Generation**
- Show progress: "Creating strategy... (1/2)"
- Then: "Generating images... (1/9, 2/9...)"
- Real-time updates
- Estimated time: "~5 minutes"

**Step 5: Review**
- Show completed feed in grid
- Highlight any failed generations
- Allow regeneration of individual posts
- Edit captions
- CTA: "Export Feed" or "Schedule Posts"

**Step 6: Export/Use**
- Download images
- Copy captions
- Share preview
- Schedule (future)

### 6.2 Key Improvements

1. **Clarity at Every Step**
   - Users always know what's happening
   - Clear next steps
   - No surprises

2. **Automation**
   - Generate all images automatically
   - No manual clicking required
   - Background processing

3. **Flexibility**
   - Edit before/after generation
   - Regenerate individual posts
   - Make changes easily

4. **Transparency**
   - Clear costs
   - Real progress
   - Honest time estimates

---

## 7. Success Metrics

### 7.1 Key Metrics to Track

1. **Adoption**
   - % of users who try Feed Planner
   - % who complete a feed
   - % who generate all 9 images

2. **Engagement**
   - Time spent in Feed Planner
   - Number of feeds created per user
   - Regeneration rate

3. **Quality**
   - % of images successfully generated
   - User satisfaction (surveys)
   - Feed completion rate

4. **Business**
   - Credits spent on Feed Planner
   - Conversion from free to paid
   - Retention of Feed Planner users

### 7.2 Success Criteria

**Phase 1 Success:**
- 80% of users who start create a complete feed
- <5% error rate on image generation
- Average time to complete feed: <10 minutes

**Phase 2 Success:**
- 90% completion rate
- User satisfaction score >4/5
- <2% support tickets related to Feed Planner

**Phase 3 Success:**
- 50% of users create multiple feeds
- 30% use advanced features (editing, regeneration)
- Feed Planner becomes top 3 feature by usage

---

## 8. Implementation Priority

### Priority 1 (Do First - Week 1-2)
1. ✅ Fix automatic image generation
2. ✅ Improve credit transparency
3. ✅ Better error handling
4. ✅ Simplify state management

### Priority 2 (Do Next - Week 3-4)
1. ✅ Add onboarding flow
2. ✅ Improve strategy creation UX
3. ✅ Better feed view
4. ✅ Real progress updates

### Priority 3 (Do Soon - Month 2)
1. ✅ Multiple feeds support
2. ✅ Better editing capabilities
3. ✅ Export functionality
4. ✅ Feed management

### Priority 4 (Do Later - Month 3+)
1. ✅ Scheduling
2. ✅ Analytics
3. ✅ Templates
4. ✅ Collaboration

---

## 9. Risks & Mitigation

### 9.1 Technical Risks

**Risk:** Image generation failures
- **Mitigation:** Robust retry logic, clear error messages, manual retry option

**Risk:** Long generation times
- **Mitigation:** Show realistic estimates, process in background, allow users to leave and return

**Risk:** High credit costs
- **Mitigation:** Clear cost breakdown, allow partial generation, offer credit packages

### 9.2 User Experience Risks

**Risk:** Users don't understand the feature
- **Mitigation:** Better onboarding, examples, tooltips

**Risk:** Users abandon during generation
- **Mitigation:** Email notifications when complete, save progress, allow resume

**Risk:** Generated content doesn't match expectations
- **Mitigation:** Preview before generation, easy regeneration, editing options

---

## 10. Conclusion

The Feed Planner has strong potential but needs significant improvements to be useful. The core issues are:

1. **Too much manual work** - Users shouldn't have to click 9 times
2. **Unclear value** - Users don't know what they're getting
3. **Poor UX** - Confusing flow, unclear next steps
4. **Technical debt** - Competing implementations, complex state

**Recommended Approach:**
1. Fix core functionality first (automatic generation, better errors)
2. Improve UX (onboarding, clarity, progress)
3. Add power features (editing, export, management)
4. Build advanced features (scheduling, analytics)

With these improvements, Feed Planner can become a key differentiator for SSELFIE and a major value driver for users.

---

## Appendix: Quick Wins

**Can be done in 1-2 days:**
1. Fix credit cost display (15 → 14)
2. Add "Generate All" button that actually works
3. Show real progress instead of fake setTimeout
4. Better error messages
5. Add "What is Feed Planner?" tooltip

**Can be done in 1 week:**
1. Automatic image generation after strategy creation
2. Real-time progress updates
3. Better loading states
4. Onboarding flow
5. Feed completion celebration

**Can be done in 2-4 weeks:**
1. Multiple feeds support
2. Better editing UI
3. Export functionality
4. Feed management
5. Improved strategy creation flow






