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
  luxury_dark_moody: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Dark luxury editorial aesthetic. All black outfits with urban edge. Moody city lighting, concrete architecture, professional spaces. iPhone photography style with natural film grain, high contrast shadows, sophisticated and effortless.

Setting: Urban concrete structures, modern office interiors, city streets at dusk, luxury building lobbies

Outfits: Black oversized blazers, black leather pants, black bodysuits with deep necklines, gray tailored blazers, occasional white tee. Gold chain necklaces, designer black bags, black sunglasses, black heels and boots.

9 frames:
1. Sitting on concrete stairs - black blazer, leather pants, beanie, sunglasses, relaxed pose
2. Coffee and designer YSL bag on dark marble table - overhead flatlay, moody lighting
3. Full-body against gray wall - black puffer jacket, dynamic pose, urban background

4. Close-up gold chain necklace on black bodysuit - hand touching collarbone, soft shadow
5. Street sign reading "ICONIC" in bold serif font on textured concrete wall, dramatic moody lighting
6. Black jacket with rhinestone details - close texture shot on reflective dark surface

7. Walking naturally on city street - black oversized jacket, chain bag, yellow road markings visible
8. Working at laptop with coffee - overhead view, hands typing, dark minimalist desk
9. Mirror selfie - gray blazer over black bralette, phone in hand, modern interior

Color grade: Deep blacks, cool grays, concrete tones, warm skin preserved, gold jewelry highlights, dramatic shadows, iPhone grain, moody candid lighting, high contrast.`,

  luxury_light_minimalistic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Bright luxury minimalist aesthetic. White and cream tailored pieces with airy elegance. Bright natural daylight, clean white interiors, sophisticated simplicity. iPhone photography style with soft lighting, minimal shadows, effortless polish.

Setting: Bright white penthouse interiors, luxury hotel lobbies with natural light, clean modern architecture

Outfits: White tailored blazers, cream wide-leg trousers, white silk blouses, ivory cashmere coats, beige knit dresses. Delicate gold jewelry, cream leather bags, nude heels, white sneakers.

9 frames:
1. Standing in bright white room - cream blazer, white trousers, hand in pocket, natural window light
2. Latte and delicate gold jewelry on white marble - overhead flatlay, soft natural light
3. Full-body in doorway - white long coat, cream dress underneath, architectural white background

4. Close-up of delicate gold necklace on white silk blouse - minimal styling, soft focus
5. Minimalist sign reading "RELAX" in elegant thin serif on white textured wall, soft shadow detail
6. White cashmere fabric texture - extreme close-up, luxurious material detail

7. Walking in bright hallway - cream trench coat, white bag, natural stride, soft shadows
8. White desk with laptop and coffee - overhead view, minimal workspace, bright daylight
9. Mirror selfie - white blazer, cream top, phone in hand, bright clean bathroom

Color grade: Bright whites, soft creams, warm beiges, gentle shadows, natural daylight, minimal grain, airy and clean, soft focus, high-key lighting.`,

  luxury_beige_aesthetic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Warm beige luxury aesthetic. Camel, tan, and cream tailored pieces with golden hour elegance. Soft warm lighting, beige interiors, sophisticated warmth. iPhone photography style with warm tones, soft shadows, timeless luxury.

Setting: Beige stone architecture, warm-toned luxury apartments, golden hour city streets, tan leather interiors

Outfits: Camel cashmere coats, tan trousers, cream knit sweaters, beige tailored blazers, chocolate brown leather. Layered gold jewelry, tan leather bags, beige heels, cognac boots.

9 frames:
1. Leaning against beige stone wall - camel coat, cream sweater, tan bag, relaxed elegant pose
2. Cappuccino and tan leather bag on wood table - overhead flatlay, warm natural light
3. Full-body walking - beige trench coat, cream dress, city background, golden hour glow

4. Close-up layered gold necklaces on cream knit - warm skin tones, soft focus, golden light
5. Vintage street sign reading "PARIS" in classic serif on aged beige stone, warm afternoon light
6. Tan leather texture close-up - luxury bag detail, buttery soft material, warm lighting

7. Sitting on tan leather chair - chocolate brown blazer, camel pants, crossed legs, sophisticated
8. Beige workspace with coffee and notebook - overhead view, warm minimal desk, soft shadows
9. Mirror selfie - camel blazer, cream turtleneck, gold jewelry, warm bathroom lighting

