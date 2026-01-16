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
export const MOOD_MAP: Record<BlueprintMood, string> = {
  luxury: "dark_moody",
  minimal: "light_minimalistic",
  beige: "beige_aesthetic",
}

export const BLUEPRINT_PHOTOSHOOT_TEMPLATES: Record<string, string> = {
  // LUXURY category
  luxury_dark_moody: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Dark luxury editorial aesthetic. All black outfits with urban edge. Moody city lighting, concrete architecture, professional spaces. iPhone photography style with natural film grain, high contrast shadows, sophisticated and effortless.

Setting: Urban concrete structures, modern office interiors, city streets at dusk, luxury building lobbies

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Sitting on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_1}}, {{STYLING_NOTES}}, relaxed pose
2. Coffee and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}} - overhead flatlay, {{LIGHTING_EVENING}}
3. Full-body against {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_2}}, dynamic pose, urban background

4. Close-up {{ACCESSORY_CLOSEUP_1}} - hand touching collarbone, soft shadow
5. Street sign reading "ICONIC" in bold serif font on {{LOCATION_ARCHITECTURAL_1}}, {{LIGHTING_EVENING}}
6. {{OUTFIT_MIDSHOT_1}} with rhinestone details - close texture shot on reflective dark surface

7. Walking naturally on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_3}}, yellow road markings visible
8. Working at laptop with coffee - overhead view, hands typing, {{LOCATION_INDOOR_2}}
9. Mirror selfie - {{OUTFIT_FULLBODY_4}}, phone in hand, {{LOCATION_INDOOR_3}}

Color grade: Deep blacks, cool grays, concrete tones, warm skin preserved, gold jewelry highlights, dramatic shadows, iPhone grain, moody candid lighting, high contrast.`,

  luxury_light_minimalistic: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Bright luxury minimalist aesthetic. White and cream tailored pieces with airy elegance. Bright natural daylight, clean white interiors, sophisticated simplicity. iPhone photography style with soft lighting, minimal shadows, effortless polish.

Setting: Bright white penthouse interiors, luxury hotel lobbies with natural light, clean modern architecture

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, hand in pocket, {{LIGHTING_BRIGHT}}
2. Latte and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}} - overhead flatlay, {{LIGHTING_BRIGHT}}
3. Full-body in {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_2}}, architectural white background

4. Close-up of {{ACCESSORY_CLOSEUP_1}} - minimal styling, soft focus
5. Minimalist sign reading "RELAX" in elegant thin serif on {{LOCATION_ARCHITECTURAL_1}}, {{LIGHTING_BRIGHT}}
6. {{OUTFIT_MIDSHOT_1}} fabric texture - extreme close-up, luxurious material detail

7. Walking in {{LOCATION_INDOOR_3}} - {{OUTFIT_FULLBODY_3}}, natural stride, soft shadows
8. {{LOCATION_INDOOR_2}} with laptop and coffee - overhead view, minimal workspace, {{LIGHTING_BRIGHT}}
9. Mirror selfie - {{OUTFIT_FULLBODY_4}}, phone in hand, {{LOCATION_INDOOR_1}}

Color grade: Bright whites, soft creams, warm beiges, gentle shadows, natural daylight, minimal grain, airy and clean, soft focus, high-key lighting.`,

  luxury_beige_aesthetic: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Warm beige luxury aesthetic. Camel, tan, and cream tailored pieces with golden hour elegance. Soft warm lighting, beige interiors, sophisticated warmth. iPhone photography style with warm tones, soft shadows, timeless luxury.

Setting: Beige stone architecture, warm-toned luxury apartments, golden hour city streets, tan leather interiors

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Leaning against {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_1}}, {{STYLING_NOTES}}, relaxed elegant pose
2. Cappuccino and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}} - overhead flatlay, {{LIGHTING_AMBIENT}}
3. Full-body walking - {{OUTFIT_FULLBODY_2}}, city background, golden hour glow

