import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function getProductKnowledge(): Promise<string> {
  try {
    const knowledgeParts: string[] = []

    knowledgeParts.push(`
=== SSELFIE STUDIO - COMPLETE PRODUCT KNOWLEDGE ===

## What We Sell

### 1. Content Creator Studio - $79/month
**Features:**
- Unlimited professional photoshoots (fair use: 3-4/month)
- 100+ images per month
- 20 video clips per month
- 9-post feed planner (saves 10 hours/month)
- Priority generation queue
- Maya Pro Mode (advanced controls, faster workflow)
- Maya Classic Mode (simple, guided)
- AI model training (upload 10-20 photos, get personalized AI model)
- Cancel anytime

**Target Customer:**
- Women entrepreneurs who post regularly
- Coaches, consultants, service providers
- Anyone building a personal brand
- Needs consistent visibility

**Value Proposition:**
"Stop scrambling for content every week. Unlimited photos + videos + feed planning - for less than one photoshoot."

### 2. Brand Studio - $149/month
**Features:**
- Everything in Content Creator Studio
- 200+ images per month
- 40+ video clips per month
- Maya AI strategist (unlimited consulting)
- Personal brand academy (2 full courses)
- 100+ Canva templates
- Monthly brand strategy drops
- Direct access to Sandra
- Priority support

**Target Customer:**
- Established entrepreneurs running premium brands
- Need comprehensive content strategy
- Want ongoing strategic guidance
- Building a high-end personal brand

**Value Proposition:**
"Your complete AI content team. Everything you need to run a premium brand."

### 3. One-Time Session - $49
**Features:**
- One AI model training
- 50 professional photos
- Access to all photo styles and settings
- Download high-resolution images
- Ready to post in 2 hours
- Valid for 30 days

**Target Customer:**
- First-time users testing the platform
- Occasional content creators
- People with one-time photo needs
- Want to try before committing to membership

**Value Proposition:**
"Professional Instagram photos in 2 hours. No photographer needed. Get 50 magazine-quality images that actually look like you - for less than dinner out."

---

## Core Value Proposition

**Brand Promise:** "Visibility = Financial Freedom"

**What This Means:**
- The more visible you are, the more clients you attract
- More clients = more revenue = financial freedom
- But being visible requires consistent content
- And consistent content requires professional photos
- Professional photos used to require expensive photoshoots
- SSELFIE makes pro photos accessible to everyone

**The Problem We Solve:**
1. "I hate having my photo taken" → AI photos, no awkward photoshoots
2. "I don't have time for photoshoots" → Generate in 30 seconds
3. "Professional photos are too expensive" → $29/mo vs $500+ per shoot
4. "I never know what to post" → Feed Designer plans your content
5. "My content doesn't look cohesive" → Consistent AI brand aesthetic

---

## Who It's For

**Primary Audience: Women Entrepreneurs**
- Age: 25-55
- Business: Coaches, consultants, service providers, creatives
- Pain: Needs to show up online but struggles with photos
- Goal: Build personal brand, attract clients, scale business
- Values: Authenticity, efficiency, empowerment

**Psychographics:**
- Busy solopreneurs juggling everything
- Knows visibility is important but photo creation is a barrier
- Wants to look professional but authentic
- Frustrated with generic stock photos
- Willing to invest in business growth

---

## What Makes SSELFIE Different

### vs Photoroom (Background Removal)
- **Photoroom:** Edits existing photos
- **SSELFIE:** Creates NEW professional photos from scratch
- **Advantage:** Don't need photoshoot - we generate the photos

### vs Canva (Design Tool)
- **Canva:** Great for graphics, not photos of YOU
- **SSELFIE:** Creates photos OF you for personal branding
- **Advantage:** Personal brand requires YOUR face, not just graphics

### vs Headshot AI (Corporate Headshots)
- **Headshot AI:** Only does headshots for corporate LinkedIn
- **SSELFIE:** Full-body, lifestyle, brand photos for Instagram/marketing
- **Advantage:** We do Instagram content, not just LinkedIn headshots

### vs Real Photoshoots
- **Photoshoot:** $500-2000, 1-2 hours, weeks of scheduling
- **SSELFIE Content Creator Studio:** $79/mo, 30 seconds, unlimited photos whenever you want
- **SSELFIE Brand Studio:** $149/mo, includes strategy and consulting
- **Advantage:** Cost, speed, convenience, consistency

**Unique Positioning:**
"We're not a photo editor. We're not a design tool. We're not corporate headshots. We're your on-demand AI photographer for building your personal brand."

---

## Features Breakdown

### Maya Pro Mode
- **What:** Advanced AI photo generation with full control
- **Who:** Power users, experienced with AI tools
- **Benefits:**
  - Customize every detail (pose, lighting, background, style)
  - Faster workflow (skip the guidance)
  - More creative control
  - Enhanced Authenticity toggle for realistic photos

### Maya Classic Mode
- **What:** Guided AI photo generation with simple prompts
- **Who:** Beginners, people who want simplicity
- **Benefits:**
  - Easy to use, no learning curve
  - Guided prompts help you get started
  - Quality results without complexity

### Feed Designer
- **What:** Plan cohesive Instagram feeds with AI-generated content
- **Who:** Instagram-focused entrepreneurs
- **Benefits:**
  - See your feed before you post
  - Ensure visual cohesion
  - Plan content in advance
  - AI suggests improvements

### AI Model Training
- **What:** Upload 10-20 photos, get personalized AI model
- **Who:** Anyone wanting photos that look exactly like them
- **Benefits:**
  - Photos look more like YOU
  - Consistent brand aesthetic
  - Better quality generations

---

## Success Stories & Use Cases

**Coach/Consultant:**
"Used to spend $500/month on photoshoots. Now pays $29/mo and has unlimited content for Instagram, website, and email campaigns."

**Real Estate Agent:**
"Needed professional headshots and listing photos. Generated 100+ variations in one day with SSELFIE."

**Course Creator:**
"Required course promo images weekly. No time for photoshoots. SSELFIE gives her fresh content for every launch."

**Personal Trainer:**
"Posts 5x/week on Instagram. Used to recycle old photos. Now has new content daily."

---

## Common Objections & Responses

**"Will it really look like me?"**
→ "Yes! Upload 10-20 photos for model training and the AI learns your unique features. Most users say it's 90%+ accurate."

**"Is it ethical to use AI photos?"**
→ "Absolutely. These are photos OF you, generated from your real photos. You're not pretending to be someone else - you're just creating content more efficiently."

**"What if people can tell they're AI?"**
→ "Our Enhanced Authenticity mode creates photos that look naturally shot. Plus, being transparent about using AI is actually trending - it shows you're tech-savvy."

**"I'm not tech-savvy, will this be hard?"**
→ "Maya Classic Mode is designed for beginners. Just describe what you want in plain English and Maya handles the rest."

**"Can I cancel anytime?"**
→ "Yes! No contracts, no commitments. Cancel anytime from your account settings."

---

## Pricing Strategy Reasoning

**Why $79/mo for Content Creator Studio?**
- Affordable for solopreneurs (less than one photoshoot per month)
- High enough to filter out tire-kickers
- Comparable to professional photography services ($500+ per shoot)
- Reflects the value of unlimited professional photos and feed planning

**Why $149/mo for Brand Studio?**
- Premium positioning for established entrepreneurs
- Includes strategic consulting and comprehensive resources
- Worth $3,000+/month in services
- For serious brand builders who want the full package

**Why $49 one-time?**
- Low barrier to trial
- Gets people in the door
- Many upgrade to monthly after seeing results
- Makes more than a free trial (attracts serious users)
- Less than dinner out - easy decision point

**Future Pricing Considerations:**
- Annual plan at $250/year (save $98, 2 months free)
- Enterprise/agency tier at $99/mo (multiple users, white-label)
- Add-ons: Professional photography review ($20/mo), Priority generation queue ($10/mo)

---

## Why App Isn't Selling (Current Hypothesis)

**Possible Issues:**
1. **Traffic Problem** - Not enough people seeing the offer
2. **Messaging Problem** - Value proposition unclear
3. **Pricing Problem** - Too expensive or not clear value
4. **Trust Problem** - Need more social proof/testimonials
5. **Onboarding Problem** - People sign up but don't generate photos
6. **Conversion Funnel** - Where are users dropping off?

**Need to Track:**
- Free signups vs paid conversions
- Which features people actually use
- Where users abandon the flow
- Which email campaigns drive sales
- Instagram vs email vs direct traffic conversion rates

---

## Competitive Advantages (What Makes Us Win)

1. **Built by an Entrepreneur FOR Entrepreneurs**
   - Sandra understands the visibility struggle personally
   - Not built by tech bros who don't get personal branding

2. **Authentic Story**
   - Real woman, real business, real results
   - Community trusts Sandra's authenticity

3. **Full-Stack Solution**
   - Not just photos - Feed Designer, strategy, planning
   - All-in-one platform vs piecemeal tools

4. **Continuous Innovation**
   - Maya Pro Mode shows we're improving
   - Not a stagnant product

5. **Solopreneur-Focused**
   - Pricing designed for solopreneurs
   - Features designed for their workflow

---

## Sandra's Story (Use This in Marketing)

**Before SSELFIE:**
- Spent $2000/month on photoshoots
- Hated having photos taken
- Never had content when she needed it
- Missed opportunities because she had no good photos

**The Breakthrough:**
- Discovered AI could create professional photos
- Built SSELFIE to solve her own problem
- Now has unlimited content whenever she wants
- Helping other women entrepreneurs do the same

**Mission:**
"Every woman entrepreneur deserves to be visible without the photoshoot struggle. Visibility shouldn't be a privilege for those with big budgets - it should be accessible to everyone building a business."

---

## When to Recommend Each Product

**Recommend Content Creator Studio ($79/mo) When:**
- Customer posts on Instagram regularly (3+ times/week)
- Runs email campaigns or creates course content
- Building personal brand
- Needs consistent content
- Has tried SSELFIE and loves it
- Needs 100+ images per month

**Recommend Brand Studio ($149/mo) When:**
- Established entrepreneur running premium brand
- Needs strategic guidance and consulting
- Wants comprehensive content strategy
- Needs 200+ images per month
- Wants direct access to Sandra
- Building a high-end personal brand

**Recommend One-Time Session ($49) When:**
- First-time customer (trial)
- Occasional content creator
- One-time project (headshot, LinkedIn photo)
- Price-conscious customer
- "Just trying AI photos"

**Upsell from One-Time to Membership:**
- After they generate 30-40 photos (running out)
- When they want Pro Mode features
- When they discover Feed Designer
- If they're posting photos they generated
- When they need more than 50 photos

**Upsell from Content Creator to Brand Studio:**
- When they need more than 100 images/month
- When they want strategic consulting
- When they need comprehensive brand strategy
- When they want direct access to Sandra

---

This product knowledge should inform EVERY email, Instagram post, and piece of content you create for Sandra.
`)

    return knowledgeParts.join("\n")
  } catch (error) {
    console.error("[v0] Error getting product knowledge:", error)
    return ""
  }
}