Color grade: Warm beiges, camel tones, cream highlights, golden hour warmth, soft shadows, gentle grain, sophisticated warmth, buttery soft lighting.`,

  // MINIMAL category
  minimal_dark_moody: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Dark minimal editorial aesthetic. All black uniform pieces with architectural precision. Harsh geometric shadows, concrete spaces, stripped-back sophistication. iPhone photography style with high contrast, clean lines, modern minimalism.

Setting: Concrete brutalist architecture, minimal black interiors, geometric urban spaces, modern art galleries

Outfits: Black turtlenecks, black straight-leg pants, black minimal dresses, black structured blazers. Single silver ring, black leather minimal bag, no other jewelry, black boots.

9 frames:
1. Standing against concrete wall - black turtleneck, black pants, arms at sides, geometric shadows
2. Black coffee cup on concrete surface - overhead flatlay, harsh single light source, minimal composition
3. Full-body in concrete hallway - black dress, centered composition, architectural symmetry

4. Close-up face profile - black turtleneck, single silver ring visible on hand near face, sharp shadows
5. Modern street sign reading "BERLIN" in bold sans-serif on matte black metal, geometric design
6. Black fabric texture - extreme close-up, ribbed knit detail, high contrast lighting

7. Walking through concrete corridor - black blazer, black pants, straight-on angle, shadow play
8. Black laptop on black desk - overhead minimal workspace, single black coffee cup, stark composition
9. Mirror selfie - black turtleneck dress, phone in hand, black minimal bathroom

Color grade: Deep blacks, charcoal grays, high contrast, harsh geometric shadows, minimal grain, modern stark aesthetic, architectural precision.`,

  minimal_light_minimalistic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Pure white minimal aesthetic. All-white uniform pieces with Scandinavian simplicity. Bright even daylight, white interiors, absolute minimalism. iPhone photography style with soft lighting, no shadows, zen simplicity.

Setting: Pure white gallery spaces, Scandinavian white interiors, bright white studios, minimal architecture

Outfits: White turtlenecks, white linen pants, white minimal dresses, white cotton shirts. No jewelry. White minimal bag, white sneakers.

9 frames:
1. Standing in white room - white turtleneck, white pants, hands relaxed, even bright light
2. White coffee cup on white marble - overhead flatlay, soft diffused light, pure minimalism
3. Full-body centered - white dress, white background, symmetrical composition, clean lines

4. Close-up face straight-on - white turtleneck, no jewelry, soft natural light, serene expression
5. Clean sign reading "STILL" in thin minimal sans-serif on white wall, subtle embossed texture
6. White linen fabric - extreme close-up, natural texture, soft even lighting

7. Walking in white hallway - white shirt, white pants, centered angle, bright daylight
8. White desk minimal - overhead view, white laptop, white cup, absolute simplicity
9. Mirror reflection - white dress, white phone, white bathroom, soft bright light

Color grade: Pure whites, soft grays, no shadows, bright even lighting, minimal grain, Scandinavian aesthetic, zen simplicity, high-key exposure.`,

  minimal_beige_aesthetic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Beige minimal aesthetic. Neutral beige and sand tones with understated elegance. Soft Nordic light, beige interiors, quiet sophistication. iPhone photography style with gentle lighting, minimal styling, calm simplicity.

Setting: Beige minimal apartments, sand-colored interiors, neutral modern spaces, soft natural environments

Outfits: Beige ribbed knits, sand linen pants, oatmeal sweaters, taupe minimal dresses. No jewelry. Beige canvas bag, nude sandals.

9 frames:
1. Sitting on beige sofa - oatmeal sweater, beige pants, relaxed pose, soft window light
2. Beige coffee cup on sand-colored surface - overhead flatlay, gentle natural light, minimal styling
3. Full-body standing - beige dress, beige wall background, centered, soft shadows

4. Close-up hands holding beige cup - ribbed sweater sleeves, no jewelry, warm skin, soft focus
5. Simple wooden sign reading "COZY" in natural carved letters on beige textured wall, soft light
6. Beige knit texture - close-up, ribbed pattern, natural fiber detail, soft lighting

7. Walking past beige wall - sand linen outfit, natural stride, gentle side lighting, calm movement
8. Beige workspace - overhead, laptop, coffee, neutral desk, soft natural light from window
9. Sitting by window - beige knit, holding cup, soft profile, warm natural light

Color grade: Warm beiges, sand tones, oatmeal neutrals, soft shadows, gentle Nordic light, minimal grain, quiet sophistication, calm aesthetic.`,

  // BEIGE category
  beige_dark_moody: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Dark cozy beige aesthetic. Chocolate brown, camel, and taupe with evening warmth. Moody warm lighting, autumn vibes, cozy sophistication. iPhone photography style with warm shadows, rich tones, intimate atmosphere.

