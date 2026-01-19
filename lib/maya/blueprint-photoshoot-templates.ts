/**
 * Blueprint Pro Photoshoot Prompt Templates
 *
 * 🧊 FROZEN: Legacy template library. Will be replaced with scene-as-data.
 * 
 * PHASE 6: This file is frozen. Feed Planner now uses scene-resolver.ts for scene intent.
 * These hardcoded templates are style-first (not activity-first) and will be replaced.
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
export const MOOD_MAP: Record<BlueprintMood, string> = {
  luxury: "dark_moody",
  minimal: "light_minimalistic",
  beige: "beige_aesthetic",
}

export const BLUEPRINT_PHOTOSHOOT_TEMPLATES: Record<string, string> = {
  // LUXURY category
  luxury_dark_moody: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is dark luxury editorial with all black outfits and urban sophistication. The moody city lighting creates dramatic shadows against concrete architecture. The photography feels like authentic iPhone shots with natural film grain, high contrast shadows, sophisticated and effortless.

The setting spans urban concrete structures, city streets at dusk, and luxury building lobbies. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject seated on {{LOCATION_OUTDOOR_1}} wearing {{OUTFIT_FULLBODY_1}} with {{STYLING_NOTES}}, in a relaxed confident pose. The second frame is an overhead lifestyle flatlay with coffee and {{ACCESSORY_FLATLAY_1}} arranged on {{LOCATION_INDOOR_1}}, captured in {{LIGHTING_EVENING}}. The third frame positions the subject full-body against {{LOCATION_ARCHITECTURAL_1}} wearing {{OUTFIT_FULLBODY_2}}, with a dynamic confident pose against the urban architectural background.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with hand near collarbone, soft shadow defining form. The fifth frame shows a street sign reading "ICONIC" in bold serif typography on {{LOCATION_ARCHITECTURAL_1}}, captured in {{LIGHTING_EVENING}}. The sixth frame is a close texture detail of {{OUTFIT_MIDSHOT_1}} featuring rhinestone details on a reflective dark surface.

The seventh frame shows the subject walking naturally along {{LOCATION_OUTDOOR_1}} wearing {{OUTFIT_FULLBODY_3}}, with yellow road markings visible in frame. The eighth frame is another overhead lifestyle flatlay with coffee and {{ACCESSORY_FLATLAY_1}} arranged on {{LOCATION_INDOOR_2}}, styled minimally. The ninth frame is a mirror selfie with {{OUTFIT_FULLBODY_4}}, phone visible in hand, captured in {{LOCATION_INDOOR_3}}.

The color grade features deep blacks, cool grays, concrete tones, with warm skin tones preserved and gold jewelry highlights. The images have dramatic shadows, authentic iPhone grain, moody candid lighting, and high contrast.`,

  luxury_light_minimalistic: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is bright luxury minimalist with white and cream tailored pieces and airy elegance. Bright natural daylight fills clean white interiors with sophisticated simplicity. The photography feels like authentic iPhone shots with soft lighting, minimal shadows, and effortless polish.

The setting spans bright white penthouse interiors, luxury hotel lobbies with natural light, and clean modern architecture. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject standing in {{LOCATION_INDOOR_1}} wearing {{OUTFIT_FULLBODY_1}}, hand in pocket, captured in {{LIGHTING_BRIGHT}}. The second frame is an overhead lifestyle flatlay with latte and {{ACCESSORY_FLATLAY_1}} arranged on {{LOCATION_INDOOR_2}}, captured in {{LIGHTING_BRIGHT}}. The third frame positions the subject full-body in {{LOCATION_ARCHITECTURAL_1}} wearing {{OUTFIT_FULLBODY_2}}, against an architectural white background.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with minimal styling and soft focus. The fifth frame shows a minimalist sign reading "RELAX" in elegant thin serif typography on {{LOCATION_ARCHITECTURAL_1}}, captured in {{LIGHTING_BRIGHT}}. The sixth frame is an extreme close-up of {{OUTFIT_MIDSHOT_1}} fabric texture revealing luxurious material detail.

The seventh frame shows the subject walking through {{LOCATION_INDOOR_3}} wearing {{OUTFIT_FULLBODY_3}}, with natural stride and soft shadows. The eighth frame is another overhead lifestyle flatlay with coffee and curated accessories on {{LOCATION_INDOOR_2}}, captured in {{LIGHTING_BRIGHT}}. The ninth frame is a mirror selfie with {{OUTFIT_FULLBODY_4}}, phone visible in hand, captured in {{LOCATION_INDOOR_1}}.

The color grade features bright whites, soft creams, warm beiges, with gentle shadows and natural daylight. The images have minimal grain, airy and clean feel, soft focus, and high-key lighting.`,

  luxury_beige_aesthetic: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is warm beige luxury with camel, tan, and cream tailored pieces and golden hour elegance. Soft warm lighting fills beige interiors with sophisticated warmth. The photography feels like authentic iPhone shots with warm tones, soft shadows, and timeless luxury.

The setting spans beige stone architecture, warm-toned luxury apartments, golden hour city streets, and tan leather interiors. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject leaning against {{LOCATION_ARCHITECTURAL_1}} wearing {{OUTFIT_FULLBODY_1}} with {{STYLING_NOTES}}, in a relaxed elegant pose. The second frame is an overhead lifestyle flatlay with cappuccino and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}}, captured in {{LIGHTING_AMBIENT}}. The third frame shows the subject full-body walking wearing {{OUTFIT_FULLBODY_2}}, with city background and golden hour glow.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with warm skin tones, soft focus, and golden light. The fifth frame shows a vintage street sign reading "PARIS" in classic serif on {{LOCATION_ARCHITECTURAL_1}}, captured in {{LIGHTING_AMBIENT}}. The sixth frame is a texture close-up of {{OUTFIT_MIDSHOT_1}} showing luxury bag detail with buttery soft material and warm lighting.

The seventh frame shows the subject sitting on {{LOCATION_INDOOR_2}} wearing {{OUTFIT_FULLBODY_3}}, with crossed legs in a sophisticated pose. The eighth frame is another overhead lifestyle flatlay with coffee and journal on {{LOCATION_INDOOR_3}}, with soft shadows. The ninth frame is a mirror selfie with {{OUTFIT_FULLBODY_4}} and {{STYLING_NOTES}}, captured in warm bathroom lighting.

The color grade features warm beiges, camel tones, cream highlights, with golden hour warmth and soft shadows. The images have gentle grain, sophisticated warmth, and buttery soft lighting.`,

  // MINIMAL category
  minimal_dark_moody: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is dark minimal editorial with all black uniform pieces and architectural precision. Harsh geometric shadows define concrete spaces with stripped-back sophistication. The photography feels like authentic iPhone shots with high contrast, clean lines, and modern minimalism.

The setting spans concrete brutalist architecture, minimal black interiors, geometric urban spaces, and modern art galleries. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject standing against {{LOCATION_ARCHITECTURAL_1}} wearing {{OUTFIT_FULLBODY_1}}, arms at sides, with geometric shadows. The second frame is an overhead minimal lifestyle flatlay with black coffee cup on {{LOCATION_INDOOR_1}}, captured with harsh single light source and minimal composition. The third frame positions the subject full-body in {{LOCATION_INDOOR_2}} wearing {{OUTFIT_FULLBODY_2}}, with centered composition and architectural symmetry.

The fourth frame is a close-up face profile with {{OUTFIT_MIDSHOT_1}}, {{ACCESSORY_CLOSEUP_1}} visible on hand near face, with sharp shadows. The fifth frame shows a modern street sign reading "BERLIN" in bold sans-serif on {{LOCATION_ARCHITECTURAL_1}}, captured in {{LIGHTING_EVENING}}. The sixth frame is an extreme close-up of {{OUTFIT_MIDSHOT_2}} texture showing ribbed knit detail with high contrast lighting.

The seventh frame shows the subject walking through {{LOCATION_INDOOR_3}} wearing {{OUTFIT_FULLBODY_3}}, with straight-on angle and shadow play. The eighth frame is another overhead minimal lifestyle flatlay with black coffee and minimal accessories on {{LOCATION_INDOOR_2}}, with stark composition. The ninth frame is a mirror selfie with {{OUTFIT_FULLBODY_4}}, phone in hand, captured in {{LOCATION_INDOOR_1}}.

The color grade features deep blacks, charcoal grays, high contrast, with harsh geometric shadows. The images have minimal grain, modern stark aesthetic, and architectural precision.`,

  minimal_light_minimalistic: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is pure white minimal with all-white uniform pieces and Scandinavian simplicity. Bright even daylight fills white interiors with absolute minimalism. The photography feels like authentic iPhone shots with soft lighting, no shadows, and zen simplicity.

The setting spans pure white gallery spaces, Scandinavian white interiors, bright white studios, and minimal architecture. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject standing in {{LOCATION_INDOOR_1}} wearing {{OUTFIT_FULLBODY_1}}, hands relaxed, in even bright light. The second frame is an overhead minimal lifestyle flatlay with white coffee cup on {{LOCATION_INDOOR_2}}, captured with soft diffused light and pure minimalism. The third frame positions the subject full-body centered wearing {{OUTFIT_FULLBODY_2}}, against white background with symmetrical composition and clean lines.

The fourth frame is a close-up face straight-on with {{OUTFIT_MIDSHOT_1}} and {{STYLING_NOTES}}, captured in soft natural light with serene expression. The fifth frame shows a clean sign reading "STILL" in thin minimal sans-serif on {{LOCATION_ARCHITECTURAL_1}}, with subtle embossed texture. The sixth frame is an extreme close-up of {{OUTFIT_MIDSHOT_2}} fabric showing natural texture with soft even lighting.

The seventh frame shows the subject walking in {{LOCATION_INDOOR_3}} wearing {{OUTFIT_FULLBODY_3}}, with centered angle and bright daylight. The eighth frame is another overhead minimal lifestyle flatlay with white coffee cup and minimal accessories on {{LOCATION_INDOOR_2}}, with absolute simplicity. The ninth frame is a mirror reflection with {{OUTFIT_FULLBODY_4}}, white phone, captured in {{LOCATION_INDOOR_1}} with soft bright light.

The color grade features pure whites, soft grays, with no shadows and bright even lighting. The images have minimal grain, Scandinavian aesthetic, zen simplicity, and high-key exposure.`,

  minimal_beige_aesthetic: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is beige minimal with neutral beige and sand tones and understated elegance. Soft Nordic light fills beige interiors with quiet sophistication. The photography feels like authentic iPhone shots with gentle lighting, minimal styling, and calm simplicity.

The setting spans beige minimal apartments, sand-colored interiors, neutral modern spaces, and soft natural environments. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject seated on {{LOCATION_INDOOR_1}} wearing {{OUTFIT_FULLBODY_1}}, in relaxed pose with soft window light. The second frame is an overhead lifestyle flatlay with beige coffee cup arranged on {{LOCATION_INDOOR_2}}, captured in gentle natural light with minimal styling. The third frame positions the subject full-body standing wearing {{OUTFIT_FULLBODY_2}}, against beige wall background with centered composition and soft shadows.

The fourth frame is a close-up of hands holding beige cup with {{OUTFIT_MIDSHOT_1}} and {{STYLING_NOTES}}, showing warm skin tones with soft focus. The fifth frame shows a simple wooden sign reading "COZY" in natural carved typography on {{LOCATION_ARCHITECTURAL_1}}, captured in soft light. The sixth frame is a close-up of {{OUTFIT_MIDSHOT_2}} texture revealing ribbed pattern with natural fiber detail and soft lighting.

The seventh frame shows the subject walking past {{LOCATION_ARCHITECTURAL_1}} wearing {{OUTFIT_FULLBODY_3}}, with natural stride, gentle side lighting, and calm movement. The eighth frame is another overhead lifestyle flatlay with coffee and journal on neutral surface at {{LOCATION_INDOOR_3}}, captured in soft natural light from window. The ninth frame shows the subject seated by window wearing {{OUTFIT_FULLBODY_4}}, holding cup, with soft profile and warm natural light.

The color grade features warm beiges, sand tones, oatmeal neutrals, with soft shadows and gentle Nordic light. The images have minimal grain, quiet sophistication, and calm aesthetic.`,

  // BEIGE category
  beige_dark_moody: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is dark cozy beige with chocolate brown, camel, and taupe tones and evening warmth. Moody warm lighting creates autumn vibes with cozy sophistication. The photography feels like authentic iPhone shots with warm shadows, rich tones, and intimate atmosphere.

The setting spans evening city streets, warm-lit cafes, cozy apartment interiors, and autumn urban landscapes. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject sitting on {{LOCATION_OUTDOOR_1}} wearing {{OUTFIT_FULLBODY_1}}, with evening street lamps behind in a cozy pose. The second frame is an overhead lifestyle flatlay with hot chocolate and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}}, captured in warm cafe lighting. The third frame shows the subject full-body walking wearing {{OUTFIT_FULLBODY_2}}, on autumn street with fallen leaves and evening golden light.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with warm skin, soft shadow, intimate lighting, and cozy feel. The fifth frame shows a vintage sign reading "AUTUMN" in warm serif font on {{LOCATION_ARCHITECTURAL_1}}, captured in glowing evening light. The sixth frame is a close-up texture of {{OUTFIT_MIDSHOT_1}} showing luxury bag with rich material and warm moody lighting.

The seventh frame shows the subject leaning in doorway wearing {{OUTFIT_FULLBODY_3}}, with warm interior light and relaxed stance. The eighth frame is another overhead cozy lifestyle flatlay with latte and journal on {{LOCATION_INDOOR_2}}, captured in evening atmosphere. The ninth frame is a mirror selfie with {{OUTFIT_FULLBODY_4}}, phone in hand, captured in {{LOCATION_INDOOR_3}}.

The color grade features chocolate browns, warm camel, taupe shadows, with golden evening light and rich warm tones. The images have cozy grain, autumn aesthetic, and intimate moody lighting.`,

  beige_light_minimalistic: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is bright beige coastal with cream, sand, and ivory tones and beach elegance. Bright coastal daylight fills airy spaces with effortless luxury. The photography feels like authentic iPhone shots with bright natural light, soft breezy feel, and coastal sophistication.

The setting spans bright beach houses, coastal cafes, sandy beach backgrounds, and white-washed architecture. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject standing on {{LOCATION_OUTDOOR_1}} wearing {{OUTFIT_FULLBODY_1}}, with natural wind in hair, bright daylight, and ocean background. The second frame is an overhead lifestyle flatlay with iced latte and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}}, captured in bright natural light with coastal vibe. The third frame shows the subject full-body walking wearing {{OUTFIT_FULLBODY_2}}, on beach path with breezy movement and soft shadows.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with sun-kissed skin, soft focus, and bright light. The fifth frame shows a beach sign reading "PARADISE" in weathered white paint on {{LOCATION_ARCHITECTURAL_1}}, captured in bright coastal light. The sixth frame is a close-up of {{OUTFIT_MIDSHOT_1}} fabric showing natural texture blowing in breeze with bright sunlight.

The seventh frame shows the subject sitting on {{LOCATION_OUTDOOR_1}} wearing {{OUTFIT_FULLBODY_3}}, in relaxed pose with coastal architecture. The eighth frame is another overhead bright lifestyle flatlay with iced coffee and minimal accessories on {{LOCATION_INDOOR_2}}, captured in natural light. The ninth frame is a doorway moment with {{OUTFIT_FULLBODY_4}}, leaning in white doorframe, with bright airy interior.

The color grade features bright creams, sand tones, ivory highlights, with coastal natural light and soft breezy shadows. The images have gentle grain, beach aesthetic, and airy sophistication.`,

  beige_beige_aesthetic: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is classic beige with camel, tan, and cream tones and timeless elegance. Soft natural light fills neutral spaces with understated luxury. The photography feels like authentic iPhone shots with warm neutral tones, gentle shadows, and editorial sophistication.

The setting spans beige townhouses, neutral modern apartments, classic cafes, and European architecture. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject leaning against {{LOCATION_ARCHITECTURAL_1}} wearing {{OUTFIT_FULLBODY_1}} with {{STYLING_NOTES}}, in a relaxed sophisticated pose. The second frame is an overhead lifestyle flatlay with cappuccino and {{ACCESSORY_FLATLAY_1}} arranged on {{LOCATION_INDOOR_1}}, captured in soft natural window light. The third frame positions the subject full-body in {{LOCATION_INDOOR_2}} wearing {{OUTFIT_FULLBODY_2}}, walking naturally with soft shadows.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with warm tones, soft focus, and gentle lighting. The fifth frame shows a classic sign reading "ELEGANCE" in timeless serif typography on {{LOCATION_ARCHITECTURAL_1}}, captured in soft afternoon light. The sixth frame is a close-up texture of {{OUTFIT_MIDSHOT_1}} revealing luxury knit detail with soft warm lighting.

The seventh frame shows the subject seated on {{LOCATION_INDOOR_3}} wearing {{OUTFIT_FULLBODY_3}}, with crossed legs in editorial pose and natural light. The eighth frame is another overhead neutral lifestyle flatlay with coffee and journal on minimal surface at {{LOCATION_INDOOR_2}}, captured in soft daylight. The ninth frame is a mirror selfie with {{OUTFIT_FULLBODY_4}} and {{STYLING_NOTES}}, phone visible in hand, captured in warm neutral bathroom.

The color grade features warm camels, soft tans, cream highlights, with natural neutral light and gentle shadows. The images have subtle grain, timeless aesthetic, and editorial sophistication.`,

  // WARM category
  warm_dark_moody: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is warm moody with rust, burgundy, and chocolate brown tones and evening richness. Warm Italian lighting fills intimate spaces with romantic atmosphere. The photography feels like authentic iPhone shots with glowing warm tones, rich shadows, and cozy drama.

The setting spans evening Italian streets, warm-lit trattorias, cozy wine bars, and sunset architecture. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject sitting at {{LOCATION_INDOOR_1}} wearing {{OUTFIT_FULLBODY_1}}, with wine glass in warm evening glow. The second frame is an overhead lifestyle flatlay with red wine and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}}, captured in candlelit atmosphere. The third frame shows the subject full-body walking wearing {{OUTFIT_FULLBODY_2}}, on Italian street with sunset warm light.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with warm intimate lighting, romantic glow, and soft shadows. The fifth frame shows a romantic sign reading "AMORE" in script font on {{LOCATION_ARCHITECTURAL_1}}, captured in warm evening light. The sixth frame is a close-up texture of {{OUTFIT_MIDSHOT_1}} showing rich fabric detail with warm glowing lighting.

The seventh frame shows the subject leaning in doorway wearing {{OUTFIT_FULLBODY_3}}, with warm interior light spilling out in romantic stance. The eighth frame is another overhead cozy evening setup with wine, journal, and {{LOCATION_INDOOR_3}}, captured in warm candlelight on wood table. The ninth frame is a window reflection with {{OUTFIT_FULLBODY_4}}, holding wine glass, with golden hour through window and warm glow.

The color grade features rich rusts, deep burgundy, chocolate browns, with golden evening light and warm romantic shadows. The images have cozy grain, Italian aesthetic, and intimate atmosphere.`,

  warm_light_minimalistic: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is bright warm minimal with ivory, cream, and white tones and warm sunlight. Bright Japanese daylight fills clean spaces with zen warmth. The photography feels like authentic iPhone shots with bright natural light, minimal styling, and warm simplicity.

The setting spans bright Tokyo apartments, minimal Japanese interiors, sunny modern spaces, and clean architecture. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject standing in {{LOCATION_INDOOR_1}} wearing {{OUTFIT_FULLBODY_1}}, in natural pose with warm sunlight streaming. The second frame is an overhead zen lifestyle flatlay with green tea and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}}, captured in bright natural light. The third frame positions the subject full-body centered wearing {{OUTFIT_FULLBODY_2}}, against white background with warm sunlit and clean composition.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with warm skin, soft focus, and bright gentle light. The fifth frame shows a minimal sign with Japanese character "和" (harmony) in simple black on white, with soft shadow. The sixth frame is a close-up texture of {{OUTFIT_MIDSHOT_1}} fabric showing natural cotton with warm bright lighting.

The seventh frame shows the subject walking in {{LOCATION_INDOOR_3}} wearing {{OUTFIT_FULLBODY_3}}, with warm sunlight, clean minimal space, and peaceful movement. The eighth frame is another overhead zen lifestyle flatlay with matcha tea and minimal accessories on {{LOCATION_INDOOR_2}}, captured in warm daylight flooding in. The ninth frame is a window seat moment with {{OUTFIT_FULLBODY_4}}, sitting peacefully, with warm natural light and zen atmosphere.

The color grade features warm ivories, soft creams, bright whites, with warm natural daylight and minimal shadows. The images have gentle grain, Japanese aesthetic, and zen simplicity.`,

  warm_beige_aesthetic: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is warm beige lifestyle with caramel, sand, and toffee tones and golden afternoon glow. Warm Barcelona light fills cozy cafes with Mediterranean warmth. The photography feels like authentic iPhone shots with golden tones, soft warmth, and lifestyle elegance.

The setting spans Barcelona cafes, warm Mediterranean streets, golden hour terraces, and sunny architecture. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject sitting on {{LOCATION_OUTDOOR_1}} wearing {{OUTFIT_FULLBODY_1}}, with coffee cup in golden afternoon Barcelona light. The second frame is an overhead warm lifestyle flatlay with cortado and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}}, captured in warm natural light. The third frame shows the subject full-body walking wearing {{OUTFIT_FULLBODY_2}}, on Mediterranean street with warm golden hour glow and natural stride.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with sun-kissed skin, warm focus, and golden light. The fifth frame shows a vintage sign reading "BARCELONA" in warm serif on {{LOCATION_ARCHITECTURAL_1}}, captured in golden afternoon light. The sixth frame is a close-up texture of {{OUTFIT_MIDSHOT_1}} showing warm fabric detail with golden lighting.

The seventh frame shows the subject leaning on {{LOCATION_ARCHITECTURAL_1}} wearing {{OUTFIT_FULLBODY_3}}, in relaxed pose with Mediterranean architecture and golden glow. The eighth frame is another overhead warm lifestyle flatlay with coffee and journal on {{LOCATION_INDOOR_2}}, captured in golden afternoon light. The ninth frame is a balcony moment with {{OUTFIT_FULLBODY_4}}, holding coffee, with warm sunset light and Mediterranean view.

The color grade features warm caramels, golden sands, toffee highlights, with Mediterranean golden light and warm shadows. The images have gentle grain, Barcelona aesthetic, and lifestyle warmth.`,

  // EDGY category
  edgy_dark_moody: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is dark edgy urban with all black leather, denim, and grunge and industrial edge. Harsh urban lighting creates neon accents with underground nightlife feel. The photography feels like authentic iPhone shots with high contrast, gritty grain, and rebellious attitude.

The setting spans industrial London streets, underground venues, graffiti walls, neon-lit alleys, and urban nightlife. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject leaning on {{LOCATION_ARCHITECTURAL_1}} wearing {{OUTFIT_FULLBODY_1}} with {{STYLING_NOTES}}, in an edgy pose. The second frame is an overhead edgy lifestyle flatlay with black coffee and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}}, captured in harsh industrial light with neon glow. The third frame positions the subject full-body in {{LOCATION_OUTDOOR_1}} wearing {{OUTFIT_FULLBODY_2}}, walking confidently with urban neon background.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with multiple chains, industrial lighting, and gritty detail. The fifth frame shows a neon sign reading "REBEL" in bold sans-serif with red neon glow on {{LOCATION_ARCHITECTURAL_1}}, captured at nighttime. The sixth frame is a close-up texture of {{OUTFIT_MIDSHOT_1}} showing worn leather detail with harsh side lighting.

The seventh frame shows the subject sitting on {{LOCATION_OUTDOOR_1}} wearing {{OUTFIT_FULLBODY_3}} with {{STYLING_NOTES}}, at underground venue in moody atmosphere. The eighth frame is another overhead edgy lifestyle flatlay with black coffee and accessories on {{LOCATION_INDOOR_2}}, captured in harsh light. The ninth frame is a mirror selfie in {{LOCATION_INDOOR_3}} with {{OUTFIT_FULLBODY_4}}, phone in hand, captured in harsh fluorescent.

The color grade features deep blacks, cool grays, neon accents (red/blue), with harsh contrast. The images have heavy grain, industrial aesthetic, gritty urban feel, and rebellious mood.`,

  edgy_light_minimalistic: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is bright edgy modern with white-black contrast and streetwear edge. Bright Seoul daylight fills clean urban spaces with modern street style. The photography feels like authentic iPhone shots with bright light, clean contrast, and contemporary cool.

The setting spans modern Seoul streets, bright subway stations, contemporary architecture, and clean urban spaces. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject standing in {{LOCATION_INDOOR_1}} wearing {{OUTFIT_FULLBODY_1}}, against clean modern background. The second frame is an overhead clean lifestyle flatlay with iced americano and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}}, captured in bright daylight with minimal styling. The third frame shows the subject full-body walking wearing {{OUTFIT_FULLBODY_2}}, on bright Seoul street with natural stride and contemporary cool.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with clean styling, bright focus, and modern simplicity. The fifth frame shows a modern sign with Korean text "서울" (Seoul) in bold sans-serif on {{LOCATION_ARCHITECTURAL_1}}, captured in bright clean light. The sixth frame is a close-up texture of {{OUTFIT_MIDSHOT_1}} showing oversized shirt detail with bright clean lighting.

The seventh frame shows the subject sitting on {{LOCATION_OUTDOOR_1}} wearing {{OUTFIT_FULLBODY_3}}, in relaxed cool pose. The eighth frame is another overhead clean lifestyle flatlay with iced coffee and minimal accessories on {{LOCATION_INDOOR_3}}, captured in bright daylight with clean aesthetic. The ninth frame is a glass reflection with {{OUTFIT_FULLBODY_4}}, against modern building, with bright daylight and contemporary styling.

The color grade features bright whites, deep blacks, clean contrast, with bright Seoul daylight and minimal shadows. The images have contemporary grain, modern aesthetic, and street style cool.`,

  edgy_beige_aesthetic: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is urban beige edgy with tan utility wear and street edge. Natural Brooklyn shadows define industrial beige spaces with urban workwear cool. The photography feels like authentic iPhone shots with natural shadows, neutral tones, and street sophistication.

The setting spans Brooklyn industrial areas, neutral urban spaces, vintage warehouses, and concrete and metal environments. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject leaning on {{LOCATION_ARCHITECTURAL_1}} wearing {{OUTFIT_FULLBODY_1}}, on Brooklyn street with casual edge. The second frame is an overhead industrial lifestyle flatlay with black coffee and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}}, captured in natural urban shadows. The third frame shows the subject full-body walking wearing {{OUTFIT_FULLBODY_2}}, with industrial background, natural stride, and urban cool.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with neutral tones, natural light, and street detail. The fifth frame shows a vintage sign reading "BK" in industrial stencil font on {{LOCATION_ARCHITECTURAL_1}}, captured in natural shadows. The sixth frame is a close-up texture of {{OUTFIT_MIDSHOT_1}} showing utility jacket detail with natural lighting.

The seventh frame shows the subject sitting on {{LOCATION_OUTDOOR_1}} wearing {{OUTFIT_FULLBODY_3}}, in relaxed pose at warehouse setting with urban edge. The eighth frame is another overhead industrial lifestyle flatlay with coffee and journal on metal surface at {{LOCATION_INDOOR_2}}, captured in natural window light. The ninth frame is a mirror in warehouse with {{OUTFIT_FULLBODY_4}}, phone in hand, captured in {{LOCATION_INDOOR_3}} with natural shadows.

The color grade features neutral tans, concrete grays, warm beiges, with natural urban shadows. The images have subtle grain, Brooklyn aesthetic, industrial cool, and street sophistication.`,

  // PROFESSIONAL category
  professional_dark_moody: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is dark corporate power with all black suiting and executive presence. Dramatic evening city glow illuminates modern offices with CEO energy. The photography feels like authentic iPhone shots with dramatic lighting, high contrast, and sophisticated power.

The setting spans Singapore financial district at night, luxury offices, corporate towers, and modern architecture. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject standing in {{LOCATION_INDOOR_1}} wearing {{OUTFIT_FULLBODY_1}}, with arms crossed, city lights behind, in executive stance. The second frame is an overhead workspace flatlay with espresso and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}}, captured with dramatic desk lamp and corporate luxury. The third frame shows the subject full-body walking wearing {{OUTFIT_FULLBODY_2}}, on city street with evening city glow.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with power detail, dramatic lighting, and sophistication. The fifth frame shows a modern sign reading "CEO" in bold minimalist font on {{LOCATION_ARCHITECTURAL_1}}, captured with dramatic city reflection. The sixth frame is a close-up texture of {{OUTFIT_MIDSHOT_1}} fabric showing luxury tailoring detail with dramatic lighting.

The seventh frame shows the subject leaning on {{LOCATION_ARCHITECTURAL_1}} wearing {{OUTFIT_FULLBODY_3}}, with city skyline behind, evening lights, and power pose. The eighth frame is another overhead executive desk with laptop, espresso, black leather journal, and {{LOCATION_INDOOR_3}}, captured in evening workspace. The ninth frame is an elevator mirror with {{OUTFIT_FULLBODY_4}}, holding briefcase, with phone reflection and modern interior.

The color grade features deep blacks, charcoal grays, gold accents, with dramatic city lights and high contrast. The images have executive grain, Singapore aesthetic, and corporate power.`,

  professional_light_minimalistic: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is bright professional elegant with white suiting and fresh sophistication. Bright Swiss daylight fills modern offices with refined elegance. The photography feels like authentic iPhone shots with bright natural light, clean professionalism, and contemporary polish.

The setting spans Zurich modern offices, bright financial district, clean contemporary architecture, and natural light spaces. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject standing in {{LOCATION_INDOOR_1}} wearing {{OUTFIT_FULLBODY_1}}, in professional stance with floor-to-ceiling windows. The second frame is an overhead workspace flatlay with green tea and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}}, captured in bright natural daylight with minimal elegance. The third frame shows the subject full-body walking in {{LOCATION_INDOOR_3}} wearing {{OUTFIT_FULLBODY_2}}, with confident stride, bright modern space, and clean lines.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with professional detail, bright focus, and refined look. The fifth frame shows a modern sign reading "EXCELLENCE" in elegant thin serif on {{LOCATION_ARCHITECTURAL_1}}, captured in soft natural light. The sixth frame is a close-up texture of {{OUTFIT_MIDSHOT_1}} showing tailored detail with bright natural lighting.

The seventh frame shows the subject sitting in modern chair wearing {{OUTFIT_FULLBODY_3}}, with crossed legs, bright office, and professional elegant pose. The eighth frame is another overhead bright workspace with laptop, tea, white desk, and {{LOCATION_INDOOR_2}}, captured in bright daylight with contemporary minimal aesthetic. The ninth frame is a glass door reflection with {{OUTFIT_FULLBODY_4}}, against modern office, with bright natural light and professional elegance.

The color grade features bright whites, soft creams, gentle shadows, with natural Swiss daylight. The images have minimal grain, professional polish, contemporary elegance, and refined aesthetic.`,

  professional_beige_aesthetic: `A 3x3 grid of nine distinct Instagram-style photos with clean symmetrical layout and subtle frame separation. Each frame shows a different camera angle and composition, maintaining natural poses and authentic lighting throughout.

The aesthetic is classic professional beige with camel and beige suiting and timeless sophistication. Natural London daylight fills traditional offices with established elegance. The photography feels like authentic iPhone shots with natural warm light, classic professionalism, and timeless quality.

The setting spans Mayfair London offices, classic architecture, traditional business districts, and natural light interiors. The outfits feature {{COLOR_PALETTE}} with {{TEXTURE_NOTES}}.

The first frame shows the subject standing by window wearing {{OUTFIT_FULLBODY_1}}, in professional pose with natural London daylight. The second frame is an overhead workspace flatlay with coffee and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}}, captured in warm natural light with classic elegance. The third frame positions the subject full-body in {{LOCATION_INDOOR_2}} wearing {{OUTFIT_FULLBODY_2}}, walking naturally with soft shadows.

The fourth frame is a close-up of {{ACCESSORY_CLOSEUP_1}} with professional details, warm light, and classic sophistication. The fifth frame shows a traditional sign reading "MAYFAIR" in classic serif on {{LOCATION_ARCHITECTURAL_1}}, captured in natural afternoon light. The sixth frame is a close-up texture of {{OUTFIT_MIDSHOT_1}} showing luxury tailoring with warm natural lighting.

The seventh frame shows the subject sitting at traditional desk wearing {{OUTFIT_FULLBODY_3}}, in leather chair with professional working pose and natural light. The eighth frame is another overhead classic workspace with coffee, leather journal, wood desk, and {{LOCATION_INDOOR_3}}, captured in warm daylight from window. The ninth frame is a traditional mirror with {{OUTFIT_FULLBODY_4}} and {{STYLING_NOTES}}, captured in warm natural bathroom light.

The color grade features warm camels, classic beiges, cream highlights, with natural London daylight and soft shadows. The images have timeless grain, Mayfair aesthetic, and established elegance.`,
}

/**
 * Build natural language feed preview prompt (Nano Banana Pro best practices)
 * 
 * SEMANTIC AUTHORITY ENFORCEMENT:
 * - Subject identity defaults to lifestyle unless category === "professional"
 * - Business semantics only allowed when category === "professional"
 * - Natural language, subject-first, identity-anchored to reference images
 * - No imperative commands, template headers, or scene numbering
 * 
 * @param category - Category (luxury, minimal, beige, warm, edgy, professional)
 * @param mood - Mood (luxury=dark_moody, minimal=light_minimalistic, beige=beige_aesthetic)
 * @param templatePrompt - Raw template with placeholders
 * @returns Natural language prompt ready for injection
 */
