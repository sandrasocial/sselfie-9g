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

    default:
      return ""
  }
}
