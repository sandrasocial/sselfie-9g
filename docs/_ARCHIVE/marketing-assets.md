# Marketing Assets Map

**Purpose:** Connect codebase capabilities with marketing visibility - turning features into content and offers.

---

## 📱 Instagram Content Pipelines

### Feed Planner System
**Location:** `/app/feed-planner`, `/app/api/feed/*`, `/lib/feed-planner/*`

**Capabilities:**
- **9-Post Feed Layouts** - Create cohesive Instagram grids
- **AI Strategy Generation** - Complete Instagram growth strategy
- **Caption Generation** - AI-written captions with hooks, CTAs, hashtags
- **Bio Generator** - Instagram bio with emoji styling
- **Story Highlights** - Generate highlight covers (3-4 max)
- **Post Scheduling** - Calendar integration for posting
- **Visual Strategy** - 80/20 rule (80% user photos, 20% lifestyle)
- **Content Pillars** - Brand-aligned content strategy

**Content Types Generated:**
- Feed posts (9-post grids)
- Carousel posts
- Story sequences
- Reel concepts
- Hashtag strategies
- Posting schedules

**Database Tables:**
- `feed_layouts` - Feed configurations
- `feed_posts` - Individual posts
- `feed_strategy` - Complete strategy documents
- `instagram_bios` - Bio configurations
- `instagram_highlights` - Story highlights
- `carousel_posts` - Carousel configurations

**API Endpoints:**
- `/api/feed-planner/*` - Feed planning operations
- `/api/feed/[feedId]/*` - Feed management (40+ endpoints)
- `/api/maya/feed/*` - Maya AI feed generation

---

### Instagram Content Templates
**Location:** `/content-templates/instagram/`

**Available Templates:**

#### Daily Post Templates
- **Monday - Behind the Scenes** (`monday-behind-the-scenes.md`)
  - Humanize the brand
  - BTS content templates
- **Wednesday - Value Posts** (`wednesday-value-posts.md`)
  - Educational content
  - Free value delivery
- **Friday - Transformations** (`friday-transformations.md`)
  - Before/after stories
  - Success stories
- **Sunday - Community** (`sunday-community.md`)
  - Testimonials
  - Q&A content
  - Engagement posts

#### Supporting Content
- **Instagram Stories Templates** (`instagram-stories-templates.md`)
  - Daily story rotation (4 stories/day)
  - Link sticker strategies
- **Reels Scripts** (`reels-scripts.md`)
  - Ready-to-use reel scripts
  - 2-3x/week posting

#### Planning Tools
- **Content Calendar Template** (`content-calendar-template.md`)
  - 30-day posting calendar
  - Optimal posting times
- **Batch Workflow** (`batch-workflow.md`)
  - 2-hour weekly batching system
- **Metrics Tracker** (`instagram-metrics-tracker.md`)
  - Weekly performance tracking

**Content Mix:**
- 40% Value (educational)
- 30% Behind-the-Scenes
- 20% Transformation
- 10% Community

**Posting Rhythm:**
- Feed Posts: 4/week (Monday, Wednesday, Friday, Sunday)
- Stories: Daily (4 stories/day)
- Reels: 2-3x/week

---

## 📧 Email Automations

### Welcome Sequences
**Location:** `/app/api/cron/welcome-sequence`, `/lib/email/templates/welcome-sequence.ts`

**Sequence:**
1. **Day 0** (`welcome-day-0`)
   - Sent within 2 hours of signup
   - For paid members only
   - Welcome email with onboarding

2. **Day 3** (`welcome-day-3`)
   - 3 days after signup
   - Feature highlights
   - Usage tips

3. **Day 7** (`welcome-day-7`)
   - 7 days after signup
   - Success stories
   - Community invitation

**Schedule:** Daily at 10:00 AM UTC  
**Target:** Users with active subscriptions

---

### Nurture Sequences
**Location:** `/app/api/cron/nurture-sequence`, `/lib/email/templates/nurture-sequence.ts`

**Sequence:**
1. **Day 1** (`nurture-day-1`)
   - 1 day after freebie signup
   - Value delivery
   - Soft CTA

2. **Day 5** (`nurture-day-5`)
   - 5 days after signup
   - Case studies
   - Social proof

3. **Day 10** (`nurture-day-10`)
   - 10 days after signup
   - Conversion-focused
   - Membership offer

**Schedule:** Daily at 11:00 AM UTC  
**Target:** Freebie subscribers (`freebie_subscribers` table)

---

### Email Campaigns
**Location:** `/app/api/admin/email/*`, `/lib/email/*`

**Campaign Types:**
- **Newsletters** - Weekly/monthly updates
- **Promotional** - Product launches, sales
- **Announcements** - Feature releases, updates
- **Reengagement** - Win-back campaigns
- **Beta Testimonials** - Social proof campaigns

**Automation Features:**
- Scheduled campaigns (via cron every 15 minutes)
- Audience segmentation
- A/B testing capabilities
- Open/click tracking
- Conversion tracking

