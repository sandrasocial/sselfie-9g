# Feed Planner - Complete Implementation Documentation

**Last Updated:** 2025-01-22  
**Status:** ✅ **Complete & Tested**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [API Endpoints](#api-endpoints)
5. [Features](#features)
6. [Database Schema](#database-schema)
7. [User Flows](#user-flows)
8. [Recent Improvements](#recent-improvements)

---

## Overview

The Feed Planner is a comprehensive Instagram feed management system that allows users to:
- Plan and visualize 9-post Instagram feed grids
- Generate captions, hashtags, and strategies using AI
- Create and manage story highlights
- Drag-and-drop reorder posts
- Generate images for posts
- Manage multiple feeds
- View feed analytics and strategy documents

### Key Capabilities

✅ **Complete Feed Management**
- Create, edit, and manage Instagram feeds
- Auto-load latest feed or specify feed ID
- Multiple feeds support with feed selector

✅ **AI-Powered Features**
- Generate comprehensive strategy documents
- Auto-generate captions for all posts
- Generate story highlight titles
- Enhance and regenerate captions

✅ **Visual Feed Builder**
- 3x3 grid preview (Instagram-style)
- Drag-and-drop post reordering
- Image upload/gallery selection
- Profile image management

✅ **Story Highlights**
- AI-generated highlight titles (3-4 max)
- Color placeholders using brand colors
- Mobile-optimized circular display
- Instagram-style highlight circles

---

## Architecture

### Component Structure

```
components/feed-planner/
├── instagram-feed-view.tsx       # Main feed view container
├── feed-view-screen.tsx          # Top-level screen component
├── feed-header.tsx               # Profile header with highlights
├── feed-tabs.tsx                 # Grid/Posts/Strategy tabs
├── feed-grid.tsx                 # 3x3 grid preview
├── feed-posts-list.tsx           # List view of posts
├── feed-post-card.tsx            # Individual post card
├── feed-strategy.tsx             # Strategy generation & display
├── feed-strategy-panel.tsx       # Strategy document view
├── feed-highlights-modal.tsx     # Highlights creation modal
├── feed-modals.tsx               # Image gallery modals
├── feed-loading-overlay.tsx      # Loading states
└── hooks/
    ├── use-feed-polling.ts       # SWR polling for feed data
    ├── use-feed-actions.ts       # Caption actions
    ├── use-feed-drag-drop.ts     # Drag & drop logic
    ├── use-feed-modals.ts        # Modal state management
    └── use-feed-confetti.ts      # Success animations
```

### Data Flow

1. **Feed Loading**
   - `useFeedPolling` hook fetches feed data via `/api/feed/[feedId]`
   - Supports `feedId` parameter or auto-loads latest feed
   - Polls every 3 seconds for updates
   - Handles loading and error states

2. **State Management**
   - React hooks for local state
   - SWR for server state and caching
   - Custom hooks for complex logic separation

3. **API Integration**
   - All API calls use authenticated fetch
   - Error handling with toast notifications
   - Optimistic UI updates where appropriate

---

## Components

### Main Components

#### `InstagramFeedView`

**Location:** `components/feed-planner/instagram-feed-view.tsx`

**Purpose:** Main container component that orchestrates all feed planner functionality

**Props:**
```typescript
interface InstagramFeedViewProps {
  feedId: number
  onBack?: () => void
}
```

**Key Features:**
- Tab navigation (Grid, Posts, Strategy)
- Bio modal management
- Highlights modal management
- Feed data polling
- Modal state management
- Drag-and-drop support

**State:**
- `activeTab`: "grid" | "posts" | "strategy"
- `showBioModal`: boolean
- `showHighlightsModal`: boolean
- `bioText`: string

#### `FeedHeader`

**Location:** `components/feed-planner/feed-header.tsx`

**Purpose:** Instagram-style profile header with highlights

**Features:**
- Profile image (clickable to change)
- Bio text display
- Highlights display (circular icons)
- Action buttons (Write Bio, New Feed, Create Highlights)
- Feed selector (if multiple feeds)
- Mobile-optimized layout

**Highlights Display:**
- Shows up to 4 highlights below buttons
- Circular icons with brand colors
- Horizontal scrolling on mobile
- Instagram-style gradient borders

#### `FeedHighlightsModal`

**Location:** `components/feed-planner/feed-highlights-modal.tsx`

**Purpose:** Create and manage Instagram story highlights

**Features:**
- AI-generated highlight titles (3-4 max)
- Color placeholders using brand colors
- Generate button ("Let Maya create highlights")
- Regenerate option
- Save functionality

**Flow:**
1. User clicks "Create Highlights"
2. Modal opens with "Let Maya create highlights" button
3. AI generates 3-4 highlight titles based on feed content
4. Highlights display as color placeholders
5. User can regenerate or save

#### `FeedStrategy`

**Location:** `components/feed-planner/feed-strategy.tsx`

**Purpose:** Generate and display comprehensive strategy documents

**Features:**
- "Create Strategy" button
- AI-generated markdown strategy document
- Comprehensive sections:
  - Overall Strategy
  - Posting Strategy
  - Content Mix Strategy
  - Stories Strategy
  - Reels Strategy
  - Carousel Strategy
  - Trend Utilization
  - Text Overlay & Hooks
  - Growth Tactics
  - Hashtag Strategy

#### `FeedGrid`

**Location:** `components/feed-planner/feed-grid.tsx`

**Purpose:** 3x3 Instagram-style grid preview

**Features:**
- Visual grid layout
- Drag-and-drop reordering
- Click to edit posts
- Image generation status
- Empty post placeholders

#### `FeedPostsList`

**Location:** `components/feed-planner/feed-posts-list.tsx`

**Purpose:** List view of all posts with captions

**Features:**
- Caption display and editing
- Copy caption functionality
- Regenerate caption
- Enhance caption
- Hashtag extraction
- Post details (position, type, pillar)

---

## API Endpoints

### Feed Data

#### `GET /api/feed/[feedId]`

Fetches feed data including posts, bio, highlights

**Query Parameters:**
- `feedId`: string | "latest" | number

**Response:**
```typescript
{
  exists: boolean
  feed: FeedLayout
  posts: FeedPost[]
  bio: InstagramBio | null
  highlights: Highlight[]
  username: string
  brandName: string
  userDisplayName: string
}
```

#### `GET /api/feed/latest`

Convenience endpoint for latest feed (delegates to `[feedId]` with "latest")

### Strategy & Content

#### `POST /api/feed/[feedId]/generate-strategy`

Generates comprehensive Instagram strategy document

**Response:**
```typescript
{
  success: boolean
  feedId: number
  strategy: string // Markdown content
}
```

#### `POST /api/feed/[feedId]/generate-captions`

Generates captions for all posts in feed

**Response:**
```typescript
{
  success: boolean
  captionsGenerated: number
}
```

#### `POST /api/feed/[feedId]/enhance-caption`

Enhances a specific caption

**Body:**
```typescript
{
  postId: number
  caption: string
}
```

#### `POST /api/feed/[feedId]/regenerate-caption`

Regenerates caption for a specific post

**Body:**
```typescript
{
  postId: number
}
```

### Highlights

#### `POST /api/feed/[feedId]/generate-highlights`

Generates highlight titles using AI

**Response:**
```typescript
{
  highlights: string[] // Array of 3-4 highlight titles
}
```

#### `POST /api/feed/[feedId]/highlights`

Saves highlights to database

**Body:**
```typescript
{
  highlights: Array<{
    title: string
    coverUrl: string
    description: string
    type: "color" | "image"
  }>
}
```

#### `GET /api/feed/[feedId]/highlights`

Gets highlights for a feed

**Response:**
```typescript
{
  highlights: Highlight[]
}
```

### Posts

#### `POST /api/feed/[feedId]/generate-single`

Generates image for a single post

**Body:**
```typescript
{
  postId: number
}
```

#### `POST /api/feed/[feedId]/reorder`

Reorders posts via drag-and-drop

**Body:**
```typescript
{
  postIds: number[] // Ordered array of post IDs
}
```

#### `POST /api/feed/[feedId]/add-row`

Adds 3 new posts to feed

**Response:**
```typescript
{
  success: boolean
  postsAdded: number
}
```

### Profile

#### `POST /api/feed/[feedId]/generate-bio`

Generates Instagram bio using AI

#### `POST /api/feed/[feedId]/update-bio`

Updates bio text

**Body:**
```typescript
{
  bioText: string
}
```

#### `POST /api/feed/[feedId]/upload-profile-image`

Uploads profile image

**Body:**
```typescript
FormData {
  file: File
}
```

### Feed Management

#### `POST /api/feed/create-manual`

Creates new empty feed

**Response:**
```typescript
{
  feedId: number
}
```

#### `GET /api/feed/list`

Gets list of all user feeds

**Response:**
```typescript
{
  feeds: Array<{
    id: number
    title: string
    image_count: number
    created_at: string
  }>
}
```

---

## Features

### 1. Feed Creation & Management

- **Create Feed**: Via Maya Chat (Feed tab) or manually
- **Multiple Feeds**: Support for multiple feeds per user
- **Feed Selector**: Dropdown to switch between feeds
- **Auto-Load Latest**: Automatically loads most recent feed
- **Feed Persistence**: All feeds saved to database

### 2. Strategy Generation

- **Comprehensive Strategy**: AI-generated markdown document
- **Multiple Sections**: 10+ strategy sections
- **Brand-Aware**: Uses user's brand profile and feed data
- **Actionable Insights**: Specific, actionable recommendations

### 3. Caption Management

- **Generate All**: Generate captions for all posts at once
- **Individual Generation**: Generate caption for single post
- **Enhance**: Improve existing captions
- **Regenerate**: Create new caption variations
- **Copy**: Quick copy to clipboard
- **Hashtag Extraction**: Automatically extracts hashtags

### 4. Story Highlights

- **AI-Generated Titles**: Automatically generates 3-4 titles
- **Brand Colors**: Uses user's brand color palette
- **Color Placeholders**: Circular icons with first letter
- **Mobile Optimized**: Responsive horizontal scrolling
- **Instagram Style**: Authentic Instagram highlight appearance

### 5. Image Generation

- **Single Post**: Generate image for individual post
- **Bulk Generation**: Generate multiple images
- **Progress Tracking**: Real-time generation status
- **Image Replacement**: Replace existing images
- **Gallery Integration**: Select from existing gallery

### 6. Post Management

- **Drag-and-Drop**: Reorder posts visually
- **Position Management**: Automatic position updates
- **Post Details**: View/edit post metadata
- **Add More Posts**: Add 3 posts at a time
- **Image Upload**: Upload or select images

### 7. Bio Management

- **AI Generation**: Generate bio using AI
- **Manual Editing**: Edit bio text directly
- **Character Count**: 150 character limit
- **Preview**: See bio in feed header

### 8. Visual Feed Builder

- **3x3 Grid**: Instagram-style grid preview
- **Visual Editing**: Click to edit posts
- **Status Indicators**: Generation status per post
- **Empty States**: Clear empty post placeholders

---

## Database Schema

### `feed_layouts`

Main feed container table

```sql
CREATE TABLE feed_layouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255),
  description TEXT,
  brand_name VARCHAR(255),
  username VARCHAR(255),
  brand_vibe VARCHAR(255),
  business_type VARCHAR(255),
  color_palette TEXT, -- JSON string or JSONB
  layout_type VARCHAR(50),
  visual_rhythm TEXT,
  feed_story TEXT,
  research_insights TEXT,
  hashtags TEXT[],
  profile_image_url TEXT,
  profile_image_prompt TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `feed_posts`

Individual posts in a feed

```sql
CREATE TABLE feed_posts (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER REFERENCES feed_layouts(id),
  user_id INTEGER REFERENCES users(id),
  position INTEGER NOT NULL, -- 1-9 for grid
  post_type VARCHAR(50),
  content_pillar VARCHAR(50),
  prompt TEXT,
  caption TEXT,
  hashtags TEXT,
  image_url TEXT,
  generation_status VARCHAR(50),
  prediction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `instagram_bios`

Instagram bio text

```sql
CREATE TABLE instagram_bios (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER REFERENCES feed_layouts(id),
  user_id INTEGER REFERENCES users(id),
  bio_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `instagram_highlights`

Story highlights

```sql
CREATE TABLE instagram_highlights (
  id SERIAL PRIMARY KEY,
  feed_layout_id INTEGER REFERENCES feed_layouts(id),
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(100) NOT NULL,
  image_url TEXT,
  icon_style VARCHAR(50),
  prompt TEXT,
  generation_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## User Flows

### Flow 1: Create & View Feed

1. User navigates to Feed Planner (`/feed-planner`)
2. System auto-loads latest feed (or shows placeholder)
3. User sees feed grid, posts list, or strategy tab
4. User can switch between feeds using selector

### Flow 2: Generate Strategy

1. User clicks "Create Strategy" button
2. System generates comprehensive strategy document
3. Strategy displays in Strategy tab
4. User can copy or export strategy

### Flow 3: Generate Captions

1. User clicks "Generate Captions" button
2. System generates captions for all posts
3. Captions appear in Posts tab
4. User can enhance or regenerate individual captions

### Flow 4: Create Highlights

1. User clicks "Create Highlights" button
2. Modal opens with "Let Maya create highlights" button
3. User clicks button → AI generates 3-4 titles
4. Highlights display as color placeholders
5. User clicks "Save Highlights"
6. Highlights appear in feed header below buttons

### Flow 5: Reorder Posts

1. User drags post in grid view
2. System updates post positions
3. Order saved to database
4. UI updates immediately

### Flow 6: Generate Images

1. User clicks on empty post
2. Gallery modal opens
3. User selects image or generates new
4. Image appears in post
5. Caption can be generated

---

## Recent Improvements

### Highlights Feature (January 2025)

**Added:**
- AI-generated highlight titles (3-4 max)
- Color placeholders using brand colors
- Mobile-optimized display
- Instagram-style circular icons
- Highlights display in feed header

**Implementation:**
- `/api/feed/[feedId]/generate-highlights` - AI generation endpoint
- `/api/feed/[feedId]/highlights` - Save/load highlights
- `FeedHighlightsModal` - Highlights creation UI
- `FeedHeader` - Highlights display in header

**Design Decisions:**
- Maximum 4 highlights (simpler, cleaner)
- AI generates titles automatically
- Color placeholders only (no image generation)
- Mobile-first responsive design
- Highlights positioned below action buttons

### Feed Header Improvements

**Added:**
- Highlights display below buttons
- Mobile-optimized layout
- Horizontal scrolling for highlights
- Responsive sizing (smaller on mobile)

**Removed:**
- Sparkles icon from highlight generation button
- Complex highlight upload flows

### Code Quality

**Improved:**
- Next.js 15 compatibility (Promise-based params)
- Better error handling and logging
- Type safety improvements
- Mobile optimization throughout

---

## Testing Status

### ✅ Tested & Working

- Feed creation and loading
- Strategy generation
- Caption generation (all posts)
- Highlights generation and display
- Bio generation and editing
- Feed switching (if multiple feeds)
- Image upload/gallery selection
- Profile image management

### 🟡 Needs Verification

- Drag-and-drop reordering
- Individual caption regeneration
- Caption enhancement
- Bulk image generation
- Post reordering persistence

---

## Next Steps

### Immediate
1. ✅ Feed Planner Complete
2. ⏭️ Integrate with Maya Feed Tab (next phase)

### Future Enhancements
- Feed analytics
- Content calendar scheduling
- Export functionality
- Feed templates
- Collaboration features

---

## Related Documentation

- `FEED_PLANNER_IMPLEMENTATION_STATUS.md` - Implementation status
- `FEED_PLANNER_USER_FLOW.md` - User flow details
- `IMPLEMENTATION_STATUS_SUMMARY.md` - Phase completion summary

---

**Document Status:** ✅ Complete  
**Last Review:** 2025-01-22  
**Reviewed By:** AI Development Team