4. Close-up {{ACCESSORY_CLOSEUP_1}} - warm skin tones, soft focus, golden light
5. Vintage street sign reading "PARIS" in classic serif on {{LOCATION_ARCHITECTURAL_1}}, {{LIGHTING_AMBIENT}}
6. {{OUTFIT_MIDSHOT_1}} texture close-up - luxury bag detail, buttery soft material, warm lighting

7. Sitting on {{LOCATION_INDOOR_2}} - {{OUTFIT_FULLBODY_3}}, crossed legs, sophisticated
8. {{LOCATION_INDOOR_3}} with coffee and notebook - overhead view, warm minimal desk, soft shadows
9. Mirror selfie - {{OUTFIT_FULLBODY_4}}, {{STYLING_NOTES}}, warm bathroom lighting

Color grade: Warm beiges, camel tones, cream highlights, golden hour warmth, soft shadows, gentle grain, sophisticated warmth, buttery soft lighting.`,

  // MINIMAL category
  minimal_dark_moody: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Dark minimal editorial aesthetic. All black uniform pieces with architectural precision. Harsh geometric shadows, concrete spaces, stripped-back sophistication. iPhone photography style with high contrast, clean lines, modern minimalism.

Setting: Concrete brutalist architecture, minimal black interiors, geometric urban spaces, modern art galleries

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Standing against {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_1}}, arms at sides, geometric shadows
2. Black coffee cup on {{LOCATION_INDOOR_1}} - overhead flatlay, harsh single light source, minimal composition
3. Full-body in {{LOCATION_INDOOR_2}} - {{OUTFIT_FULLBODY_2}}, centered composition, architectural symmetry

4. Close-up face profile - {{OUTFIT_MIDSHOT_1}}, {{ACCESSORY_CLOSEUP_1}} visible on hand near face, sharp shadows
5. Modern street sign reading "BERLIN" in bold sans-serif on {{LOCATION_ARCHITECTURAL_1}}, {{LIGHTING_EVENING}}
6. {{OUTFIT_MIDSHOT_2}} texture - extreme close-up, ribbed knit detail, high contrast lighting

7. Walking through {{LOCATION_INDOOR_3}} - {{OUTFIT_FULLBODY_3}}, straight-on angle, shadow play
8. Black laptop on {{LOCATION_INDOOR_2}} - overhead minimal workspace, single black coffee cup, stark composition
9. Mirror selfie - {{OUTFIT_FULLBODY_4}}, phone in hand, {{LOCATION_INDOOR_1}}

Color grade: Deep blacks, charcoal grays, high contrast, harsh geometric shadows, minimal grain, modern stark aesthetic, architectural precision.`,

  minimal_light_minimalistic: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Pure white minimal aesthetic. All-white uniform pieces with Scandinavian simplicity. Bright even daylight, white interiors, absolute minimalism. iPhone photography style with soft lighting, no shadows, zen simplicity.

Setting: Pure white gallery spaces, Scandinavian white interiors, bright white studios, minimal architecture

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, hands relaxed, even bright light
2. White coffee cup on {{LOCATION_INDOOR_2}} - overhead flatlay, soft diffused light, pure minimalism
3. Full-body centered - {{OUTFIT_FULLBODY_2}}, white background, symmetrical composition, clean lines

4. Close-up face straight-on - {{OUTFIT_MIDSHOT_1}}, {{STYLING_NOTES}}, soft natural light, serene expression
5. Clean sign reading "STILL" in thin minimal sans-serif on {{LOCATION_ARCHITECTURAL_1}}, subtle embossed texture
6. {{OUTFIT_MIDSHOT_2}} fabric - extreme close-up, natural texture, soft even lighting

7. Walking in {{LOCATION_INDOOR_3}} - {{OUTFIT_FULLBODY_3}}, centered angle, bright daylight
8. {{LOCATION_INDOOR_2}} minimal - overhead view, white laptop, white cup, absolute simplicity
9. Mirror reflection - {{OUTFIT_FULLBODY_4}}, white phone, {{LOCATION_INDOOR_1}}, soft bright light

