# SSELFIE Studio 📸

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/sselfie-studio/v0-sselfie)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/M0ivfv4hQpE)

> **Your personal AI photographer that knows your best angles.**

SSELFIE Studio is the world's first AI-powered personal brand studio. We help women entrepreneurs create professional brand photos every month—no photographer needed. Just AI selfies that look like you, styled for your brand, and ready to use everywhere.

---

## 🌟 The Story Behind SSELFIE

I started by teaching women how to take better selfies on Instagram. Then I began sharing my own story—a single mom of three, divorced, heartbroken, broke, and totally overwhelmed. I had to build my whole life and business from scratch, with nothing.

That's how my "SSELFIE machine" was born. Today, it's called SSELFIE Studio.

I created it for women who feel overwhelmed, stuck, or like they don't see themselves as powerful or beautiful. Women who don't have the time or money for a brand photoshoot but still need professional-looking brand photos. I wanted them to have a way to see themselves in a new light and finally feel confident, proud, and strong enough to build their own personal brands.

---

## 💡 What SSELFIE Studio Does

SSELFIE Studio gives you **100 professional brand photos every month** for less than the price of a coffee a day ($47/month).

### The 3-Step Flow

1. **TRAIN** → Upload 10–20 selfies to build your personal AI model
2. **STYLE** → Chat with Maya (your AI stylist) to create styled shoots in your brand vibe
3. **GALLERY** → Save 100+ fresh professional images every month into your brand asset library

### What You Get

- **Professional brand photos** for Instagram feed, reels, carousel posts
- **Consistent branding** across your website, brochures, guides, and media kits
- **Digital product assets** for online courses and downloadable content
- **Maya, your AI stylist** who styles your shoots like a best friend
- **Variety of styles**: Business, lifestyle, casual, travel, fashion, GRWM, aspirational

---

## 🎯 Why It Matters

**Instagram is built on visuals.** Video might be trending, but photos—especially selfies—are still the #1 way to show off your personal brand.

**Consistency builds trust.** When your photos look professional and cohesive across Instagram, your website, your media kit—people see you as the real deal.

**Selfies are personal branding assets.** They're not vanity. They're proof of your identity, your authority, and your future vision.

We help women imagine themselves in outfits, settings, and lifestyles they never thought possible. It's what we call the **Future Self Vision**: seeing yourself as the successful, powerful version of you that you're becoming.

---

## 🚀 Key Features

### 🎨 Studio
- Upload and train your personal AI model
- Manage your training photos
- View training status and model readiness

### 💬 Maya - Your AI Stylist
- Chat with Maya to create custom styled shoots
- Get personalized style recommendations
- Generate images based on your brand profile
- Access concept cards for quick inspiration

### 🖼️ Gallery
- Browse all your generated images
- Organize by style, date, or category
- Download high-resolution photos
- Share directly to social media

### 📅 Feed Designer
- Plan your Instagram feed strategy
- Create cohesive feed layouts
- Generate captions with Maya
- Schedule content calendar

### 🎓 Academy
- Learn personal branding strategies
- Master Instagram content creation
- Discover styling tips and tricks
- Access exclusive courses

### 👤 Profile & Brand Wizard
- Complete your brand profile
- Define your visual aesthetic
- Set your color palette
- Establish your brand voice

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library with latest features
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components

### Backend & Database
- **Neon** - Serverless Postgres database
- **Supabase** - Authentication and storage
- **Vercel** - Hosting and deployment

### AI & Image Generation
- **Vercel AI SDK** - AI chat and streaming
- **Replicate** - AI image generation (Flux models)
- **OpenAI** - GPT models for Maya's intelligence

### Storage & Caching
- **Vercel Blob** - Image and file storage
- **Upstash Redis** - Caching and rate limiting
- **Upstash Search** - Fast content search

### Payments
- **Stripe** - Subscription management and payments

---

## Maya AI System - Recent Improvements

### Creativity Cleanup (December 2024)

We recently completed a comprehensive cleanup of Maya's concept generation system, removing over 3,200 lines of constraints that were limiting her creativity.

#### What Was Removed:
- **Consistency Mode Post-Processing** - Was regenerating concepts after Maya created them
- **Brand Template Constraints** - Forced rigid brand mention rules
- **Composition System** - Was REPLACING Maya's AI with component-based assembly
- **Diversity Engine** - Rejected concepts based on artificial thresholds

#### What Changed:
- **Before:** Maya's AI generation was overridden by component assembly and rigid constraints
- **After:** Maya generates all concepts directly via AI with full creative freedom