Setting: Evening city streets, warm-lit cafes, cozy apartment interiors, autumn urban landscapes

Outfits: Chocolate brown wool coats, camel cashmere sweaters, taupe trousers, brown leather jackets. Gold jewelry, cognac leather bags, brown suede boots.

9 frames:
1. Sitting on bench - chocolate brown coat, camel sweater, evening street lamps behind, cozy pose
2. Hot chocolate and brown leather bag - overhead flatlay on wood table, warm cafe lighting
3. Full-body walking - brown wool coat, autumn street, fallen leaves, evening golden light

4. Close-up gold jewelry on camel knit - warm skin, soft shadow, intimate lighting, cozy feel
5. Vintage sign reading "AUTUMN" in warm serif font on rustic wood, glowing evening light
6. Brown leather texture - close-up luxury bag, rich material, warm moody lighting

7. Leaning in doorway - taupe blazer, chocolate sweater, warm interior light, relaxed stance
8. Cozy workspace - overhead, latte, brown notebook, warm desk lamp, evening atmosphere
9. Mirror selfie - brown coat, camel scarf, phone in hand, warm bathroom light

Color grade: Chocolate browns, warm camel, taupe shadows, golden evening light, rich warm tones, cozy grain, autumn aesthetic, intimate moody lighting.`,

  beige_light_minimalistic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Bright beige coastal aesthetic. Cream, sand, and ivory with beach elegance. Bright coastal daylight, airy spaces, effortless luxury. iPhone photography style with bright natural light, soft breezy feel, coastal sophistication.

Setting: Bright beach houses, coastal cafes, sandy beach backgrounds, white-washed architecture

Outfits: Cream linen dresses, sand cotton shirts, ivory wide-leg pants, beige knit cardigans. Minimal gold jewelry, woven cream bags, nude sandals.

9 frames:
1. Standing on beach - cream linen dress, natural wind in hair, bright daylight, ocean background
2. Iced latte and woven bag on white table - overhead flatlay, bright natural light, coastal vibe
3. Full-body walking - ivory pants, sand top, beach path, breezy movement, soft shadows

4. Close-up minimal gold necklace on cream linen - sun-kissed skin, soft focus, bright light
5. Beach sign reading "PARADISE" in weathered white paint on driftwood, bright coastal light
6. Cream linen fabric - close-up, natural texture blowing in breeze, bright sunlight

7. Sitting on white steps - beige cardigan, cream dress, relaxed pose, coastal architecture
8. Bright workspace - overhead, iced coffee, minimal desk, beach view visible, natural light
9. Doorway moment - sand linen outfit, leaning in white doorframe, bright airy interior

Color grade: Bright creams, sand tones, ivory highlights, coastal natural light, soft breezy shadows, gentle grain, beach aesthetic, airy sophistication.`,

  beige_beige_aesthetic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Classic beige aesthetic. Camel, tan, and cream with timeless elegance. Soft natural light, neutral spaces, understated luxury. iPhone photography style with warm neutral tones, gentle shadows, editorial sophistication.

Setting: Beige townhouses, neutral modern apartments, classic cafes, European architecture

Outfits: Camel knit sweaters, tan trousers, cream blouses, beige coats. Layered gold jewelry, tan leather bags, nude heels, beige accessories.

9 frames:
1. Leaning against beige wall - camel sweater, tan pants, gold jewelry, relaxed sophisticated pose
2. Cappuccino and tan bag on neutral surface - overhead flatlay, soft natural window light
3. Full-body in neutral hallway - beige coat, cream pants, walking naturally, soft shadows

4. Close-up layered gold necklaces on camel knit - warm tones, soft focus, gentle lighting
5. Classic sign reading "ELEGANCE" in timeless serif on beige stone wall, soft afternoon light
6. Tan cashmere texture - close-up, luxury knit detail, soft warm lighting

7. Sitting on beige chair - cream blouse, tan trousers, crossed legs, editorial pose, natural light
8. Neutral workspace - overhead, coffee, tan notebook, minimal desk, soft daylight
9. Mirror selfie - camel coat, layered gold jewelry, phone in hand, warm neutral bathroom