Color grade: Pure whites, soft grays, no shadows, bright even lighting, minimal grain, Scandinavian aesthetic, zen simplicity, high-key exposure.`,

  minimal_beige_aesthetic: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Beige minimal aesthetic. Neutral beige and sand tones with understated elegance. Soft Nordic light, beige interiors, quiet sophistication. iPhone photography style with gentle lighting, minimal styling, calm simplicity.

Setting: Beige minimal apartments, sand-colored interiors, neutral modern spaces, soft natural environments

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Sitting on {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, relaxed pose, soft window light
2. Beige coffee cup on {{LOCATION_INDOOR_2}} - overhead flatlay, gentle natural light, minimal styling
3. Full-body standing - {{OUTFIT_FULLBODY_2}}, beige wall background, centered, soft shadows

4. Close-up hands holding beige cup - {{OUTFIT_MIDSHOT_1}}, {{STYLING_NOTES}}, warm skin, soft focus
5. Simple wooden sign reading "COZY" in natural carved letters on {{LOCATION_ARCHITECTURAL_1}}, soft light
6. {{OUTFIT_MIDSHOT_2}} texture - close-up, ribbed pattern, natural fiber detail, soft lighting

7. Walking past {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_3}}, natural stride, gentle side lighting, calm movement
8. {{LOCATION_INDOOR_3}} - overhead, laptop, coffee, neutral desk, soft natural light from window
9. Sitting by window - {{OUTFIT_FULLBODY_4}}, holding cup, soft profile, warm natural light

Color grade: Warm beiges, sand tones, oatmeal neutrals, soft shadows, gentle Nordic light, minimal grain, quiet sophistication, calm aesthetic.`,

  // BEIGE category
  beige_dark_moody: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Dark cozy beige aesthetic. Chocolate brown, camel, and taupe with evening warmth. Moody warm lighting, autumn vibes, cozy sophistication. iPhone photography style with warm shadows, rich tones, intimate atmosphere.

Setting: Evening city streets, warm-lit cafes, cozy apartment interiors, autumn urban landscapes

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Sitting on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_1}}, evening street lamps behind, cozy pose
2. Hot chocolate and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}} - overhead flatlay, warm cafe lighting
3. Full-body walking - {{OUTFIT_FULLBODY_2}}, autumn street, fallen leaves, evening golden light

4. Close-up {{ACCESSORY_CLOSEUP_1}} - warm skin, soft shadow, intimate lighting, cozy feel
5. Vintage sign reading "AUTUMN" in warm serif font on {{LOCATION_ARCHITECTURAL_1}}, glowing evening light
6. {{OUTFIT_MIDSHOT_1}} texture - close-up luxury bag, rich material, warm moody lighting

7. Leaning in doorway - {{OUTFIT_FULLBODY_3}}, warm interior light, relaxed stance
8. Cozy workspace - overhead, latte, brown notebook, {{LOCATION_INDOOR_2}}, evening atmosphere
9. Mirror selfie - {{OUTFIT_FULLBODY_4}}, phone in hand, {{LOCATION_INDOOR_3}}

