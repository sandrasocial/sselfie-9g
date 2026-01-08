/**
 * Blueprint Pro Photoshoot Prompt Templates
 *
 * User will provide exact prompts for each category + mood combination.
 * Each prompt should be a complete Pro Photoshoot prompt that:
 * - Creates a 3x3 grid (9 frames)
 * - Maintains facial/body consistency
 * - Matches the category aesthetic (luxury, minimal, beige, warm, edgy, professional)
 * - Matches the mood aesthetic (dark_moody, light_minimalistic, beige_aesthetic)
 * - Includes setting, angles, and color grade
 *
 * Structure: {category}_{mood}
 * Example: "luxury_light_minimalistic" = Luxury category + Light & Minimalistic mood
 */

export type BlueprintCategory = "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
export type BlueprintMood = "luxury" | "minimal" | "beige" // Maps to: dark_moody, light_minimalistic, beige_aesthetic

// Map mood selection to mood name
const MOOD_MAP: Record<BlueprintMood, string> = {
  luxury: "dark_moody",
  minimal: "light_minimalistic",
  beige: "beige_aesthetic",
}

export const BLUEPRINT_PHOTOSHOOT_TEMPLATES: Record<string, string> = {
  // LUXURY category
  luxury_dark_moody: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: SoHo, New York City at dusk - mix of upscale street corners and luxury hotel lobby, all-black designer outfit (black silk slip dress with black leather jacket or black blazer with black tailored pants), black strappy heels, layered gold jewelry, designer black quilted bag, sleek hair in low bun, natural dusk lighting transitioning to interior warm lighting.
Angles include:

Close-up portrait outside luxury hotel entrance with city lights behind
Detail shot - designer bag hardware on marble hotel table with espresso cup
Full body walking on SoHo cobblestone street at dusk
Side profile in hotel lobby doorway with glass reflection
Over-shoulder viewing Manhattan street from hotel window
Detail shot - layered gold rings holding phone on black marble surface
Environmental portrait on SoHo street corner with cast iron buildings
Candid walking moment crossing street with taxi lights
Elevated perspective from hotel mezzanine looking down at lobby floor

Color grade: Dark and moody luxury influencer aesthetic with deep blacks, rich charcoals, natural dusk ambiance, warm city lights bokeh, gold jewelry highlights, desaturated with natural skin warmth, cinematic NYC Instagram grid vibe.`,

  luxury_light_minimalistic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Knightsbridge, London - mix of designer boutique exterior and minimalist café interior, elegant white outfit (white blazer with cream pants or ivory blouse with beige trousers), nude heels, delicate gold jewelry, structured designer bag in cream, sleek hair, bright natural daylight.
Angles include:

Close-up portrait outside Sloane Street boutique with bright daylight
Detail shot - iced latte on white marble café table with designer sunglasses
Full body against white boutique exterior with large windows
Side profile inside bright minimalist café by window
Over-shoulder viewing Knightsbridge street through glass
Detail shot - gold watch and rings on wrist holding phone on white table
Environmental portrait on clean London sidewalk with luxury storefronts
Candid checking phone while walking past boutique window displays
Elevated perspective from café balcony looking down at street

Color grade: Light and minimalistic luxury aesthetic with bright whites, soft creams, natural British daylight, gentle shadows, fresh sophisticated palette, airy elegance, high-end London Instagram grid vibe.`,

  luxury_beige_aesthetic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Le Marais, Paris - mix of charming cobblestone streets and upscale café terrace, camel cashmere coat over cream knit with beige wide-leg pants, nude heels, gold layered jewelry, tan leather designer bag, polished hair in loose waves, soft Parisian natural lighting.
Angles include:

Close-up portrait at outdoor café table with Parisian buildings behind
Detail shot - cappuccino on beige stone café table with croissant and fashion magazine
Full body walking on Le Marais cobblestone street
Side profile seated at café terrace holding coffee cup
Over-shoulder viewing charming Parisian street architecture
Detail shot - tan leather bag on café chair with gold watch visible
Environmental portrait on narrow Parisian street with boutiques
Candid moment looking in boutique window with bag over shoulder
Elevated perspective from apartment balcony looking down at street

Color grade: Beige luxury influencer aesthetic with rich camels, soft taupes, creamy beiges, natural Parisian daylight, gentle shadows, sophisticated neutral Instagram grid with timeless French elegance.`,

  // MINIMAL category
  minimal_dark_moody: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Kreuzberg, Berlin - mix of industrial loft interior and concrete urban courtyard, all-black minimal outfit (black turtleneck with black straight pants), black minimal leather shoes, minimal silver jewelry, sleek hair, harsh natural window and courtyard lighting.
Angles include:

Close-up portrait in concrete courtyard with dramatic side lighting
Detail shot - black coffee on concrete surface inside loft with geometric shadows
Full body against raw concrete wall in urban courtyard
Side profile inside loft by large industrial window
Over-shoulder viewing Berlin courtyard through loft window
Detail shot - minimal silver ring on hand against black fabric on concrete
Environmental portrait in industrial courtyard with exposed brick buildings
Candid still moment walking through concrete passageway
Elevated perspective from loft stairs looking down

Color grade: Dark and moody minimal aesthetic with deep blacks, concrete grays, stark natural contrast, geometric shadows, desaturated Berlin palette, editorial minimalism Instagram grid with powerful architectural presence.`,

  minimal_light_minimalistic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Nørrebro, Copenhagen - mix of white gallery space and minimalist outdoor plaza, simple white outfit (white shirt with white linen pants), white minimal shoes, no jewelry, simple natural hair, bright Scandinavian daylight.
Angles include:

Close-up portrait outside white building in Copenhagen plaza
Detail shot - white ceramic cup on white surface inside gallery café
Full body against pure white gallery exterior wall
Side profile inside bright gallery space by floor-to-ceiling window
Over-shoulder viewing Copenhagen street through gallery glass
Detail shot - clean white fabric hem and minimal white shoe detail
Environmental portrait in white minimalist plaza with modern architecture
Candid calm walking moment across white plaza stones
Elevated perspective from gallery upper level looking down

Color grade: Light and minimalistic aesthetic with pure whites, bright Scandinavian daylight, minimal shadows, clean Nordic simplicity, peaceful serenity, Copenhagen Instagram grid with absolute Nordic purity.`,

  minimal_beige_aesthetic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Vesterbro, Copenhagen - mix of minimalist home interior and quiet residential street, beige ribbed knit with beige linen pants, nude minimal shoes, no jewelry, natural simple hair, soft Nordic diffused daylight.
Angles include:

Close-up portrait on quiet Copenhagen residential street
Detail shot - beige ceramic mug on natural oak table inside home
Full body against neutral beige building exterior
Side profile inside by large window overlooking cobblestone street
Over-shoulder viewing tree-lined Copenhagen street
Detail shot - beige knit texture close-up with natural fabric drape
Environmental portrait on peaceful Vesterbro street with bicycles
Candid moment walking on sidewalk with hands in pockets
Elevated perspective from apartment window looking down at street

Color grade: Beige minimal aesthetic with soft beiges, gentle creams, natural Nordic taupes, diffused lighting, monochromatic Scandinavian warmth, hygge Instagram grid with peaceful neutral calm.`,

  // BEIGE category
  beige_dark_moody: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: West Village, New York - mix of cozy brownstone interior and tree-lined evening street, chocolate brown coat over camel turtleneck with dark taupe pants, brown leather accessories, gold jewelry, polished hair, dramatic evening window light and street lamp glow.
Angles include:

Close-up portrait on West Village brownstone steps at dusk
Detail shot - espresso on dark wood table inside brownstone with gold jewelry
Full body on cobblestone street with brownstone backdrop at twilight
Side profile inside by large brownstone window overlooking street
Over-shoulder viewing tree-lined West Village street with street lamps
Detail shot - brown leather bag on wrought iron chair with brass hardware
Environmental portrait on charming Village street with historic buildings
Candid walking moment under street lamp glow
Elevated perspective from brownstone stoop looking down at sidewalk

Color grade: Dark and moody beige aesthetic with deep chocolates, rich browns, shadowed taupes, natural twilight and warm street lamp light, dramatic contrast, cozy NYC Instagram grid with sophisticated autumn darkness.`,

  beige_light_minimalistic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Byron Bay, Australia - mix of beach café interior and coastal street, cream linen shirt with sand-colored pants, nude minimal sandals, minimal gold jewelry, natural beachy hair, bright Australian coastal daylight.
Angles include:

Close-up portrait outside beach café with coastal buildings behind
Detail shot - iced coffee on light wood table inside café with ocean view
Full body on clean white coastal street with palm trees
Side profile inside bright café by open window with sea breeze
Over-shoulder viewing Byron Bay beach street and ocean
Detail shot - natural linen fabric texture with delicate gold anklet
Environmental portrait on coastal pathway with white buildings
Candid walking moment on sunny Byron Bay main street
Elevated perspective from café deck looking down at street

Color grade: Light and minimalistic beige aesthetic with bright creams, soft ivories, pale sand tones, natural bright Australian daylight, fresh coastal neutrals, breezy Instagram grid with luminous beach elegance.`,

  beige_beige_aesthetic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Notting Hill, London - mix of pastel townhouse interior and colorful residential street, camel sweater with beige trousers, tan leather accessories, gold jewelry, natural polished hair, soft London natural lighting.
Angles include:

Close-up portrait on Notting Hill street with pastel houses behind
Detail shot - cappuccino on beige stone surface inside home with British Vogue
Full body on charming Notting Hill street with colorful doors
Side profile inside by bay window overlooking mews street
Over-shoulder viewing iconic pastel-colored townhouse row
Detail shot - cashmere texture with gold watch on windowsill with plants
Environmental portrait on quintessential Notting Hill cobblestone street
Candid contemplative moment walking past flower shop
Elevated perspective from townhouse window looking down at street

Color grade: Complete beige aesthetic with warm camels, soft taupes, gentle beiges, natural British daylight, subtle tonal variations, monochromatic London warmth, Pinterest-worthy Instagram grid with perfect British neutral harmony.`,

  // WARM category
  warm_dark_moody: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Trastevere, Rome - mix of rustic trattoria interior and narrow cobblestone alley at evening, rust oversized sweater with chocolate wide-leg pants, brown leather accessories, gold jewelry, natural hair, warm Italian evening light and ambient interior lighting.
Angles include:

Close-up portrait in Trastevere alley with warm stone buildings at dusk
Detail shot - espresso on rustic wood table inside trattoria with gold rings beside
Full body on narrow Roman cobblestone street with ivy-covered walls
Side profile inside trattoria by arched window overlooking alley
Over-shoulder viewing charming Trastevere street with hanging laundry
Detail shot - brown leather crossbody bag on wooden chair with brass details
Environmental portrait on atmospheric Roman alley with warm stone
Candid walking moment under Trastevere street lamp glow
Elevated perspective from trattoria balcony looking down at alley

Color grade: Dark and moody warm aesthetic with deep rusts, rich burgundies, chocolate browns, natural evening Italian light, dramatic shadows, warm terracotta tones, cozy Rome Instagram grid with mysterious Mediterranean warmth.`,

  warm_light_minimalistic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Omotesando, Tokyo - mix of minimalist café interior and clean modern street, ivory oversized sweater with cream wide-leg pants, nude accessories, minimal gold jewelry, natural hair, bright Tokyo natural daylight.
Angles include:

Close-up portrait on clean Omotesando street with modern architecture
Detail shot - matcha latte on white ceramic inside minimal café with wooden accents
Full body on pristine Tokyo sidewalk with zelkova trees
Side profile inside bright café by floor-to-ceiling window
Over-shoulder viewing modern Omotesando street with designer stores
Detail shot - soft knit texture with delicate gold necklace on white surface
Environmental portrait on architectural Omotesando avenue
Candid peaceful walking moment crossing clean crosswalk
Elevated perspective from café terrace looking down at street

Color grade: Light and minimalistic warm aesthetic with soft ivories, warm whites, gentle creams, natural Tokyo daylight, fresh minimalist warmth, Japanese aesthetic Instagram grid with luminous peaceful simplicity.`,

  warm_beige_aesthetic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Gracia, Barcelona - mix of bohemian café interior and tree-lined plaza, caramel ribbed knit with sand linen pants, tan leather accessories, gold jewelry, soft natural hair, warm Barcelona afternoon light.
Angles include:

Close-up portrait at outdoor café table in Gracia plaza
Detail shot - cortado on terracotta surface inside café with pan con tomate
Full body on charming Barcelona square with Modernist buildings
Side profile inside bohemian café by vintage tiled window
Over-shoulder viewing Gracia plaza with fountain and palm trees
Detail shot - textured knit with layered gold necklaces on café table
Environmental portrait on Barcelona plaza with colorful facades
Candid relaxed moment browsing market stall
Elevated perspective from apartment balcony overlooking plaza

Color grade: Warm beige aesthetic with rich toffees, warm caramels, toasted beiges, natural golden Barcelona light, gentle warm shadows, Mediterranean tonal harmony, Spanish lifestyle Instagram grid with embracing afternoon warmth.`,

  // EDGY category
  edgy_dark_moody: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Shoreditch, London - mix of industrial café interior and gritty urban street, black leather jacket over black tee with ripped black jeans, black combat boots, silver chains, messy hair, harsh natural industrial lighting and neon signs.
Angles include:

Close-up portrait on Shoreditch street with brick wall and graffiti
Detail shot - black coffee on metal table inside industrial café with cigarette pack
Full body against raw brick warehouse wall on street
Side profile inside gritty café by steel-framed window
Over-shoulder viewing Shoreditch street with neon signs and street art
Detail shot - silver chain necklace and leather jacket texture with studs
Environmental portrait on edgy London street with vintage shops
Candid powerful walking moment under railway bridge
Elevated perspective from fire escape looking down at alley

Color grade: Dark and moody edgy aesthetic with deep blacks, harsh contrasts, industrial tones, dramatic shadows, desaturated with neon accents, gritty urban texture, underground London Instagram grid with rebellious raw presence.`,

  edgy_light_minimalistic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Gangnam, Seoul - mix of white minimalist café and ultra-modern street, white oversized shirt with black leather pants, white platform sneakers, minimal silver jewelry, sleek straight hair, bright Seoul daylight.
Angles include:

Close-up portrait on clean Gangnam street with glass skyscrapers
Detail shot - black iced americano on white table inside minimal café
Full body against pure white modern building exterior
Side profile inside bright café by geometric window
Over-shoulder viewing futuristic Seoul street with LED screens
Detail shot - white platform sneaker sole with black leather pants hem
Environmental portrait on pristine Gangnam sidewalk with modern architecture
Candid confident walking moment on zebra crossing
Elevated perspective from café glass bridge looking down

Color grade: Light and minimalistic edgy aesthetic with bright whites, clean blacks, stark contrast, sharp natural shadows, modern Korean minimalism, K-fashion Instagram grid with clean bold futuristic edge.`,

  edgy_beige_aesthetic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Williamsburg, Brooklyn - mix of raw café interior and industrial street, oversized tan utility jacket with beige cargo pants, tan combat boots, minimal leather accessories, natural undone hair, natural Brooklyn daylight.
Angles include:

Close-up portrait on Williamsburg street with converted warehouse behind
Detail shot - cold brew coffee on reclaimed wood inside raw café
Full body on Brooklyn industrial street with exposed brick
Side profile inside café by large factory window
Over-shoulder viewing Williamsburg street with water towers
Detail shot - tan combat boot laces and cargo pocket hardware
Environmental portrait on urban Brooklyn street with graffiti murals
Candid composed walking moment past vintage shop fronts
Elevated perspective from rooftop café looking down at street

Color grade: Beige edgy aesthetic with neutral tans, soft beiges, urban earth tones, natural Brooklyn shadows, raw industrial texture, soft grunge aesthetic, Williamsburg Instagram grid with muted cool Brooklyn edge.`,

  // PROFESSIONAL category
  professional_dark_moody: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Financial District, Singapore - mix of corporate office interior and Marina Bay evening street, black power blazer with black tailored pants, black pointed pumps, minimal gold jewelry and watch, sleek professional hair, dramatic evening natural light and city glow.
Angles include:

Close-up portrait on Singapore downtown street at dusk with skyscrapers
Detail shot - MacBook and black coffee on glass desk inside office with gold watch
Full body on modern Singapore sidewalk with corporate buildings
Side profile inside executive office by floor-to-ceiling window
Over-shoulder viewing Marina Bay skyline and financial towers
Detail shot - black leather portfolio with gold pen and iPhone on marble
Environmental portrait on sleek Singapore street with modern architecture
Candid authoritative walking moment exiting luxury office building
Elevated perspective from office level looking down at plaza

Color grade: Dark and moody professional aesthetic with deep blacks, corporate glass reflections, natural evening light with city glow, dramatic contrast, polished sophistication, CEO Singapore Instagram grid with commanding presence.`,

  professional_light_minimalistic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Zurich Financial District, Switzerland - mix of modern office interior and clean city street, white tailored blazer with white pants, nude pumps, minimal gold jewelry, sleek polished hair, bright Swiss natural daylight.
Angles include:

Close-up portrait on pristine Zurich street with modern banks behind
Detail shot - white coffee cup on minimalist desk with gold Apple Watch
Full body on clean Zurich sidewalk with contemporary architecture
Side profile inside bright modern office by window
Over-shoulder viewing Zurich financial district and lake
Detail shot - gold pen on white notebook with minimal gold jewelry
Environmental portrait on Swiss street with clean geometric buildings
Candid composed walking moment crossing spotless crosswalk
Elevated perspective from office terrace looking down at street

Color grade: Light and minimalistic professional aesthetic with bright whites, clean Swiss neutrals, natural alpine daylight, minimal shadows, fresh precision, modern Swiss sophistication, LinkedIn-worthy Instagram grid with polished European elegance.`,

  professional_beige_aesthetic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
Setting: Mayfair, London - mix of sophisticated office interior and elegant city street, camel blazer with cream blouse and beige trousers, nude pumps, gold jewelry and watch, polished professional hair, natural London daylight.
Angles include:

Close-up portrait on Mayfair street with Georgian architecture behind
Detail shot - cappuccino on leather desk pad inside office with Financial Times
Full body on elegant London street with luxury office buildings
Side profile inside sophisticated office by tall sash window
Over-shoulder viewing Mayfair street with black cabs and red buses
Detail shot - tan leather Mulberry bag with gold Cartier watch on wrist
Environmental portrait on prestigious Mayfair street with private clubs
Candid professional walking moment past Savile Row tailors
Elevated perspective from Georgian townhouse office looking down

Color grade: Beige professional aesthetic with warm camels, soft beiges, neutral British tans, natural London daylight, gentle shadows, sophisticated British warmth, executive elegance, classic London Instagram grid with refined professional authority.`,
}

/**
 * Get Pro Photoshoot prompt for category + mood combination
 * @param category - Category from formData.vibe (luxury, minimal, beige, warm, edgy, professional)
 * @param mood - Mood from selectedFeedStyle (luxury=dark_moody, minimal=light_minimalistic, beige=beige_aesthetic)
 */
export function getBlueprintPhotoshootPrompt(category: BlueprintCategory, mood: BlueprintMood): string {
  const moodName = MOOD_MAP[mood]
  const promptKey = `${category}_${moodName}`
  const prompt = BLUEPRINT_PHOTOSHOOT_TEMPLATES[promptKey]

  if (!prompt || prompt === `[USER WILL PROVIDE EXACT PROMPT]`) {
    throw new Error(
      `Prompt template not provided for combination: ${category} + ${moodName} (key: ${promptKey}). Please add the prompt to BLUEPRINT_PHOTOSHOOT_TEMPLATES.`,
    )
  }

  return prompt
}