Color grade: Warm camels, soft tans, cream highlights, natural neutral light, gentle shadows, subtle grain, timeless aesthetic, editorial sophistication.`,

  // WARM category
  warm_dark_moody: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Warm moody aesthetic. Rust, burgundy, and chocolate brown with evening richness. Warm Italian lighting, intimate spaces, romantic atmosphere. iPhone photography style with glowing warm tones, rich shadows, cozy drama.

Setting: Evening Italian streets, warm-lit trattorias, cozy wine bars, sunset architecture

Outfits: Rust knit sweaters, burgundy dresses, chocolate brown coats, terracotta tops. Gold jewelry, brown leather bags, cognac boots.

9 frames:
1. Sitting at cafe table - rust sweater, burgundy scarf, wine glass, warm evening glow
2. Red wine and leather-bound book on wood table - overhead flatlay, candlelit atmosphere
3. Full-body walking - chocolate coat, burgundy dress underneath, Italian street, sunset warm light

4. Close-up gold jewelry on rust knit - warm intimate lighting, romantic glow, soft shadows
5. Romantic sign reading "AMORE" in script font on aged terracotta wall, warm evening light
6. Burgundy velvet texture - close-up, rich fabric detail, warm glowing lighting

7. Leaning in doorway - terracotta top, brown pants, warm interior light spilling out, romantic stance
8. Cozy evening setup - overhead, wine, journal, warm candlelight on wood table
9. Window reflection - rust dress, holding wine glass, golden hour through window, warm glow

Color grade: Rich rusts, deep burgundy, chocolate browns, golden evening light, warm romantic shadows, cozy grain, Italian aesthetic, intimate atmosphere.`,

  warm_light_minimalistic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Bright warm minimal aesthetic. Ivory, cream, and white with warm sunlight. Bright Japanese daylight, clean spaces, zen warmth. iPhone photography style with bright natural light, minimal styling, warm simplicity.

Setting: Bright Tokyo apartments, minimal Japanese interiors, sunny modern spaces, clean architecture

Outfits: Ivory oversized shirts, cream wide-leg pants, white minimal dresses, warm knit cardigans. Minimal gold jewelry, cream canvas bags, white sneakers.

9 frames:
1. Standing in bright room - ivory oversized shirt, cream pants, natural pose, warm sunlight streaming
2. Green tea and minimal gold bracelet on white table - overhead flatlay, bright natural light
3. Full-body centered - cream dress, white background, warm sunlit, clean composition

4. Close-up minimal gold necklace on white shirt - warm skin, soft focus, bright gentle light
5. Minimal sign with Japanese character "和" (harmony) in simple black on white, soft shadow
6. Cream fabric texture - close-up, natural cotton, warm bright lighting

7. Walking in bright hallway - ivory outfit, warm sunlight, clean minimal space, peaceful movement
8. Bright workspace - overhead, matcha tea, minimal desk, warm daylight flooding in
9. Window seat moment - cream sweater, sitting peacefully, warm natural light, zen atmosphere

Color grade: Warm ivories, soft creams, bright whites, warm natural daylight, minimal shadows, gentle grain, Japanese aesthetic, zen simplicity.`,

  warm_beige_aesthetic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Warm beige lifestyle aesthetic. Caramel, sand, and toffee with golden afternoon glow. Warm Barcelona light, cozy cafes, Mediterranean warmth. iPhone photography style with golden tones, soft warmth, lifestyle elegance.

Setting: Barcelona cafes, warm Mediterranean streets, golden hour terraces, sunny architecture

Outfits: Caramel ribbed knits, sand linen pants, toffee sweaters, warm beige dresses. Layered gold jewelry, tan leather bags, nude sandals.

9 frames:
1. Sitting on terrace - caramel knit, sand pants, coffee cup, golden afternoon Barcelona light
2. Cortado and gold jewelry on terracotta tiles - overhead flatlay, warm natural light
3. Full-body walking - toffee dress, Mediterranean street, warm golden hour glow, natural stride

4. Close-up layered gold necklaces on caramel knit - sun-kissed skin, warm focus, golden light
5. Vintage sign reading "BARCELONA" in warm serif on aged ochre wall, golden afternoon light
6. Caramel ribbed knit texture - close-up, warm fabric detail, golden lighting

7. Leaning on warm stone wall - sand linen outfit, relaxed pose, Mediterranean architecture, golden glow
8. Warm cafe workspace - overhead, coffee, notebook, terracotta table, golden afternoon light
9. Balcony moment - toffee sweater, holding coffee, warm sunset light, Mediterranean view

Color grade: Warm caramels, golden sands, toffee highlights, Mediterranean golden light, warm shadows, gentle grain, Barcelona aesthetic, lifestyle warmth.`,

  // EDGY category
  edgy_dark_moody: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Dark edgy urban aesthetic. All black leather, denim, and grunge with industrial edge. Harsh urban lighting, neon accents, underground nightlife. iPhone photography style with high contrast, gritty grain, rebellious attitude.

