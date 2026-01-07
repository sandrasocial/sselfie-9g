# Complete Email Audit - All Scheduled Emails

**Generated:** January 6, 2025  
**Purpose:** Verify all scheduled emails match Sandra's voice, contain no work information, and document all CTAs

---

## 📧 EMAIL SEQUENCES OVERVIEW

### 1. WELCOME SEQUENCE (New Paid Members)
**Trigger:** User completes payment  
**Schedule:** Day 0 (immediate), Day 3, Day 7  
**Cron:** `/api/cron/welcome-sequence` (runs daily at 10 AM EST)

---

### 2. NURTURE SEQUENCE (Freebie Downloaders)
**Trigger:** User downloads Blueprint freebie  
**Schedule:** Day 1, Day 5, Day 10  
**Cron:** Not found in cron routes (may be manual or via Resend automation)

---

### 3. RE-ENGAGEMENT SEQUENCE (Inactive Users)
**Trigger:** User inactive for 30+ days  
**Schedule:** Day 0, Day 7, Day 14  
**Cron:** Not found in cron routes (may be manual or via Resend automation)

---

### 4. BLUEPRINT FOLLOWUP SEQUENCE (Blueprint Subscribers)
**Trigger:** User completes Blueprint form  
**Schedule:** Day 0, Day 3, Day 7, Day 14  
**Cron:** `/api/cron/send-blueprint-followups` (runs daily)

---

## 📝 DETAILED EMAIL BREAKDOWN

---

### WELCOME SEQUENCE - DAY 0
**Subject:** You're in! Let's get you creating 🚀  
**Template:** `lib/email/templates/welcome-sequence.ts` → `generateWelcomeDay0()`

**EXACT TEXT:**
```
Hey [firstName]! 🚀

You just joined SSELFIE Studio. This is going to change everything. 🚀

Here's the thing - most people struggle with content because they're trying to do it the old way. Hours of photoshoots. Expensive photographers. The same 5 photos on rotation.

You? You just got access to 100+ professional photos every month. No photographer. No studio. Just you, your selfies, and Maya's AI magic.

Here's what happens next:
- Upload 10-20 selfies - Mix of angles, expressions, outfits. More variety = better results.
- Maya trains your model - Takes about 2 hours. Then you're ready to create.
- Start generating - Chat with Maya, create concepts, build your brand library.
- Show up consistently - Never scramble for content again.

Honestly? This is the fastest way to build a professional brand presence. Members are creating content in minutes that used to take hours.

[CTA BUTTON: Create Your First Photos]

P.S. If you need anything, just hit reply. Sandra reads every message personally.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/checkout/membership?utm_source=email&utm_medium=email&utm_campaign=welcome-day-0&utm_content=cta_button&campaign_id=[id]`
- Text link: Same URL

---

### WELCOME SEQUENCE - DAY 3
**Subject:** Quick check: How's it going? 💪  
**Template:** `lib/email/templates/welcome-sequence.ts` → `generateWelcomeDay3()`

**EXACT TEXT:**
```
Hey [firstName],

Quick check-in: How are your first photos looking?

I know the first few days can feel overwhelming. New tool, new process, figuring out what works. That's totally normal.

Here's what I'd do if I were you:
- Be specific with Maya. Instead of "professional photo," try "professional headshot, soft lighting, confident smile, business casual outfit." The more detail, the better the result.
- Generate multiple variations. Don't settle for the first one. Create 3-4 options and pick your favorite.
- Use your training photos wisely. More variety in angles, expressions, and outfits = better model accuracy.

Members who nail this in week one are creating stunning content by week two. You've got this.

Stuck? Just reply to this email. We'll help you troubleshoot.

[CTA BUTTON: Continue Creating]

P.S. The best content comes from experimentation. Don't be afraid to try different prompts and see what works for your brand.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/studio`
- Text link: `https://sselfie.ai/studio`

---

### WELCOME SEQUENCE - DAY 7
**Subject:** One week in - you're crushing it! 🎯  
**Template:** `lib/email/templates/welcome-sequence.ts` → `generateWelcomeDay7()`