#### Maya Now Creates:
- ✅ Naturally diverse concepts (different outfits, locations, poses)
- ✅ Luxury influencer content with 2026 trends
- ✅ Brand-aware content without rigid templates
- ✅ Consistent concepts when requested (via system prompt, not post-processing)

#### Performance:
- 41% faster generation (no post-processing)
- ~3,273 lines of code removed
- Simpler, cleaner architecture

For details, see: [`MAYA_CREATIVITY_CLEANUP_COMPLETE.md`](./MAYA_CREATIVITY_CLEANUP_COMPLETE.md)

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ installed
- A Vercel account
- Database (Neon or Supabase)
- Replicate API key
- Stripe account (for payments)

### Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`bash
# Database (Neon)
DATABASE_URL=your_neon_database_url
POSTGRES_URL=your_postgres_url

# Supabase (Auth & Storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI & Image Generation
REPLICATE_API_TOKEN=your_replicate_token
REPLICATE_USERNAME=your_replicate_username

# Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Payments
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Upstash (Redis & Search)
UPSTASH_KV_REST_API_URL=your_upstash_url
UPSTASH_KV_REST_API_TOKEN=your_upstash_token
UPSTASH_SEARCH_REST_URL=your_search_url
UPSTASH_SEARCH_REST_TOKEN=your_search_token

# App URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### Install Dependencies

\`\`\`bash
npm install
\`\`\`

### Run Database Migrations

\`\`\`bash
# Run SQL scripts in the /scripts folder
# These create the necessary tables for users, models, images, feeds, etc.
\`\`\`

### Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 📁 Project Structure

\`\`\`
sselfie/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── maya/            # Maya AI chat endpoints
│   │   ├── training/        # Model training endpoints
│   │   ├── feed/            # Feed designer endpoints
│   │   └── profile/         # User profile endpoints
│   ├── studio/              # Studio page
│   ├── maya/                # Maya chat page
│   ├── gallery/             # Gallery page
│   └── feed-designer/       # Feed designer page
├── components/
│   ├── sselfie/             # SSELFIE-specific components
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── maya/                # Maya AI logic
│   ├── instagram-strategist/ # Feed strategy logic
│   └── data/                # Data utilities
├── scripts/                 # Database scripts
└── public/                  # Static assets
\`\`\`

---

## 🎨 Brand Identity

### Colors
- **Black** `#0a0a0a` - Headlines, CTAs, luxury anchor
- **White** `#ffffff` - Clean, space, minimal luxury
- **Editorial Gray** `#f5f5f5` - Moodboards, background texture
- **Soft Gray** `#666666` - Subtext, quiet details

### Typography
- **Headlines/Editorial**: Times New Roman (serif, uppercase, thin-weight for luxury feel)
- **Body/UI**: System Sans (clean and conversational)

### Visual Style
- Minimalist, Vogue-inspired, high-fashion editorial
- Faces first, always. Women as the hero of their story
- Full-bleed layouts, bold typography, lots of negative space
- Every pixel should feel like luxury and make women see their future self

---

## 🎯 Brand Pillars

1. **Selfies → Identity** - Selfies become brand assets that show the world your story, your style, and your future self vision
2. **Branding → Consistency** - A beautiful, consistent look across Instagram, your website, and your products
3. **Visibility → Authority** - When you show up with polished, professional photos month after month, you build instant trust
4. **Confidence → Power** - She sees herself as powerful, beautiful, and professional
5. **Growth → Opportunity** - More visibility leads to more clients, more collaborations, and more income

---

## 🌍 Our Vision

We don't just want to build an AI app. We want to change the way women see themselves.

Our vision is to help **millions of women around the world** feel confident enough to be visible again. To show up on Instagram, to launch businesses, to share their story—without the fear of not looking "professional enough."

SSELFIE Studio isn't just about AI photos. It's about **identity, confidence, and consistency**. It's the bridge between who you are now and who you're becoming.

---

## 🚀 Deployment

This project is automatically deployed to Vercel. Any changes pushed to the main branch will trigger a new deployment.

**Live App**: [https://vercel.com/sselfie-studio/v0-sselfie](https://vercel.com/sselfie-studio/v0-sselfie)

**Continue Building**: [https://v0.app/chat/projects/M0ivfv4hQpE](https://v0.app/chat/projects/M0ivfv4hQpE)

---

## 🤝 Contributing

This is a founder-led project built with [v0.app](https://v0.app). Changes are automatically synced from v0 deployments.

---

## 📄 License

Copyright © 2025 SSELFIE Studio. All rights reserved.

---

## 💌 Contact

Built with ❤️ by a single mom who rebuilt her life with selfies.

**Let's help millions of women feel visible, confident, and powerful.**
