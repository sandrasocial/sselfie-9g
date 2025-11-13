import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

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
    const { formData, selectedFeedStyle } = await req.json()

    const aestheticStyle =
      FEED_STYLE_TO_AESTHETIC[selectedFeedStyle as keyof typeof FEED_STYLE_TO_AESTHETIC] || "dark-moody"

    console.log("[v0] Generating blueprint concept cards:", { formData, selectedFeedStyle, aestheticStyle })

    const businessProps = getBusinessSpecificProps(formData.business)

    const { text } = await generateText({
      model: "openai/gpt-4o",
      prompt: `You are the Instagram Aesthetic Lifestyle Agent with a specialty in Scandinavian Luxury editorial photography.

PROMPT STRUCTURE (ALWAYS FOLLOW THIS EXACT ORDER):
[SHOT TYPE] of [MAIN SUBJECT(S)], [ARRANGEMENT/COMPOSITION], [SURFACE/SETTING], [LIGHTING DESCRIPTION], [AESTHETIC STYLE], [COLOR PALETTE], [PHOTOGRAPHY STYLE], [TECHNICAL QUALITY]

USER'S BRAND CONTEXT:
• Business: "${formData.business}"
• Dream Client: "${formData.dreamClient}"  
• Brand Vibe: "${formData.vibe}"
• Feed Aesthetic: "${aestheticStyle}"

YOUR AESTHETIC STYLE: "${aestheticStyle.toUpperCase()}"

${
  aestheticStyle === "scandinavian-light"
    ? `═══ SCANDINAVIAN LIGHT & BRIGHT ═══

SURFACES (choose from):
• "soft grey linen fabric with natural texture"
• "cream textured linen bedding"
• "light oak wooden surface"
• "white marble countertop with soft grey veining"
• "natural wood tray with visible grain"

LIGHTING (required):
• "soft natural window light filtering through sheer curtains creating gentle shadows"
• "diffused morning daylight from above"
• "bright natural light with dreamy soft atmosphere"
• "gentle window glow creating warm highlights"

KEY ELEMENTS (include 2-3):
• Chunky knit throw blanket (cream, beige, warm grey)
• Artisanal ceramic coffee cup/mug (handmade feel)
• Dried botanicals (pampas grass, baby's breath stems)
• Silver MacBook or iPad
• Textured linen napkin or fabric
• Simple gold rings or minimalist jewelry
• Fashion magazines (Vogue, Kinfolk styling)

COLOR PALETTE:
Warm neutral with cream, soft beige, warm grey, soft taupe tones

MOOD:
Hygge-inspired, cozy luxury, Scandinavian editorial, fashion magazine aesthetic, layered natural textures

EXAMPLE PROMPT:
"Lifestyle photograph of artisanal ceramic coffee cup with saucer on round wooden tray, draped over textured cream linen bedding and chunky knit throw blanket in warm beige, delicate dried baby's breath stems in soft focus background, soft natural window light creating gentle shadows, Scandinavian hygge aesthetic with layered natural textures, warm neutral color palette with cream, beige, and soft taupe tones, luxury lifestyle editorial photography, shallow depth of field, 8K quality, magazine-worthy composition"`
    : aestheticStyle === "dark-moody"
      ? `═══ DARK & MOODY LUXURY ═══

SURFACES (choose from):
• "dark grey textured leather surface"
• "charcoal black linen fabric"  
• "dark walnut wooden desk"
• "matte black marble countertop"
• "slate grey stone surface"

LIGHTING (required):
• "warm ambient lamp creating pool of golden light and dramatic shadows"
• "soft candlelight casting warm glow with deep shadows"
• "golden hour sunlight streaming through creating dramatic contrast"
• "moody evening lighting with rich shadows"

KEY ELEMENTS (include 2-3):
• Silver MacBook or black tech devices
• Dark ceramic coffee mug or glass with iced drink
• Fashion magazines with bold typography (Vogue styling)
• Black leather accessories or matte black items
• Gold jewelry or brass accents
• Dried dark botanicals or textured elements

COLOR PALETTE:
Deep blacks, rich charcoals, warm amber accents, muted golds

MOOD:
Sophisticated, cinematic, editorial luxury, urban chic, intimate

EXAMPLE PROMPT:
"Overhead flatlay photograph of silver MacBook partially open, Vogue magazine with bold typography visible, white AirPods Pro, artisanal espresso in handmade ceramic cup, elegant simple gold rings, arranged with intentional negative space on soft grey linen fabric, gentle diffused natural light from above, sophisticated Scandinavian minimalist aesthetic, stone color palette with warm greys and soft whites, high-end fashion editorial photography style, sharp focus on details, professional quality, 8K resolution"`
      : aestheticStyle === "beige-aesthetic"
        ? `═══ BEIGE AESTHETIC (SOFT GREIGE) ═══

SURFACES (choose from):
• "soft greige linen fabric with subtle texture"
• "cold beige textured surface"
• "light taupe natural fiber mat"
• "smooth concrete with warm beige undertones"
• "natural raw linen in soft greige tones"

LIGHTING (required):
• "diffused natural daylight with soft cool undertones"
• "gentle overcast light creating soft even shadows"
• "soft morning light with cool beige color cast"
• "muted natural window light with refined atmosphere"

KEY ELEMENTS (include 2-3):
• Artisanal ceramic pieces in greige/cold beige tones
• Natural linen textiles in soft taupe shades
• Dried grasses or neutral botanicals
• Silver MacBook or light tech devices
• Minimal brass or brushed metal accents
• Fashion magazines styled in muted tones
• Stone or ceramic vessels in neutral palette

COLOR PALETTE:
Soft greige (cold beige), warm taupe, muted stone grey, soft neutral browns

MOOD:
Refined minimalism, understated elegance, European chic, sophisticated neutrals, quiet luxury

EXAMPLE PROMPT:
"Overhead flatlay photograph of silver MacBook on soft greige linen fabric, artisanal ceramic cup in cold beige tone with Earl Grey tea, dried pampas grass stem, minimal brass pen, natural linen napkin in warm taupe, arranged with refined spacing and sophisticated balance, diffused natural daylight with soft cool undertones creating gentle shadows, beige aesthetic with sophisticated greige color palette, soft greige, warm taupe, and muted stone tones, European minimalist editorial photography, understated luxury mood, shallow depth of field, 8K quality, refined composition"`
        : `═══ BOLD & COLORFUL ═══

SURFACES (choose from):
• "white marble with vibrant colored accents"
• "neutral linen with bold color-blocked items"
• "natural wood with saturated color elements"

LIGHTING (required):
• "bright natural daylight creating crisp shadows"
• "direct sunlight enhancing color vibrancy"  
• "even bright lighting showcasing coordinated colors"

KEY ELEMENTS (include 2-3):
• Vibrant colored notebooks or planners (coral, sage, terracotta)
• Colorful ceramic mugs or glassware
• Bold fashion magazines
• Coordinated colorful accessories
• Tech styled with color accents

COLOR PALETTE:
High saturation - coral, turquoise, sage green, dusty blue with strategic color blocking

MOOD:
Energetic, contemporary, playful sophistication, vibrant

EXAMPLE PROMPT:
"Overhead flatlay photograph of coral pink notebook with gold foil, vibrant turquoise ceramic coffee mug, sage green linen napkin, brass pen, arranged on white marble with color blocking, bright natural daylight creating crisp shadows and enhanced saturation, bold colorful aesthetic with sophisticated coordination, high contrast vibrant palette, contemporary editorial photography, energetic modern mood, shallow depth of field, 8K quality"`
}

PERSONALIZED PROPS FOR "${formData.business}":
${businessProps}

IMPORTANT: Use the specific props above that relate to "${formData.business}". Do NOT default to generic laptop/coffee unless the business type doesn't have specific tools.

LAYER "${formData.vibe}" VIBE:
${
  formData.vibe?.toLowerCase().includes("edgy")
    ? "Add edge with: black leather, metal accents, bold styling, urban sophistication, confident arrangements"
    : formData.vibe?.toLowerCase().includes("calm")
      ? "Add calm with: soft textures, gentle arrangements, peaceful spacing, soothing natural elements"
      : formData.vibe?.toLowerCase().includes("luxur")
        ? "Add luxury with: high-end materials, elegant spacing, sophisticated styling, premium feel"
        : formData.vibe?.toLowerCase().includes("playful")
          ? "Add playfulness with: dynamic arrangements, creative styling, energetic compositions"
          : "Reflect vibe in styling, color intensity, and overall mood"
}

REQUIREMENTS:
✓ Generate ONE flatlay + ONE detail/lifestyle shot  
✓ Each prompt 100-150 words
✓ Use EXACT structure: [SHOT TYPE] of [SUBJECTS], [ARRANGEMENT], [SURFACE], [LIGHTING], [AESTHETIC], [PALETTE], [STYLE], [QUALITY]
✓ Be specific: "silver MacBook Pro 16-inch" not "laptop"
✓ Name items: "artisanal ceramic cup" not "coffee mug"
✓ Include surface texture + lighting source/direction
✓ Add: shallow depth of field, 8K quality, editorial/magazine-worthy
✓ USE THE PERSONALIZED PROPS listed above - they are specific to "${formData.business}"
✓ Combine business tools + vibe + dream client + aesthetic style

Return ONLY valid JSON (no markdown):
{
  "concepts": [
    {
      "title": "4-5 word evocative title",
      "prompt": "Complete 100-150 word prompt with exact structure using personalized props",
      "category": "flatlay"
    },
    {
      "title": "4-5 word evocative title", 
      "prompt": "Complete 100-150 word prompt with exact structure using personalized props",
      "category": "detail"
    }
  ]
}`,
    })

    let cleanedText = text.trim()
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\n/, "").replace(/\n```$/, "")
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\n/, "").replace(/\n```$/, "")
    }

    const concepts = JSON.parse(cleanedText)

    return NextResponse.json({
      success: true,
      concepts: concepts.concepts,
    })
  } catch (error) {
    console.error("[v0] Error generating concepts:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate concepts" },
      { status: 500 },
    )
  }
}
