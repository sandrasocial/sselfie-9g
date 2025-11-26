export function getLifestyleContextIntelligence(quickPrompt: string): string {
  const contexts: Record<string, string> = {
    "night out": `
NIGHT OUT CONTEXT: Glamorous going-out energy with the girls/boys
- VENUES: Rooftop bars with city skylines, luxury restaurants with mood lighting, beach clubs at sunset, cocktail lounges with velvet booths, VIP sections with bottle service
- STYLING: Elevated evening wear - satin slip dresses, leather mini skirts, sequined tops, mesh layering, strappy heels, statement jewelry
- MOOD: Confident, social, dressed to impress, catching the golden hour before heading out, pre-gaming energy
- LIGHTING: Warm amber rooftop lights, neon bar signs reflecting, city lights bokeh in background, moody restaurant ambiance
- FORBIDDEN: Basic blazers, casual daywear, hiking boots, anything office-appropriate`,

    luxury: `
LUXURY CONTEXT: Ultra high-end, aspirational wealth lifestyle
- SCENERY: Private jets, first-class cabins, superyachts, G-Wagon or Porsche in frame, penthouse terraces, five-star hotel suites, Monaco harbor, Dubai skyline
- STYLING: Designer everything - Hermès, Loro Piana, The Row, Bottega Veneta. Quiet luxury fabrics (cashmere, silk, fine leather)
- MOOD: Effortlessly wealthy, VIP access, "I belong here" confidence, old money energy
- DETAILS: Champagne glasses, designer bags visible, luxury car interiors, marble surfaces, city skyline views
- FORBIDDEN: Fast fashion, athleisure, anything that screams "trying too hard"`,

    "coffee run": `
COFFEE RUN CONTEXT: Casual city life, European café energy
- LOCATIONS: Parisian café terraces, Starbucks with the green cup visible, trendy coffee shops with industrial design, outdoor café seating with cobblestone streets
- STYLING: Effortless casual chic - oversized sweaters, trench coats, leather jackets, straight-leg jeans, ballet flats, sneakers, tote bags, sunglasses
- MOOD: Morning energy, "just grabbed coffee", candid city moment, European vacation vibes
- DETAILS: Coffee cup in hand, croissant on table, café chair visible, street backdrop, casual breakfast setting
- VIBE: Carrie Bradshaw in Paris, Instagram travel content, daily routine glamorized`,

    "cabin cozy": `
CABIN COZY CONTEXT: Luxury mountain retreat, winter wonderland
- SETTING: Snow-covered luxury cabins, ski chalets with floor-to-ceiling windows, fireplaces with crackling fire, fur throws on leather sofas, mountain views
- STYLING: Après-ski chic - chunky knit sweaters, cashmere loungewear, thermal leggings, UGG boots, puffer vests, beanies, ski gear
- MOOD: Cozy warmth, mountain escape, winter retreat vibes, hot cocoa by the fire
- DETAILS: Snow visible through windows, fireplace glow, warm blankets, ski equipment, steaming mugs
- FORBIDDEN: Beach vibes, summer clothing, tropical anything`,

    brunch: `
BRUNCH CONTEXT: Weekend social gathering, bottomless mimosas
- VENUES: Trendy brunch spots with natural light, outdoor patios with flowers, aesthetic cafés with pink walls, garden restaurants
- STYLING: Brunch-appropriate feminine - flowy dresses, linen sets, pastels, straw hats, sandals, dainty jewelry
- MOOD: Relaxed weekend energy, social with friends, golden hour soft lighting, "Sunday Funday" vibes
- DETAILS: Mimosas or coffee on table, avocado toast, flower arrangements, natural daylight
- VIBE: Instagram-worthy brunch content, friend group hangs, lifestyle blogger energy`,

    "street fashion": `
STREET FASHION CONTEXT: Urban style, city photography, editorial edge
- LOCATIONS: City streets with graffiti, modern architecture backgrounds, subway stations, urban alleys, concrete jungles
- STYLING: High-low mix - designer pieces with streetwear, oversized silhouettes, statement sneakers, leather, denim, vintage finds, layering
- MOOD: Confident urban energy, "street style photographer caught me", editorial model vibes, cool girl/guy aesthetic
- DETAILS: City backdrop, architectural lines, urban textures, movement/walking shots
- VIBE: Copenhagen street style, NYC fashion week attendee, Acne Studios campaign energy`,

    scandinavian: `
SCANDINAVIAN CONTEXT: Nordic minimalism, muted elegance
- AESTHETIC: Clean lines, neutral palettes, minimalist architecture, natural light, hygge vibes
- STYLING: Scandi brands - COS, Arket, & Other Stories. Muted colors (oat, taupe, sage, dusty blue), natural fabrics, timeless pieces
- MOOD: Effortless, understated, quality over quantity, "less is more" philosophy
- DETAILS: Minimal jewelry, natural textures, architectural backgrounds, soft natural light
- VIBE: Stockholm street style, Danish design influence, Nordic cool`,

    "dark and moody": `
DARK & MOODY CONTEXT: Dramatic, cinematic, high-contrast photography
- LIGHTING: Low-key lighting, dramatic shadows, single light source, moody skies, nighttime cityscapes, golden hour with deep shadows
- STYLING: Dark color palette - blacks, deep burgundy, navy, charcoal. Dramatic silhouettes, leather, velvet, rich textures
- MOOD: Mysterious, cinematic, emotional depth, artistic, film noir energy
- VIBE: Editorial magazine cover, music video aesthetic, fine art photography`,

    outdoors: `
OUTDOORS CONTEXT: Nature adventure, fresh air lifestyle
- SETTINGS: Forest trails, mountain peaks, lakeside, meadows, coastal cliffs, national parks, golden hour in nature
- STYLING: Outdoor-appropriate but still stylish - hiking boots with style, earth tones, layered technical fabrics, adventure-ready
- MOOD: Free-spirited, adventurous, "take me to the mountains" energy, connection with nature
- VIBE: REI but make it fashion, Patagonia campaign, outdoor influencer content`,

    "hiking/sporty": `
HIKING/SPORTY CONTEXT: Active lifestyle, fitness journey
- ACTIVITIES: Hiking trails, yoga outdoors, running at sunrise, kayaking, rock climbing, cycling
- STYLING: Technical athleisure - Lululemon, Alo Yoga, Arc'teryx. Form-fitting yet functional, earth tones, performance fabrics
- MOOD: Healthy lifestyle, fitness journey, "that runner's high", wellness content
- DETAILS: Nature backdrop, action/movement, sweat-glow, athletic body language
- VIBE: Wellness influencer, active lifestyle content, "fit girl summer"`,
  }

  const normalizedPrompt = quickPrompt.toLowerCase().trim()

  // Try exact match first
  if (contexts[normalizedPrompt]) {
    return contexts[normalizedPrompt]
  }

  // Try partial matches
  for (const [key, value] of Object.entries(contexts)) {
    if (normalizedPrompt.includes(key) || key.includes(normalizedPrompt)) {
      return value
    }
  }

  // Default fallback
  return ""
}