Color grade: Chocolate browns, warm camel, taupe shadows, golden evening light, rich warm tones, cozy grain, autumn aesthetic, intimate moody lighting.`,

  beige_light_minimalistic: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Bright beige coastal aesthetic. Cream, sand, and ivory with beach elegance. Bright coastal daylight, airy spaces, effortless luxury. iPhone photography style with bright natural light, soft breezy feel, coastal sophistication.

Setting: Bright beach houses, coastal cafes, sandy beach backgrounds, white-washed architecture

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Standing on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_1}}, natural wind in hair, bright daylight, ocean background
2. Iced latte and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}} - overhead flatlay, bright natural light, coastal vibe
3. Full-body walking - {{OUTFIT_FULLBODY_2}}, beach path, breezy movement, soft shadows

4. Close-up {{ACCESSORY_CLOSEUP_1}} - sun-kissed skin, soft focus, bright light
5. Beach sign reading "PARADISE" in weathered white paint on {{LOCATION_ARCHITECTURAL_1}}, bright coastal light
6. {{OUTFIT_MIDSHOT_1}} fabric - close-up, natural texture blowing in breeze, bright sunlight

7. Sitting on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_3}}, relaxed pose, coastal architecture
8. Bright workspace - overhead, iced coffee, minimal desk, {{LOCATION_INDOOR_2}}, natural light
9. Doorway moment - {{OUTFIT_FULLBODY_4}}, leaning in white doorframe, bright airy interior

Color grade: Bright creams, sand tones, ivory highlights, coastal natural light, soft breezy shadows, gentle grain, beach aesthetic, airy sophistication.`,

  beige_beige_aesthetic: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Classic beige aesthetic. Camel, tan, and cream with timeless elegance. Soft natural light, neutral spaces, understated luxury. iPhone photography style with warm neutral tones, gentle shadows, editorial sophistication.

Setting: Beige townhouses, neutral modern apartments, classic cafes, European architecture

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Leaning against {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_1}}, {{STYLING_NOTES}}, relaxed sophisticated pose
2. Cappuccino and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}} - overhead flatlay, soft natural window light
3. Full-body in {{LOCATION_INDOOR_2}} - {{OUTFIT_FULLBODY_2}}, walking naturally, soft shadows

4. Close-up {{ACCESSORY_CLOSEUP_1}} - warm tones, soft focus, gentle lighting
5. Classic sign reading "ELEGANCE" in timeless serif on {{LOCATION_ARCHITECTURAL_1}}, soft afternoon light
6. {{OUTFIT_MIDSHOT_1}} texture - close-up, luxury knit detail, soft warm lighting

7. Sitting on {{LOCATION_INDOOR_3}} - {{OUTFIT_FULLBODY_3}}, crossed legs, editorial pose, natural light
8. Neutral workspace - overhead, coffee, tan notebook, minimal desk, {{LOCATION_INDOOR_2}}, soft daylight
9. Mirror selfie - {{OUTFIT_FULLBODY_4}}, {{STYLING_NOTES}}, phone in hand, warm neutral bathroom

Color grade: Warm camels, soft tans, cream highlights, natural neutral light, gentle shadows, subtle grain, timeless aesthetic, editorial sophistication.`,

  // WARM category
  warm_dark_moody: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Warm moody aesthetic. Rust, burgundy, and chocolate brown with evening richness. Warm Italian lighting, intimate spaces, romantic atmosphere. iPhone photography style with glowing warm tones, rich shadows, cozy drama.

Setting: Evening Italian streets, warm-lit trattorias, cozy wine bars, sunset architecture

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Sitting at {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, wine glass, warm evening glow
2. Red wine and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}} - overhead flatlay, candlelit atmosphere
3. Full-body walking - {{OUTFIT_FULLBODY_2}}, Italian street, sunset warm light

4. Close-up {{ACCESSORY_CLOSEUP_1}} - warm intimate lighting, romantic glow, soft shadows
5. Romantic sign reading "AMORE" in script font on {{LOCATION_ARCHITECTURAL_1}}, warm evening light
6. {{OUTFIT_MIDSHOT_1}} texture - close-up, rich fabric detail, warm glowing lighting

7. Leaning in doorway - {{OUTFIT_FULLBODY_3}}, warm interior light spilling out, romantic stance
8. Cozy evening setup - overhead, wine, journal, {{LOCATION_INDOOR_3}}, warm candlelight on wood table
9. Window reflection - {{OUTFIT_FULLBODY_4}}, holding wine glass, golden hour through window, warm glow

Color grade: Rich rusts, deep burgundy, chocolate browns, golden evening light, warm romantic shadows, cozy grain, Italian aesthetic, intimate atmosphere.`,

  warm_light_minimalistic: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Bright warm minimal aesthetic. Ivory, cream, and white with warm sunlight. Bright Japanese daylight, clean spaces, zen warmth. iPhone photography style with bright natural light, minimal styling, warm simplicity.

