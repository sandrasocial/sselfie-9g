import { generateText } from "ai"
import { INSTAGRAM_BIO_STRATEGIST_PERSONALITY } from "./personality"
import { neon } from "@neondatabase/serverless"

interface GenerateBioParams {
  userId: string
  businessType: string
  brandVibe: string
  brandVoice?: string
  targetAudience?: string
  businessGoals?: string
  researchData?: string
}

export async function generateInstagramBio(params: GenerateBioParams): Promise<{
  success: boolean
  bio: string
  error?: string
}> {
  const { userId, businessType, brandVibe, brandVoice, targetAudience, businessGoals, researchData } = params

  console.log("[v0] [BIO STRATEGIST] Generating Instagram bio...")
  console.log("[v0] [BIO STRATEGIST] User ID:", userId)
  console.log("[v0] [BIO STRATEGIST] Business Type:", businessType)
  console.log("[v0] [BIO STRATEGIST] Research Data Available:", !!researchData)

  try {
    const sql = neon(process.env.DATABASE_URL!)

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

    const [personalBrand] = await sql`
      SELECT name FROM user_personal_brand
      WHERE user_id = ${userId}
      AND is_completed = true
      LIMIT 1
    `

    const instagramHandle = userProfile?.instagram_handle || brandOnboarding?.instagram_handle || null
    const businessName = brandOnboarding?.business_name || personalBrand?.name || userProfile?.full_name || null

    console.log("[v0] [BIO STRATEGIST] Instagram Handle:", instagramHandle)
    console.log("[v0] [BIO STRATEGIST] Business Name:", businessName)

    const prompt = `Create a high-converting Instagram bio for a ${businessType}.

**Brand Profile:**
- Business Type: ${businessType}
- Brand Vibe: ${brandVibe}
${brandVoice ? `- Brand Voice: ${brandVoice}` : ""}
${targetAudience ? `- Target Audience: ${targetAudience}` : ""}
${businessGoals ? `- Business Goals: ${businessGoals}` : ""}
${businessName ? `- Business Name: ${businessName}` : ""}
${instagramHandle ? `- Instagram Handle: @${instagramHandle.replace("@", "")}` : ""}

${
  researchData
    ? `**MARKET INTELLIGENCE:**
${researchData}

Use these insights to:
- Identify what makes this brand unique vs competitors
- Incorporate trending keywords and phrases from the industry
- Address specific pain points or desires of the target audience
- Position the brand strategically in the market
`
    : ""
}

**EXAMPLE FORMAT (follow this structure):**
"Personal brand strategy for ambitious entrepreneurs ✨ | Founder @SSELFIE STUDIO | Transform your story into influence | Link below 📈"

**CRITICAL REQUIREMENTS:**
1. Use simple, everyday language - NO fancy words
2. Use " | " (space pipe space) to separate sections for line breaks
3. Add 2-3 strategic emojis throughout (NOT just at the end)
4. Maximum 150 characters total
5. Structure: WHAT YOU DO | WHO YOU ARE${businessName ? ` (include @${businessName.toUpperCase().replace(/\s+/g, " ")})` : ""} | VALUE PROP | CTA
6. Sound like a real person texting, NOT like AI
7. Be specific and benefit-focused
8. Include a clear call-to-action at the end
${researchData ? "9. Leverage the market intelligence to differentiate from competitors" : ""}

**WRITING STYLE:**
- Write how people actually talk on Instagram
- Use short, punchy phrases
- Be authentic and relatable
- NO corporate jargon or fancy words
- Think: "How would I explain this to a friend?"
${researchData ? "- Use insights from competitor analysis to stand out" : ""}

${businessName ? `\n**IMPORTANT:** Include the business name "${businessName}" in the bio (e.g., "Founder @${businessName.toUpperCase().replace(/\s+/g, " ")}")` : ""}

Return ONLY the bio text with " | " separators and emojis, nothing else.`

    const result = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: INSTAGRAM_BIO_STRATEGIST_PERSONALITY,
      prompt,
      temperature: 0.7,
    })

    if (!result || typeof result.text !== "string") {
      throw new Error("Invalid response from AI model")
    }

    const cleanBio = result.text.trim()

    // Validate length
    if (cleanBio.length > 150) {
      console.warn("[v0] [BIO STRATEGIST] ⚠️ Bio exceeds 150 characters, truncating...")
      const truncatedBio = cleanBio.substring(0, 147) + "..."
      console.log("[v0] [BIO STRATEGIST] ✓ Bio generated (truncated):", truncatedBio)
      return {
        success: true,
        bio: truncatedBio,
      }
    }

    console.log("[v0] [BIO STRATEGIST] ✓ Bio generated:", cleanBio)
    console.log("[v0] [BIO STRATEGIST] Character count:", cleanBio.length, "/ 150")

    return {
      success: true,
      bio: cleanBio,
    }
  } catch (error) {
    console.error("[v0] [BIO STRATEGIST] ❌ Error generating bio:", error)

    const fallbackBio = `${params.businessType} | ${params.brandVibe} | DM to connect ✨`

    return {
      success: false,
      bio: fallbackBio,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