**Database Tables:**
- `admin_email_campaigns` - Campaign storage
- `email_sends` - Send tracking
- `email_logs` - Email history
- `blueprint_subscribers` - Blueprint email list
- `freebie_subscribers` - Freebie email list

**Templates:**
- Welcome email template (`email-templates/welcome-email.html`)
- Email template library (`email_templates` table)
- React email templates (`lib/email/templates/*`)

---

### Email Control System
**Location:** `/lib/email/email-control.ts`

**Feature Flags:**
- `email_sending_enabled` - Global kill switch
- `email_test_mode` - Test mode with whitelist

**Test Mode:**
- Whitelist via `EMAIL_TEST_WHITELIST` env var
- Admin email always allowed
- Prevents accidental sends

---

## 🌐 Landing Pages

### Main Landing Page
**Location:** `/app/page.tsx`, `/components/sselfie/landing-page-new.tsx`

**Features:**
- Hero section with value proposition
- Feature showcase
- Social proof (testimonials)
- Pricing/CTA
- Mobile-optimized

**Routes:**
- `/` - Main landing (redirects to `/studio` if authenticated)

---

### Brand Blueprint Landing
**Location:** `/app/blueprint/page.tsx`, `/components/blueprint/*`

**Features:**
- Interactive brand assessment quiz
- Email capture
- Concept card generation
- Before/after slider
- Embedded Stripe checkout
- Lead magnet delivery

**Flow:**
1. Brand assessment (10 questions)
2. Score calculation
3. Email capture
4. Concept generation
5. Checkout (optional upgrade)
6. Email delivery

**Database:**
- `blueprint_subscribers` - Email captures
- `blueprint_concepts` - Generated concepts

**API:**
- `/api/blueprint/generate-concepts`
- `/api/blueprint/subscribe`
- `/api/blueprint/email-concepts`

---

### Checkout Pages
**Location:** `/app/checkout/*`

**Pages:**
- `/checkout` - Main checkout
- `/checkout/membership` - Membership subscription
- `/checkout/credits` - Credit purchase
- `/checkout/one-time` - One-time session purchase
- `/checkout/success` - Success page
- `/checkout/cancel` - Cancel page

**Features:**
- Stripe Embedded Checkout
- Product selection
- Payment processing
- Success tracking

---

### Prompt Guides (Landing Pages)
**Location:** `/app/prompt-guides/*`

**Features:**
- Public URL-based pages (`/prompt-guides/[slug]`)
- Email capture (modal, inline, or top)
- Upsell links
- Preview images
- View/email tracking

**Database:**
- `prompt_pages` - Public pages
- `prompt_guides` - Guide collections
- `prompt_guide_items` - Individual prompts

**Email Capture Types:**
- Modal (default)
- Inline
- Top banner

---

## 🎓 Course Pages

### Academy
**Location:** `/app/academy` (via `/prompt-guides`), `/components/academy/*`

**Features:**
- Course catalog
- Video lessons
- Interactive lessons
- Exercises/quizzes
- Progress tracking
- Certificates
- Downloadable resources

**Course Types:**
- Video courses
- Interactive tutorials
- Templates library
- Monthly drops
- Flatlay images

**Database:**
- `academy_courses` - Course catalog
- `academy_lessons` - Lessons
- `user_academy_enrollments` - Enrollments
- `user_lesson_progress` - Progress tracking
- `academy_certificates` - Completion certificates
- `academy_templates` - Downloadable templates
- `academy_flatlay_images` - Flatlay resources
- `academy_monthly_drops` - Monthly content

**Access Control:**
- Tier-based access (foundation, professional, enterprise)
- Membership-gated content
- Progress tracking

---

## 🎨 Canva Template Libraries

### Content Templates
**Location:** `/content-templates/instagram/`

**Templates Available:**
- Instagram post templates (daily themes)
- Story templates
- Reel scripts
- Content calendar
- Metrics tracker

**Note:** While Canva templates aren't explicitly stored in codebase, the content templates provide:
- Copy templates
- Content frameworks
- Posting schedules
- Strategy guides

**Integration Opportunity:**
- Content templates can be used to create Canva designs
- Feed Planner generates images that can be used in Canva
- Instagram templates provide copy for Canva graphics

---

## 🔗 Marketing Asset Connections

### Feature → Content Pipeline

**Feed Planner → Instagram Content:**
- 9-post grids → Feed posts
- Strategy generation → Content calendar
- Caption generation → Post copy
- Bio generator → Profile optimization

**Maya AI → Content Ideas:**
- Concept cards → Post concepts
- Style recommendations → Visual direction
- Prompt generation → Image creation

**Academy → Educational Content:**
- Course content → Blog posts
- Templates → Lead magnets
- Lessons → Social media tips

**Email Sequences → Nurture Funnel:**
- Welcome sequence → Onboarding content
- Nurture sequence → Conversion content
- Campaigns → Promotional content

---

## 📊 Marketing Metrics & Tracking