/**
 * Build natural language feed preview prompt (Nano Banana Pro best practices)
 * 
 * SEMANTIC AUTHORITY ENFORCEMENT:
 * - Subject identity defaults to lifestyle unless category === "professional"
 * - Business semantics only allowed when category === "professional"
 * - Natural language, subject-first, identity-anchored to reference images
 * - No imperative commands, template headers, or scene numbering
 */
async function buildNaturalLanguagePrompt(
  category: BlueprintCategory,
  mood: BlueprintMood,
  templatePrompt: string
): Promise<string> {
  // Resolve subject role using semantic authority (async import for compatibility)
  const { resolveSubjectRole, getSubjectIdentityDescriptor } = await import('@/lib/semantic/resolve-subject-role')
  const subjectRole = resolveSubjectRole(category)
  
  // Extract components from template (they're already in natural language format)
  // The template is now structured as natural prose, so we just need to ensure
  // identity anchor is at the start
  const parts: string[] = []
  
  // 1. IDENTITY ANCHOR (subject-first, reference images)
  // Use semantic authority to determine identity descriptor
  const identityDescriptor = getSubjectIdentityDescriptor(subjectRole)
  parts.push(`The subject's identity is anchored entirely to the reference images provided. Every physical characteristic—face structure, body proportions, skin tone, hair texture, and styling—must match the reference images exactly. ${identityDescriptor}`)
  
  // 2. NATURAL LANGUAGE TEMPLATE (already refactored to prose)
  parts.push(templatePrompt)
  
  return parts.join('\n\n')
}

