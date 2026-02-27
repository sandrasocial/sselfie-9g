import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { neon } from "@neondatabase/serverless"
import { FLUX_PROMPTING_PRINCIPLES } from "@/lib/maya/flux-prompting-principles"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateBlueprintConceptsPrompt, auditLogMayaChatGeneration } from "@/lib/maya/prompt-authority"

const sql = neon(process.env.DATABASE_URL!)

const FEED_STYLE_TO_AESTHETIC = {
  luxury: "dark-moody",
  minimal: "scandinavian-light",
  beige: "beige-aesthetic",
} as const

function getBusinessSpecificProps(businessType: string): string {
  const business = businessType.toLowerCase()

  // Beauty & Wellness
  if (business.includes("hair") || business.includes("hairdress") || business.includes("stylist")) {
    return `• Professional hair styling tools (ceramic straightener, rose gold curling wand, sleek blow dryer)
• Flatlay of luxury hair products in minimalist bottles
• Detail shots of hair brush with natural bristles, gold scissors
• Textured arrangement of hair clips, elegant bobby pins, silk scrunchies
• High-end hair serums or oils in beautiful glass bottles
• Professional cape draped artistically with styling tools`
  }

  if (business.includes("makeup") || business.includes("mua") || business.includes("beauty")) {
    return `• Luxury makeup brushes arranged in flatlay (rose gold, matte black handles)
• High-end makeup products (designer lipsticks, elegant compacts, sleek mascara)
• Flatlay of beauty tools: tweezers, lash curler, facial roller
• Jewelry styled with makeup (delicate gold necklaces, minimalist rings)
• Beauty sponges, powder puffs, aesthetic makeup bags
• Mirror with soft lighting, elegant perfume bottles`
  }

  if (business.includes("wellness") || business.includes("health") || business.includes("nutrition")) {
    return `• Green juice or smoothie in elegant glassware with natural light
• Fresh ingredients artfully arranged (avocado, leafy greens, citrus)
• Wellness tools: jade roller, gua sha stone, essential oil bottles
• Yoga mat edge with meditation cushion or crystals
• Healthy breakfast bowl with aesthetic styling (acai, granola, berries)
• Supplements in minimal glass bottles, herbal tea setup`
  }

  if (business.includes("fitness") || business.includes("yoga") || business.includes("personal train")) {
    return `• Yoga mat with blocks and natural lighting
• Activewear details (textured leggings, sports bra with elegant lines)
• Water bottle (glass or sleek stainless steel) with towel
• Fitness journal with workout plans, motivational quotes
• Resistance bands, dumbbells styled aesthetically
• Post-workout smoothie with fresh ingredients visible`
  }

  // Creative Services
  if (business.includes("photographer") || business.includes("photography")) {
    return `• Vintage or modern camera (film camera, mirrorless body)
• Photography equipment flatlay (lenses, memory cards, lens cloth)
• Contact sheets or printed photos arranged aesthetically
• Camera strap draped artistically with lens caps
• Film rolls, light meter, photography books
• MacBook showing Lightroom or editing workspace`
  }

  if (business.includes("design") || business.includes("graphic") || business.includes("brand")) {
    return `• iPad showing design work or aesthetic mood boards
• Pantone swatches or color palette cards
• Design books (Kinfolk, Cereal, design theory)
• Quality art supplies (brush pens, markers) in minimal holders
• Fabric or material swatches arranged artistically
• MacBook with design software visible, aesthetic workspace`
  }

  if (business.includes("artist") || business.includes("illustrat") || business.includes("painter")) {
    return `• Paint brushes in ceramic holder or laid out aesthetically
• Watercolor palette with beautiful color mixing
• Art supplies flatlay (quality pencils, erasers, paper)
• Sketchbook open showing work in progress
• Paint tubes arranged by color gradient
• Canvas edge with soft lighting, artistic tools`
  }

  // Coaching & Consulting
  if (business.includes("coach") || business.includes("life coach") || business.includes("career")) {
    return `• Elegant planner or journal with gold foil lettering
• MacBook showing coaching framework, Notion workspace, or calendar
• Quality fountain pen or brass pen on linen surface
• Inspirational books with designer spines (Atomic Habits, Deep Work)
• Artisanal coffee in handmade ceramic cup
• Leather notebook cover, brass accessories, motivational cards`
  }

  if (business.includes("business") || business.includes("strateg") || business.includes("consult")) {
    return `• MacBook Pro with spreadsheets or strategy documents visible
• Business books arranged (Good to Great, Lean Startup)
• Quality notebook with structured planning pages
• Professional desk accessories (leather pad, brass organizer)
• Espresso in elegant cup, reading glasses
• Charts, graphs, or business documents aesthetically styled`
  }

  if (business.includes("mentor") || business.includes("advisor")) {
    return `• Stack of wisdom-oriented books with visible spines
• Handwritten notes on quality stationery
• Vintage or elegant watch as detail shot
• Tea setup with beautiful teapot and ceramic cups
• Journal with reflective prompts or quotes
• MacBook with mentorship framework visible`
  }

  // Real Estate & Home
  if (business.includes("real estate") || business.includes("realtor") || business.includes("property")) {
    return `• House keys on elegant keychain with minimalist fob
• Real estate documents or contracts styled aesthetically
• iPad showing property listings or floor plans
• Coffee with house hunting notes, measuring tape
• Luxury pen signing documents on marble surface
• Business cards arranged with architectural magazines`
  }

  if (business.includes("interior") || business.includes("home staging") || business.includes("decor")) {
    return `• Fabric swatches and material samples arranged by color
• Paint chips or color cards in aesthetic gradient
• Design magazines (Architectural Digest, Elle Decor)
• Mood board with fabric, wallpaper samples
• Measuring tape, sketch tools, design templates
• iPad with room planning app or design inspiration`
  }

  // Food & Hospitality
  if (business.includes("chef") || business.includes("cook") || business.includes("culinary")) {
    return `• Professional chef knife on wooden cutting board
• Fresh ingredients arranged by color (herbs, vegetables, spices)
• Copper or brass cooking tools (whisk, spoons)
• Recipe book open with handwritten notes
• Artisanal plates or ceramic bowls in flatlay
• Linen kitchen towel with rustic texture`
  }

  if (business.includes("bak") || business.includes("pastry") || business.includes("cake")) {
    return `• Baking tools arranged (whisk, spatula, measuring spoons)
• Flour dusted on marble surface with rolling pin
• Fresh ingredients (eggs, butter, vanilla beans)
• Piping bags with decorative tips arranged aesthetically
• Vintage baking books or handwritten recipe cards
• Artisanal baked goods on elegant cake stand`
  }

  // Fashion & Style
  if (business.includes("fashion") || business.includes("stylist") || business.includes("wardrobe")) {
    return `• Fashion magazines (Vogue, Harper's Bazaar) arranged aesthetically
• Fabric swatches in textured materials (silk, linen, wool)
• Jewelry pieces arranged (gold chains, minimalist rings, statement earrings)
• Sunglasses with designer frame on linen surface
• Leather accessories (wallet, watch strap, belt detail)
• Mood board with fashion tears, color palette cards`
  }

  // Writing & Content
  if (business.includes("writer") || business.includes("author") || business.includes("copywriter")) {
    return `• Stack of books with visible spines (writing guides, novels)
• Vintage typewriter or quality keyboard detail
• Handwritten notes on quality paper with fountain pen
• Coffee in literary-themed mug with reading glasses
• Manuscript pages arranged aesthetically
• Journal open with creative writing, bookmarks`
  }

  if (business.includes("content creator") || business.includes("influencer") || business.includes("blogger")) {
    return `• Ring light or softbox creating professional lighting
• iPhone or camera on tripod for content creation
• MacBook with content calendar, Instagram analytics visible
• Aesthetic props for content (flowers, textiles, styling elements)
• Planning materials (mood boards, shot lists, calendar)
• Coffee with content planning notebook`
  }

  // Education & Teaching
  if (business.includes("teacher") || business.includes("tutor") || business.includes("educat")) {
    return `• Quality notebooks and textbooks arranged aesthetically
• Educational materials styled minimally (flashcards, worksheets)
• Apple Pencil with iPad showing lesson plans
• Books stacked with bookmarks, reading glasses
• Inspirational educational quotes on cards
• Coffee with grading materials or lesson planning`
  }

  // Legal & Finance
  if (business.includes("lawyer") || business.includes("attorney") || business.includes("legal")) {
    return `• Legal books with leather binding arranged
• Quality fountain pen signing documents
• Gavel styled aesthetically on wooden surface (if appropriate)
• Professional briefcase or leather portfolio detail
• Coffee with law journals or case files
• Business cards, professional stationery on marble`
  }

  if (business.includes("accountant") || business.includes("financial") || business.includes("bookkeep")) {
    return `• Calculator (aesthetic vintage or sleek modern)
• Financial documents or spreadsheets styled professionally
• Quality pen with financial planning materials
• Coffee with accounting books or tax guides
• MacBook with Excel or financial software visible
• Professional desk accessories in minimal style`
  }

  // Therapy & Mental Health
  if (business.includes("therap") || business.includes("psycholog") || business.includes("counselor")) {
    return `• Comfortable textures (soft blanket, cozy pillow)
• Self-help or psychology books arranged thoughtfully
• Journal for reflection with quality pen
• Calming tea setup with ceramic teapot
• Crystals or calming objects styled aesthetically
• Soft lighting with candles or ambient elements`
  }

  // Default for professional services
  return `• Silver MacBook Pro or elegant tech device
• Quality leather-bound notebook or designer planner
• Artisanal coffee in handmade ceramic cup
• Professional books related to ${businessType}
• Quality fountain pen or brass accessories
• Fashion magazines or industry publications
• Elegant desk accessories (brass, leather, marble)
• Natural textiles (linen napkin, knit throw)`
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.ENABLE_BLUEPRINT_GUEST !== "true") {
      return NextResponse.json({ error: "Endpoint disabled" }, { status: 410 })
    }

    const { formData, selectedFeedStyle, email, accessToken } = await req.json()

    // Phase 1: Support both user_id (authenticated) and email (backward compatibility)
    let userId: string | null = null
    let subscriberQuery = null

    // Try to get user_id from auth session (Studio flow)
    try {
      const supabase = await createServerClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const neonUser = await getUserByAuthId(authUser.id)
        if (neonUser) {
          userId = neonUser.id
          console.log("[Blueprint] Using user_id from auth session:", userId)
        }
      }
    } catch (authError) {
      // Not authenticated - fall back to email-based lookup
      console.log("[Blueprint] Not authenticated, using email-based lookup")
    }

    // Query by user_id if authenticated, otherwise by email
    if (userId) {
      subscriberQuery = await sql`
        SELECT id, strategy_generated, strategy_data
        FROM blueprint_subscribers
        WHERE user_id = ${userId}
        LIMIT 1
      `
    } else {
      // Backward compatibility: email-based lookup
      if (!email && !accessToken) {
        return NextResponse.json(
          { error: "Email or access token is required. Please complete email capture first." },
          { status: 400 },
        )
      }

      if (accessToken) {
        subscriberQuery = await sql`
          SELECT id, strategy_generated, strategy_data
          FROM blueprint_subscribers
          WHERE access_token = ${accessToken}
          LIMIT 1
        `
      } else if (typeof email === "string") {
        subscriberQuery = await sql`
          SELECT id, strategy_generated, strategy_data
          FROM blueprint_subscribers
          WHERE email = ${email}
          LIMIT 1
        `
      } else {
        return NextResponse.json(
          { error: "Email is required. Please complete email capture first." },
          { status: 400 },
        )
      }
    }

    if (subscriberQuery.length === 0) {
      return NextResponse.json(
        { error: userId ? "Blueprint state not found. Please start your blueprint first." : "Email not found. Please complete email capture first." },
        { status: 404 },
      )
    }

    const subscriberData = subscriberQuery[0]

    // If strategy already generated, return saved strategy
    if (subscriberData.strategy_generated && subscriberData.strategy_data) {
      console.log("[Blueprint] Returning saved strategy for", userId ? `user_id: ${userId}` : `email: ${email}`)
      return NextResponse.json({
        success: true,
        concepts: [subscriberData.strategy_data],
        fromCache: true,
      })
    }

    const aestheticStyle =
      FEED_STYLE_TO_AESTHETIC[selectedFeedStyle as keyof typeof FEED_STYLE_TO_AESTHETIC] || "dark-moody"

    console.log("[Blueprint] Generating new strategy for", userId ? `user_id: ${userId}` : `email: ${email}`, { selectedFeedStyle, aestheticStyle })

    const businessProps = getBusinessSpecificProps(formData.business)

    // Phase 3A P0-3: Generate prompt via Authority Layer
    const generationStartTime = Date.now()
    const authorityResult = generateBlueprintConceptsPrompt({
      formData,
      selectedFeedStyle,
      aestheticStyle,
      businessProps,
    })
    
    console.log(`[Blueprint] Prompt generated via Authority Layer, fingerprint: ${authorityResult.metadata.fingerprint}`)
    
    const { text } = await generateText({
      model: "openai/gpt-4o",
      prompt: authorityResult.prompt,
    })

    let cleanedText = text.trim()
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\n/, "").replace(/\n```$/, "")
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\n/, "").replace(/\n```$/, "")
    }

    const concepts = JSON.parse(cleanedText)

    // Phase 3A P0-3: Audit logging already handled by Authority Layer wrapper
    // Additional audit log for concept output (preserves existing behavior)
    const generationTimeMs = Date.now() - generationStartTime
    const generatedPrompt = concepts.concepts?.[0]?.prompt || JSON.stringify(concepts)
    try {
      auditLogMayaChatGeneration(
        'blueprint-preview',
        'blueprint-preview',
        {
          userId: userId?.toString() ?? undefined,
          feedStyle: selectedFeedStyle,
          businessType: formData.business,
          formData,
        },
        generatedPrompt,
        generationTimeMs
      )
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.warn("[Blueprint] Audit logging failed (non-critical):", auditError)
    }

    // Save strategy to database (only the first concept)
    const strategyData = concepts.concepts[0]
    if (strategyData) {
      try {
        if (userId) {
          await sql`
            UPDATE blueprint_subscribers
            SET strategy_generated = TRUE,
                strategy_generated_at = NOW(),
                strategy_data = ${JSON.stringify(strategyData)}::jsonb
            WHERE user_id = ${userId}
          `
          console.log("[Blueprint] Strategy saved to database for user_id:", userId)
        } else {
          await sql`
            UPDATE blueprint_subscribers
            SET strategy_generated = TRUE,
                strategy_generated_at = NOW(),
                strategy_data = ${JSON.stringify(strategyData)}::jsonb
            WHERE email = ${email}
          `
          console.log("[Blueprint] Strategy saved to database for email:", email)
        }
      } catch (dbError) {
        console.error("[Blueprint] Error saving strategy to database:", dbError)
        // Continue even if save fails - user still gets the strategy
      }
    }

    return NextResponse.json({
      success: true,
      concepts: concepts.concepts,
    })
  } catch (error) {
    console.error("[Blueprint] Error generating concepts:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate concepts" },
      { status: 500 },
    )
  }
}
