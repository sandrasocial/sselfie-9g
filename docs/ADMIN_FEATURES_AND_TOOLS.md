# ADMIN PANEL - Features, Tools & AI Systems
## Complete Reference Guide

**Last Updated:** January 7, 2026  
**Purpose:** Comprehensive guide to all admin features, tools, and AI systems available in the SSELFIE admin panel

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [AI Systems](#ai-systems)
   - [Alex AI Assistant](#alex-ai-assistant)
   - [Mission Control](#mission-control)
3. [Admin Pages & Features](#admin-pages--features)
4. [Alex AI Tools (30+ Tools)](#alex-ai-tools-30-tools)
5. [Admin Database Tables](#admin-database-tables)
6. [Quick Reference](#quick-reference)

---

## OVERVIEW

The SSELFIE admin panel provides a comprehensive suite of tools for managing the platform, analyzing data, creating content, managing email campaigns, and automating business operations. The admin panel is accessible at `/admin` and requires admin authentication (ssa@ssasocial.com).

### Key Capabilities

- **AI-Powered Assistance:** Alex AI with 30+ tools for content, email, analytics, and automation
- **Dashboard Analytics:** Real-time metrics, revenue tracking, user analytics
- **Content Management:** Academy courses, templates, prompt guides
- **Email Campaigns:** Full email automation, broadcasts, sequences
- **Maya Studio:** Admin access to Maya chat with Pro Photoshoot features
- **Mission Control:** Daily health checks for system monitoring
- **User Management:** Credits, feedback, login-as-user functionality

---

## AI SYSTEMS

### Alex AI Assistant

**Location:** `/admin/alex`  
**Purpose:** AI-powered assistant for business operations, content creation, email management, and analytics

**Capabilities:**
- 30+ specialized tools across 6 categories
- Proactive suggestions based on business data
- Multi-turn conversation with memory
- Content generation (emails, captions, calendars)
- Analytics and insights
- Automation capabilities

**How It Works:**
1. Natural language conversation interface
2. Tool selection based on user requests
3. Automatic tool execution
4. Results displayed with preview cards
5. Suggestions for next actions

**Categories:**
- 📧 **Email Tools** (15 tools) - Draft, send, analyze emails
- 📊 **Analytics Tools** (7 tools) - Revenue, platform, content insights
- ✍️ **Content Tools** (4 tools) - Instagram captions, calendars, Maya prompts
- 💼 **Business Tools** (4 tools) - Testimonials, prompt guides, journal
- ⚙️ **Automation Tools** (2 tools) - Create automations, web search
- 📚 **Historical Tools** (2 tools) - Email tracking, analytics recording

**Access:** Navigate to `/admin/alex` in the admin panel

---

### Mission Control

**Location:** `/admin/mission-control`  
**Purpose:** Daily automated health checks for system monitoring and task management

**Features:**
- **6 Health Checks:**
  1. **Code Health** - Monitors code quality and technical issues
  2. **Revenue** - Tracks MRR, subscriptions, revenue trends
  3. **Customer Success** - User satisfaction, feedback, support metrics
  4. **Email Strategy** - Campaign performance, send rates, engagement
  5. **Landing Page** - Conversion tracking, traffic analysis
  6. **User Journey** - User flow, retention, activation metrics

**How It Works:**
1. Runs daily automated checks
2. Creates tasks for issues found
3. Prioritizes tasks (high/medium/low)
4. Tracks completion status
5. Prevents duplicate runs per day

**Task Management:**
- Tasks stored in `mission_control_tasks` table
- Can be marked as completed from UI
- Cursor prompts for code fixes included
- Action types: `cursor`, `manual`, `alex`

**Access:** Navigate to `/admin/mission-control`

---

## ADMIN PAGES & FEATURES

### Dashboard (`/admin`)

**Primary landing page for admin operations**

**Features:**
- **Key Metrics:**
  - Monthly Recurring Revenue (MRR)
  - Active Subscriptions
  - Total Revenue
  - Conversion Rate
  - New Subscribers (30 days)
  - Canceled Subscriptions (30 days)
  
- **Stripe Integration:**
  - Live Stripe metrics (when available)
  - Database fallback metrics
  - Revenue breakdown (one-time, credits, subscriptions)
  
- **Cron Job Monitoring:**
  - Scheduled task status
  - Run counts (24h)
  - Error tracking
  
- **Proactive Suggestions:**
  - Alex AI suggestions displayed
  - Quick actions
  - Dismiss/act upon options

**API:** `/api/admin/dashboard/stats`

---

### Academy Management (`/admin/academy`)

**Manage courses, templates, and monthly drops**

**Features:**
- **Courses:**
  - Create/edit courses
  - Manage lessons within courses
  - Set course order, status, categories
  - Video upload and management
  
- **Templates:**
  - Canva templates
  - Resource links
  - Categories and organization
  
- **Monthly Drops:**
  - Monthly resource releases
  - Templates and content
  - Date tracking
  
- **Flatlay Images:**
  - Image resources for courses
  - Thumbnail management

**API Routes:**
- `/api/admin/academy/courses`
- `/api/admin/academy/templates`
- `/api/admin/academy/monthly-drops`
- `/api/admin/academy/flatlay-images`

---

### Credits Management (`/admin/credits`)

**Manage user credits and transactions**

**Features:**
- View user credit balances
- View credit transaction history
- Add credits manually
- Transaction filtering and search

**API:** `/api/admin/credits/add`

---

### Feedback Management (`/admin/feedback`)

**Handle user feedback and support requests**

**Features:**
- View all user feedback
- AI-powered response generation
- Feedback categorization
- Response tracking

**API:** `/api/admin/feedback`

---

### Health Monitoring (`/admin/health`)

**System health and diagnostics**

**Features:**
- End-to-end health checks
- Database connection status
- API endpoint testing
- System diagnostics

**API:** `/api/admin/health/e2e`

---

### Maya Studio (`/admin/maya-studio`)

**Admin access to Maya chat with Pro Photoshoot**

**Features:**
- Full Maya chat interface (Pro Mode)
- Pro Photoshoot panel integration
- Generate 3x3 photo grids
- Create carousels from grids
- Admin guide controls

**Pro Photoshoot Features:**
- Start session from any image
- Generate 8 grids per session (9 frames each)
- Style and outfit consistency
- Carousel creation
- Real-time generation tracking

**API Routes:**
- `/api/maya/pro/photoshoot/start-session`
- `/api/maya/pro/photoshoot/generate-grid`
- `/api/maya/pro/photoshoot/check-grid`
- `/api/maya/pro/photoshoot/create-carousel`

---

### Mission Control (`/admin/mission-control`)

**See [Mission Control](#mission-control) section above**

---

### Email Management (`/admin/email-*`)

**Multiple email-related pages:**

- **Email Broadcast** (`/admin/email-broadcast`)
  - Send broadcasts to segments
  - Campaign management
  
- **Email Analytics** (`/admin/email-analytics`)
  - Campaign performance metrics
  - Open rates, click rates
  - Engagement tracking
  
- **Email Control** (`/admin/email-control`)
  - Email settings
  - Test email sending
  - Configuration
  
- **Email Sequences** (`/admin/email-sequences`)
  - Automated email sequences
  - Sequence management
  - Scheduling

**API Routes:**
- `/api/admin/email/*` (multiple endpoints)

---

### Prompt Guides (`/admin/prompt-guides`)

**Manage Maya prompt guides**

**Features:**
- Create/edit prompt guides
- Publish guides
- Guide categories
- Approval workflow

**API:** `/api/admin/prompt-guides/*`

---

### Knowledge Base (`/admin/knowledge`)

**Admin knowledge management**

**Features:**
- Store business knowledge
- Content patterns
- Best practices
- Strategy insights

**Database:** `admin_knowledge_base` table

---

### Additional Pages

- **Beta Program** (`/admin/beta`) - Beta user management
- **Calendar** (`/admin/calendar`) - Calendar scheduling
- **Conversions** (`/admin/conversions`) - Conversion tracking
- **Testimonials** (`/admin/testimonials`) - Testimonial management
- **Login as User** (`/admin/login-as-user`) - User impersonation
- **Webhook Diagnostics** (`/admin/webhook-diagnostics`) - Webhook monitoring
- **Maya Testing** (`/admin/maya-testing`) - Maya testing lab
- **Prompt Guide Builder** (`/admin/prompt-guide-builder`) - Visual guide builder
- **Composition Analytics** (`/admin/composition-analytics`) - Content analytics
- **Journal** (`/admin/journal`) - Admin journal
- **Content Templates** (`/admin/content-templates`) - Template library

---

## ALEX AI TOOLS (30+ TOOLS)

### 📧 Email Tools (15 tools)

1. **`compose_email_draft`** - Compose email drafts with HTML/text preview
2. **`edit_email`** - Edit existing email drafts
3. **`send_resend_email`** - Send emails via Resend API
4. **`send_broadcast_to_segment`** - Broadcast to email segments
5. **`get_email_campaign`** - Retrieve campaign details
6. **`list_email_drafts`** - List all email drafts
7. **`check_campaign_status`** - Check email campaign status
8. **`create_email_sequence_plan`** - Plan multi-email sequences
9. **`recommend_send_timing`** - Get optimal send time recommendations
10. **`get_email_timeline`** - View email send timeline
11. **`get_resend_audience_data`** - Get audience data from Resend
12. **`create_email_sequence`** - Create automated email sequences
13. **`create_resend_automation_sequence`** - Create Resend automation
14. **`schedule_resend_automation`** - Schedule automated emails
15. **`get_resend_automation_status`** - Check automation status
16. **`analyze_email_strategy`** - Analyze email marketing strategy

### 📊 Analytics Tools (7 tools)

1. **`get_revenue_metrics`** - Get revenue statistics (MRR, ARR, etc.)
2. **`get_platform_analytics`** - Platform-wide user analytics
3. **`get_business_insights`** - Business insights and opportunities
4. **`get_content_performance`** - Content engagement metrics
5. **`get_email_recommendations`** - Email strategy recommendations
6. **`research_content_strategy`** - Research content strategies
7. **`get_brand_strategy`** - Brand strategy insights

### ✍️ Content Tools (4 tools)

1. **`create_instagram_caption`** - Generate Instagram captions
2. **`create_content_calendar`** - Create content calendar plans
3. **`suggest_maya_prompts`** - Suggest prompts for Maya image generation
4. **`read_codebase_file`** - Read files from codebase

### 💼 Business Tools (4 tools)

1. **`get_testimonials`** - Retrieve user testimonials
2. **`get_prompt_guides`** - Get Maya prompt guides
3. **`update_prompt_guide`** - Update prompt guide content
4. **`get_sandra_journal`** - Access Sandra's journal entries

### ⚙️ Automation Tools (2 tools)

1. **`create_automation`** - Create business automation rules
2. **`web_search`** - Perform web searches for research

### 📚 Historical Tools (2 tools)

1. **`mark_email_sent`** - Mark emails as sent (historical tracking)
2. **`record_email_analytics`** - Record email analytics data

---

## ADMIN DATABASE TABLES

All admin tables are verified and present in the database (verified January 7, 2026).

### Core Admin Tables (20 total)

**Knowledge & Memory:**
- `admin_knowledge_base` - Business knowledge, strategies, patterns
- `admin_context_guidelines` - AI context guidelines
- `admin_memory` - Business insights and patterns
- `admin_personal_story` - Sandra's personal narrative
- `admin_writing_samples` - Sandra's writing samples for voice matching
- `admin_agent_feedback` - AI learning feedback loop

**Email & Campaigns:**
- `admin_email_campaigns` - Email campaign storage
- `admin_email_drafts` - Email draft storage
- `admin_email_errors` - Email error tracking
- `admin_automation_rules` - Automation rules
- `admin_automation_triggers` - Automation triggers

**Analytics & Performance:**
- `admin_business_insights` - Business insights storage
- `admin_content_performance` - Content performance metrics

**Agent & Chat:**
- `admin_agent_chats` - Admin agent chat sessions
- `admin_agent_messages` - Admin agent chat messages
- `admin_agent_sessions` - Admin agent sessions

**System & Operations:**
- `admin_cron_runs` - Cron job tracking
- `admin_feature_flags` - Feature flag management
- `admin_alert_sent` - Alert tracking
- `admin_testimonials` - Testimonials storage

### Verification

**Status:** ✅ All tables verified and present  
**Verification Script:** `scripts/admin-migrations/verify-and-create-admin-tables.ts`  
**Last Verified:** January 7, 2026

---

## QUICK REFERENCE

### Common Tasks

**View Dashboard:**
- Navigate to `/admin`
- View real-time metrics and suggestions

**Chat with Alex:**
- Navigate to `/admin/alex`
- Type natural language requests
- Alex will select appropriate tools

**Run Mission Control:**
- Navigate to `/admin/mission-control`
- Click "Run Daily Checks"
- Review tasks and mark complete

**Manage Credits:**
- Navigate to `/admin/credits`
- Search for user
- Add credits manually

**Generate Pro Photoshoot:**
- Navigate to `/admin/maya-studio`
- Generate or select an image
- Use Pro Photoshoot panel below chat
- Generate 3x3 grids

**View Analytics:**
- Ask Alex: "Show me revenue metrics"
- Or use: `/admin/email-analytics`

**Create Email:**
- Ask Alex: "Compose an email about [topic]"
- Or use: `/admin/email-broadcast`

**Manage Academy:**
- Navigate to `/admin/academy`
- Create/edit courses, templates, drops

---

### API Endpoints Reference

**Dashboard:**
- `GET /api/admin/dashboard/stats` - Dashboard statistics

**Alex AI:**
- `POST /api/admin/alex/chat` - Chat with Alex
- `GET /api/admin/alex/suggestions` - Get proactive suggestions
- `POST /api/admin/alex/suggestions/act-upon` - Act on suggestion
- `POST /api/admin/alex/suggestions/dismiss` - Dismiss suggestion

**Mission Control:**
- `POST /api/admin/mission-control/daily-check` - Run health checks
- `POST /api/admin/mission-control/complete-task` - Mark task complete

**Credits:**
- `POST /api/admin/credits/add` - Add credits to user

**Email:**
- Multiple endpoints under `/api/admin/email/*`

**Maya Studio:**
- `/api/maya/pro/photoshoot/*` - Pro Photoshoot endpoints

---

### Feature Flags

**Pro Photoshoot Admin:**
- `FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY` - Enable Pro Photoshoot in admin

---

## SUMMARY

The SSELFIE admin panel provides:

✅ **30+ AI Tools** via Alex AI assistant  
✅ **Dashboard** with real-time metrics  
✅ **Mission Control** for system health  
✅ **Email Management** with full automation  
✅ **Content Creation** tools (captions, calendars, prompts)  
✅ **Analytics** and insights  
✅ **User Management** (credits, feedback)  
✅ **Maya Studio** with Pro Photoshoot  
✅ **Academy Management** (courses, templates)  
✅ **20 Verified Database Tables** for all features

**Access:** `/admin` (requires admin authentication)  
**AI Assistant:** `/admin/alex` (30+ tools available)  
**System Health:** `/admin/mission-control` (daily checks)

---

**Document Status:** Complete  
**Last Updated:** January 7, 2026  
**Maintained By:** Production QA Architect