Setting: Industrial London streets, underground venues, graffiti walls, neon-lit alleys, urban nightlife

Outfits: Black leather jackets, distressed black jeans, band t-shirts, combat boots. Silver chains, studded accessories, dark sunglasses, leather bags.

9 frames:
1. Leaning on graffiti wall - leather jacket, band tee, distressed jeans, combat boots, edgy pose
2. Black coffee and silver chains on metal surface - overhead flatlay, harsh industrial light, neon glow
3. Full-body in alley - all black outfit, combat boots, walking confidently, urban neon background

4. Close-up silver chain necklaces on black tee - multiple chains, industrial lighting, gritty detail
5. Neon sign reading "REBEL" in bold sans-serif with red neon glow on brick wall, nighttime
6. Black leather jacket texture - close-up, worn leather detail, harsh side lighting

7. Sitting on industrial steps - leather pants, black hoodie, silver chains, underground venue, moody
8. Dark workspace - overhead, black coffee, laptop with stickers, industrial desk, harsh light
9. Mirror selfie in dark bathroom - all black outfit, silver accessories, phone in hand, harsh fluorescent

Color grade: Deep blacks, cool grays, neon accents (red/blue), harsh contrast, heavy grain, industrial aesthetic, gritty urban, rebellious mood.`,

  edgy_light_minimalistic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Bright edgy modern aesthetic. White-black contrast with streetwear edge. Bright Seoul daylight, clean urban spaces, modern street style. iPhone photography style with bright light, clean contrast, contemporary cool.

Setting: Modern Seoul streets, bright subway stations, contemporary architecture, clean urban spaces

Outfits: White oversized shirts, black leather pants, platform sneakers, black-and-white contrast pieces. Minimal silver jewelry, crossbody bags, modern sunglasses.

9 frames:
1. Standing in bright subway - white oversized shirt, black leather pants, platforms, clean modern background
2. Iced americano and silver rings on white concrete - overhead flatlay, bright daylight, minimal styling
3. Full-body walking - black-white contrast outfit, bright Seoul street, natural stride, contemporary cool

4. Close-up minimal silver jewelry on white shirt - clean styling, bright focus, modern simplicity
5. Modern sign with Korean text "서울" (Seoul) in bold sans-serif on white wall, bright clean light
6. White cotton texture - close-up, oversized shirt detail, bright clean lighting

7. Sitting on white urban bench - black leather pants, white tee, platforms, relaxed cool pose
8. Bright workspace - overhead, iced coffee, white minimal desk, bright daylight, clean aesthetic
9. Glass reflection - black-white outfit, modern building, bright daylight, contemporary styling

Color grade: Bright whites, deep blacks, clean contrast, bright Seoul daylight, minimal shadows, contemporary grain, modern aesthetic, street style cool.`,

  edgy_beige_aesthetic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Urban beige edgy aesthetic. Tan utility wear with street edge. Natural Brooklyn shadows, industrial beige spaces, urban workwear cool. iPhone photography style with natural shadows, neutral tones, street sophistication.

Setting: Brooklyn industrial areas, neutral urban spaces, vintage warehouses, concrete and metal environments

Outfits: Tan utility jackets, cargo pants, combat boots, beige workwear pieces. Minimal leather accessories, canvas bags, neutral caps.

9 frames:
1. Leaning on concrete wall - tan utility jacket, cargo pants, combat boots, Brooklyn street, casual edge
2. Black coffee and beige canvas bag on concrete - overhead flatlay, natural urban shadows
3. Full-body walking - beige workwear outfit, industrial background, natural stride, urban cool

4. Close-up minimal leather bracelet on tan jacket sleeve - neutral tones, natural light, street detail
5. Vintage sign reading "BK" in industrial stencil font on weathered concrete, natural shadows
6. Tan canvas texture - close-up, utility jacket detail, natural lighting

7. Sitting on industrial crate - cargo pants, beige tee, relaxed pose, warehouse setting, urban edge
8. Industrial workspace - overhead, coffee, neutral notebook, metal desk, natural window light
9. Mirror in warehouse - tan utility outfit, phone in hand, industrial bathroom, natural shadows