/**
 * Get Pro Photoshoot prompt for category + mood combination
 * 
 * REFACTORED: Natural language, subject-first prompt following Nano Banana Pro best practices
 * - No imperative commands ("Create", "Generate")
 * - No template headers ("Vibe:", "Setting:", "9 frames:")
 * - No scene numbering (1-9)
 * - Subject identity anchored to reference images
 * - Scenes described as narrative prose
 * 
 * @param category - Category from formData.vibe (luxury, minimal, beige, warm, edgy, professional)
 * @param mood - Mood from selectedFeedStyle (luxury=dark_moody, minimal=light_minimalistic, beige=beige_aesthetic)
 * @param fashionStyle - Optional fashion style from user_personal_brand (for identity resolution)
 */
export async function getBlueprintPhotoshootPrompt(
  category: BlueprintCategory,
  mood: BlueprintMood,
  fashionStyle?: string | null
): Promise<string> {
  const moodName = MOOD_MAP[mood]
  const promptKey = `${category}_${moodName}`
  const templatePrompt = BLUEPRINT_PHOTOSHOOT_TEMPLATES[promptKey]

  if (!templatePrompt || templatePrompt === `[USER WILL PROVIDE EXACT PROMPT]`) {
    throw new Error(
      `Prompt template not provided for combination: ${category} + ${moodName} (key: ${promptKey}). Please add the prompt to BLUEPRINT_PHOTOSHOOT_TEMPLATES.`,
    )
  }

  // Build natural language prompt (now async)
  return await buildNaturalLanguagePrompt(category, mood, templatePrompt)
}
