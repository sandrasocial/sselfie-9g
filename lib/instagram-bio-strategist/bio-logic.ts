import { generateText } from "ai"
import { INSTAGRAM_BIO_STRATEGIST_PERSONALITY } from "./personality"
import { sql } from "@/lib/db/client"
import { createMayaOpenRouterModel, getMayaMaxTokensForTask } from "@/lib/maya/openrouter"

interface GenerateBioParams {
  userId: string
  businessType: string
  brandVibe: string
  brandVoice?: string
  targetAudience?: string
  businessGoals?: string
  researchData?: string
  /** The member's saved current offer or focus. This is the only source for an offer CTA. */
  currentOfferFocus?: string
}

const UNSUPPORTED_OFFER_TERMS = [
  "free",
  "guide",
  "toolkit",
  "checklist",
  "download",
  "webinar",
  "course",
  "challenge",
  "masterclass",
  "newsletter",
]

function cleanBio(value: string): string {
  return String(value || "")
    .replace(/^['"]|['"]$/g, "")
    .replace(/\s*—+\s*/g, ": ")
    .replace(/\s*\n+\s*/g, " | ")
    .replace(/\s{2,}/g, " ")
    .trim()
}

export function hasUnsupportedBioClaim(bio: string, verifiedContext: string): boolean {
  const text = String(bio || "").toLowerCase()
  const source = String(verifiedContext || "").toLowerCase()
  if (!text) return true

  if (
    UNSUPPORTED_OFFER_TERMS.some(
      term =>
        new RegExp(`\\b${term}\\b`, "i").test(text) &&
        !new RegExp(`\\b${term}\\b`, "i").test(source)
    )
  ) {
    return true
  }

  const proofClaims = text.match(
    /\b(?:\d+\+?\s*(?:years?|clients?|customers?|followers?|sales)|(?:six|seven)[- ]figure|certified|award[- ]winning|featured in)\b/gi
  )
  if (proofClaims?.some(claim => !source.includes(claim.toLowerCase()))) return true

  const currentYear = new Date().getFullYear()
  const staleYears = text.match(/\b20\d{2}\b/g) || []
  if (staleYears.some(year => Number(year) < currentYear && !source.includes(year))) return true

  return false
}

function groundedFallback(params: GenerateBioParams): string {
  const first = params.targetAudience?.trim()
    ? `For ${params.targetAudience.trim()}`
    : params.businessType.trim()
  const second = params.brandVibe.trim() || "Clear, practical support"
  const third = params.currentOfferFocus?.trim() || "Follow for practical ideas"
  return cleanBio(`${first} | ${second} | ${third}`).slice(0, 150)
}

export async function generateInstagramBio(params: GenerateBioParams): Promise<{
  success: boolean
  bio: string
  error?: string
}> {
  const {
    userId,
    businessType,
    brandVibe,
    brandVoice,
    targetAudience,
    businessGoals,
    researchData,
    currentOfferFocus,
  } = params

  console.log("[v0] [BIO STRATEGIST] Generating Instagram bio...")
  console.log("[v0] [BIO STRATEGIST] User ID:", userId)
  console.log("[v0] [BIO STRATEGIST] Business Type:", businessType)
  console.log("[v0] [BIO STRATEGIST] Research Data Available:", !!researchData)

  try {
    // Get user's display name (not business name)
    const [userData] = await sql`
      SELECT display_name, email FROM users
      WHERE id = ${userId}
      LIMIT 1
    `

    const [userProfile] = await sql`
      SELECT instagram_handle, full_name FROM user_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `

    const [brandOnboarding] = await sql`
      SELECT business_name, instagram_handle FROM brand_onboarding
      WHERE user_id = ${userId}
      LIMIT 1
    `

    const instagramHandle =
      userProfile?.instagram_handle || brandOnboarding?.instagram_handle || null
    // Use user's display name instead of business name
    const userDisplayName =
      userData?.display_name ||
      userProfile?.full_name ||
      (userData?.email ? userData.email.split("@")[0] : null) ||
      null

    console.log("[v0] [BIO STRATEGIST] Instagram Handle:", instagramHandle)
    console.log("[v0] [BIO STRATEGIST] User Display Name:", userDisplayName)

    const verifiedContext = [
      businessType,
      brandVibe,
      brandVoice,
      targetAudience,
      businessGoals,
      currentOfferFocus,
      userDisplayName,
      instagramHandle,
    ]
      .filter(Boolean)
      .join(" | ")

    const prompt = `Create a clear Instagram bio for a ${businessType}.

**VERIFIED BRAND PROFILE:**
- Business Type: ${businessType}
- Brand Vibe: ${brandVibe}
${brandVoice ? `- Brand Voice: ${brandVoice}` : ""}
${targetAudience ? `- Target Audience: ${targetAudience}` : ""}
${businessGoals ? `- Business Goals: ${businessGoals}` : ""}
${currentOfferFocus ? `- Current Offer or Focus: ${currentOfferFocus}` : "- Current Offer or Focus: Not provided"}
${userDisplayName ? `- User Name: ${userDisplayName}` : ""}
${instagramHandle ? `- Instagram Handle: @${instagramHandle.replace("@", "")}` : ""}

${
  researchData
    ? `**MARKET INTELLIGENCE:**
${researchData}

Use these insights to:
- Identify what makes this brand unique vs competitors
- Incorporate relevant industry words naturally for search
- Address specific pain points or desires of the target audience
- Clarify the brand's place in the market

Market intelligence is creative context, not proof. Never turn it into a claim about this member.
`
    : ""
}

**THE 3-LINE STRUCTURE:**
Line 1: Who she helps and what she is known for, using only the profile above
Line 2: Her known approach or positioning. Use proof only if the profile explicitly provides it
Line 3: Her verified current offer or focus. If none is provided, use a safe follow CTA such as "Follow for practical ideas"

**CRITICAL REQUIREMENTS:**
1. Use the 3-line structure exactly
2. Use simple, everyday language. No fancy words or corporate jargon
3. Use " | " (space pipe space) to separate the 3 lines
4. Use 0-2 relevant emojis only if they help scanning
5. Maximum 150 characters total
6. Sound like a real person, not AI
7. Be specific only when the verified profile is specific
8. Lead with what the member actually helps with
9. Include industry keywords naturally for Instagram search
10. Include a clear call-to-action at the end
11. Never invent an offer, freebie, guide, link, credential, proof point, result, number, audience size, client history, or years of experience
12. If Current Offer or Focus is not provided, do not write "free", "guide", "toolkit", "download", "course", or any other offer noun

**2026 BIO PRIORITIES:**
- Search clarity: include the most relevant industry words naturally
- Purpose over polish: say what she helps with in plain language
- Factual trust: every claim must be traceable to the verified profile
- One useful CTA: current offer if supplied, otherwise a follow CTA

**WHAT NOT TO DO:**
- Do not use generic templated phrases such as "live your best life" or "follow your dreams"
- Do not use more than 2 emojis
- Do not use vague buzzwords without meaning
- Do not invent a transformation, proof point, or resource
- Do not use fancy fonts

**WRITING STYLE:**
- Write how people actually talk on Instagram
- Use short, punchy phrases
- Be authentic and relatable
- NO corporate jargon or fancy words
- Think: "How would I explain this to a friend?"
- Mission-driven: Lead with what she truly helps with
${researchData ? "- Use competitor insights only for phrasing and differentiation, never as facts about her" : ""}

${userDisplayName ? `\n**IMPORTANT:** Use the user's name "${userDisplayName}" naturally in the bio if it fits, but prioritize the 3-Line Power Structure and transformation message.` : ""}

Return ONLY the bio text with " | " separators, nothing else.`

    const model = createMayaOpenRouterModel("instagram_bio")
    let result = await generateText({
      model,
      system: INSTAGRAM_BIO_STRATEGIST_PERSONALITY,
      prompt,
      temperature: 0.7,
      maxOutputTokens: getMayaMaxTokensForTask("instagram_bio"),
    })

    if (!result || typeof result.text !== "string") {
      throw new Error("Invalid response from AI model")
    }

    let generatedBio = cleanBio(result.text)
    if (generatedBio.length > 150 || hasUnsupportedBioClaim(generatedBio, verifiedContext)) {
      result = await generateText({
        model,
        system: INSTAGRAM_BIO_STRATEGIST_PERSONALITY,
        prompt: `Rewrite this Instagram bio so every word is grounded in the verified profile.

VERIFIED PROFILE:
${verifiedContext}

RULES:
- Maximum 150 characters.
- Use three parts separated by " | ".
- Never invent an offer, freebie, guide, toolkit, link, credential, proof, result, number, client history, or old calendar year.
- Use the current offer only when it appears in the verified profile. Otherwise end with a simple follow CTA.
- No em dash.

BIO TO REWRITE:
${generatedBio}

Return only the rewritten bio.`,
        temperature: 0.3,
        maxOutputTokens: getMayaMaxTokensForTask("instagram_bio"),
      })
      generatedBio = cleanBio(result.text)
    }

    if (
      !generatedBio ||
      generatedBio.length > 150 ||
      hasUnsupportedBioClaim(generatedBio, verifiedContext)
    ) {
      return {
        success: false,
        bio: groundedFallback(params),
        error: "Bio could not be grounded in the saved brand context",
      }
    }

    console.log("[v0] [BIO STRATEGIST] ✓ Bio generated:", generatedBio)
    console.log("[v0] [BIO STRATEGIST] Character count:", generatedBio.length, "/ 150")

    return {
      success: true,
      bio: generatedBio,
    }
  } catch (error) {
    console.error("[v0] [BIO STRATEGIST] ❌ Error generating bio:", error)

    const fallbackBio = groundedFallback(params)

    return {
      success: false,
      bio: fallbackBio,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
