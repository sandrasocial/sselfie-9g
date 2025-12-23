import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const SANDRA_EMAIL = "ssa@ssasocial.com"

export interface SandraVoice {
  voice: string
  communicationStyle: string | string[]
  signatures: string | string[]
  pillars: Array<{name: string, description?: string}>
  languageStyle: string
  vibe: string
  audience: string
}

/**
 * Load Sandra's brand voice from database
 * This ensures ALL content (email, Instagram, landing pages) uses HER voice
 */
export async function getSandraVoice(): Promise<SandraVoice> {
  // Get Sandra's user ID
  const [sandra] = await sql`
    SELECT id FROM users WHERE email = ${SANDRA_EMAIL} LIMIT 1
  `
  
  if (!sandra) {
    throw new Error("Sandra's user account not found")
  }
  
  // Get Sandra's brand voice data
  const [brandVoice] = await sql`
    SELECT 
      brand_voice,
      communication_voice,
      signature_phrases,
      content_pillars,
      language_style,
      brand_vibe,
      target_audience
    FROM user_personal_brand
    WHERE user_id = ${sandra.id}
    LIMIT 1
  `
  
  if (!brandVoice) {
    // Fallback to writing assistant voice if not in database
    return {
      voice: "Raw and authentic, not polished corporate. Warm and encouraging, like a friend. Direct and clear, no jargon. Conversational and casual. Empowering and action-oriented.",
      communicationStyle: "Friend-to-friend, empowering, conversational",
      signatures: "XoXo Sandra 💋",
      pillars: [
        {name: "Prompts with Examples", description: "Educational carousel content"},
        {name: "SSELFIE Features & Updates", description: "Platform updates and tips"},
        {name: "Visibility = Financial Freedom", description: "Core message and transformation"},
        {name: "Behind the Scenes", description: "Personal journey and real talk"}
      ],
      languageStyle: "Casual, emoji-friendly, warm",
      vibe: "Empowering and authentic",
      audience: "Women entrepreneurs, solopreneurs, coaches"
    }
  }
  
  // Parse content pillars
  let pillars = []
  try {
    pillars = typeof brandVoice.content_pillars === 'string' 
      ? JSON.parse(brandVoice.content_pillars)
      : brandVoice.content_pillars || []
  } catch (e) {
    pillars = []
  }
  
  // Parse communication_voice if it's a JSON string
  let communicationStyle = brandVoice.communication_voice || ""
  try {
    if (typeof communicationStyle === 'string' && communicationStyle.startsWith('[')) {
      communicationStyle = JSON.parse(communicationStyle)
    }
  } catch (e) {
    // Keep as string if parsing fails
  }
  
  // Parse signature_phrases if it's a JSON string
  let signatures = brandVoice.signature_phrases || ""
  try {
    if (typeof signatures === 'string' && signatures.startsWith('[')) {
      signatures = JSON.parse(signatures)
    }
  } catch (e) {
    // Keep as string if parsing fails
  }
  
  return {
    voice: brandVoice.brand_voice || "",
    communicationStyle: communicationStyle,
    signatures: signatures,
    pillars: Array.isArray(pillars) ? pillars : [],
    languageStyle: brandVoice.language_style || "",
    vibe: brandVoice.brand_vibe || "",
    audience: brandVoice.target_audience || ""
  }
}