Setting: Bright Tokyo apartments, minimal Japanese interiors, sunny modern spaces, clean architecture

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, natural pose, warm sunlight streaming
2. Green tea and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}} - overhead flatlay, bright natural light
3. Full-body centered - {{OUTFIT_FULLBODY_2}}, white background, warm sunlit, clean composition

4. Close-up {{ACCESSORY_CLOSEUP_1}} - warm skin, soft focus, bright gentle light
5. Minimal sign with Japanese character "和" (harmony) in simple black on white, soft shadow
6. {{OUTFIT_MIDSHOT_1}} fabric texture - close-up, natural cotton, warm bright lighting

7. Walking in {{LOCATION_INDOOR_3}} - {{OUTFIT_FULLBODY_3}}, warm sunlight, clean minimal space, peaceful movement
8. Bright workspace - overhead, matcha tea, minimal desk, {{LOCATION_INDOOR_2}}, warm daylight flooding in
9. Window seat moment - {{OUTFIT_FULLBODY_4}}, sitting peacefully, warm natural light, zen atmosphere

Color grade: Warm ivories, soft creams, bright whites, warm natural daylight, minimal shadows, gentle grain, Japanese aesthetic, zen simplicity.`,

  warm_beige_aesthetic: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Warm beige lifestyle aesthetic. Caramel, sand, and toffee with golden afternoon glow. Warm Barcelona light, cozy cafes, Mediterranean warmth. iPhone photography style with golden tones, soft warmth, lifestyle elegance.

Setting: Barcelona cafes, warm Mediterranean streets, golden hour terraces, sunny architecture

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Sitting on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_1}}, coffee cup, golden afternoon Barcelona light
2. Cortado and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}} - overhead flatlay, warm natural light
3. Full-body walking - {{OUTFIT_FULLBODY_2}}, Mediterranean street, warm golden hour glow, natural stride

4. Close-up {{ACCESSORY_CLOSEUP_1}} - sun-kissed skin, warm focus, golden light
5. Vintage sign reading "BARCELONA" in warm serif on {{LOCATION_ARCHITECTURAL_1}}, golden afternoon light
6. {{OUTFIT_MIDSHOT_1}} texture - close-up, warm fabric detail, golden lighting

7. Leaning on {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_3}}, relaxed pose, Mediterranean architecture, golden glow
8. Warm cafe workspace - overhead, coffee, notebook, {{LOCATION_INDOOR_2}}, golden afternoon light
9. Balcony moment - {{OUTFIT_FULLBODY_4}}, holding coffee, warm sunset light, Mediterranean view

Color grade: Warm caramels, golden sands, toffee highlights, Mediterranean golden light, warm shadows, gentle grain, Barcelona aesthetic, lifestyle warmth.`,

  // EDGY category
  edgy_dark_moody: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Dark edgy urban aesthetic. All black leather, denim, and grunge with industrial edge. Harsh urban lighting, neon accents, underground nightlife. iPhone photography style with high contrast, gritty grain, rebellious attitude.

Setting: Industrial London streets, underground venues, graffiti walls, neon-lit alleys, urban nightlife

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Leaning on {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_1}}, {{STYLING_NOTES}}, edgy pose
2. Black coffee and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}} - overhead flatlay, harsh industrial light, neon glow
3. Full-body in {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_2}}, walking confidently, urban neon background

4. Close-up {{ACCESSORY_CLOSEUP_1}} - multiple chains, industrial lighting, gritty detail
5. Neon sign reading "REBEL" in bold sans-serif with red neon glow on {{LOCATION_ARCHITECTURAL_1}}, nighttime
6. {{OUTFIT_MIDSHOT_1}} texture - close-up, worn leather detail, harsh side lighting

7. Sitting on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_3}}, {{STYLING_NOTES}}, underground venue, moody
8. Dark workspace - overhead, black coffee, laptop with stickers, {{LOCATION_INDOOR_2}}, harsh light
9. Mirror selfie in {{LOCATION_INDOOR_3}} - {{OUTFIT_FULLBODY_4}}, phone in hand, harsh fluorescent

