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

    const instagramHandle = userProfile?.instagram_handle || brandOnboarding?.instagram_handle || null
    // Use user's display name instead of business name
    const userDisplayName = userData?.display_name || userProfile?.full_name || (userData?.email ? userData.email.split("@")[0] : null) || null

    console.log("[v0] [BIO STRATEGIST] Instagram Handle:", instagramHandle)
    console.log("[v0] [BIO STRATEGIST] User Display Name:", userDisplayName)

    const prompt = `Create a high-converting Instagram bio using the 3-Line Power Structure for a ${businessType}.

**Brand Profile:**
- Business Type: ${businessType}
- Brand Vibe: ${brandVibe}
${brandVoice ? `- Brand Voice: ${brandVoice}` : ""}
${targetAudience ? `- Target Audience: ${targetAudience}` : ""}
${businessGoals ? `- Business Goals: ${businessGoals}` : ""}
${userDisplayName ? `- User Name: ${userDisplayName}` : ""}
${instagramHandle ? `- Instagram Handle: @${instagramHandle.replace("@", "")}` : ""}

${
  researchData
    ? `**MARKET INTELLIGENCE:**
${researchData}

Use these insights to:
- Identify what makes this brand unique vs competitors
- Incorporate trending keywords and phrases from the industry (naturally, for search)
- Address specific pain points or desires of the target audience
- Position the brand strategically in the market
`
    : ""
}

**THE 3-LINE POWER STRUCTURE (REQUIRED):**
Line 1: [WHO YOU HELP] achieve [SPECIFIC RESULT]
Line 2: [PROOF POINT or UNIQUE APPROACH]
Line 3: [CLEAR CTA] → [Link description]

**EXAMPLE FORMATS:**

For Thought Leaders:
"Helping ambitious entrepreneurs build 6-figure businesses 💼 | 10+ years coaching | Free guide → Link below"

For Product-Based:
"Sustainable fashion for conscious consumers 🌿 | Ethically sourced, planet-friendly | Shop → Collection below"

For Personal Brands:
"Teaching millennials to master their money 💰 | Certified financial coach | Start here → Free toolkit"

**CRITICAL REQUIREMENTS:**
1. Use the 3-Line Power Structure exactly as shown above
2. Use simple, everyday language - NO fancy words or corporate jargon
3. Use " | " (space pipe space) to separate the 3 lines
4. Add 2-3 strategic emojis throughout (NOT just at the end, max 3 total)
5. Maximum 150 characters total
6. Sound like a real person texting a friend, NOT like AI
7. Be specific and results-focused - tangible outcomes, not vague promises
8. Lead with your "why" (purpose/mission) - what transformation you create
9. Include industry keywords naturally for Instagram search
10. Include a clear call-to-action at the end
${researchData ? "11. Leverage the market intelligence to differentiate from competitors" : ""}

**2025 TRENDS TO IMPLEMENT:**
- Keywords for Search: Include industry terms naturally (e.g., "financial coach", "sustainable fashion", "business coach")
- Purpose Over Polish: Lead with your "why" - what transformation you create, not perfect corporate speak
- Results-Focused: Specific, tangible outcomes (e.g., "build 6-figure businesses", "master your money", "reduce waste by 50%")
- Video-First Mention: If they create video content, mention it (e.g., "Video content creator", "Reels daily")
- Community Language: Use words like "community", "together", "join us" when appropriate

**WHAT NOT TO DO:**
❌ Don't use generic templated phrases ("live your best life", "follow your dreams", "be yourself")
❌ Avoid more than 3 emojis (looks unprofessional)
❌ Skip vague buzzwords without meaning ("authentic", "passionate" - unless you explain what they mean)
❌ Don't just list what you do - explain the transformation you provide
❌ Never use fancy fonts that hurt readability

**WRITING STYLE:**
- Write how people actually talk on Instagram
- Use short, punchy phrases
- Be authentic and relatable
- NO corporate jargon or fancy words
- Think: "How would I explain this to a friend?"
- Mission-driven: Lead with your "why", not just what you do
${researchData ? "- Use insights from competitor analysis to stand out" : ""}

${userDisplayName ? `\n**IMPORTANT:** Use the user's name "${userDisplayName}" naturally in the bio if it fits, but prioritize the 3-Line Power Structure and transformation message.` : ""}

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