Color grade: Neutral tans, concrete grays, warm beiges, natural urban shadows, subtle grain, Brooklyn aesthetic, industrial cool, street sophistication.`,

  // PROFESSIONAL category
  professional_dark_moody: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Dark corporate power aesthetic. All black suiting with executive presence. Dramatic evening city glow, modern offices, CEO energy. iPhone photography style with dramatic lighting, high contrast, sophisticated power.

Setting: Singapore financial district at night, luxury offices, corporate towers, modern architecture

Outfits: Black tailored blazers, black trousers, black trench coats, black power suits. Minimal gold jewelry, black leather briefcases, black heels.

9 frames:
1. Standing in glass office - black power suit, arms crossed, city lights behind, executive stance
2. Espresso and gold watch on black marble - overhead flatlay, dramatic desk lamp, corporate luxury
3. Full-body walking - black trench coat, black suit underneath, city street, evening city glow

4. Close-up minimal gold watch on black blazer sleeve - power detail, dramatic lighting, sophistication
5. Modern sign reading "CEO" in bold minimalist font on black glass, dramatic city reflection
6. Black wool suiting fabric - close-up, luxury tailoring detail, dramatic lighting

7. Leaning on glass railing - black blazer, city skyline behind, evening lights, power pose
8. Executive desk - overhead, laptop, espresso, black leather journal, desk lamp, evening workspace
9. Elevator mirror - black suit, holding briefcase, phone reflection, modern interior

Color grade: Deep blacks, charcoal grays, gold accents, dramatic city lights, high contrast, executive grain, Singapore aesthetic, corporate power.`,

  professional_light_minimalistic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Bright professional elegant aesthetic. White suiting with fresh sophistication. Bright Swiss daylight, modern offices, refined elegance. iPhone photography style with bright natural light, clean professionalism, contemporary polish.

Setting: Zurich modern offices, bright financial district, clean contemporary architecture, natural light spaces

Outfits: White tailored blazers, cream trousers, white button-down shirts, ivory coats. Minimal gold jewelry, cream leather bags, nude heels.

9 frames:
1. Standing in bright office - white blazer, cream pants, professional stance, floor-to-ceiling windows
2. Green tea and gold pen on white desk - overhead flatlay, bright natural daylight, minimal elegance
3. Full-body walking in bright hallway - white suit, confident stride, bright modern space, clean lines

4. Close-up minimal gold necklace on white shirt collar - professional detail, bright focus, refined
5. Modern sign reading "EXCELLENCE" in elegant thin serif on white wall, soft natural light
6. White wool blazer texture - close-up, tailored detail, bright natural lighting

7. Sitting in modern chair - cream suit, crossed legs, bright office, professional elegant pose
8. Bright workspace - overhead, laptop, tea, white desk, bright daylight, contemporary minimal
9. Glass door reflection - white suit, modern office, bright natural light, professional elegance

Color grade: Bright whites, soft creams, gentle shadows, natural Swiss daylight, minimal grain, professional polish, contemporary elegance, refined aesthetic.`,

  professional_beige_aesthetic: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain strict perfect facial and body consistency.

Vibe: Classic professional beige aesthetic. Camel and beige suiting with timeless sophistication. Natural London daylight, traditional offices, established elegance. iPhone photography style with natural warm light, classic professionalism, timeless quality.

Setting: Mayfair London offices, classic architecture, traditional business districts, natural light interiors

Outfits: Camel blazers, beige trousers, cream blouses, tan coats. Gold jewelry, tan leather bags, nude heels, classic accessories.

9 frames:
1. Standing by window - camel blazer, beige trousers, professional pose, natural London daylight
2. Coffee and gold jewelry on wood desk - overhead flatlay, warm natural light, classic elegance
3. Full-body in classic hallway - tan coat, cream blouse underneath, walking naturally, soft shadows

4. Close-up gold watch and rings on camel blazer - professional details, warm light, classic sophistication
5. Traditional sign reading "MAYFAIR" in classic serif on stone, natural afternoon light
6. Camel wool blazer texture - close-up, luxury tailoring, warm natural lighting

7. Sitting at traditional desk - beige suit, leather chair, professional working pose, natural light
8. Classic workspace - overhead, coffee, leather journal, wood desk, warm daylight from window
9. Traditional mirror - camel coat, gold jewelry, professional styling, warm natural bathroom light

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