Color grade: Deep blacks, cool grays, neon accents (red/blue), harsh contrast, heavy grain, industrial aesthetic, gritty urban, rebellious mood.`,

  edgy_light_minimalistic: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Bright edgy modern aesthetic. White-black contrast with streetwear edge. Bright Seoul daylight, clean urban spaces, modern street style. iPhone photography style with bright light, clean contrast, contemporary cool.

Setting: Modern Seoul streets, bright subway stations, contemporary architecture, clean urban spaces

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, clean modern background
2. Iced americano and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}} - overhead flatlay, bright daylight, minimal styling
3. Full-body walking - {{OUTFIT_FULLBODY_2}}, bright Seoul street, natural stride, contemporary cool

4. Close-up {{ACCESSORY_CLOSEUP_1}} - clean styling, bright focus, modern simplicity
5. Modern sign with Korean text "서울" (Seoul) in bold sans-serif on {{LOCATION_ARCHITECTURAL_1}}, bright clean light
6. {{OUTFIT_MIDSHOT_1}} texture - close-up, oversized shirt detail, bright clean lighting

7. Sitting on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_3}}, relaxed cool pose
8. Bright workspace - overhead, iced coffee, white minimal desk, {{LOCATION_INDOOR_3}}, bright daylight, clean aesthetic
9. Glass reflection - {{OUTFIT_FULLBODY_4}}, modern building, bright daylight, contemporary styling

Color grade: Bright whites, deep blacks, clean contrast, bright Seoul daylight, minimal shadows, contemporary grain, modern aesthetic, street style cool.`,

  edgy_beige_aesthetic: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Urban beige edgy aesthetic. Tan utility wear with street edge. Natural Brooklyn shadows, industrial beige spaces, urban workwear cool. iPhone photography style with natural shadows, neutral tones, street sophistication.

Setting: Brooklyn industrial areas, neutral urban spaces, vintage warehouses, concrete and metal environments

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Leaning on {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_1}}, Brooklyn street, casual edge
2. Black coffee and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}} - overhead flatlay, natural urban shadows
3. Full-body walking - {{OUTFIT_FULLBODY_2}}, industrial background, natural stride, urban cool

4. Close-up {{ACCESSORY_CLOSEUP_1}} - neutral tones, natural light, street detail
5. Vintage sign reading "BK" in industrial stencil font on {{LOCATION_ARCHITECTURAL_1}}, natural shadows
6. {{OUTFIT_MIDSHOT_1}} texture - close-up, utility jacket detail, natural lighting

7. Sitting on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_3}}, relaxed pose, warehouse setting, urban edge
8. Industrial workspace - overhead, coffee, neutral notebook, metal desk, {{LOCATION_INDOOR_2}}, natural window light
9. Mirror in warehouse - {{OUTFIT_FULLBODY_4}}, phone in hand, {{LOCATION_INDOOR_3}}, natural shadows

Color grade: Neutral tans, concrete grays, warm beiges, natural urban shadows, subtle grain, Brooklyn aesthetic, industrial cool, street sophistication.`,

  // PROFESSIONAL category
  professional_dark_moody: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Dark corporate power aesthetic. All black suiting with executive presence. Dramatic evening city glow, modern offices, CEO energy. iPhone photography style with dramatic lighting, high contrast, sophisticated power.

Setting: Singapore financial district at night, luxury offices, corporate towers, modern architecture

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, arms crossed, city lights behind, executive stance
2. Espresso and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}} - overhead flatlay, dramatic desk lamp, corporate luxury
3. Full-body walking - {{OUTFIT_FULLBODY_2}}, city street, evening city glow

4. Close-up {{ACCESSORY_CLOSEUP_1}} - power detail, dramatic lighting, sophistication
5. Modern sign reading "CEO" in bold minimalist font on {{LOCATION_ARCHITECTURAL_1}}, dramatic city reflection
6. {{OUTFIT_MIDSHOT_1}} fabric - close-up, luxury tailoring detail, dramatic lighting

7. Leaning on {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_3}}, city skyline behind, evening lights, power pose
8. Executive desk - overhead, laptop, espresso, black leather journal, {{LOCATION_INDOOR_3}}, evening workspace
9. Elevator mirror - {{OUTFIT_FULLBODY_4}}, holding briefcase, phone reflection, modern interior

Color grade: Deep blacks, charcoal grays, gold accents, dramatic city lights, high contrast, executive grain, Singapore aesthetic, corporate power.`,

  professional_light_minimalistic: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Bright professional elegant aesthetic. White suiting with fresh sophistication. Bright Swiss daylight, modern offices, refined elegance. iPhone photography style with bright natural light, clean professionalism, contemporary polish.

