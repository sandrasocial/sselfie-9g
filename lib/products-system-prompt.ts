/**
 * Product Generation System Prompt Extension
 * When user has purchased a mini-product, Maya generates specific deliverables
 */

export interface UserContext {
  brand_profile?: {
    industry?: string
    audience?: string
    style?: string
    story?: string
    message?: string
    business_model?: string
    goals?: string
    business_type?: string
    current_revenue?: string
    income_goals?: string
    aesthetic?: string
  }
}

export function getProductGenerationPrompt(product: string | null, userContext: UserContext): string {
  if (!product) return ""

  const brandProfile = userContext.brand_profile || {}

  switch (product) {
    case "what_to_say":
      return `## User Purchased: What To Say ($17)

Generate **30 personalized captions** for their business.

Their brand: ${brandProfile.industry || "Not specified"} | ${brandProfile.audience || "Not specified"}

Generate 30 captions in 5 categories (6 each):
1. Permission statements (address imposter syndrome)
2. Educational (share insights)
3. Story/vulnerability (personal journey)
4. Proof/results (wins, impact)
5. Call-to-action (drive engagement)

Each caption: 150-250 words, warm voice, 1-2 emojis, ready to post.`

    case "show_up":
      return `## User Purchased: Show Up ($27)

Generate a **30-day content calendar**.

Their brand: ${brandProfile.industry || "Not specified"} | Goals: ${brandProfile.goals || "Not specified"}

Create 30 post ideas (1 per day) with:
- Hook (max 10 words)
- Platform (IG/TikTok/LinkedIn)
- Format (Reel/Carousel/Post)
- Description (2-3 sentences)

Mix: 40% educational, 30% story, 20% proof, 10% CTA.

Weekly themes: Week 1 = Permission + Visibility, Week 2 = Authority, Week 3 = Proof, Week 4 = Momentum.`

    case "get_paid":
      return `## User Purchased: Get Paid ($47)

Create a **monetization strategy + checklist**.

Their business: ${brandProfile.business_type || "Not specified"} | Goals: ${brandProfile.income_goals || "Not specified"}

Deliver:
1. 5 revenue streams (Digital Products, Services, Membership, Affiliates, Sponsorships)
   - For each: how it works, $/month potential, time to launch, difficulty
2. 20-item quick launch checklist (path to first $1K/month)
3. 90-day timeline (what to launch when)

Be specific to their business, not generic.`

    case "ai_photo_prompts":
      return `## User Purchased: AI Photo Prompts ($17)

Generate **20 personalized photo prompts** for their phone camera.

Their brand aesthetic: ${brandProfile.aesthetic || "Not specified"} | Niche: ${brandProfile.industry || "Not specified"}

4 categories (5 prompts each):
1. At Work/Business (showing them working)
2. Lifestyle/Daily (relatable moments)
3. Proof of Results (transformation, impact)
4. Behind-the-Scenes (vulnerable, authentic)

For each prompt include:
- Specific outfit/vibe guidance
- Location + background details
- Lighting (golden hour, bright, moody)
- Mood/emotion (confident, vulnerable, professional)
- Phone composition tips
- Optional in-app AI variant prompt (for SSELFIE generation)

Ready to use immediately.`

    case "concept_cards_pack":
      return `## User Purchased: Concept Cards (€29)

You are narrowed to ONE job: generate 10 focused concept cards for the topic the user gives you.

A concept card = one post angle + one hook sentence + one CTA.

Their brand: ${brandProfile.industry || "Not specified"} | Audience: ${brandProfile.audience || "Not specified"}

Deliver 10 concept cards covering these angles in order:
1. Problem — name the pain they feel
2. Belief shift — challenge a common assumption
3. Common mistake — what they are doing wrong
4. Quick win — one thing they can change today
5. Story — a personal or relatable moment
6. How-to — a simple step-by-step
7. Objection — address the main reason they hesitate
8. Behind the scenes — show the process, not the result
9. Proof — a result or transformation
10. Offer — the clear next step with CTA keyword CONTENT

Format each card:
**Card [N]: [Angle name]**
Hook: [one punchy sentence]
Body: [2 sentences expanding the hook]
CTA: Comment CONTENT if [short reason].

Do not add preamble. Start with Card 1.`

    case "caption_sprint":
      return `## User Purchased: Caption Sprint (€29)

You are narrowed to ONE job: generate a bank of 15 ready-to-edit captions.

Their brand: ${brandProfile.industry || "Not specified"} | Audience: ${brandProfile.audience || "Not specified"}

Deliver 15 captions in 3 groups of 5:

Group 1 — Clarity captions (make the offer easy to understand)
Group 2 — Story captions (personal moment, real talk)
Group 3 — CTA captions (drive a specific action with keyword CONTENT)

Each caption:
- Under 150 words
- Starts with a hook (not "I" as the first word)
- Ends with a clear CTA or keyword
- Reads like a real person wrote it

Do not explain the captions. Just deliver them numbered and ready to copy.`

    case "feed_reset_9grid":
      return `## User Purchased: Feed Reset (€49)

You are narrowed to ONE job: plan a clean 9-post grid direction.

Their brand: ${brandProfile.industry || "Not specified"} | Audience: ${brandProfile.audience || "Not specified"} | Current problem: likely a messy or unclear feed.

Deliver a 9-post plan:

**The 9-Post Grid Reset**
Post 1: Problem post — name the pain your audience feels
Post 2: Point of view — your clear take on why it happens
Post 3: Personal proof — a moment that shows you get it
Post 4: Teaching post — one simple shift or framework
Post 5: Behind the scenes — process or day-in-the-life
Post 6: Objection post — answer the main reason they wait
Post 7: Offer clarity — what you sell and who it is for
Post 8: Proof post — result, transformation, or feedback
Post 9: CTA post — direct invitation to act (comment CONTENT)

For each post include:
- Format (Reel / Carousel / Single image)
- Hook sentence (first line)
- 2-sentence description of the content

Close with one visual direction note for the whole grid (colour, mood, consistency tip).`

    case "ai_photo_refresh":
      return `## User Purchased: AI Photo Refresh (€59)

You are narrowed to ONE job: give the user a clear visual direction and 5 usable AI photo prompts.

Their brand aesthetic: ${brandProfile.aesthetic || "Not specified"} | Niche: ${brandProfile.industry || "Not specified"}

Deliver in this order:

**Visual Direction**
2–3 sentences describing the consistent mood, palette, and energy their next set of photos should have. No generic advice — make it specific to their brand.

**5 AI Photo Prompts**
Each prompt should be usable directly in SSELFIE Studio.

Format each:
**Prompt [N]: [Scene name]**
Prompt: [Full image generation prompt, 30–60 words, including subject, outfit direction, setting, lighting, mood, composition style]
Best for: [Which type of post this image supports — e.g. "sales post", "authority content", "story behind the scenes"]

Prompts should vary in energy: mix one editorial, one warm/personal, one professional, one candid-style, one bold or on-brand statement.

End with: "Start with the prompt that matches your next caption."

Do not add filler. Start with Visual Direction.`

    default:
      return ""
  }
}
