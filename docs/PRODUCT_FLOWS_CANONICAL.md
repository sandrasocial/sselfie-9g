# SSELFIE Studio - Product Flows Canonical Documentation

**Last Updated:** January 2025  
**Purpose:** Complete system map for audits, fixes, UX improvements, and consistency checks

---

## 1. PRODUCT OVERVIEW

### What SSELFIE Studio Is
SSELFIE Studio is an AI-powered personal brand photo generation platform. Users upload 10-20 selfies to train a personal AI model, then use Maya (an AI stylist) to generate professional brand photos in various styles and contexts.

### Who It Is For
- **Primary:** Women entrepreneurs who need professional brand photos
- **Use Cases:** Instagram feeds, websites, media kits, digital products, online courses
- **Value:** 100+ professional photos per month for $47/month (less than a coffee per day)

### Core Value Proposition
1. **Train once** - Upload selfies to create personal AI model (one-time, ~5 minutes)
2. **Style with Maya** - Chat with AI stylist to create styled shoots matching brand vibe
3. **Gallery** - Save 100+ fresh professional images monthly into brand asset library

### Classic Mode vs Pro Mode (System Level)

**Classic Mode:**
- Uses trained LoRA model (custom model trained on user's selfies)
- Requires trigger word in prompts (e.g., "ohwx", "sselfie_username_social")
- Prompts: 50-100 words, concise
- Credit cost: 1 credit per image
- Generation: Replicate Flux model with LoRA weights
- User must complete training first

**Pro Mode:**
- Uses reference images (avatar library) instead of trained model
- NO trigger word (uses NanoBanana Pro model)
- Prompts: 150-250 words, detailed and editorial
- Credit cost: 2 credits per image
- Generation: NanoBanana Pro with reference images
- Requires at least 1 avatar image uploaded (works best with 3+)
- Can be used without training

**Key Difference:** Classic = trained model + trigger word, Pro = reference images + no trigger word

---

## 2. USER TYPES

### Visitor (Not Logged In)
- **Access:** Landing page only
- **Can Do:** View pricing, read content, sign up
- **Cannot Do:** Access studio, generate images, view gallery
- **Entry Point:** `/` (landing page)

### New Paying User
- **Access:** After purchase (one-time or membership)
- **Status:** Has credits but may not have trained model
- **First Steps:** Onboarding wizard → training → Maya chat
- **Entry Point:** Redirected to `/studio` after purchase

### Existing User (Classic)
- **Access:** Full studio access
- **Requirements:** Trained model completed
- **Primary Flow:** Maya chat → generate images → gallery
- **Credit Usage:** 1 credit per Classic image

### Existing User (Pro)
- **Access:** Full studio access
- **Requirements:** Avatar images uploaded (1+ required, 3+ recommended)
- **Primary Flow:** Maya chat (Pro Mode) → generate images → gallery
- **Credit Usage:** 2 credits per Pro image

### Test/E2E User
- **Access:** Same as regular users
- **Special:** Test mode flag in database
- **Purpose:** Testing without consuming real credits
- **Identification:** `is_test` flag in user_models, `is_test_mode` in credit_transactions

### Admin User
- **Access:** Admin routes (`/admin/*`)
- **Features:** Impersonation, guide management, testing lab
- **Identification:** Admin check via Supabase auth metadata or database flag

---

## 3. ENTRY & PURCHASE FLOWS

### Landing Page → Purchase Flow

**Step 1: Landing Page (`/`)**
- Visitor sees landing page with pricing
- Two products available:
  - **One-Time Session:** $47 (50 credits, one-time grant)
  - **Creator Studio Membership:** $47/month (200 credits/month, recurring)

**Step 2: Purchase Initiation**
- User clicks "Get Started" or pricing CTA
- `startEmbeddedCheckout()` called from `lib/start-embedded-checkout.ts`
- Creates Stripe checkout session via `/api/landing/checkout`
- Redirects to Stripe hosted checkout page

**Step 3: Stripe Checkout**
- User completes payment on Stripe
- Stripe redirects back to app with success/error

**Step 4: Account Creation & Password Setup**
- If new user: Supabase auth account created during checkout
- User receives email with password setup link (if email/password auth)
- Or: OAuth flow (Google, etc.) creates account automatically

**Step 5: Post-Purchase Redirect**
- **One-Time Purchase:** Redirects to `/studio?welcome=true`
- **Membership Purchase:** Redirects to `/studio?welcome=true`
- **Note:** Studio screen removed - users land directly in Maya chat

**Step 6: Credit Grant**
- Stripe webhook (`/api/webhooks/stripe/route.ts`) processes payment
- Credits granted:
  - One-Time: `grantOneTimeSessionCredits()` → 50 credits
  - Membership: `grantMonthlyCredits()` → 200 credits
- Subscription record created in `subscriptions` table

### Redirect Logic

**From Landing Page (`app/page.tsx`):**
- If user authenticated → check if internal navigation
- If direct visit → redirect to `/studio`
- If internal navigation → show landing page (allow viewing)

**From Studio Page (`app/studio/page.tsx`):**
- Checks auth → gets Neon user → loads `SselfieApp` component
- No redirect to separate "Studio" screen
- Users land directly in Maya chat interface

### First-Time vs Returning User Behavior

**First-Time User:**
- Onboarding wizard triggered (if no trained model)
- Must complete: gender selection → selfie upload → training
- After training: Onboarding wizard closes → Maya chat opens

**Returning User:**
- Onboarding wizard skipped (has trained model)
- Lands directly in Maya chat
- Can access all tabs: Photos, Videos, Prompts, Training, Feed

---

## 4. ONBOARDING FLOW

### Onboarding Modal Trigger Conditions

**Triggered When:**
- User has no trained model (`hasTrainedModel = false`)
- User enters `/studio` for first time
- Component: `components/sselfie/onboarding-wizard.tsx`

**Not Triggered When:**
- User has completed training (`hasTrainedModel = true`)
- User dismisses modal (can be reopened via Training tab)

### Step-by-Step Flow

**Step 1: Welcome Screen**
- Modal opens with welcome message
- "Get Started" button → proceeds to upload

**Step 2: Gender Selection**
- Required field
- Options: "woman", "man", "non-binary"
- Stored for model training accuracy

**Step 3: Ethnicity Selection**
- Required field (appears after gender selected)
- Options: Black, White, Asian, Latina/Latino, Middle Eastern, South Asian, Mixed, Other, Prefer not to say
- Used for accurate representation in generated images

**Step 4: Selfie Upload**
- Upload 10-20 images (minimum 10 required)
- File validation:
  - Max 15MB per image
  - Formats: JPG, PNG, WebP
  - HEIC/HEIF rejected (must convert first)
- Images compressed client-side:
  - Progressive compression (1600px → 600px if needed)
  - Target: ZIP file < 4MB total
  - Quality levels: 0.85 → 0.55 (if needed)

**Step 5: ZIP Creation & Upload**
- Client creates ZIP from compressed images
- Uploads to `/api/training/upload-zip`
- Server extracts ZIP → saves to Supabase storage
- Training job created in Replicate

**Step 6: Training Start + Progress**
- Training status: `training` → `processing` → `completed`
- Progress polling: `/api/training/progress?modelId=xxx` (every 15 seconds)
- UI shows: Progress percentage, progress bar, cancel option
- Typical duration: 2-5 minutes

**Step 7: Training Completion**
- Status changes to `completed`
- Modal shows success screen
- "Start Creating" button → closes modal → opens Maya chat

**Step 8: Brand Profile Wizard (Optional)**
- Can be completed later via Settings
- Not required for image generation
- Recommended for better Maya personalization
- Access: Settings → Brand Profile

### Completion → Maya Chat
- Onboarding wizard `onComplete()` callback
- Wizard closes
- User lands in Maya chat (Photos tab)
- Can start generating images immediately

---

## 5. MAYA CHAT CORE FLOW

### Chat Interface Structure

**Component:** `components/sselfie/maya-chat-screen.tsx`

**Tabs:**
- **Photos:** Main chat interface (default)
- **Videos:** Video/B-roll generation
- **Prompts:** Admin-published prompt guides
- **Training:** Training status and retraining
- **Feed:** Feed creation flow

**Mode Toggle:**
- Classic Mode (default if trained model exists)
- Pro Mode (requires avatar images)
- Toggle persists in localStorage

### Chat Streaming Behavior

**Message Flow:**
1. User types message → `sendMessage()` called
2. Message sent to `/api/maya/chat` (streaming endpoint)
3. Server streams response via Vercel AI SDK
4. Client receives chunks → updates UI in real-time
5. Message saved to database when complete

**Chat Management:**
- Active chat loaded on mount
- New chat: Creates new chat record
- Chat history: Sidebar with all previous chats
- Chat switching: Loads messages for selected chat
- Auto-save: Messages saved after streaming completes

### Quick Prompt Starters

**Component:** `components/sselfie/maya/maya-quick-prompts.tsx`

**Behavior:**
- Pre-defined prompt suggestions
- Click → inserts into input field
- Examples: "Create a professional headshot", "Generate a lifestyle photo", etc.
- Context-aware based on user's brand profile

### Concept Card Creation

**Flow:**
1. User requests concept in chat
2. Maya generates concept via `[GENERATE_CONCEPTS]` tool
3. Concept includes: title, description, prompt, category
4. Concept card rendered in chat
5. User clicks "Generate" → image generation starts

**Concept Card Structure:**
- Title (e.g., "Professional Headshot")
- Description (e.g., "Clean, modern headshot for LinkedIn")
- Prompt (used for image generation)
- Category (portrait, lifestyle, business, etc.)
- Generate button

### Classic vs Pro Prompt Logic

**Classic Mode Prompt Generation:**
- System prompt includes LoRA training context
- Prompts must include trigger word
- Prompt length: 50-100 words
- Uses `getMayaSystemPrompt(MAYA_CLASSIC_CONFIG)`
- Trigger word prepended automatically if missing

**Pro Mode Prompt Generation:**
- System prompt includes reference image context
- Prompts must NOT include trigger word
- Prompt length: 150-250 words (detailed, editorial)
- Uses `getMayaSystemPrompt(MAYA_PRO_CONFIG)`
- Reference images selected from avatar library

**Mode Detection:**
- User toggles mode in UI
- Mode stored in chat context
- API routes check mode → use appropriate generation method

### Credit Usage Rules

**Credit Costs:**
- Classic image: 1 credit
- Pro image: 2 credits
- Video/B-roll: 3 credits
- Training: 25 credits (one-time)

**Credit Check Flow:**
1. Before generation: `checkCredits(userId, requiredAmount)`
2. If insufficient: Show "Buy Credits" modal
3. If sufficient: Deduct credits → start generation
4. Transaction recorded in `credit_transactions` table

**Credit Balance:**
- Displayed in header
- Updates after each transaction
- Cached for performance (`lib/credits-cached.ts`)

### Image Generation Lifecycle

**Step 1: Prompt → Replicate**
- User clicks "Generate" on concept card
- Prompt sent to `/api/maya/generate-image` (Classic) or `/api/maya/pro/generate-image` (Pro)
- Credits deducted
- Replicate prediction created

**Step 2: Replicate → Temp URL**
- Replicate generates image
- Returns temporary URL (expires in ~1 hour)
- Status polling: `/api/maya/check-generation?predictionId=xxx`

**Step 3: Temp URL → Blob**
- Image downloaded from Replicate temp URL
- Uploaded to Vercel Blob storage
- Permanent URL created

**Step 4: Blob → Gallery**
- Image saved to `ai_images` table
- Fields: `user_id`, `image_url`, `prompt`, `category`, `saved`, `created_at`
- Gallery ID returned

**Step 5: Gallery → UI Card**
- Image card rendered in chat
- Shows: image, prompt, category, save status
- User can: download, save to gallery (if not auto-saved), regenerate

**Auto-Save Behavior:**
- All generated images auto-save to gallery
- No preview before generation (by design)
- User can review in Gallery tab later

---

## 6. IMAGE SYSTEM

### Classic Mode Image Generation

**Requirements:**
- Trained LoRA model (`training_status = 'completed'`)
- Trigger word (e.g., "ohwx", "sselfie_username_social")
- LoRA weights URL from `user_models` table

**Generation Process:**
1. Prompt prepended with trigger word
2. Replicate Flux model called with:
   - `hf_lora`: LoRA weights URL
   - `lora_scale`: User's preferred scale (default 0.8)
   - `extra_lora`: Realism LoRA (optional)
   - Quality presets from `lib/maya/quality-settings.ts`

**Credit Cost:** 1 credit per image

**API Route:** `/api/maya/generate-image`

### Pro Mode Image Generation

**Requirements:**
- At least 1 avatar image uploaded (3+ recommended)
- Avatar images stored in `user_avatar_images` table
- Reference images selected from avatar library

**Generation Process:**
1. Prompt does NOT include trigger word
2. NanoBanana Pro model called with:
   - `image_input`: Array of reference image URLs
   - `prompt`: Detailed 150-250 word prompt
   - `aspect_ratio`: User-selected (default 4:5)
   - `resolution`: 2K
   - `output_format`: PNG

**Credit Cost:** 2 credits per image

**API Route:** `/api/maya/pro/generate-image`

### Gallery Saving Logic

**Auto-Save:**
- All generated images automatically save to `ai_images` table
- No user action required
- Gallery ID returned in generation response

**Manual Save:**
- User can "unsave" and "save" images
- Updates `saved` field in `ai_images` table
- Saved images appear in Gallery tab

**Gallery Table Structure:**
- `id`: Primary key
- `user_id`: User identifier
- `image_url`: Vercel Blob URL
- `prompt`: Generation prompt
- `category`: Image category
- `saved`: Boolean (saved to gallery)
- `created_at`: Timestamp
- `generation_type`: "classic" | "pro" | "feed" | "video"

### Relationship Between Maya Outputs and Gallery

**All Maya Generations:**
- Concept cards → images → saved to gallery
- Photoshoots → images → saved to gallery
- Feed posts → images → saved to gallery
- Videos → thumbnails → saved to gallery

**Gallery Access:**
- Gallery tab shows all `ai_images` where `saved = true`
- Filterable by category, date, type
- Downloadable as high-res images

---

## 7. VIDEO / B-ROLL FLOW

### Image → Motion Prompt Generation

**Trigger:**
- User selects image from gallery or chat
- Clicks "Create Video" or "Add Motion"
- Component: `components/sselfie/b-roll-screen.tsx`

**Motion Prompt Flow:**
1. Image sent to `/api/maya/generate-motion-prompt`
2. Maya analyzes image → generates motion prompt
3. Motion prompt describes desired movement/animation
4. Example: "gentle hair movement, soft smile, natural head turn"

### Replicate WAN Model Usage

**Model:** WAN-2.5 I2V (Image-to-Video)

**Process:**
1. Input image (from gallery or generation)
2. Motion prompt (from Maya or user-provided)
3. Replicate prediction created via `/api/maya/generate-video`
4. Prediction ID stored in database

**Note:** WAN-2.5 does NOT support LoRA weights
- Character consistency relies on input image quality
- LoRA data kept for reference but not used

### Video Return and Rendering

**Status Polling:**
- `/api/maya/check-video?predictionId=xxx`
- Polls every 3-5 seconds
- Status: `starting` → `processing` → `succeeded` → `failed`

**Video URL:**
- Replicate returns video URL (MP4)
- Video downloaded → uploaded to Vercel Blob
- Permanent URL stored in database

**Rendering:**
- Video card displayed in chat/Videos tab
- Shows: thumbnail, motion prompt, duration
- User can: play, download, share

### Credit Usage

**Cost:** 3 credits per video

**Deduction:**
- Credits deducted before generation starts
- If insufficient: Error shown, generation not started

### How Videos Are Displayed and Saved

**Display:**
- Videos tab: Grid of all user videos
- Chat: Video cards inline with messages
- Gallery: Video thumbnails (if saved)

**Saving:**
- Videos saved to `ai_images` table with `generation_type = 'video'`
- Video URL stored in `image_url` field
- Thumbnail generated and stored

---

## 8. PROMPTS TAB

### Admin-Published Prompt Guides

**Purpose:** Pre-written prompt templates for common use cases

**Structure:**
- Guides organized by category
- Each guide has: title, description, prompt template
- Admin publishes via `/api/admin/prompt-guide/*`

**Access:**
- Prompts tab in Maya chat
- Free guides: Visible to all users
- Internal guides: Visible to admins only

### Free vs Internal Prompts

**Free Prompts:**
- Publicly available
- No access restrictions
- Examples: "Professional Headshot", "Lifestyle Photo"

**Internal Prompts:**
- Admin-only
- Used for testing/development
- Not visible to regular users

### Click-to-Generate Behavior

**Flow:**
1. User clicks prompt guide
2. Prompt template inserted into chat input
3. User can edit or send as-is
4. Maya processes prompt → generates concept → generates image

**No Direct Generation:**
- Prompts are templates, not direct generators
- User must send message to Maya
- Maya interprets prompt → creates concept → generates image

### Relationship to Maya and Image Generation

**Prompts Tab → Maya Chat:**
- Prompts are starting points
- User selects prompt → edits if needed → sends to Maya
- Maya uses prompt to generate concept card
- Concept card → image generation

**Not Direct:**
- Prompts tab does NOT directly generate images
- Always goes through Maya chat flow
- Ensures consistency and quality control

---

## 9. TRAINING & RETRAINING

### Initial Training Flow

**Triggered By:**
- Onboarding wizard (first-time users)
- Training tab → "Retrain Model" button

**Process:**
1. User uploads 10-20 selfies
2. Images compressed → ZIP created
3. ZIP uploaded to `/api/training/upload-zip`
4. Server extracts ZIP → saves to Supabase storage
5. Training job created in Replicate
6. Model ID stored in `user_models` table
7. Status: `training` → `processing` → `completed`

**Training Status:**
- Polled via `/api/training/progress?modelId=xxx`
- Updates every 15 seconds
- Progress percentage: 0-100%

**Completion:**
- Status changes to `completed`
- LoRA weights URL stored in `user_models.lora_weights_url`
- Trigger word assigned (e.g., "ohwx")
- User can now generate Classic Mode images

### Retraining Conditions

**When Retraining is Needed:**
- User wants to update model with new photos
- Model quality issues
- User appearance changes significantly

**Retraining Process:**
- Same as initial training
- New model replaces old model
- Old model marked as inactive (not deleted)
- New trigger word may be assigned

### Where Training is Triggered

**Onboarding Wizard:**
- First-time users
- Automatic trigger if no trained model

**Training Tab:**
- Existing users
- "Retrain Model" button
- Manual trigger

**Settings:**
- Training status display
- Link to Training tab

### How Status is Communicated to Users

**Onboarding Wizard:**
- Progress bar with percentage
- Status text: "Training Your Model"
- Cancel option available

**Training Tab:**
- Real-time progress updates
- Status: "Training", "Processing", "Completed", "Failed"
- Error messages if training fails

**Notifications:**
- No email notifications (in-app only)
- Status updates via polling
- User must check Training tab for updates

---

## 10. FEED CREATION FLOW (CRITICAL)

### Conversational Feed Design with Maya

**Entry Point:**
- Feed tab in Maya chat
- User starts conversation: "Create a feed for my Instagram"

**Flow:**
1. User requests feed creation
2. Maya analyzes brand profile (if completed)
3. Maya generates feed strategy via `[CREATE_FEED_STRATEGY]` tool
4. Strategy includes: 9 posts, aesthetic, color palette, captions
5. User reviews strategy → approves or requests changes

### Strategy Generation

**Maya's Process:**
1. Reads user's brand profile (business type, brand vibe, target audience)
2. Generates 9-post strategy with:
   - Post positions (1-9)
   - Content pillars (hook, value, lifestyle, etc.)
   - Aesthetic (e.g., "Clean & Minimalistic", "Warm & Cozy")
   - Color palette
   - Caption drafts
   - Generation mode (Classic or Pro - user selects via toggle)

**Strategy Structure:**
```json
{
  "aesthetic": "Clean & Minimalistic",
  "colorPalette": ["white", "beige", "cream"],
  "posts": [
    {
      "position": 1,
      "contentPillar": "Hook post",
      "purpose": "Approachable first impression",
      "prompt": "Full prompt for image generation",
      "generationMode": "classic" | "pro",
      "caption": "Draft caption"
    },
    // ... 8 more posts
  ]
}
```

### Feed Card Rendering

**After Strategy Approval:**
- Feed card rendered in chat
- Shows: 3x3 grid preview, aesthetic, color palette
- User clicks "Generate Feed" → starts 9-image generation

**Feed Card Component:**
- `components/sselfie/maya/maya-feed-tab.tsx`
- Displays placeholder grid
- Updates as images generate

### 9-Image Generation Flow

**Process:**
1. User clicks "Generate Feed"
2. Strategy sent to `/api/feed-planner/create-from-strategy`
3. Feed record created in `feeds` table
4. 9 posts created in `feed_posts` table (status: `pending`)
5. Generation starts for each post (parallel or sequential)

**Generation Per Post:**
- Classic Mode: `/api/feed/[feedId]/generate-single` (1 credit)
- Pro Mode: `/api/feed/[feedId]/generate-single` (2 credits)
- Uses prompt from strategy
- Replicate generation → Blob upload → database update

**Status Updates:**
- Post status: `pending` → `generating` → `completed` → `failed`
- Polled via `/api/feed/[feedId]/progress`
- UI updates in real-time

### Placeholder → Generation → Final Image Mapping

**Placeholder Phase:**
- 3x3 grid shows placeholder cards
- Each card shows: position, content pillar, status

**Generation Phase:**
- Placeholder replaced with loading spinner
- Progress indicator shows generation status
- Image preview appears when ready

**Final Image Phase:**
- Placeholder replaced with generated image
- Image clickable → opens full view
- User can regenerate individual posts

**Mapping:**
- Post position (1-9) maps to grid position
- Database: `feed_posts.position` → UI grid index
- Images stored in `feed_posts.image_url`

### Save Feed → Feed Planner

**After Generation:**
- User clicks "Save Feed" or "View in Feed Planner"
- Feed saved to database (if not already saved)
- Redirects to `/feed-planner?feedId=xxx`

**Feed Planner Access:**
- Feed Planner screen: `components/feed-planner/feed-view-screen.tsx`
- Shows: 3x3 grid, bio, profile picture, highlights, captions
- User can: edit captions, regenerate posts, create highlights

---

## 11. FEED PLANNER SYSTEM

### Feed Organization

**Feed Structure:**
- One feed = 9 posts (3x3 grid)
- Feeds stored in `feeds` table
- Posts stored in `feed_posts` table
- User can have multiple feeds

**Feed List:**
- `/api/feed/list` returns all user feeds
- Feeds ordered by `created_at DESC`
- Feed selector in Feed Planner header

### Bio Generation

**Trigger:**
- User clicks "Generate Bio" in Feed Planner
- Requires brand profile completion

**Process:**
1. Bio generation request sent to `/api/feed/[feedId]/generate-bio`
2. Maya analyzes brand profile → generates Instagram bio
3. Bio saved to `feeds.instagram_bio` field
4. User can edit bio after generation

**Requirements:**
- Brand profile must be completed
- Error shown if brand profile missing

### Profile Picture Upload/Selection

**Upload:**
- User clicks profile picture area
- File picker opens
- Image uploaded to `/api/feed/[feedId]/upload-profile-image`
- Image saved to Vercel Blob
- URL stored in `feeds.profile_image_url`

**Selection:**
- User can select from gallery
- Or upload new image
- Profile picture displayed in Feed Planner header

### Drag & Drop

**Post Reordering:**
- User drags post card to new position
- Position updated in database
- Grid re-renders with new order
- API: `/api/feed/[feedId]/reorder-posts`

**Limitations:**
- Only reorders within same feed
- Cannot move posts between feeds
- Position must be 1-9

### Highlights Creation

**Purpose:** Instagram story highlights (3-4 max)

**Process:**
1. User clicks "Create Highlight"
2. Selects image from feed or gallery
3. Enters highlight name
4. Highlight saved to `feed_highlights` table
5. Highlight displayed in Feed Planner

**Limitations:**
- Max 3-4 highlights per feed
- Highlight image uploaded to Vercel Blob
- URL stored in `feed_highlights.image_url`

### Posts Tab (Captions Per Post)

**Caption Editing:**
- Each post has editable caption
- Caption stored in `feed_posts.caption` field
- User can edit directly in Feed Planner

**Caption Generation:**
- Captions generated during feed strategy creation
- User can regenerate via Maya chat
- Or edit manually

### Strategy Tab (Long-Form Strategy Doc)

**Purpose:** Detailed strategy document for feed

**Content:**
- Aesthetic description
- Color palette
- Content pillars
- Post-by-post breakdown
- Caption strategy
- Hashtag suggestions

**Access:**
- Strategy tab in Feed Planner
- Read-only view
- Can be exported/shared

### "My Feed" Organization and Reuse

**Feed Management:**
- User can create multiple feeds
- Feeds listed in Feed Planner selector
- Each feed is independent (9 posts)

**Reuse:**
- User cannot "duplicate" feed
- Must create new feed for new strategy
- Old feeds remain accessible for reference

**Organization:**
- Feeds ordered by creation date (newest first)
- Feed name/title stored in `feeds.title` field
- User can rename feeds

---

## 12. ACADEMY

### Courses

**Structure:**
- Courses stored in `academy_courses` table
- Lessons stored in `academy_lessons` table
- User progress in `user_academy_enrollments` and `user_lesson_progress`

**Course Types:**
- Video courses (video lessons)
- Interactive courses (step-by-step guides)

### Content Types

**Video Lessons:**
- Video URL (Vercel Blob or external)
- Duration in minutes
- Progress tracking

**Interactive Lessons:**
- JSONB content structure
- Steps with: title, description, image, action items
- Embedded tutorials (ScribeHow)
- Downloadable resources

### Access Rules

**Requirement:**
- Studio Membership only (`sselfie_studio_membership`)
- Checked via `hasStudioMembership(userId)`

**API Routes:**
- `/api/academy/courses` - List all courses
- `/api/academy/courses/[courseId]` - Course details
- `/api/academy/enroll` - Enroll in course
- `/api/academy/my-courses` - User's enrolled courses

**Access Denied:**
- One-time session users: No access
- Free users: No access
- Error message: "Academy access requires Studio Membership"

### Relationship to Subscription

**Subscription Check:**
- `hasStudioMembership()` checks `subscriptions` table
- Product type must be `sselfie_studio_membership`
- Status must be `active`

**Upgrade Prompt:**
- Users without membership see upgrade CTA
- Links to checkout for Studio Membership

---

## 13. ACCOUNT & SETTINGS

### Profile Editing

**Access:**
- Settings panel in Maya chat
- Or: Settings tab in app navigation

**Editable Fields:**
- Display name
- Email (via Supabase auth)
- Profile picture
- Password (via Supabase auth)

**API Routes:**
- `/api/user/profile` - Get/update profile
- `/api/user/avatar` - Upload avatar images

### Brand Profile Wizard Access

**Access:**
- Settings → Brand Profile
- Or: Prompt in Studio screen (if not completed)

**Wizard Flow:**
1. Business type selection
2. Brand vibe selection
3. Target audience
4. Color palette selection
5. Brand voice description
6. Save to `user_personal_brands` table

**Completion:**
- Not required for image generation
- Recommended for better Maya personalization
- Used in feed strategy generation

### Subscription Management

**View Subscription:**
- Settings → Subscription
- Shows: Product type, status, renewal date
- API: `/api/user/subscription`

**Cancellation:**
- User cancels via Stripe customer portal
- Or: Contact support
- Status updated to `cancelled` via webhook

**Upgrade:**
- One-time → Membership: Purchase new subscription
- Membership → Higher tier: Not available (single tier)

### Cancellation/Upgrade Logic

**Cancellation:**
- Stripe webhook processes cancellation
- Subscription status: `active` → `cancelled`
- User retains access until period end
- Credits not revoked (already granted)

**Upgrade:**
- Purchase new subscription
- Old subscription cancelled
- New subscription created
- Credits granted immediately

### Best Work 3x3 Grid

**Purpose:** Showcase user's best generated images

**Selection:**
- User selects 9 images from gallery
- Saved to `user_best_work` table (or similar)
- Displayed in profile/settings

**Note:** Implementation may vary - check actual database schema

---

## 14. SYSTEMS & INTEGRATIONS

### Supabase (Auth)

**Purpose:** User authentication and storage

**Usage:**
- Auth: User login, signup, password reset
- Storage: Training images (ZIP files)
- Client: `lib/supabase/server.ts` (server), `lib/supabase/client.ts` (client)

**Tables:**
- `auth.users` - Supabase auth users
- Mapped to Neon `users` table via `user-mapping.ts`

### Neon/Postgres

**Purpose:** Primary database for all app data

**Key Tables:**
- `users` - User profiles
- `user_models` - Trained LoRA models
- `user_credits` - Credit balances
- `credit_transactions` - Credit transaction history
- `subscriptions` - Stripe subscriptions
- `ai_images` - Generated images (gallery)
- `maya_chats` - Chat conversations
- `maya_chat_messages` - Chat messages
- `feeds` - Feed strategies
- `feed_posts` - Feed post images
- `user_personal_brands` - Brand profiles
- `academy_courses` - Academy courses
- `user_avatar_images` - Pro Mode reference images

**Connection:**
- `lib/db.ts` - Database client
- `lib/neon.ts` - Neon serverless client

### Replicate

**Purpose:** AI image and video generation

**Models Used:**
- **Flux (Classic Mode):** `black-forest-labs/flux-dev` with LoRA weights
- **NanoBanana Pro (Pro Mode):** `nateraw/nanobanana-pro` with reference images
- **WAN-2.5 (Video):** Image-to-video generation

**API Client:**
- `lib/replicate-client.ts`
- Predictions created → polled for completion
- Results downloaded → uploaded to Vercel Blob

### Vercel Blob

**Purpose:** Permanent image and file storage

**Usage:**
- Generated images (after Replicate temp URLs expire)
- Training ZIP files
- Avatar images (Pro Mode)
- Feed images
- Video files

**Client:**
- `@vercel/blob` package
- Upload via `put()` method
- URLs: `https://[account].public.blob.vercel-storage.com/...`

### Claude / OpenAI

**Purpose:** Maya's AI intelligence

**Models:**
- **Claude Sonnet 4:** Concept generation, feed strategy
- **Claude Haiku 4.5:** Quick responses, prompt generation
- **OpenAI GPT-4:** Alternative (if configured)

**Usage:**
- Maya chat streaming
- Concept card generation
- Feed strategy generation
- Motion prompt generation

**Client:**
- Vercel AI SDK (`ai` package)
- Streaming responses
- Tool calling for structured outputs

### Stripe

**Purpose:** Payment processing and subscriptions

**Products:**
- One-Time Session: $47 (50 credits)
- Creator Studio Membership: $47/month (200 credits/month)

**Webhooks:**
- `/api/webhooks/stripe/route.ts`
- Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Processes: Credit grants, subscription updates

**Client:**
- `lib/stripe.ts` - Stripe client initialization

### Cron Jobs

**Purpose:** Scheduled tasks

**Known Jobs:**
- Monthly credit grants (for subscriptions)
- Subscription renewal checks
- Training status cleanup

**Note:** Check Vercel Cron configuration for exact schedules

---

## 15. REVENUE-CRITICAL FLOWS

### Flows That Block Revenue If Broken

**1. Purchase Flow**
- Landing page → Stripe checkout → Credit grant
- **Break Point:** Webhook fails → no credits granted
- **Impact:** User pays but cannot use product

**2. Credit Grant System**
- Stripe webhook → `grantMonthlyCredits()` or `grantOneTimeSessionCredits()`
- **Break Point:** Database error → credits not granted
- **Impact:** User cannot generate images

**3. Credit Deduction**
- Before generation: `checkCredits()` → `deductCredits()`
- **Break Point:** Credits not deducted → free generations
- **Impact:** Revenue loss

**4. Subscription Renewal**
- Monthly credit grants via cron
- **Break Point:** Cron fails → users don't receive monthly credits
- **Impact:** User churn, support tickets

**5. Stripe Webhook Processing**
- Payment events → subscription updates
- **Break Point:** Webhook fails → subscription not activated
- **Impact:** User pays but no access

**6. Onboarding → First Generation**
- Training → Maya chat → Image generation
- **Break Point:** Training fails → user cannot generate
- **Impact:** User churn, refunds

---

## 16. KNOWN COMPLEXITY / RISK AREAS

### Long Async Chains

**1. Feed Generation (9 Images)**
- Strategy generation → 9 parallel generations → Blob uploads → Database updates
- **Risk:** One failure can break entire feed
- **Mitigation:** Individual post error handling, partial success allowed

**2. Training → First Generation**
- Upload → ZIP → Replicate training → Model ready → Image generation
- **Risk:** Long wait time, user may abandon
- **Mitigation:** Progress indicators, email notifications (if implemented)

**3. Video Generation**
- Image → Motion prompt → Replicate WAN → Blob upload → Database
- **Risk:** Video generation takes 30-60 seconds
- **Mitigation:** Status polling, loading states

### Credit-Sensitive Operations

**1. Credit Deduction Timing**
- Credits deducted before generation starts
- **Risk:** Generation fails → credits lost
- **Mitigation:** Refund logic for failed generations (check implementation)

**2. Concurrent Generations**
- Multiple tabs/windows → race conditions
- **Risk:** Double deduction or insufficient credit checks
- **Mitigation:** Database transactions, credit locks

**3. Credit Balance Caching**
- Cached credit balance for performance
- **Risk:** Stale balance → incorrect checks
- **Mitigation:** Cache invalidation on transactions

### Multi-Step User Journeys

**1. Onboarding → Training → First Image**
- 3 separate steps, user can abandon at any point
- **Risk:** High drop-off rate
- **Mitigation:** Progress indicators, clear next steps

**2. Feed Creation → Generation → Feed Planner**
- Strategy → 9 generations → Feed Planner editing
- **Risk:** User confusion, incomplete feeds
- **Mitigation:** Clear navigation, status indicators

**3. Brand Profile → Feed Strategy**
- Brand profile optional but recommended
- **Risk:** Poor strategy without brand profile
- **Mitigation:** Prompts to complete brand profile

### Areas Prone to Silent Failure

**1. Gallery Auto-Save**
- Images auto-save to gallery
- **Risk:** Save fails silently → image lost
- **Mitigation:** Error logging, retry logic

**2. Webhook Processing**
- Stripe webhooks processed asynchronously
- **Risk:** Webhook fails → no error shown to user
- **Mitigation:** Webhook monitoring, error alerts

**3. Replicate Polling**
- Status polling for generations
- **Risk:** Polling stops → generation stuck
- **Mitigation:** Timeout handling, manual refresh

**4. Credit Transactions**
- Credit transactions recorded in database
- **Risk:** Transaction fails → credits not recorded
- **Mitigation:** Database transactions, error logging

---

## 17. SCOPE NOTES

### What is Intentionally Complex

**1. Feed Generation System**
- 9-image generation with strategy, captions, bio
- **Why:** Complex because it's a core feature requiring coordination

**2. Classic vs Pro Mode Logic**
- Two separate generation paths
- **Why:** Different models, different prompts, different credit costs

**3. Credit System**
- Credits, transactions, grants, deductions
- **Why:** Revenue-critical, must be accurate

### What is Intentionally Manual

**1. Brand Profile Completion**
- User must manually complete brand profile
- **Why:** Personalization requires user input

**2. Feed Caption Editing**
- User edits captions manually in Feed Planner
- **Why:** Captions are personal, AI-generated drafts need refinement

**3. Image Selection for Feeds**
- User selects which images to use in feeds
- **Why:** User has final say on feed composition

### What is Future-Facing But Not Active

**1. Academy Interactive Lessons**
- JSONB structure supports interactive lessons
- **Status:** Structure exists, content may be limited

**2. Multiple Feed Management**
- Users can have multiple feeds
- **Status:** Implemented but may not be heavily used

**3. Video/B-roll Generation**
- WAN-2.5 model integration
- **Status:** Implemented but may be experimental

**4. Pro Mode Avatar Library**
- Reference image system for Pro Mode
- **Status:** Implemented, requires user upload

---

## READY FOR AUDIT

This document can now be used to:

✅ **Audit flows one by one**
- Each section documents a complete flow
- Step-by-step processes clearly outlined
- Entry points and exit points identified

✅ **Audit UI/UX consistency**
- User types and their access levels documented
- Navigation paths mapped
- Component relationships identified

✅ **Audit voice & tone consistency**
- Maya's behavior and responses documented
- Error messages and user communications outlined
- Brand voice requirements noted

✅ **Catch silent failures**
- Known risk areas identified
- Failure points documented
- Mitigation strategies noted

✅ **Onboard future engineers or AI agents**
- Complete system map provided
- Integration points documented
- Revenue-critical flows highlighted

---

**Document Status:** Complete and ready for use.

**Maintenance:** Update this document when:
- New features are added
- Flows change significantly
- New integrations are added
- User types or access rules change