Setting: Zurich modern offices, bright financial district, clean contemporary architecture, natural light spaces

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, professional stance, floor-to-ceiling windows
2. Green tea and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}} - overhead flatlay, bright natural daylight, minimal elegance
3. Full-body walking in {{LOCATION_INDOOR_3}} - {{OUTFIT_FULLBODY_2}}, confident stride, bright modern space, clean lines

4. Close-up {{ACCESSORY_CLOSEUP_1}} - professional detail, bright focus, refined
5. Modern sign reading "EXCELLENCE" in elegant thin serif on {{LOCATION_ARCHITECTURAL_1}}, soft natural light
6. {{OUTFIT_MIDSHOT_1}} texture - close-up, tailored detail, bright natural lighting

7. Sitting in modern chair - {{OUTFIT_FULLBODY_3}}, crossed legs, bright office, professional elegant pose
8. Bright workspace - overhead, laptop, tea, white desk, {{LOCATION_INDOOR_2}}, bright daylight, contemporary minimal
9. Glass door reflection - {{OUTFIT_FULLBODY_4}}, modern office, bright natural light, professional elegance

Color grade: Bright whites, soft creams, gentle shadows, natural Swiss daylight, minimal grain, professional polish, contemporary elegance, refined aesthetic.`,

  professional_beige_aesthetic: `Use reference images for strict identity consistency (face, body, hair, skin tone, styling). Create 3x3 grid with 9 distinct camera angles. Clean symmetrical layout with subtle frame separation. High-resolution editorial photography. Natural poses, authentic lighting. Different angles from reference.

Vibe: Classic professional beige aesthetic. Camel and beige suiting with timeless sophistication. Natural London daylight, traditional offices, established elegance. iPhone photography style with natural warm light, classic professionalism, timeless quality.

Setting: Mayfair London offices, classic architecture, traditional business districts, natural light interiors

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. Standing by window - {{OUTFIT_FULLBODY_1}}, professional pose, natural London daylight
2. Coffee and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_1}} - overhead flatlay, warm natural light, classic elegance
3. Full-body in {{LOCATION_INDOOR_2}} - {{OUTFIT_FULLBODY_2}}, walking naturally, soft shadows

4. Close-up {{ACCESSORY_CLOSEUP_1}} - professional details, warm light, classic sophistication
5. Traditional sign reading "MAYFAIR" in classic serif on {{LOCATION_ARCHITECTURAL_1}}, natural afternoon light
6. {{OUTFIT_MIDSHOT_1}} texture - close-up, luxury tailoring, warm natural lighting

7. Sitting at traditional desk - {{OUTFIT_FULLBODY_3}}, leather chair, professional working pose, natural light
8. Classic workspace - overhead, coffee, leather journal, wood desk, {{LOCATION_INDOOR_3}}, warm daylight from window
9. Traditional mirror - {{OUTFIT_FULLBODY_4}}, {{STYLING_NOTES}}, warm natural bathroom light

Color grade: Warm camels, classic beiges, cream highlights, natural London daylight, soft shadows, timeless grain, Mayfair aesthetic, established elegance.`,
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