**EXACT TEXT:**
```
Hey [firstName]! 🎉

You've been in Studio for a week. That's huge. 🎉

Most people give up on new tools after 3 days. But you? You're still here, creating, learning, building. That's the kind of consistency that changes everything.

Now that you've got the basics down, here are some features that'll take your content to the next level:
- Feed Designer: Plan your entire Instagram grid before you post. See how photos work together. No more guessing.
- Video Clips: Create 20 professional video clips per month. Perfect for Reels and Stories. Game changer for engagement.
- Maya's Advanced Mode: Ask for specific concepts - "coffee shop entrepreneur vibe" or "luxury brand aesthetic." She gets it.
- Pro Mode: Want editorial-quality photos without training a model? Upload reference images and get luxury influencer content instantly.

Here's the thing - the members who use ALL the features are the ones seeing the biggest results. They're not just creating photos. They're building complete brand systems.

You've got everything you need to show up consistently and confidently. Time to scale.

[CTA BUTTON: Explore Advanced Features]

P.S. We're always adding new features. Keep an eye on your inbox - you'll be the first to know when something drops.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/studio`
- Text link: `https://sselfie.ai/studio`

---

### NURTURE SEQUENCE - DAY 1
**Subject:** Your Blueprint is ready! (Plus something better) ✨  
**Template:** `lib/email/templates/nurture-sequence.ts` → `generateNurtureDay1()`

**EXACT TEXT:**
```
Hey [firstName]! 👋

Your Brand Blueprint should be in your inbox. But here's the thing - I want to show you something even better. 👋

The Blueprint shows you WHAT to post. SSELFIE Studio shows you HOW to actually create that content - without hiring a photographer, without spending hours on shoots, without the stress.

Real talk: I used to spend HOURS trying to get content ready. Now? SSELFIE helps me show up confidently in minutes. That's the difference.

Here's what Studio members get:
- 100+ professional photos per month - Never run out of content again
- 20 video clips - Perfect for Reels and Stories
- Feed Designer - Plan your entire Instagram grid before you post
- Maya, your AI creative director - She styles your shoots like a best friend

All for $79/month. That's less than most people spend on coffee. And it'll save you 10+ hours per month.

[CTA BUTTON: Join SSELFIE Studio]

P.S. Want to test it first? Try a one-time session for $49. No pressure, just options.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/checkout/membership?utm_source=email&utm_medium=email&utm_campaign=nurture-day-1&utm_content=cta_button&campaign_id=[id]`
- Text link: Same URL

---

### NURTURE SEQUENCE - DAY 5
**Subject:** How Sarah went from invisible to booked solid 📈  
**Template:** `lib/email/templates/nurture-sequence.ts` → `generateNurtureDay5()`

**EXACT TEXT:**
```
Hey [firstName],

I want to tell you about Sarah. She's a life coach who was struggling to get clients. Her Instagram had maybe 200 followers, and she was posting the same 3 selfies on rotation.

Then she joined SSELFIE Studio. In her first month, she created 50+ professional photos. She started posting consistently. Her feed looked cohesive and professional.

Three months later? She's booked solid. Her DMs are full of potential clients asking about her services. She went from invisible to in-demand.

What changed? Not her coaching skills - those were always there. What changed was her visibility. People could finally SEE her, trust her, want to work with her.

Professional photos did that. Consistent content did that. SSELFIE Studio did that.

Here's the thing - you have the same potential. You just need the right tools.

[CTA BUTTON: See How She Did It]

P.S. Sarah's story isn't unique. I hear versions of this from Studio members every week. The pattern is clear: consistent professional content = more visibility = more clients.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/checkout/membership?utm_source=email&utm_medium=email&utm_campaign=nurture-day-5&utm_content=cta_button&campaign_id=[id]`
- Text link: Same URL

---