### Available Data

**User Engagement:**
- Feed creation activity (`feed_layouts`)
- Image generation (`generated_images`, `ai_images`)
- Chat interactions (`maya_chats`, `maya_chat_messages`)
- Course progress (`user_lesson_progress`)

**Email Performance:**
- Email sends (`email_sends`)
- Campaign metrics (`admin_email_campaigns`)
- Open/click rates (via email provider)

**Conversion Tracking:**
- Subscriptions (`subscriptions`)
- Payments (`stripe_payments`)
- Credit purchases (`credit_transactions`)

**Landing Page Performance:**
- Blueprint signups (`blueprint_subscribers`)
- Freebie signups (`freebie_subscribers`)
- Prompt guide views (`prompt_pages.view_count`)

---

## 🎯 Content-to-Offer Mapping

### Instagram Content → Offers

**Behind-the-Scenes Posts:**
- → Link to Academy courses
- → "How I Built This" content
- → Behind-the-scenes of SSELFIE

**Value Posts:**
- → Free templates
- → Prompt guides
- → Educational content

**Transformation Posts:**
- → Customer testimonials
- → Before/after galleries
- → Success stories

**Community Posts:**
- → User-generated content
- → Testimonials
- → Case studies

### Email Sequences → Offers

**Welcome Sequence:**
- Day 0: Onboarding + Free resources
- Day 3: Feature highlights + Upgrade CTA
- Day 7: Success stories + Community invite

**Nurture Sequence:**
- Day 1: Value delivery + Soft CTA
- Day 5: Case studies + Social proof
- Day 10: Conversion offer + Membership CTA

### Landing Pages → Offers

**Blueprint Landing:**
- Lead magnet: Brand assessment
- Upsell: Membership subscription
- Email sequence: Concept delivery

**Prompt Guides:**
- Lead magnet: Prompt collection
- Upsell: Membership access
- Email sequence: Weekly prompts

---

## 🚀 Marketing Automation Opportunities

### Existing Automations
✅ Welcome sequences (Day 0, 3, 7)  
✅ Nurture sequences (Day 1, 5, 10)  
✅ Scheduled campaigns (every 15 minutes)  
✅ Audience segmentation  
✅ Email tracking

### Potential Automations
🔄 Feed completion → Email with strategy  
🔄 Course completion → Certificate + upsell  
🔄 Low engagement → Reengagement campaign  
🔄 High engagement → Referral program invite  
🔄 Credit depletion → Upgrade prompt

---

## 📝 Content Creation Workflow

### Weekly Content Batching (2 hours)

**Sunday:**
1. Review Feed Planner for next week's posts
2. Generate 9-post feed layout
3. Generate captions for all posts
4. Schedule posts via calendar
5. Create story templates
6. Record 2-3 reels using scripts

**Daily:**
- Post at optimal times
- Share 4 stories with link stickers
- Engage with comments/DMs (10 min)

**Monthly:**
- Review metrics
- Optimize based on data
- Plan next month's content

---

## 🎨 Brand Assets

### Visual Identity
- **Colors:** Black, White, Editorial Gray, Soft Gray
- **Typography:** Times New Roman (headlines), System Sans (body)
- **Style:** Minimalist, Vogue-inspired, high-fashion editorial

### Content Voice
- **Tone:** Warm, friendly, encouraging
- **Language:** Simple, everyday (no jargon)
- **Focus:** Transformation, empowerment, authenticity

### Image Assets
- **User Photos:** 80% of feed (selfies, portraits)
- **Lifestyle:** 20% of feed (flatlays, scenery)
- **Style:** Cohesive color palette, consistent lighting

---

## 🔄 Content Repurposing

### Feed Posts → Multiple Formats
1. **Feed Post** → Main Instagram post
2. **Reel** → Video version with trending audio
3. **Carousel** → Multi-slide educational content
4. **Story** → Behind-the-scenes or teaser
5. **Blog Post** → Extended version for website
6. **Email** → Newsletter content

### Academy Content → Social Media
- Course lessons → Instagram tips
- Templates → Lead magnets
- Certificates → Social proof posts

### Email Content → Social Media
- Newsletter highlights → Instagram posts
- Campaign themes → Story series
- Testimonials → Feed posts

---

## 📈 Growth Levers

### Instagram Growth
- Consistent posting (4x/week)
- Story engagement (daily)
- Reel distribution (2-3x/week)
- Link in bio optimization
- Hashtag strategy

### Email Growth
- Welcome sequence conversion
- Nurture sequence conversion
- Campaign open rates
- Segmentation effectiveness

### Landing Page Growth
- Blueprint conversion rate
- Prompt guide email capture
- Checkout completion rate

---

**Last Updated:** Auto-generated from codebase  
**Source Files:**
- `/content-templates/instagram/*`
- `/app/feed-planner/*`
- `/app/api/cron/*`
- `/lib/email/*`
- `/app/blueprint/*`
- `/app/prompt-guides/*`
- `/app/academy/*`