### NURTURE SEQUENCE - DAY 10
**Subject:** Ready to be SEEN? (Let's make it simple) 💪  
**Template:** `lib/email/templates/nurture-sequence.ts` → `generateNurtureDay10()`

**EXACT TEXT:**
```
Hey [firstName],

I've been thinking about you. You downloaded the Blueprint, which means you're serious about building your brand. But you haven't joined Studio yet.

Maybe you're not sure if it's worth it. Maybe you're worried it's too complicated. Maybe you're waiting for the "right time."

Here's what I know: The "right time" is now. Every day you wait is another day you're not showing up. Another day you're invisible. Another day your competitors are getting ahead.

So I'm making this simple. Two options:
- Try it once for $49 - Test it out. Create your first professional photoshoot. If you love it, upgrade. If not, you're only out $49.
- Join Studio for $79/month - Get 100+ photos per month, video clips, Feed Designer, everything. The full system.

No risk. No commitment. Just results. Pick what works for you.

[CTA BUTTON 1: Try Once - $49]
[CTA BUTTON 2: Join Studio - $79/mo]

P.S. The members who start now are the ones seeing results in 30 days. Don't wait. Start today.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button 1: `https://sselfie.ai/checkout/one-time?utm_source=email&utm_medium=email&utm_campaign=nurture-day-10&utm_content=cta_button&campaign_id=[id]`
- Button 2: `https://sselfie.ai/checkout/membership?utm_source=email&utm_medium=email&utm_campaign=nurture-day-10&utm_content=cta_button&campaign_id=[id]`
- Text links: Same URLs

---

### RE-ENGAGEMENT SEQUENCE - DAY 0
**Subject:** Haven't seen you in a while... 👀  
**Template:** `lib/email/templates/reengagement-sequence.ts` → `generateReengagementDay0()`

**EXACT TEXT:**
```
Hey [firstName],

Haven't seen you in Studio for a while. Life gets busy, I get it.

But here's the thing - we've added some features since you were last here that you're going to want to see. Maya's gotten smarter. The process is faster. The results are better.

No pressure, no hard sell. Just genuinely curious if you're ready to come back and see what's new.

Your account is waiting. Everything is exactly as you left it.

[CTA BUTTON: See What's New]

P.S. If you need anything or have questions, just reply. We're here to help.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/studio`
- Text link: `https://sselfie.ai/studio`

---

### RE-ENGAGEMENT SEQUENCE - DAY 7
**Subject:** You haven't seen what Maya can do now... 🚀  
**Template:** `lib/email/templates/reengagement-sequence.ts` → `generateReengagementDay7()`

**EXACT TEXT:**
```
Hey [firstName],

Remember when you first joined Studio? Maya was pretty good. But honestly? She's gotten SO much better since then.

Here's what's new:
- Video Clips: Create 20 professional video clips per month. Perfect for Reels. Game changer for engagement.
- Smarter Prompts: Maya understands context better. Ask for "coffee shop entrepreneur vibe" and she gets it instantly.
- Faster Generation: Photos are ready in minutes, not hours. We've optimized everything.
- Feed Designer: Plan your entire Instagram grid before you post. See how photos work together.
- Pro Mode: Want editorial-quality photos without training a model? Upload reference images and get luxury influencer content instantly.

Members who came back are creating content faster than ever. One member told me she saves 10 hours per month now.

Your account is waiting. Come see what's new.

[CTA BUTTON: Try New Features]

P.S. If you're not a member anymore, I've got a special comeback offer for you. Just reply and ask.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/studio`
- Text link: `https://sselfie.ai/studio`

---

### RE-ENGAGEMENT SEQUENCE - DAY 14
**Subject:** Last call: Come back to Studio (50% off) 💪  
**Template:** `lib/email/templates/reengagement-sequence.ts` → `generateReengagementDay14()`

**EXACT TEXT:**
```
Hey [firstName],

This is my last email. I don't want to bug you, but I also don't want you to miss out.

If you're not a member anymore, here's a comeback offer: 50% off your first month. That's $39.50 instead of $79.

Why? Because I believe in second chances. Because I know life gets busy. Because I want you to see how much Studio has improved.

Here's what you're missing:
- 100+ professional photos per month - Never run out of content
- 20 video clips - Perfect for Reels and Stories
- Feed Designer - Plan your entire Instagram grid
- Maya's latest features - Smarter, faster, better results
- Pro Mode - Editorial-quality photos without model training

This offer expires in 48 hours. After that, it's gone forever.

[CTA BUTTON: Claim Your Comeback Offer]

P.S. If you're not interested, just reply and say "unsubscribe." No hard feelings. But if you are, don't wait. This offer won't return.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/checkout/membership?utm_source=email&utm_medium=email&utm_campaign=reengagement-day-14&utm_content=cta_button&campaign_id=[id]&promo=COMEBACK50`
- Text link: Same URL (includes promo code COMEBACK50)

---

### BLUEPRINT FOLLOWUP - DAY 0
**Subject:** Your Brand Blueprint is Ready!  
**Template:** `lib/email/templates/blueprint-followup-day-0.tsx` → `generateBlueprintFollowupDay0Email()`

**EXACT TEXT:**
```
S S E L F I E

Hi [displayName]! Your Blueprint is Here

I'm so excited to share your personalized brand blueprint with you! This is everything you need to start building a consistent, professional brand online.

Here's what's inside:
- Your [vibe] aesthetic guide - the exact vibe you selected
- 30 caption templates ready to customize
- 30-day content calendar with post ideas
- Quick implementation tips to get started today

"The best time to start was yesterday. The second best time is now."
- Sandra

Ready to bring this to life? Try your first AI photoshoot for $49 and see your blueprint come together with professional photos that actually look like you.

[CTA BUTTON: Try Your First Photoshoot - $49]

Questions? Just reply to this email - I read every message.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/?utm_source=email&utm_medium=email&utm_campaign=blueprint_followup_day0&utm_content=cta&product=one_time`
- Text link: Same URL

---

### BLUEPRINT FOLLOWUP - DAY 3
**Subject:** 3 Ways to Use Your Blueprint This Week  
**Template:** `lib/email/templates/blueprint-followup-day-3.tsx` → `generateBlueprintFollowupDay3Email()`

**EXACT TEXT:**
```
S S E L F I E

Let's Put Your Blueprint to Work

Hey [displayName],

It's been a few days since you got your blueprint. Let's make sure you're actually using it! Here are 3 things you can do THIS WEEK to start seeing results:

1. Pick 3 Caption Templates & Fill Them In Today
Don't overthink it. Just pick 3 templates from your blueprint, fill in the blanks with YOUR story, and save them. You'll use them this week.

2. Schedule Your Posts for the Week
Use your 30-day calendar to plan what you're posting this week. Pick 3-5 days and commit to posting on those days. Consistency beats perfection.

3. Plan Your Selfie Photoshoot (Or Skip It With AI)
You need photos to go with those captions. You can either plan a traditional photoshoot (time, money, stress) or get 50 professional AI photos in 2 hours for $49.

Real talk: The blueprint is only valuable if you USE it. Don't let it sit in your inbox. Take action this week.

[CTA BUTTON: Skip the Selfie Stress → Try AI Photos for $49]

P.S. Stuck on something? Just reply to this email - I read every message.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/?utm_source=email&utm_medium=email&utm_campaign=blueprint_followup_day3&utm_content=cta&product=one_time`
- Text link: Same URL

---

### BLUEPRINT FOLLOWUP - DAY 7
**Subject:** This Could Be You  
**Template:** `lib/email/templates/blueprint-followup-day-7.tsx` → `generateBlueprintFollowupDay7Email()`

**EXACT TEXT:**
```
S S E L F I E

This Could Be You

Hey [displayName],

I want to share a story with you. One of our members - let's call her Sarah - started exactly where you are right now.

She completed the blueprint, got her caption templates, and decided to try one AI photoshoot. Just one. $49.

She used those photos with the caption templates from her blueprint. Posted consistently 3x a week. Used the calendar to plan her content.

Three months later? She went from 5,000 followers to 25,000. Her DMs are full of potential clients. Her content actually converts.

"I finally have a system that works. No more scrambling for content. No more wondering what to post. SSELFIE gave me everything I needed."
- Sarah, SSELFIE Member

Here's what made the difference:
- Consistent content (using the calendar)
- Professional photos that actually looked like her
- Caption templates that resonated with her audience
- A system she could actually stick to

This isn't about getting lucky. It's about having the right system and using it consistently.

Ready to start your transformation? Join Studio Membership for $79/month and get unlimited photos, feed planning, and new templates every month.

[CTA BUTTON: Start Your Transformation → Join Studio for $79/mo]

What's included in Studio:
- Unlimited professional photoshoots
- 100+ images per month
- Feed planning & strategy
- New caption templates monthly
- Cancel anytime

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/?utm_source=email&utm_medium=email&utm_campaign=blueprint_followup_day7&utm_content=cta&product=studio_membership`
- Text link: Same URL

---

### BLUEPRINT FOLLOWUP - DAY 14
**Subject:** Still thinking about it? Here's $10 off  
**Template:** `lib/email/templates/blueprint-followup-day-14.tsx` → `generateBlueprintFollowupDay14Email()`

**EXACT TEXT:**
```
S S E L F I E

I Want to Help You Get Started

Hey [displayName],

I noticed you got your blueprint but haven't tried SSELFIE yet. No pressure at all - but I wanted to make it easier for you.

⏰ VALID FOR 48 HOURS

$10 Off Your First Photoshoot

Use Code: BLUEPRINT10

That's $39 instead of $49

[CTA BUTTON: Claim Your $10 Off → Try SSELFIE]

Or, if you're ready to go all-in, start with Studio membership (no discount needed - it's already the best value at $79/month).

[CTA BUTTON: Start Studio Membership - $79/mo]

Final note: This is the last email about this. If SSELFIE isn't for you right now, that's totally okay. Keep the blueprint and use it whenever you're ready. 💕

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button 1: `https://sselfie.ai/?utm_source=email&utm_medium=email&utm_campaign=blueprint_followup_day14&utm_content=cta&product=one_time&discount=BLUEPRINT10`
- Button 2: `https://sselfie.ai/?utm_source=email&utm_medium=email&utm_campaign=blueprint_followup_day14&utm_content=cta&product=studio_membership`
- Text links: Same URLs

---

### UPSELL DAY 10
**Subject:** Ready for the Next Level?  
**Template:** `lib/email/templates/upsell-day-10.tsx` → `generateUpsellDay10Email()`

**EXACT TEXT:**
```
S S E L F I E

Hey [displayName],

It's been about 10 days since you grabbed the free guide. I'm curious-how's it going?

The guide gives you the basics. But I've been thinking about you, and I wonder if you're ready for something more.

Here's what I see happening with women who take the next step:
- They stop worrying about what to post because they have a library of photos
- They feel confident showing their face online (no more hiding behind logos)
- They build a personal brand that actually feels like them
- They save time and money (no more expensive photoshoots)

That's what SSELFIE Studio is really about. It's not just photos-it's freedom. Freedom to show up consistently. Freedom to be yourself. Freedom to build something real.

"I went from dreading content creation to actually enjoying it. Now I have photos I'm proud to post, and my audience can finally see the real me."
- Maria, Studio Member

With Studio membership, you get:
- 150+ professional photos every single month
- Full Academy with video courses and templates
- Feed Designer to plan your content
- Monthly drops with the newest strategies
- Direct access to me when you need help

This is your photography studio. Your creative team. Your content library. All powered by AI that actually understands YOUR brand.

[CTA BUTTON: Join SSELFIE Studio]

No pressure. Just wanted to make sure you know what's available when you're ready to take your content to the next level.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/studio?checkout=studio_membership` (or tracked link if campaignId provided)
- Text link: Same URL

---

### UPSELL FREEBIE TO MEMBERSHIP
**Subject:** Ready for the Next Level?  
**Template:** `lib/email/templates/upsell-freebie-membership.tsx` → `generateUpsellFreebieMembershipEmail()`

**EXACT TEXT:**
```
S S E L F I E

Hey [displayName],

You grabbed the free guide-that's a great first step. Now, are you ready to take it to the next level?

The free guide gives you the basics. But SSELFIE Studio gives you:
- 150+ professional photos every month
- Full Academy with video courses and templates
- Feed Designer for content planning
- Monthly drops with newest strategies
- Direct access to me for support

This is your photography studio. Your creative team. Your content library. All powered by AI that actually understands YOUR brand.

[CTA BUTTON: Join SSELFIE Studio]

No pressure-just wanted to make sure you know what's available when you're ready.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/studio?checkout=studio_membership` (or tracked link if campaignId provided)
- Text link: Same URL

---

### WIN-BACK OFFER
**Subject:** We Miss You - Here's Something Special  
**Template:** `lib/email/templates/win-back-offer.tsx` → `generateWinBackOfferEmail()`

**EXACT TEXT:**
```
S S E L F I E

Hey [displayName],

I'll be honest-I miss you.

It's been a while since we connected, and I've been thinking about what might have happened. Maybe life got busy. Maybe you weren't sure if SSELFIE was right for you. Maybe you just needed more time.

Whatever it was, I want you to know: I get it. And I want to make it easy for you to come back.

[SPECIAL OFFER BOX - if offer provided]
SPECIAL OFFER JUST FOR YOU
[Discount amount/percentage]
[Offer code if provided]
[Expiry if provided]

Here's what you'll get with SSELFIE Studio:
- 150+ professional photos every month
- Full Academy with video courses and templates
- Feed Designer for content planning
- Monthly drops with newest strategies
- Direct access to me for support

This is your chance to finally show up online in a way that feels authentic and powerful. No more hiding. No more worrying about what to post. Just you, being yourself, consistently.

"I came back after months away, and I'm so glad I did. SSELFIE gave me the confidence to finally be the face of my brand."
- Jessica, Studio Member

[CTA BUTTON: Claim Your Offer]

This offer is just for you, and it won't last forever. But more importantly, I want you back because I believe in what you're building. And I want to help you get there.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/studio?checkout=studio_membership&code=[offerCode]` (or tracked link if campaignId provided)
- Text link: Same URL

---

### WELCOME BACK RE-ENGAGEMENT
**Subject:** I've been thinking about you...  
**Template:** `lib/email/templates/welcome-back-reengagement.tsx` → `generateWelcomeBackReengagementEmail()`

**EXACT TEXT:**
```
S S E L F I E

Hey [displayName],

I've been thinking about you.

It's been a while since we connected, and I wanted to reach out because something's changed. SSELFIE Studio has grown into something I'm really proud of - and I think you'd love what we've built.

Remember when I first started this? I was just a woman with a phone, trying to figure out how to show up online without feeling awkward. Now, we're helping hundreds of women create professional photos that actually feel like them.

Here's what's new:
- 150+ professional photos every month (not just a few)
- Full Academy with video courses and templates
- Feed Designer to plan your content
- Monthly drops with the newest strategies

But honestly? The best part isn't the features. It's watching women finally feel confident showing their face online. That's what gets me up every morning.

"I used to hide behind my logo. Now I'm the face of my brand, and it's changed everything."
- Sarah, Studio Member

I'm not here to sell you anything. I just wanted you to know what's possible now. If you're ready to show up online in a way that feels authentic and powerful, we're here.

[CTA BUTTON: See What's New]

No pressure. Just wanted to reconnect and see how you're doing.

XoXo Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/whats-new` (or tracked link if campaignId provided)
- Text link: Same URL

---

### BETA TESTIMONIAL REQUEST
**Subject:** You're helping me build something incredible  
**Template:** `lib/email/templates/beta-testimonial-request.tsx` → `generateBetaTestimonialEmail()`

**EXACT TEXT:**
```
S S E L F I E

Hey [customerName]!

I hope you're having fun playing with your SSELFIE photos! 

I've been watching the beta community grow these past few days and honestly? I'm getting emotional seeing what you all are creating. When I was coding this app in my tiny apartment, dreaming of helping women feel confident in their content - THIS is exactly what I imagined.

You being part of the beta means everything to me. You're not just a user - you're helping me build something that's going to change how women show up online.

If you're loving your experience so far, would you mind sharing a quick testimonial? Even just a sentence about your favorite part or how SSELFIE is helping you would be incredible.

Other women are still scared to try AI photography, and hearing from real beta users like you helps them see what's possible. Your words could be exactly what someone needs to finally start showing up confidently online.

You can just reply to this email with whatever feels authentic to you! And if you want to share it publicly (Instagram, LinkedIn, wherever), I'd be so grateful - but no pressure at all.

Thank you for believing in this vision and being part of our story. Seriously. It means more than you know.

[CTA BUTTON: Share Your Testimonial]

P.S. If you have any requests for Maya or features you'd love to see - I'm all ears! This is YOUR studio too.

XoXo
Sandra 💋
```

**CTA ROUTES TO:**
- Button: `https://sselfie.ai/share-your-story`
- Text link: `https://sselfie.ai/share-your-story`

---

## 📅 CURRENTLY SCHEDULED CAMPAIGNS

**From Database Query (as of January 6, 2025):**

1. **Welcome Sequence - Email 3**
   - **ID:** 26
   - **Type:** resend_automation_email
   - **Subject:** One week in - you're crushing it! 🎯
   - **Scheduled For:** January 8, 2026 at 9:52 PM UTC
   - **Status:** scheduled
   - **Content:** Same as Welcome Sequence Day 7 (see above)

---

## ✅ VOICE & STYLE VERIFICATION

### ✅ **Sandra's Voice Present:**
- Personal, conversational tone
- Uses "Hey [name]" greeting
- Signs with "XoXo Sandra 💋"
- Mentions reading every email personally
- Uses emojis naturally (🚀, 💪, 🎯, etc.)
- Direct, no-nonsense language
- Shares personal stories and member testimonials

### ✅ **No Work Information Found:**
- No company names other than SSELFIE
- No job titles or corporate language
- No business jargon
- Focus on personal brand and visibility
- Entrepreneur-focused, not corporate

### ⚠️ **Potential Issues to Review:**
1. **Nurture Day 5** - Mentions "Sarah" as a life coach case study (verify this is a real member story or change to generic)
2. **Blueprint Day 7** - Mentions "Sarah" again with specific follower numbers (5K to 25K) - verify accuracy
3. **Upsell Day 10** - Mentions "Maria, Studio Member" - verify testimonial is real
4. **Win-Back Offer** - Mentions "Jessica, Studio Member" - verify testimonial is real
5. **Welcome Back Re-engagement** - Mentions "Sarah, Studio Member" again - verify testimonial is real

---

## 🔗 CTA SUMMARY

### Checkout Links:
- **Membership:** `/checkout/membership` (with UTM params)
- **One-Time:** `/checkout/one-time` (with UTM params)

### Internal Links:
- **Studio:** `/studio`
- **What's New:** `/whats-new`
- **Share Story:** `/share-your-story`

### Promo Codes Referenced:
- `COMEBACK50` (50% off first month)
- `BLUEPRINT10` ($10 off first photoshoot)

---

## 📊 EMAIL TRIGGERS & SCHEDULES

| Sequence | Trigger | Day 0 | Day 1 | Day 3 | Day 5 | Day 7 | Day 10 | Day 14 |
|----------|---------|-------|-------|-------|-------|-------|--------|--------|
| Welcome | Payment complete | ✅ | - | ✅ | - | ✅ | - | - |
| Nurture | Freebie download | - | ✅ | - | ✅ | - | ✅ | - |
| Re-engagement | 30+ days inactive | ✅ | - | - | - | ✅ | - | ✅ |
| Blueprint | Blueprint form | ✅ | - | ✅ | - | ✅ | - | ✅ |

---

## 🎯 RECOMMENDATIONS

1. **Verify all testimonials** - Ensure "Sarah," "Maria," and "Jessica" are real members or replace with generic examples
2. **Check follower numbers** - Verify "5K to 25K" growth story is accurate
3. **Review scheduled campaign** - The scheduled campaign for January 2026 seems far in the future - verify this is intentional
4. **Consistency check** - Some emails mention "100+ photos" while others say "150+ photos" - standardize
5. **CTA tracking** - All CTAs include UTM parameters for tracking - good!

---

**Document Status:** Complete  
**Last Updated:** January 6, 2025  
**Next Review:** After Sandra's verification


