// ---------------------------------------------------------------------------
// AI Prompts data — edit this file to add, change, or remove prompts.
// Each section maps to a section on the access page.
//
// ORDERING RULE: newest collection goes at the TOP of this file.
// Add new COLLECTION arrays above COZY_LEATHER_SERIES, then add the section
// to the page in app/ai-prompts/access/[token]/page.tsx (same top order).
//
// FREEBIE RULE: When adding a new collection:
//   1. Add the full collection as [NAME]_SERIES above COZY_LEATHER_SERIES (newest at top)
//   2. Add [NAME]_SERIES[0] to FREEBIE_COLLECTION_PREVIEWS at the BOTTOM of this file
//   Only shot 1 goes to the freebie. The full series goes to the vault.
// ---------------------------------------------------------------------------

export type PromptCard = {
  number: string
  title: string
  id: string
  whenToUse: string
  mood: string
  prompt: string
  exampleImage?: string
}

// ---------------------------------------------------------------------------
// COLLECTION 09 — Quiet Luxury London Editorial (9 shots)
// ---------------------------------------------------------------------------

export const QUIET_LUXURY_LONDON_SERIES: PromptCard[] = [
  {
    number: "89",
    id: "quiet-luxury-london-shot-1",
    title: "Quiet Luxury London · Café Arrival",
    whenToUse: "Your opener. Full-body street style walking up to the café, coffee not in hand yet. Use for reel covers, carousel openers, or any caption about starting the day in your element.",
    mood: "quiet luxury · london street · arriving · full body · camel tailoring",
    exampleImage: "/images/ai-prompts/quiet-luxury-london-shot-1.jpg",
    prompt: `Create image 1 of a 6-part quiet luxury London editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: a quiet upscale London street outside a white-painted café with arched windows and black iron lanterns. Pale stone pavement, black-and-white woven bistro chairs and a small round marble table on the sidewalk, soft overcast morning light, muted neoclassical architecture behind.

Outfit: oversized camel-taupe tailored blazer with strong shoulders and long relaxed sleeves, worn open over a fitted cream high-neck top. Matching high-waisted wide-leg tailored trousers in the same camel-taupe. Black pointed slingback heels with a low kitten heel. A small black quilted leather chain bag worn on one shoulder. Black rectangular sunglasses. Minimal gold jewelry: thin hoops, a fine necklace, a few slim rings.

Hair: long soft waves with a clean middle part and natural movement through the lengths. Keep the person's natural hair color from the uploaded reference photos.

Makeup: blurred natural skin finish, softly sculpted cheeks, natural brows, soft brown eye definition, warm nude satin lip. Polished and modern, not heavy glam.

Accessories/props: black rectangular sunglasses, black quilted chain bag, minimal gold jewelry only. No phone, no coffee yet.

Pose: walking along the pavement toward the café, one foot mid-step, blazer moving slightly with the motion, one hand resting near the bag strap, head turned softly toward the café windows, calm confident expression.

Camera + lens: shot on Canon EOS R5 with a 35mm lens from a proper distance, full-body lifestyle framing, realistic proportions, no wide-angle distortion.

Camera angle: waist-height street-style angle, pulled back enough to keep the full body natural and balanced.

Composition: vertical 9:16 full-body movement shot, subject slightly off-center, café facade and bistro chairs visible behind her, pavement lines leading toward the entrance.

Body proportion lock: keep full-body anatomy realistic. Natural head size, natural leg length, normal heel size, balanced torso, realistic hips and shoulders, natural walking posture. Avoid stretched legs, tiny head, warped feet, exaggerated runway proportions, wide-angle body distortion.

Mood: arriving at the café, old-money London calm, quiet luxury, confident and effortless.

Color grading: warm camel and cream tones, soft black accents, muted gray London pavement, gentle gold warmth on skin and jewelry, low-saturation quiet-luxury edit, subtle film grain, polished editorial contrast.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: phone, coffee in hand, distorted hands, extra fingers, warped heels, stretched legs, tiny head, elongated torso, warped waist, plastic skin, heavy glam makeup, cartoonish AI style, CGI, fantasy lighting, blur, cluttered street background, random logos.`,
  },
  {
    number: "90",
    id: "quiet-luxury-london-shot-2",
    title: "Quiet Luxury London · Coffee Run",
    whenToUse: "The coffee-in-hand moment. Three-quarter body carrying the takeaway tray, mid-stride. Ideal for day-in-my-life content or any caption about moving through the city with ease.",
    mood: "quiet luxury · coffee run · takeaway cups · three-quarter · lifestyle",
    exampleImage: "/images/ai-prompts/quiet-luxury-london-shot-2.jpg",
    prompt: `Create image 2 of the same quiet luxury London editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: just outside the white London café, pale stone pavement, black iron lanterns and arched windows behind, the marble bistro table and woven chairs softly out of focus, gentle overcast daylight.

Outfit: oversized camel-taupe tailored blazer over a fitted cream high-neck top, matching wide-leg trousers, black pointed slingback heels, small black quilted chain bag on one shoulder, black rectangular sunglasses, minimal gold jewelry.

Hair: long soft waves with a clean middle part and natural movement. Keep the person's natural hair color from the uploaded reference photos.

Makeup: blurred natural skin, softly sculpted cheeks, natural brows, soft brown eye definition, warm nude satin lip, polished daytime editorial finish.

Accessories/props: one cardboard takeaway coffee tray holding two paper cups, held in one hand at waist height. Black quilted chain bag on the shoulder, black sunglasses, minimal gold jewelry. No phone.

Pose: walking slowly away from the café counter holding the coffee tray in one hand, the other hand relaxed near the bag, body angled three-quarters, head turned slightly down toward the cups or off to the side, calm unbothered expression.

Camera + lens: shot on Canon EOS R5 with a 50mm portrait lens, natural compression, realistic body proportions, no wide-angle distortion.

Camera angle: eye-level lifestyle angle, slightly pulled back to show the outfit, the coffee tray, and the café context without stretching the body.

Composition: vertical 9:16 three-quarter editorial shot, café facade softly blurred behind, subject framed slightly off-center, coffee tray clearly readable.

Body proportion lock: preserve realistic standing and walking proportions. Natural head size, natural arm length, balanced shoulders, waist, hips, torso, hands, and feet. Avoid stretched legs, oversized hands, warped waist, tiny head, exaggerated model proportions.

Mood: coffee run, chic everyday luxury, calm confidence, fashion-forward London morning.

Color grading: warm camel and cream tones, soft black accents, kraft-brown coffee cups, muted gray pavement, gentle gold warmth, creamy highlights, subtle film grain, soft quiet-luxury editorial contrast.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: phone, distorted hands, extra fingers, warped coffee cups, fake cup lids, spilled coffee, warped heels, stretched legs, tiny head, plastic skin, heavy glam makeup, cartoonish AI style, CGI, messy anatomy, blur, random logos.`,
  },
  {
    number: "91",
    id: "quiet-luxury-london-shot-3",
    title: "Quiet Luxury London · Seated Marble Hero",
    whenToUse: "The hero shot of the series. Seated at the marble bistro table, legs crossed, coffee resting, the heels and chain bag in full view. The centrepiece. Perfect as a single post or carousel cover.",
    mood: "quiet luxury · seated hero · marble bistro table · crossed legs · fashion editorial",
    exampleImage: "/images/ai-prompts/quiet-luxury-london-shot-3.jpg",
    prompt: `Create image 3 of the same quiet luxury London editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: outside the white London café at a small round marble bistro table with black-and-white woven bistro chairs on pale stone pavement. Arched café windows and black lanterns softly behind, muted overcast morning light, quiet old-money street atmosphere.

Outfit: oversized camel-taupe tailored blazer over a fitted cream high-neck top, matching wide-leg trousers, black pointed slingback heels, small black quilted chain bag, black rectangular sunglasses, minimal gold jewelry.

Hair: long soft waves with a clean middle part and natural movement through the lengths. Keep the person's natural hair color from the uploaded reference photos.

Makeup: blurred natural skin finish, softly sculpted cheeks, natural brows, soft brown eye definition, warm nude satin lip.

Accessories/props: one paper takeaway coffee cup or a small espresso cup on the marble table, black quilted chain bag resting on the table or hung over the chair back, minimal gold jewelry. No phone.

Pose: seated on the woven bistro chair with one leg crossed over the other so the pointed slingback heel is visible, torso angled slightly, one hand resting on the knee or the table near the cup, chin softly lifted, face turned toward the street as if watching the morning, calm confident expression.

Camera + lens: shot on Canon EOS R5 with a 50mm portrait lens, natural compression, realistic human proportions, no wide-angle distortion.

Camera angle: eye-level seated angle, slightly pulled back to keep proportions natural and show the table, bag, and heels.

Composition: vertical 9:16 medium-full seated editorial shot, marble table and woven chair clearly framed, subject slightly off-center, heels and bag included but not exaggerated.

Body proportion lock: keep seated anatomy realistic. Natural head size, natural leg length, realistic knee bend, balanced shoulders, waist, hips, torso, hands, and feet. Avoid stretched legs, tiny head, elongated torso, oversized hands, warped waist, exaggerated fashion-model anatomy.

Mood: main fashion hero moment, old-money London ease, confident, expensive, effortless quiet-luxury editorial.

Color grading: warm camel and cream tones, soft black accents, creamy marble highlights, muted gray stone, gentle gold warmth, slightly desaturated quiet-luxury palette, soft contrast, subtle film grain.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: phone, random extra props, distorted hands, extra fingers, warped heels, warped coffee cup, stretched legs, tiny head, elongated torso, warped waist, wide-angle body distortion, plastic skin, heavy glam makeup, cartoonish AI style, CGI, fantasy lighting, cluttered table, random logos.`,
  },
  {
    number: "92",
    id: "quiet-luxury-london-shot-4",
    title: "Quiet Luxury London · Sunglasses Beauty",
    whenToUse: "A close-up candid while seated. Gold jewelry, sunglasses, completely at ease. Works beautifully for beauty, fragrance, or any caption about a quiet moment to yourself.",
    mood: "quiet luxury · beauty close-up · gold jewelry · sunglasses · personal moment",
    exampleImage: "/images/ai-prompts/quiet-luxury-london-shot-4.jpg",
    prompt: `Create image 4 of the same quiet luxury London editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: seated near the café window or beside the glass exterior, soft reflections in the glass, marble table edge nearby, warm café lights and muted London street movement blurred behind.

Outfit: oversized camel-taupe tailored blazer over a fitted cream high-neck top, black rectangular sunglasses worn or lowered slightly down the nose, minimal gold jewelry: thin hoops, a fine necklace, slim rings.

Hair: long soft waves with a clean middle part and face-framing pieces, natural movement around the face and shoulders. Keep the person's natural hair color from the uploaded reference photos.

Makeup: blurred natural skin, softly sculpted cheeks, soft brown eye definition, natural brows, warm nude satin lip.

Accessories/props: black rectangular sunglasses and minimal gold jewelry only. No phone, no extra props.

Pose: candid seated beauty moment, one hand lightly adjusting the sunglasses or resting near the jaw, the other relaxed near the blazer lapel or collarbone, relaxed mouth, calm confident expression, eyes toward the camera or softly to the side.

Camera + lens: shot on Sony A7R V with an 85mm portrait lens, shallow depth of field, sharp face detail, realistic facial proportions, soft background compression.

Camera angle: eye-level close portrait angle, clean and straight, no face distortion.

Composition: vertical 9:16 close-up to waist-up crop, face, sunglasses, gold jewelry, and blazer collar sharp, café glass reflection softly blurred behind, clean side space for text overlay.

Body proportion lock: keep facial structure, neck length, shoulder width, hand size, and finger length realistic. Avoid changed face, stretched neck, oversized fingers, warped sunglasses, distorted lips.

Mood: candid personal moment, polished, feminine, quiet-luxury London beauty, caught-between-moments energy.

Color grading: warm camel and cream tones, soft natural skin, muted nude lip, gentle gold warmth on the jewelry, cool gray glass reflections, soft café bokeh, gentle contrast, subtle film grain, luxury editorial finish.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: phone, warped sunglasses, distorted fingers, extra fingers, changed face, plastic skin, over-smoothed beauty filter, heavy glam makeup, cartoonish AI style, CGI, fantasy lighting, blur, compression haze.`,
  },
  {
    number: "93",
    id: "quiet-luxury-london-shot-5",
    title: "Quiet Luxury London · Detail Cutaway",
    whenToUse: "The atmospheric detail shot. Chain bag on the woven chair, takeaway coffees, pointed heels on marble, gold rings. No full face needed. Use as a carousel filler or a standalone mood image that grounds the whole editorial.",
    mood: "quiet luxury · detail shot · chain bag · heels · coffee · cutaway",
    exampleImage: "/images/ai-prompts/quiet-luxury-london-shot-5.jpg",
    prompt: `Create image 5 of the same quiet luxury London editorial photoshoot.

Use the uploaded reference photos only as identity reference if any part of the person is visible. Preserve natural skin tone, realistic hand shape, and natural texture from the reference photos.

Scene: close-up detail at the outdoor London café, round marble table with two kraft-brown takeaway coffee cups in a cardboard tray, black-and-white woven bistro chair edge, a small black quilted leather chain bag resting on the chair seat, pale stone pavement below, soft café window reflection blurred behind.

Outfit: camel-taupe blazer sleeve draping naturally into the frame, black pointed slingback heels visible on the marble or pavement, minimal gold rings.

Hair: no full face needed.

Makeup: no full face needed.

Accessories/props: black quilted chain bag with gold-tone chain strap, two kraft-brown takeaway coffee cups in a cardboard tray, minimal gold rings, black pointed slingback heels. No phone.

Pose: no full face needed. One hand with minimal gold rings resting near the marble table or the bag, blazer sleeve draped naturally, the chain bag and heels readable in the frame.

Camera + lens: shot on Sony A7R V with a 70mm macro-style lens, shallow depth of field, crisp texture detail, realistic hands, leather, gold chain, coffee cups, marble, and heel leather.

Camera angle: close-up detail angle from slightly above table or knee height, natural perspective, no hand, bag, cup, or heel distortion.

Composition: vertical 9:16 detail shot, chain bag, gold chain, coffee cups, blazer sleeve, marble, and heel texture sharp, background softly blurred.

Body proportion lock: keep hand, wrist, and any visible limb scale realistic. Normal finger length, natural knuckles, no extra fingers, no warped wrist, no plastic skin.

Mood: quiet-luxury London detail, café cutaway, polished Pinterest carousel image.

Color grading: creamy marble, kraft-brown coffee cups, soft black quilted leather, muted gold chain and rings, warm camel blazer, gray stone, cool glass reflections, soft low-saturation quiet-luxury finish, subtle film grain.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: phone, distorted hands, extra fingers, warped coffee cups, fake tray shape, warped quilted pattern, melted leather, warped heel shape, random logos, fake brand marks, plastic skin, blur, cluttered table.`,
  },
  {
    number: "94",
    id: "quiet-luxury-london-shot-6",
    title: "Quiet Luxury London · Reel Cover Exit",
    whenToUse: "The exit shot. Full body walking away down the London street, coffee in hand, head turned back over the shoulder, phone box and black cab behind. The perfect reel cover, reel thumbnail, or closing carousel image.",
    mood: "quiet luxury · reel cover · leaving · london street · head turn · full body exit",
    exampleImage: "/images/ai-prompts/quiet-luxury-london-shot-6.jpg",
    prompt: `Create image 6 of the same quiet luxury London editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: a quiet London street after the coffee stop, neoclassical stone building facade behind, a black London cab parked at the curb and a dark phone box softly out of focus, pale stone pavement, gentle overcast daylight, calm city atmosphere.

Outfit: oversized camel-taupe tailored blazer with relaxed long sleeves over a fitted cream high-neck top, matching wide-leg trousers, black pointed slingback heels, small black quilted chain bag on one shoulder, black rectangular sunglasses, minimal gold jewelry.

Hair: long loose waves moving naturally as she turns, smooth at the roots with relaxed face-framing layers. Keep the person's natural hair color from the uploaded reference photos.

Makeup: polished natural editorial makeup with blurred skin, softly sculpted cheeks, soft brown eye definition, warm nude satin lip.

Accessories/props: one kraft-brown takeaway coffee cup held naturally in one hand, black quilted chain bag on the shoulder, black sunglasses, minimal gold jewelry. No phone.

Pose: walking away down the pavement, body angled three-quarters away, head turned back over the shoulder toward the camera, blazer and hair moving slightly, coffee cup held naturally, confident relaxed expression.

Camera + lens: shot on Canon EOS R5 with a 35mm lens from a proper distance, full-body lifestyle framing, natural proportions, no wide-angle distortion.

Camera angle: waist-height angle, pulled back enough to keep the body balanced and realistic.

Composition: vertical 9:16 full-body reel-cover shot with clean space at the top or side for text overlay, London street and stone facade behind, movement visible in the blazer and hair.

Body proportion lock: preserve natural full-body proportions. Normal leg length, natural heel size, balanced torso, normal head size, realistic hips and shoulders. Avoid stretched legs, tiny head, warped feet, oversized hands, exaggerated runway body.

Mood: leaving-the-café candid, cool, effortless, old-money London street style, strong quiet-luxury reel cover energy.

Color grading: warm camel and cream tones, soft black accents, muted gray London street, warm coffee-cup highlight, gentle gold warmth, soft city shadows, slightly desaturated quiet-luxury editorial finish, subtle film grain.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: phone, stiff walking pose, distorted feet, extra toes, unrealistic body proportions, stretched legs, tiny head, oversized coffee cup, warped cup lid, warped heels, plastic skin, over-smoothed beauty filter, cartoonish AI style, CGI, messy anatomy, blur, cluttered background, random logos.`,
  },
  {
    number: "95",
    id: "quiet-luxury-london-shot-7",
    title: "Quiet Luxury London · Grand Entrance",
    whenToUse: "The architecture beat. Pulled back at the entrance of a grand London building, the facade celebrated around you. Use for establishing shots, location reveals, or any caption about the city itself.",
    mood: "quiet luxury · london architecture · grand facade · establishing · full body",
    exampleImage: "/images/ai-prompts/quiet-luxury-london-shot-7.jpg",
    prompt: `Create image 7 of the same quiet luxury London editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: the grand entrance of an elegant London building, a white-painted or pale stone neoclassical facade with a tall arched doorway, black iron lanterns, fluted columns or carved cornices, polished black door framing. Warm interior light glows softly through the glass behind the door. Pale stone steps and pavement, gentle overcast daylight, quiet old-money street.

Outfit: oversized camel-taupe tailored blazer over a fitted cream high-neck top, matching wide-leg trousers, black pointed slingback heels, small black quilted chain bag on one shoulder, black rectangular sunglasses, minimal gold jewelry.

Hair: long soft waves with a clean middle part and natural movement. Keep the person's natural hair color from the uploaded reference photos.

Makeup: blurred natural skin finish, softly sculpted cheeks, natural brows, soft brown eye definition, warm nude satin lip.

Accessories/props: black quilted chain bag, black sunglasses, minimal gold jewelry only. No phone, no coffee.

Pose: standing at the foot of the steps or just inside the arched doorway, body angled toward the architecture, one hand resting near the bag strap, head turned slightly up or to the side, calm composed expression. She is a smaller figure within the grand facade, not filling the frame.

Camera + lens: shot on Canon EOS R5 with a 35mm lens from a proper distance, architectural framing that keeps both the building and the full body natural, no wide-angle distortion.

Camera angle: eye-level to slightly low angle to let the building rise above her, pulled well back.

Composition: vertical 9:16 establishing shot, the grand facade and arched doorway dominant, subject positioned off-center within the architecture, strong vertical building lines.

Body proportion lock: keep full-body anatomy realistic at a distance. Natural head size, natural leg length, balanced torso, realistic hips and shoulders, normal heel size. Avoid stretched legs, tiny head, warped feet, exaggerated proportions.

Mood: arriving somewhere expensive, old-money London, quiet luxury, architectural and calm.

Color grading: warm camel and cream tones, soft black door and iron accents, pale stone facade, muted gray London light, warm glow from the interior windows, gentle gold warmth, low-saturation quiet-luxury edit, subtle film grain.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, sharp architectural detail, no blur, no low-resolution softness, no compression haze.

Avoid: phone, distorted hands, extra fingers, warped heels, warped architecture, melted columns, crooked building lines, stretched legs, tiny head, plastic skin, heavy glam makeup, cartoonish AI style, CGI, fantasy lighting, blur, random logos, fake signage text.`,
  },
  {
    number: "96",
    id: "quiet-luxury-london-shot-8",
    title: "Quiet Luxury London · Checking Phone",
    whenToUse: "The candid pause. Stopped on the pavement checking your phone, coffee in the other hand. Founder-on-the-go energy. Works for productivity captions, day-in-my-life content, or any honest in-between moment.",
    mood: "quiet luxury · checking phone · candid pause · coffee · real moment",
    exampleImage: "/images/ai-prompts/quiet-luxury-london-shot-8.jpg",
    prompt: `Create image 8 of the same quiet luxury London editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: paused on a quiet London pavement beside a pale stone building, soft reflections in a shop window behind, black iron railings, muted overcast morning light, calm street atmosphere.

Outfit: oversized camel-taupe tailored blazer over a fitted cream high-neck top, matching wide-leg trousers, black pointed slingback heels, small black quilted chain bag on one shoulder, black rectangular sunglasses worn or pushed up on the head, minimal gold jewelry.

Hair: long soft waves with a clean middle part and natural movement. Keep the person's natural hair color from the uploaded reference photos.

Makeup: blurred natural skin, softly sculpted cheeks, natural brows, soft brown eye definition, warm nude satin lip.

Accessories/props: an Apple iPhone Pro Max held in one hand, checked naturally, and one kraft-brown takeaway coffee cup in the other hand. Black quilted chain bag on the shoulder, minimal gold jewelry.

Pose: standing still on the pavement, body angled three-quarters, head tilted slightly down toward the phone screen in one hand, the coffee cup held low in the other hand, shoulders relaxed, calm focused expression, a real caught-mid-day pause.

Camera + lens: shot on Canon EOS R5 with a 50mm portrait lens, natural compression, realistic body proportions, no wide-angle distortion.

Camera angle: eye-level street angle, slightly pulled back to show the outfit, phone, coffee, and quiet street context.

Composition: vertical 9:16 three-quarter editorial shot, subject slightly off-center, soft street and window reflections behind, phone and coffee clearly readable.

Body proportion lock: keep standing proportions realistic. Natural head size, natural arm length, balanced shoulders, waist, hips, torso, hands, and feet. Avoid stretched legs, oversized hands, warped phone, tiny head, exaggerated proportions.

Mood: founder-on-the-go, quiet-luxury London morning, calm focus, real in-between moment, candid and effortless.

Color grading: warm camel and cream tones, soft black accents, kraft-brown coffee cup, muted gray London street, gentle gold warmth, soft reflections, low-saturation quiet-luxury finish, subtle film grain.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: distorted hands, extra fingers, warped phone, fake Apple logo, warped coffee cup, warped heels, stretched legs, tiny head, plastic skin, heavy glam makeup, cartoonish AI style, CGI, blur, cluttered street, random logos, readable text on the phone screen.`,
  },
  {
    number: "97",
    id: "quiet-luxury-london-shot-9",
    title: "Quiet Luxury London · Through the Cab Window",
    whenToUse: "The cinematic closer. Seen from outside through the window of a black London cab, soft glass reflections over you inside. The most editorial frame in the set. Use as a standalone art-direction post or the final carousel slide.",
    mood: "quiet luxury · black cab · through glass · cinematic · series closer",
    exampleImage: "/images/ai-prompts/quiet-luxury-london-shot-9.jpg",
    prompt: `Create image 9 of the same quiet luxury London editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: a classic black London cab parked or pausing at the curb, photographed from outside on the pavement, looking in through the rear side window. The window glass carries soft reflections of the pale stone London street and overcast sky. Inside, the dark cab interior is dim and warm. She is seated in the back.

Outfit: oversized camel-taupe tailored blazer over a fitted cream high-neck top, small black quilted chain bag on her lap, minimal gold jewelry, black rectangular sunglasses worn or held.

Hair: long soft waves with a clean middle part falling around the face. Keep the person's natural hair color from the uploaded reference photos.

Makeup: blurred natural skin, softly sculpted cheeks, soft brown eye definition, natural brows, warm nude satin lip.

Accessories/props: black quilted chain bag on the lap, minimal gold jewelry, black sunglasses. No phone.

Pose: seated in the back of the cab, body turned slightly toward the window, face in three-quarter view looking out or softly down, one hand resting on the bag or near the window edge, calm reflective expression. Part of her is veiled by the soft reflections on the glass.

Camera + lens: shot on Sony A7R V with an 85mm portrait lens from outside the cab, shooting through the window glass, shallow depth of field, sharp face inside the glass, soft reflective layer on the surface.

Camera angle: eye-level to the window from the pavement, straight into the glass, natural perspective, no face distortion.

Composition: vertical 9:16 cinematic crop, the cab window framing her, street reflections layered over the glass, her face and figure readable inside the dim interior, off-center.

Body proportion lock: keep seated anatomy and facial structure realistic through the glass. Natural head size, neck length, shoulder width, hand size. Avoid changed face, doubled-face reflection errors, stretched neck, oversized fingers, warped window frame.

Mood: leaving the city quietly, reflective, expensive, cinematic, the soft private end of a London morning.

Color grading: warm camel and cream tones inside, soft black cab interior, cool gray-silver reflections on the glass, muted London street tones in the reflection, gentle gold warmth on skin and jewelry, low-saturation cinematic finish, subtle film grain.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp face detail through the glass, realistic glass reflection, no blur on the main subject, no low-resolution softness, no compression haze.

Avoid: distorted reflection, doubled or warped face, fake-looking glass, warped window frame, distorted hands, extra fingers, plastic skin, over-smoothed beauty filter, cartoonish AI style, CGI, fantasy lighting, blur, random logos, fake signage text.`,
  },
]

// ---------------------------------------------------------------------------
// COLLECTION 08 — NOIR FEMME Editorial (9 shots)
// ---------------------------------------------------------------------------

export const NOIR_FEMME_SERIES: PromptCard[] = [
  {
    number: "80",
    id: "noir-femme-shot-1",
    title: "Noir Femme · Walking Toward Camera",
    whenToUse: "Your ground-level opener. Full-body upshot, mid-stride, lace flares lifting off cobblestones. Use for reel covers, carousel openers, or any content that leads with movement and presence.",
    mood: "noir editorial · ground-level upshot · lace flares · full body · movement",
    exampleImage: "/images/ai-prompts/noir-femme-shot-1.png",
    prompt: `Use the uploaded reference photos as the only source for this person's face and identity. Preserve her exact facial structure, face shape, skin tone, natural skin texture, body proportions, and age. Do not idealize, smooth, or alter the face.

Create image 1 of a 9-part NOIR FEMME editorial photoshoot.

Scene: European cobblestone street, individual stones visible with mortar gaps. Raw dark stone building facade close behind her. Flat overcast daylight, heavy and cool. Camera at ground level, angled upward.

Subject: Woman mid-stride, walking directly toward the camera. Both feet slightly off the ground — caught between steps. Black flare lace trousers lifting and separating with the stride — wide bell flares rising away from the cobblestones, large-scale floral lace pattern sharp and readable, sheer fabric showing the legs beneath. Oversized black blazer swinging open with the movement — belt tie loose, black lace bralette and bare midriff visible through the opening. Black quilted chain bag swinging at her side. Black open-toe heeled mules — one heel lifted mid-step. Thin gold necklace catching flat light. Long dark wavy hair lifting slightly with movement. Face forward, eyes straight at the lens — not performing, just walking.

Composition: The lace flares are the dominant shape — two wide dark wings lifting away from the cobblestones in the foreground. Strong upward perspective — legs long, face at the top of the frame. Cobblestones recede behind her heels. Subject slightly off-center.

Style: Black and white editorial movement photograph. Deep blacks throughout. Lace flares in mid-gray against near-black cobblestones. Heavy shadows under the flare hems. Dark moody grade — underexposed, crushed blacks, minimal highlights. Subtle film grain.

Image quality: Vertical 9:16, 2K quality, minimum 1440 x 2560 px.

Avoid: No plastic fabric. No static posed stance. No CGI surfaces. No warped lace pattern. No distorted leg anatomy. No centered composition. No illustration.`,
  },
  {
    number: "81",
    id: "noir-femme-shot-2",
    title: "Noir Femme · Mid-Pivot Turning Away",
    whenToUse: "The movement mystery shot. Body in rotation, hair sweeping, back to camera. Use for transitions, moody editorial breaks, or content about turning the page.",
    mood: "noir editorial · mid-pivot · turning away · hair in motion · from behind",
    exampleImage: "/images/ai-prompts/noir-femme-shot-2.png",
    prompt: `Use the uploaded reference photos as the only source for this person's face and identity. Preserve her exact facial structure, face shape, skin tone, natural skin texture, body proportions, and age. Do not idealize, smooth, or alter the face.

Create image 2 of a 9-part NOIR FEMME editorial photoshoot.

Scene: European cobblestone street with raw rough-cut dark stone column on the left frame edge. Cream neoclassical stone facade blurred in the background. Heavy overcast light, flat and cool.

Subject: Woman caught mid-pivot — body turning away from the camera, weight transferring in the turn. Shot from behind and slightly to the right. The back of the oversized black blazer dominant — crepe fabric twisting slightly with the turn, belt tie swinging outward from the waist. Long dark wavy hair sweeping across the back with the rotation — strands lifting and separating mid-air, not settled. Wide black lace trouser flares swinging outward with the pivot — bell hems lifting and slightly motion-blurred at the edges. One black open-toe heeled mule visible, heel lifted. The side of her jaw and one cheekbone barely visible at the frame edge — just enough to suggest the face without showing it fully.

Composition: Camera at hip height, behind and to the right. Hair sweep and flare swing are the movement anchors. Stone column on the left creates a dark vertical border. The turning body creates a diagonal line across the frame. No centered composition.

Style: Black and white editorial movement photograph. Dark moody grade — deep blacks in the blazer and cobblestones, hair mid-air in dark gray, lace flare edges slightly motion-blurred. Crushed blacks, underexposed, minimal highlights. Subtle film grain.

Image quality: Vertical 9:16, 2K quality, minimum 1440 x 2560 px.

Avoid: No plastic fabric. No static pose. No CGI surfaces. No warped lace. No centered composition. No full face visible. No illustration.`,
  },
  {
    number: "82",
    id: "noir-femme-shot-3",
    title: "Noir Femme · Looking Back Over Shoulder",
    whenToUse: "The head-turn tension shot. Body moving forward, face looking back. Use for before/after content, mid-walk lifestyle posts, or any caption about moving forward while staying aware.",
    mood: "noir editorial · head turn · three-quarter profile · lace trousers · blazer closed",
    exampleImage: "/images/ai-prompts/noir-femme-shot-3.png",
    prompt: `Use the uploaded reference photos as the only source for this person's face and identity. Preserve her exact facial structure, face shape, skin tone, natural skin texture, body proportions, and age. Do not idealize, smooth, or alter the face.

Create image 3 of a 9-part NOIR FEMME editorial photoshoot.

Scene: European cobblestone street, raw dark stone wall running along the left side. Shot from slight distance at eye level. Heavy flat overcast light, cool and dim.

Subject: Woman mid-walk, head turned back over her left shoulder looking behind her — body still moving forward. Oversized black blazer belted closed at the waist with the self-tie sash — front panels closed, belt knot sitting at the waist with soft fabric folds beneath. Blazer swinging slightly with the stride but remaining closed. Black flare lace trousers mid-stride — one flare hem lifted off the cobblestones. Face in three-quarter view — one eye fully visible looking directly back at the lens. Long dark wavy hair swept to one side by the head turn, strands crossing her cheek. Thin gold necklace catching a faint highlight. Black quilted chain bag on her shoulder.

Composition: Camera at eye level, slight distance — head to just below the knee. Body moving forward creates a diagonal lean. Turned head creates tension — body going one way, eyes going the other. Blazer remains fully belted and closed.

Style: Black and white editorial movement photograph. Dark moody grade — deep blacks in the blazer and stone wall, cobblestones in near-black, face in clean grayscale. Crushed blacks, underexposed. Subtle film grain.

Image quality: Vertical 9:16, 2K quality, minimum 1440 x 2560 px.

Avoid: No open blazer. No visible bralette or midriff. No plastic fabric. No static pose. No CGI surfaces. No warped lace. No centered composition. No illustration.`,
  },
  {
    number: "83",
    id: "noir-femme-shot-4",
    title: "Noir Femme · Fixing the Heel",
    whenToUse: "The graphic pause. One leg raised behind her, hand reaching to the ankle strap. A strong standalone shot or detail-heavy carousel slide.",
    mood: "noir editorial · heel fix · upright balance · lace lifted mid-air · graphic line",
    exampleImage: "/images/ai-prompts/noir-femme-shot-4.png",
    prompt: `Use the uploaded reference photos as the only source for this person's face and identity. Preserve her exact facial structure, face shape, skin tone, natural skin texture, body proportions, and age. Do not idealize, smooth, or alter the face.

Create image 4 of a 9-part NOIR FEMME editorial photoshoot.

Scene: European cobblestone street, raw dark stone wall soft and out of focus behind her. Heavy overcast light from above, flat and cool.

Subject: Woman standing upright — one leg lifted behind her, knee bent, foot raised up toward her hand. Her right arm reaching back and downward, fingers grasping the ankle strap of the black open-toe mule to adjust it — strap between her fingers, foot suspended behind her. Body weight entirely on the left leg, standing straight and upright — not bent forward. Oversized black blazer fully belted and closed — front panels together, belt knot at the waist. Black flare lace trousers — standing leg straight, raised leg showing the lace fabric pulling taut from the knee upward as the leg lifts. Lace flare of the raised leg hanging and swinging freely mid-air behind her. Black quilted chain bag on the shoulder. Face angled slightly downward looking toward the raised foot — hair falling forward slightly.

Composition: Camera at three-quarter body height, slightly to the side. The raised leg and reaching arm create a strong graphic line — heel to hand. Standing leg straight and grounded on the cobblestone.

Style: Black and white editorial movement photograph. Dark moody grade — deep blacks in the blazer, cobblestones in near-black, lifted lace flare in mid-gray catching flat light mid-air. Crushed blacks, underexposed. Subtle film grain.

Image quality: Vertical 9:16, 2K quality, minimum 1440 x 2560 px.

Avoid: No bent-forward posture. No open blazer. No visible midriff. No plastic fabric. No warped lace. No CGI surfaces. No distorted leg anatomy. No centered composition. No illustration.`,
  },
  {
    number: "84",
    id: "noir-femme-shot-5",
    title: "Noir Femme · Walking Away Down the Street",
    whenToUse: "The cinematic wide closer. Small figure, tall facades, converging vanishing-point perspective. Use as a series closer, reel cover, or any caption about moving forward alone.",
    mood: "noir editorial · wide shot · vanishing point · walking away · architectural",
    exampleImage: "/images/ai-prompts/noir-femme-shot-5.png",
    prompt: `Use the uploaded reference photos as the only source for this person's face and identity. Preserve her exact facial structure, face shape, skin tone, natural skin texture, body proportions, and age. Do not idealize, smooth, or alter the face.

Create image 5 of a 9-part NOIR FEMME editorial photoshoot.

Scene: Long European cobblestone street receding into the distance. Cream neoclassical stone building facades on both sides — arched windows, carved cornices, buildings creating a corridor that narrows toward a vanishing point. Heavy overcast sky above. Shot from far back, wide.

Subject: Woman walking away from the camera down the cobblestone street — small figure in the middle distance, not close. Both feet mid-stride. The back of the oversized black blazer — belt tie visible at the back waist. Wide black flare lace trousers — both bell flares lifting slightly with each step, lace hems brushing the cobblestones, sheer fabric catching flat overcast light. Long dark wavy hair moving with her stride. Black quilted chain bag on her shoulder. She does not look back.

Composition: Camera at eye level, far back — she occupies roughly the middle third of the frame vertically, small against the tall building facades. Converging building lines and cobblestone street lines all lead to her. Subject slightly left or right of center — not centered. No other people on the street.

Style: Black and white editorial wide photograph. Darkest, moodiest frame in the set — deep black cobblestones, near-black building facades in shadow, figure in mid-gray, pale overcast sky the only light source above. Maximum crushed blacks, heavily underexposed, figure almost dissolving into the street. Subtle film grain.

Image quality: Vertical 9:16, 2K quality, minimum 1440 x 2560 px.

Avoid: No plastic fabric. No CGI surfaces. No warped lace. No static pose. No other people on the street. No centered figure. No illustration.`,
  },
  {
    number: "85",
    id: "noir-femme-shot-6",
    title: "Noir Femme · Eyes Down, Hair Across",
    whenToUse: "Intimate face close-up — downcast eyes, hair falling across the cheek. Use for beauty posts, personal captions, or any post where the face tells the story without looking at the lens.",
    mood: "noir portrait · close-up · eyes down · hair across · natural texture",
    exampleImage: "/images/ai-prompts/noir-femme-shot-6.png",
    prompt: `Use the uploaded reference photos as the only source for this person's face and identity. Preserve her exact facial structure, face shape, skin tone, natural skin texture, body proportions, and age. Do not idealize, smooth, or alter the face.

Create image 6 of a 9-part NOIR FEMME editorial photoshoot — Bonus A.

Scene: Raw dark European stone wall completely out of focus behind her. Single flat light source from above-left. Heavy and cool.

Subject: Tight face crop — forehead to chin, cut close on both sides. Head tilted very slightly downward, eyes cast down — not at the camera. Long dark wavy hair falling forward, one thick section crossing the cheek and jaw, partially framing the face. Expression completely neutral — lips relaxed and closed, jaw soft. Thin gold necklace chain just visible at the bottom edge of the frame. Natural skin texture visible — pores, the faint shadow under the lower lip, the collarbone shadow beginning at the very bottom of the crop.

Composition: Camera at face height, very close. The downward eye direction means we see the eyelids and lashes clearly. Shallow depth of field — face sharp, hair strands against the skin sharp, stone wall behind completely dissolved into dark gray.

Style: Black and white editorial close portrait. Skin in clean grayscale with natural texture. Hair in deep dark gray. Dark moody grade, crushed blacks, underexposed. Subtle film grain.

Image quality: Vertical 9:16, 2K quality, minimum 1440 x 2560 px.

Avoid: No eye contact with camera. No over-smoothed skin. No idealized face. No CGI surfaces. No centered composition. No smile. No illustration.`,
  },
  {
    number: "86",
    id: "noir-femme-shot-7",
    title: "Noir Femme · Mid-Hair Push, Eyes Closed",
    whenToUse: "The private, unguarded portrait. Both hands at the hairline, eyes closed, face to the light. Use for intimate captions, process content, or any post where vulnerability is the message.",
    mood: "noir portrait · hands in hair · eyes closed · private moment · intimate",
    exampleImage: "/images/ai-prompts/noir-femme-shot-7.png",
    prompt: `Use the uploaded reference photos as the only source for this person's face and identity. Preserve her exact facial structure, face shape, skin tone, natural skin texture, body proportions, and age. Do not idealize, smooth, or alter the face.

Create image 7 of a 9-part NOIR FEMME editorial photoshoot — Bonus B.

Scene: European cobblestone street, cream stone facade completely soft and out of focus behind her. Heavy flat overcast light from above.

Subject: Tight face crop — just the face from chin to hairline. Both hands visible at the temples and hairline — fingers pressing hair back off the forehead, caught mid-push. Eyes closed in the gesture — eyelids relaxed, lashes resting. Lips slightly parted, not smiling, just breathing. The hair half-pushed back — some strands still falling forward across the forehead, caught between the fingers. Thin gold necklace just catching a faint line of light at the very bottom of the frame. Skin rendered in grayscale — the natural shadows under the cheekbones, the slight shadow above the upper lip.

Composition: Camera at face height, close. The hands at the hairline frame the face from both sides. The closed eyes make this feel completely private. Shallow depth of field, stone facade completely dissolved behind her.

Style: Black and white editorial close portrait. Natural skin texture intact. Dark moody grade, crushed blacks. Subtle film grain.

Image quality: Vertical 9:16, 2K quality, minimum 1440 x 2560 px.

Avoid: No open eyes. No over-smoothed skin. No idealized face. No distorted fingers. No CGI surfaces. No smile. No illustration.`,
  },
  {
    number: "87",
    id: "noir-femme-shot-8",
    title: "Noir Femme · Sharp Profile, Chin Up",
    whenToUse: "The architectural portrait. Pure 90-degree profile against dark stone — jawline, throat, necklace. Use for visual brand statements or any caption about clarity and direction.",
    mood: "noir portrait · true 90° profile · chin up · jawline · architectural",
    exampleImage: "/images/ai-prompts/noir-femme-shot-8.png",
    prompt: `Use the uploaded reference photos as the only source for this person's face and identity. Preserve her exact facial structure, face shape, skin tone, natural skin texture, body proportions, and age. Do not idealize, smooth, or alter the face.

Create image 8 of a 9-part NOIR FEMME editorial photoshoot — Bonus C.

Scene: Dark European stone wall filling the background — close enough to be slightly textured, far enough to be out of focus. Single flat light source from directly in front of her face.

Subject: Tight profile crop — her face turned exactly 90 degrees to the camera, pure side profile. Chin lifted slightly upward — the jaw line sharp against the dark background, the throat long, the thin gold necklace visible against the skin in profile. Eyes looking forward and slightly upward — not at the camera, focused on something in the distance. Lips closed, the natural curve of the upper and lower lip visible in profile. Long dark wavy hair falling behind the shoulder — one strand curling forward against the collarbone, visible at the bottom of the frame. The black blazer lapel visible at the very bottom edge.

Composition: Camera at exact face height, perfectly level for a true side profile. The jaw line and throat are the composition. The dark stone wall behind creates maximum contrast against the lit side of the face. The shadow side of the face falls into near-black.

Style: Black and white editorial profile portrait. The lit side of the face in clean grayscale, the shadow side crushed to near-black, the jaw line the sharpest edge in the frame. Dark moody grade. Subtle film grain.

Image quality: Vertical 9:16, 2K quality, minimum 1440 x 2560 px.

Avoid: No three-quarter turn — true 90 degree profile only. No over-smoothed skin. No idealized face. No eye contact with camera. No CGI surfaces. No illustration.`,
  },
  {
    number: "88",
    id: "noir-femme-shot-9",
    title: "Noir Femme · Looking Back, Face Over Shoulder",
    whenToUse: "The only direct-eye-contact shot in the series. Tight over-the-shoulder crop, sharp neck turn, full gaze straight to the lens. Use when you want to stop the scroll with pure presence.",
    mood: "noir portrait · over shoulder · eye contact · direct · confrontational",
    exampleImage: "/images/ai-prompts/noir-femme-shot-9.png",
    prompt: `Use the uploaded reference photos as the only source for this person's face and identity. Preserve her exact facial structure, face shape, skin tone, natural skin texture, body proportions, and age. Do not idealize, smooth, or alter the face.

Create image 9 of a 9-part NOIR FEMME editorial photoshoot — Bonus D.

Scene: European cobblestone street receding behind her, stone wall soft on the left. Heavy overcast light, flat and cool from above.

Subject: Tight crop from the shoulders up — her body facing away from the camera, face turned back over her right shoulder looking directly into the lens. The turn is sharp — maximum rotation, the neck muscles visible with the effort of the turn. Eyes direct and calm, looking straight into the camera — this is the only shot in the series with direct eye contact. Lips closed, expression neutral, no smile. Long dark wavy hair — most of it falling down her back away from us, but the turn has pulled some strands across her cheek and neck. The back of the oversized black blazer collar framing the neck and shoulder. The shoulder seam of the blazer sharp at the top of the frame.

Composition: Camera at shoulder height, close — tight crop, just shoulders and face. The sharp neck turn creates a strong diagonal line from the shoulder to the jaw. The direct eye contact is the contrast to all other shots in the series.

Style: Black and white editorial over-the-shoulder portrait. Deep black blazer back in the foreground, face in clean sharp grayscale, hair in dark gray. Dark moody grade, crushed blacks. Subtle film grain.

Image quality: Vertical 9:16, 2K quality, minimum 1440 x 2560 px.

Avoid: No over-smoothed skin. No idealized face. No CGI surfaces. No smile. No centered composition. No full forward-facing body. No illustration.`,
  },
]

// ---------------------------------------------------------------------------
// COLLECTION 07 — Clean Girl Founder Morning Editorial (10 shots)
// ---------------------------------------------------------------------------

export const CLEAN_GIRL_MORNING_SERIES: PromptCard[] = [
  {
    number: "70",
    id: "clean-girl-morning-shot-1",
    title: "Clean Girl · Soft Morning Mirror Selfie",
    whenToUse: "Your opener. Bedroom mirror selfie in cream knit loungewear, soft window light, phone covering part of the face. Use for morning routine content, outfit check captions, or any post about the quiet start of a founder day.",
    mood: "clean girl · mirror selfie · morning soft · bedroom · cozy",
    exampleImage: "/images/ai-prompts/clean-girl-morning-shot-1.jpg",
    prompt: `Create image 1 of a 10-part clean girl founder morning editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Editorial concept: A soft founder morning mirror selfie that feels calm, feminine, and elevated — like the first quiet moment before the workday begins.

Micro-story moment: She is sitting on the edge of the bed or sofa, still in her soft morning clothes, taking a quick mirror selfie before starting her day.

Scene and atmosphere: Creamy white bedroom or soft living room with white bedding, sheer curtains, soft window light, neutral pillows, and a clean minimal interior. Peaceful, expensive, and real — not staged.

Wardrobe: Cream ribbed knit lounge pants, soft white tank or fitted cream top, oversized white cardigan slipping slightly off one shoulder, fluffy cream slippers or bare feet.

Hair and makeup: Natural hair color from the uploaded reference photos. Soft brushed waves or relaxed morning waves, slightly undone. Fresh clean skin, brushed brows, soft cream blush, nude glossy lip.

Accessories: Apple iPhone Pro Max only, held naturally for a mirror selfie.

Pose and body language: Seated casually with one knee slightly bent, phone covering part of the face, shoulders relaxed, cardigan falling softly, body angled toward the mirror.

Composition: Vertical 9:16 mirror selfie crop. Show the soft outfit, bed or sofa texture, window light, and calm neutral room. Keep the mirror reflection realistic and not overly perfect.

Lighting: Soft natural morning daylight through sheer curtains, gentle shadows, no harsh flash.

Color grading: Creamy whites, oat beige, soft warm highlights, muted shadows, low contrast, airy Pinterest editorial finish, subtle film grain.

Image quality: Vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px, sharp mirror reflection, crisp knit texture, realistic skin texture, no blur, no compression haze.

Avoid: cluttered room, harsh white overexposure, distorted hands, extra fingers, warped phone, fake mirror reflection, plastic skin, CGI, cheap staged bedroom photoshoot.`,
  },
  {
    number: "71",
    id: "clean-girl-morning-shot-2",
    title: "Clean Girl · Bathroom Skincare In Use",
    whenToUse: "The real skincare moment — not a product shelf ad. Use for beauty content, morning routine posts, or any caption about showing up for yourself before anyone else.",
    mood: "clean girl · bathroom · skincare · dewy skin · UGC morning routine",
    exampleImage: "/images/ai-prompts/clean-girl-morning-shot-2.jpg",
    prompt: `Create image 2 of the same clean girl founder morning editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Editorial concept: A real bathroom skincare moment — the product is in use, not just displayed.

Micro-story moment: She is standing at the bathroom mirror applying skincare or lip treatment while getting ready.

Scene and atmosphere: Minimal beige bathroom with warm stone vanity, cream towel, mirror, soft daylight, and a slightly lived-in counter.

Wardrobe: Oversized white robe or thick cream cardigan over a fitted white tank. Sleeves slightly long and soft.

Hair and makeup: Natural hair color from the reference photos. Hair softly clipped back, tucked behind ears, or loosely tied. Skin is fresh and dewy, brows brushed, nude lip balm.

Products: Use real mixed products naturally — Rhode Glazing Milk or Rhode Peptide Lip Treatment in hand, with Summer Fridays Jet Lag Mask, Laneige Lip Sleeping Mask, OUAI product, or BYOMA serum sitting casually on the vanity. Use 2–3 products maximum.

Pose and body language: Face visible in the mirror or directly in frame. One hand applies Rhode Peptide Lip Treatment or skincare near the cheek. The other hand rests on the vanity or holds the product. Expression focused and natural.

Composition: Vertical 9:16 bathroom mirror or side-angle frame. Show face, hand applying product, robe or cardigan sleeve, and small messy vanity detail. Not a perfect flatlay.

Lighting: Soft bathroom daylight, warm stone reflection, gentle shadows.

Color grading: Warm beige stone, creamy white robe, soft pastel product packaging, natural skin glow, low saturation, clean UGC editorial finish, subtle grain.

Image quality: Vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px, sharp face, crisp product packaging, realistic hand detail, no blur.

Avoid: perfect product lineup, too many products, fake labels, distorted fingers, warped product tube, plastic skin, harsh commercial lighting, CGI.`,
  },
  {
    number: "72",
    id: "clean-girl-morning-shot-3",
    title: "Clean Girl · Kitchen Coffee + Breakfast",
    whenToUse: "The morning moves into the kitchen. Use for slow morning content, what-I-eat posts, or any caption about the pace of a founder day.",
    mood: "clean girl · kitchen · coffee · breakfast · morning movement",
    exampleImage: "/images/ai-prompts/clean-girl-morning-shot-3.jpg",
    prompt: `Create image 3 of the same clean girl founder morning editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Editorial concept: The morning moves into the kitchen — coffee, breakfast, and getting ready to work, not a still-life flatlay.

Micro-story moment: She is standing at the kitchen counter making coffee or reaching for breakfast while checking her phone.

Scene and atmosphere: Soft neutral kitchen with stone countertop, cream cabinets, morning light, coffee machine or mug, yogurt bowl with raspberries and granola, and a slightly imperfect real-life counter.

Wardrobe: White fitted tank or cropped cream cardigan, relaxed butter-yellow boxer shorts or soft beige drawstring trousers. Bare feet, cream socks, or soft slippers.

Hair and makeup: Natural hair color from the reference photos. Softly brushed, clipped back on one side, or loose with relaxed waves. Fresh skin, lip balm or gloss visible.

Accessories: Apple iPhone Pro Max in one hand or resting on the counter. Coffee mug, yogurt bowl, spoon.

Pose and body language: Standing slightly angled at the counter, one hand reaching for the mug or spoon, the other holding the phone low. Face visible, gaze lowered toward the counter or phone. Natural movement.

Composition: Vertical 9:16 medium lifestyle frame from a slight side angle, showing face, outfit, kitchen counter, coffee, breakfast, and morning light.

Lighting: Soft morning kitchen light, natural shadows, no flash.

Color grading: Cream cabinets, oat beige counter, coffee brown, raspberry red accent, pale butter yellow, warm daylight, subtle film grain, airy UGC editorial finish.

Image quality: Vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px, sharp face, realistic food texture, crisp phone edge, no blur.

Avoid: perfect flatlay, fake food, cluttered kitchen, warped phone, distorted hands, overexposed whites, plastic skin, CGI, staged sponsor post.`,
  },
  {
    number: "73",
    id: "clean-girl-morning-shot-4",
    title: "Clean Girl · Living Room Founder Work Moment",
    whenToUse: "The soft founder work shot. MacBook open, matcha nearby, elevated knit outfit. Use for working-from-home content, productivity captions, or posts about building something from wherever you are.",
    mood: "clean girl · living room · laptop · founder work · soft editorial",
    exampleImage: "/images/ai-prompts/clean-girl-morning-shot-4.jpg",
    prompt: `Create image 4 of the same clean girl founder morning editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Editorial concept: The soft founder work moment — styled like an elevated fashion editorial instead of a boring laptop shot.

Micro-story moment: She has moved to the living room, coffee nearby, laptop open, planning her day before getting fully dressed.

Scene and atmosphere: Cream living room with soft sofa, low coffee table, sheer curtains, warm natural light, neutral textured pillows, Apple MacBook open, notebook, latte or matcha. Calm, personal, and lightly lived-in.

Wardrobe: Fashion-forward home outfit — ivory off-shoulder fine-knit top or sculptural cream knit cardigan, relaxed wide-leg linen trousers or soft parachute trousers in oat beige. Current, elevated, feminine, and wearable.

Hair and makeup: Natural hair color from the reference photos. Soft polished waves or a clean low bun with loose pieces. Fresh skin, cream blush, nude glossy lip, brushed brows.

Accessories: Apple MacBook, Apple iPhone Pro Max, notebook, coffee or matcha. One lip product sitting naturally on the coffee table.

Pose and body language: Seated sideways on the sofa or floor cushion, one leg tucked under, laptop open, one hand near the keyboard, face visible and turned toward the window or laptop. Focused, calm, in control.

Composition: Vertical 9:16 editorial lifestyle frame from a low side angle or slightly above, showing face, outfit silhouette, laptop, coffee, and soft living room texture.

Lighting: Soft window light, gentle shadows, airy but not overexposed.

Color grading: Cream, oat beige, soft gold highlights, pale matcha green if present, low contrast, warm daylight, subtle grain, clean founder editorial finish.

Image quality: Vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px, sharp face, crisp knit and linen texture, realistic laptop detail, no blur.

Avoid: corporate office vibe, boring sweatshirt outfit, too many props, fake laptop screen, distorted hands, product-ad stiffness, plastic skin, CGI.`,
  },
  {
    number: "74",
    id: "clean-girl-morning-shot-5",
    title: "Clean Girl · Closet Getting Dressed Moment",
    whenToUse: "The morning becomes fashion-forward. Wardrobe backdrop, getting-dressed action. Use for outfit reveal content, wardrobe posts, or any caption about showing up polished.",
    mood: "clean girl · getting dressed · wardrobe · outfit transition · fashion-forward",
    exampleImage: "/images/ai-prompts/clean-girl-morning-shot-5.jpg",
    prompt: `Create image 5 of the same clean girl founder morning editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Editorial concept: The getting-dressed moment that makes the shoot feel desirable.

Micro-story moment: She is in the closet or bedroom mirror area, changing from soft morning clothes into a polished founder outfit.

Scene and atmosphere: Cream wardrobe or dressing area with soft shelves, neutral handbags, shoes, folded knits, and window light. Clean but lived-in, not a showroom.

Wardrobe: Fashion-forward final outfit — soft ivory off-shoulder knit top or fitted white tank layered under an oversized cream cardigan, high-waisted wide-leg tailored trousers in warm beige or pale butter yellow, slim belt, pointed flats, ballet flats, loafers, or kitten heels. Current, elevated, feminine, and wearable.

Hair and makeup: Natural hair color from the reference photos. Soft brushed waves or a clean low bun. Makeup fresh but finished — glossy nude lip, sculpted cheeks, brushed brows.

Accessories: Apple iPhone Pro Max only, for mirror selfie or low in one hand. Optional minimal sunglasses or one neutral handbag if it fits naturally.

Pose and body language: Standing near a mirror or closet doorway, one hand adjusting the cardigan, belt, or trouser waistband, phone held low or used for a mirror selfie. Face visible if possible. Body angled to show outfit.

Composition: Vertical 9:16 three-quarter or full-body dressing-room frame. Show outfit silhouette, wardrobe context, and real getting-dressed action.

Lighting: Soft window light, warm cream reflections, gentle shadows.

Color grading: Warm cream wardrobe, oat beige trousers, ivory knit, soft gold highlights, natural skin tones, matte Pinterest editorial finish, subtle grain.

Image quality: Vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px, sharp face, crisp outfit texture, realistic wardrobe detail, no blur.

Avoid: boring matching loungewear, phone covering whole face, stiff mirror pose, cluttered closet, fake bag logos, distorted hands, warped phone, CGI, cheap try-on haul energy.`,
  },
  {
    number: "75",
    id: "clean-girl-morning-shot-6",
    title: "Clean Girl · Real Morning Objects Detail",
    whenToUse: "The tactile detail slide. No face needed. Phone, coffee, lip product, laptop edge — the full morning through objects. Use as a carousel detail slide or standalone mood post.",
    mood: "clean girl · detail shot · morning objects · no face · tactile",
    exampleImage: "/images/ai-prompts/clean-girl-morning-shot-6.jpg",
    prompt: `Create image 6 as the only detail shot of this clean girl founder morning editorial photoshoot.

No full face needed.

Editorial concept: The final tactile frame that captures the whole morning through objects and textures.

Micro-story moment: The morning has happened — coffee, phone, lip product, skincare, knitwear, and laptop are all casually left behind.

Scene and atmosphere: A cream coffee table, bed edge, vanity corner, or kitchen counter with soft daylight. Real and slightly imperfect.

Wardrobe details: Cream knit sleeve or beige trouser fabric visible near the edge of the frame.

Products: Use 3–4 mixed real products — Rhode Peptide Lip Treatment, Summer Fridays Lip Butter Balm, Laneige Lip Sleeping Mask, OUAI product, Dior Addict Lip Maximizer, Glow Recipe Dew Drops, or BYOMA product. Mix brands naturally.

Accessories: Apple iPhone Pro Max, coffee cup or latte, Apple MacBook edge or notebook, one product lid open, one item slightly turned, one item partly out of frame.

Pose and body language: One hand reaching for the phone or coffee, cardigan sleeve falling softly over the wrist. No full face needed.

Composition: Vertical 9:16 close detail crop from above or side angle. It should feel like a real creator morning table, not a perfect product flatlay.

Lighting: Soft daylight, gentle shadows, no flash.

Color grading: Cream, beige, oat milk, soft coffee brown, muted warm highlights, low saturation, airy Pinterest detail edit, subtle grain.

Image quality: Vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px, crisp knit fibers, sharp phone edge, realistic coffee foam, clean product packaging, no blur.

Avoid: too many products, product-only ad shot, perfect symmetrical flatlay, random fake labels, distorted fingers, warped phone, fake coffee foam, plastic textures, CGI.`,
  },
  {
    number: "76",
    id: "clean-girl-morning-shot-7",
    title: "Clean Girl · Bathroom Mirror Skincare Selfie",
    whenToUse: "The post-skincare mirror check. Fresh skin, robe, phone up. Use for glow check captions, UGC-style beauty content, or morning routine posts that feel real and relatable.",
    mood: "clean girl · bathroom mirror selfie · skincare glow · UGC · candid beauty",
    exampleImage: "/images/ai-prompts/clean-girl-morning-shot-7.jpg",
    prompt: `Create image 7 as a bonus selfie shot from the same clean girl founder morning editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Editorial concept: A real bathroom mirror skincare selfie that feels like a soft UGC morning check-in, not a polished beauty campaign.

Micro-story moment: She has just finished skincare and is checking her glow in the bathroom mirror.

Scene and atmosphere: Minimal beige bathroom with warm stone vanity, soft neutral tiles, cream towel, gentle daylight, and a slightly lived-in counter with a few real beauty products casually placed.

Wardrobe: Oversized white robe or cream cardigan over a fitted white tank. Sleeves slightly long and soft.

Hair and makeup: Natural hair color from the reference photos. Hair softly clipped back, tucked behind the ears, or loosely tied. Skin looks fresh and dewy, brows brushed, nude glossy lip, minimal makeup.

Products: 2–3 mixed products visible on the vanity — Rhode Glazing Milk, Summer Fridays Jet Lag Mask, Laneige Lip Sleeping Mask, OUAI product, BYOMA serum, or Glow Recipe Dew Drops. One product lid can be open.

Accessories: Apple iPhone Pro Max only, held naturally for the mirror selfie.

Pose and body language: Standing close to the mirror, phone covering part of the face but not all of it, one hand lightly touching the cheek or robe collar. Calm, fresh, real morning energy.

Composition: Vertical 9:16 bathroom mirror selfie. Show face, robe or cardigan texture, phone, vanity, and small product cluster. Keep it candid and slightly imperfect.

Lighting: Soft bathroom daylight, warm stone reflections, gentle shadows.

Color grading: Warm beige stone, creamy whites, soft oat tones, natural skin glow, low saturation, subtle grain, clean UGC editorial finish.

Image quality: Vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px, sharp mirror reflection, crisp product packaging, realistic skin texture, no blur.

Avoid: perfect product lineup, fake labels, harsh beauty lighting, distorted hands, extra fingers, warped phone, plastic skin, CGI, sponsored-ad stiffness.`,
  },
  {
    number: "77",
    id: "clean-girl-morning-shot-8",
    title: "Clean Girl · Kitchen Counter iPhone Selfie",
    whenToUse: "Coffee before content. Lean-back kitchen selfie with breakfast nearby. Use for morning routine posts, founder-lifestyle captions, or the quiet start before the busy day.",
    mood: "clean girl · kitchen selfie · coffee · casual founder · morning",
    exampleImage: "/images/ai-prompts/clean-girl-morning-shot-8.jpg",
    prompt: `Create image 8 as a bonus selfie shot from the same clean girl founder morning editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Editorial concept: A casual kitchen counter selfie during a slow founder morning, with coffee and breakfast nearby.

Micro-story moment: She is leaning against the kitchen counter, holding her phone for a quick selfie while coffee is brewing or breakfast sits beside her.

Scene and atmosphere: Soft neutral kitchen with cream cabinets, stone countertop, morning light, latte or matcha, yogurt bowl with raspberries and granola, and a real slightly imperfect counter setup.

Wardrobe: White fitted tank or cropped cream cardigan with relaxed beige drawstring trousers, boxer shorts, or soft parachute pants. Casual, current, and desirable.

Hair and makeup: Natural hair color from the reference photos. Softly brushed, clipped back on one side, or loose with relaxed waves. Fresh skin, nude glossy lip, brushed brows.

Accessories: Apple iPhone Pro Max in hand. Coffee, breakfast bowl, and one small beauty item can sit on the counter.

Pose and body language: Leaning slightly against the counter, phone held high or chest-level, face visible, one shoulder relaxed, one hand resting near the coffee or waistband. Calm soft expression.

Composition: Vertical 9:16 iPhone selfie angle, slightly above eye level. Show face, outfit, counter, coffee, and breakfast without making it a flatlay.

Lighting: Soft morning kitchen light, natural shadows, no flash.

Color grading: Cream cabinets, oat beige counter, coffee brown, raspberry red accent, warm daylight, low contrast, airy UGC editorial finish.

Image quality: Vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px, sharp face, realistic food texture, crisp phone edge, no blur.

Avoid: perfect flatlay, fake food texture, cluttered kitchen, overexposed whites, distorted hands, warped phone, plastic skin, CGI, staged sponsor-post energy.`,
  },
  {
    number: "78",
    id: "clean-girl-morning-shot-9",
    title: "Clean Girl · Living Room Laptop Selfie",
    whenToUse: "Soft founder work selfie — laptop open, matcha beside her, cozy outfit. Use for working-from-home content, accountability posts, or any caption about making the work feel good.",
    mood: "clean girl · living room selfie · laptop · founder lifestyle · soft",
    exampleImage: "/images/ai-prompts/clean-girl-morning-shot-9.jpg",
    prompt: `Create image 9 as a bonus selfie shot from the same clean girl founder morning editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Editorial concept: A soft founder work selfie that shows the reality of working from home, but makes it feel calm and elevated.

Micro-story moment: She is sitting in the living room with her laptop open, taking a quick selfie before starting work.

Scene and atmosphere: Cream living room with soft sofa, low coffee table, sheer curtains, warm natural light, neutral pillows, Apple MacBook open, notebook, latte or matcha. Calm, personal, lightly lived-in.

Wardrobe: Fashion-forward home outfit — ivory off-shoulder fine-knit top, sculptural cream knit cardigan, or linen vest with wide-leg trousers or soft parachute trousers in oat beige.

Hair and makeup: Natural hair color from the reference photos. Soft polished waves or clean low bun with loose pieces. Fresh skin, cream blush, nude glossy lip, brushed brows.

Accessories: Apple iPhone Pro Max in hand for selfie. Apple MacBook, notebook, and coffee or matcha nearby.

Pose and body language: Seated sideways on sofa or floor cushion, laptop open beside her, phone held naturally, one knee tucked or legs folded, face visible, relaxed focused expression.

Composition: Vertical 9:16 casual iPhone selfie or slightly reflective screen-style angle. Show face, outfit, laptop, coffee, and soft living room texture.

Lighting: Soft window light, gentle shadows, airy but not overexposed.

Color grading: Cream, oat beige, soft gold highlights, pale matcha green if present, low contrast, warm daylight, subtle grain, clean founder editorial finish.

Image quality: Vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px, sharp face, crisp knit or linen texture, realistic laptop detail, no blur.

Avoid: corporate office vibe, boring sweatshirt outfit, fake laptop screen, too many props, distorted hands, warped phone, plastic skin, CGI, product-ad stiffness.`,
  },
  {
    number: "79",
    id: "clean-girl-morning-shot-10",
    title: "Clean Girl · Window Light FaceTime Selfie",
    whenToUse: "The most intimate shot in the series. Close selfie near the window, finished look, just before the day starts. Use for personal check-in content, profile photos, or captions about showing up for yourself.",
    mood: "clean girl · window light · close selfie · intimate · polished",
    exampleImage: "/images/ai-prompts/clean-girl-morning-shot-10.jpg",
    prompt: `Create image 10 as a creative selfie-style portrait from the same clean girl founder morning editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Editorial concept: A soft, intimate phone-camera selfie that feels like a founder checking in with herself before the day starts.

Micro-story moment: She is sitting near the window after getting ready, holding the phone close like a FaceTime or front-camera selfie.

Scene and atmosphere: Cream bedroom or living room near sheer curtains, soft sofa or bed edge, coffee nearby but blurred. Calm, bright, minimal.

Wardrobe: Ivory off-shoulder knit, cream cardigan, or soft white fitted tank with wide-leg trousers. Stylish but still soft.

Hair and makeup: Natural hair color from reference photos. Soft brushed waves, fresh makeup, glossy nude lip, brushed brows, soft cream blush.

Pose and body language: Close selfie crop from shoulders up, face near the window light, one hand lightly touching hair or cardigan collar, expression calm and soft, eyes toward camera.

Composition: Vertical 9:16 front-camera selfie feel, slightly high angle but flattering, close and intimate. Background softly blurred.

Lighting: Soft side window light, gentle highlights on skin and hair, natural shadows.

Color grading: Creamy whites, warm beige, soft oat tones, pale gold highlights, low contrast, airy matte edit, subtle film grain.

Image quality: Vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px, sharp face, realistic skin texture, crisp hair detail, no blur.

Avoid: overly posed glamour portrait, harsh beauty filter, plastic skin, heavy glam, cluttered background, CGI, generic stock-photo smile.`,
  },
]

// ---------------------------------------------------------------------------
// COLLECTION 06 — Dark Feminine Café Coffee-Run Editorial (6 shots)
// ---------------------------------------------------------------------------

export const DARK_FEMININE_CAFE_SERIES: PromptCard[] = [
  {
    number: "64",
    id: "dark-feminine-cafe-shot-1",
    title: "Dark Feminine Café · Street Arrival",
    whenToUse: "Your opener. Full-body street style, mid-step toward the café. Use for reel covers, carousel openers, or any content that captures confident city movement.",
    mood: "dark feminine · city street · arriving · full body · editorial opener",
    exampleImage: "/images/ai-prompts/dark-feminine-cafe-shot-1.jpg",
    prompt: `Create image 1 of a 6-part dark feminine café coffee-run editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: chic city street outside a stylish café, dark stone sidewalk, glass café windows in the background, marble café tables and woven chairs visible behind the window, soft urban reflections, muted city architecture, late morning street light.

Outfit: oversized black structured blazer with strong shoulders, long relaxed sleeves, and a slightly masculine fit. Underneath, a fitted black square-neck mini dress with a sleek body-skimming silhouette. Black knee-high lace-up leather boots with a polished glossy finish. Black rectangular sunglasses with a sharp modern frame. Minimal gold rings.

Hair: long hair worn down with smooth roots, a soft middle part, airy face-framing layers, natural movement through the lengths, and relaxed undone ends. Keep the person's natural hair color from the uploaded reference photos.

Makeup: blurred natural skin finish, softly sculpted cheeks, natural brows, subtle brown eye definition, and a muted nude-rose satin lip. Makeup should feel polished, modern, and editorial, not heavy glam.

Accessories/props: black rectangular sunglasses and minimal gold rings only. No phone, no coffee yet, no extra props.

Pose: walking across the street toward the café, one foot mid-step, blazer moving slightly with the motion, head turned softly toward the café, chin relaxed, confident calm expression.

Camera + lens: shot on Canon EOS R5 with a 35mm lens from a proper distance, full-body lifestyle framing, realistic proportions, no wide-angle distortion.

Camera angle: waist-height street-style angle, pulled back enough to keep the full body natural and balanced.

Composition: vertical 9:16 full-body movement shot, subject slightly off-center, café visible behind her, street lines and sidewalk leading toward the café entrance.

Body proportion lock: keep full-body anatomy realistic. Natural head size, natural leg length, normal boot size, balanced torso, realistic hips and shoulders, natural walking posture. Avoid stretched legs, tiny head, warped feet, exaggerated runway proportions, or wide-angle body distortion.

Mood: arriving at the café, cool city-girl energy, dark feminine street style, confident and effortless.

Color grading: deep black outfit tones, muted gray pavement, cool glass reflections, soft beige café details, natural skin tones, low-saturation urban edit, subtle film grain, polished Pinterest editorial contrast.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: phone, coffee in hand, distorted hands, extra fingers, warped boots, stretched legs, tiny head, elongated torso, warped waist, unrealistic hips, plastic skin, heavy glam makeup, cartoonish AI style, CGI, fantasy lighting, blur, low-resolution softness, compression haze, cluttered street background.`,
  },
  {
    number: "65",
    id: "dark-feminine-cafe-shot-2",
    title: "Dark Feminine Café · Counter Order",
    whenToUse: "The ordering moment. Three-quarter body at the counter, relaxed and confident. Ideal for lifestyle content and any caption about moving through the world with ease.",
    mood: "dark feminine · café counter · ordering · side profile · lifestyle editorial",
    exampleImage: "/images/ai-prompts/dark-feminine-cafe-shot-2.jpg",
    prompt: `Create image 2 of a 6-part dark feminine café coffee-run editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: inside a stylish café or at an outdoor ordering window, dark marble counter, soft café menu board in the background, warm barista lighting, glass reflections, espresso machine details blurred behind the counter.

Outfit: oversized black structured blazer with strong shoulders, fitted black square-neck mini dress, black knee-high lace-up leather boots, black rectangular sunglasses, minimal gold rings.

Hair: long hair worn down with smooth roots, soft middle part, loose face-framing pieces, and natural movement over the shoulders. Keep the person's natural hair color from the uploaded reference photos.

Makeup: blurred natural skin, softly sculpted cheeks, subtle brown eye definition, natural brows, muted nude-rose satin lips, polished daytime editorial finish.

Accessories/props: black rectangular sunglasses and minimal gold rings. A small structured black handbag can rest against her side or hang from one shoulder if it stays minimal. No phone.

Pose: standing at the café counter in a side-profile or three-quarter angle, one hand lightly resting near the counter as if ordering, shoulders relaxed, face turned slightly toward the barista or menu, calm unbothered expression.

Camera + lens: shot on Canon EOS R5 with a 50mm portrait lens, natural compression, realistic body proportions, no wide-angle distortion.

Camera angle: eye-level counter angle, slightly pulled back to show the outfit, counter, and café context without stretching the body.

Composition: vertical 9:16 medium-full editorial shot, counter on one side, café menu and warm lights softly blurred behind, subject framed slightly off-center.

Body proportion lock: preserve realistic full-body and standing proportions. Natural head size, natural arm length, balanced shoulders, waist, hips, torso, hands, and feet. Avoid stretched legs, oversized hands, warped waist, tiny head, or exaggerated model proportions.

Mood: ordering coffee, chic everyday luxury, calm confidence, fashion-forward café story moment.

Color grading: deep black outfit, dark marble counter, warm café lighting, muted beige interior tones, creamy highlights, natural skin tones, subtle film grain, soft editorial contrast.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: phone, cluttered counter, distorted hands, extra fingers, warped sunglasses, warped boots, stretched legs, tiny head, plastic skin, heavy glam makeup, cartoonish AI style, CGI, messy anatomy, blur, compression haze, random logos.`,
  },
  {
    number: "66",
    id: "dark-feminine-cafe-shot-3",
    title: "Dark Feminine Café · Seated Hero",
    whenToUse: "The main hero shot of the series. Seated at the marble bistro table, one leg crossed, face turned away from camera. The pinnacle fashion image. Perfect for single posts or the centrepiece of a carousel.",
    mood: "dark feminine · seated hero · marble table · crossed legs · fashion editorial",
    exampleImage: "/images/ai-prompts/dark-feminine-cafe-shot-3.jpg",
    prompt: `Create image 3 of a 6-part dark feminine café coffee-run editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: chic outdoor city café with round marble bistro table, woven beige-and-black café chairs, dark patterned stone flooring, tall glass windows behind, soft building reflections, and moody urban atmosphere.

Outfit: oversized black structured blazer with strong shoulders, long relaxed sleeves, and a slightly masculine fit. Underneath, a fitted black square-neck mini dress with a clean neckline and sleek body-skimming silhouette. Black knee-high lace-up leather boots with glossy leather texture. Black rectangular sunglasses. Minimal gold rings.

Hair: long hair worn down with smooth roots, soft middle part, airy face-framing layers, natural movement through the lengths, and relaxed undone ends. Keep the person's natural hair color from the uploaded reference photos.

Makeup: blurred natural skin finish, softly sculpted cheeks, natural brows, subtle brown eye definition, and muted nude-rose satin lip.

Accessories/props: black rectangular sunglasses, minimal gold rings, small structured black handbag placed on the café table or nearby chair, and one white coffee cup with saucer on the marble table. No phone.

Pose: seated on a woven café chair with one leg crossed over the other, torso leaning slightly forward, hands resting naturally near the knee or boot, chin slightly lifted, face turned away from the camera as if watching the street.

Camera + lens: shot on Canon EOS R5 with a 50mm portrait lens, natural compression, realistic human proportions, no wide-angle distortion.

Camera angle: eye-level seated angle, slightly pulled back to keep the body proportions natural and balanced.

Composition: vertical 9:16 medium-full seated editorial shot, café table and window reflections visible, subject placed slightly off-center, boots included but not exaggerated.

Body proportion lock: keep seated anatomy realistic. Natural head size, natural leg length, realistic knee bend, balanced shoulders, waist, hips, torso, hands, and feet. Avoid stretched legs, tiny head, elongated torso, oversized hands, warped waist, or exaggerated fashion-model anatomy.

Mood: main fashion hero moment, cool city-girl café energy, confident, mysterious, expensive, effortless Pinterest street editorial.

Color grading: deep black outfit tones, muted gray stone flooring, soft beige café chair texture, cool glass reflections, creamy marble highlights, slightly desaturated urban palette, natural skin tones, soft contrast, subtle film grain.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: phone, random extra props, distorted hands, extra fingers, warped boots, stretched legs, tiny head, elongated torso, warped waist, unrealistic hips, wide-angle body distortion, plastic skin, heavy glam makeup, cartoonish AI style, CGI, fantasy lighting, messy anatomy, blur, low-resolution softness, cluttered table, random logos.`,
  },
  {
    number: "67",
    id: "dark-feminine-cafe-shot-4",
    title: "Dark Feminine Café · Lipstick Moment",
    whenToUse: "A close-up candid while waiting for coffee. Lipstick in hand, sunglasses, completely in her own world. Works beautifully for beauty, self-care, or any caption about having a moment for yourself.",
    mood: "dark feminine · beauty close-up · lipstick · candid · personal moment",
    exampleImage: "/images/ai-prompts/dark-feminine-cafe-shot-4.jpg",
    prompt: `Create image 4 of a 6-part dark feminine café coffee-run editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: seated near the café window or standing beside the café's glass exterior while waiting for coffee, soft reflections in the glass, marble table edge nearby, warm café lights and muted city movement behind.

Outfit: oversized black structured blazer, fitted black square-neck mini dress, black rectangular sunglasses either worn or slightly lowered, minimal gold rings. Boots may be partially visible depending on crop.

Hair: long hair worn down with smooth roots, soft middle part, face-framing layers, and natural movement around the face and shoulders. Keep the person's natural hair color from the uploaded reference photos.

Makeup: blurred natural skin, softly sculpted cheeks, subtle brown eye definition, natural brows, muted nude-rose satin lips. The lip color should match the lipstick moment.

Accessories/props: black rectangular sunglasses, minimal gold rings, and a slim nude-rose lipstick or lip liner in one hand. No phone. No extra props.

Pose: candid beauty moment while waiting for coffee, one hand lightly applying or holding nude-rose lipstick near the lips, other hand adjusting the sunglasses or resting near the blazer lapel, relaxed mouth, calm confident expression.

Camera + lens: shot on Sony A7R V with an 85mm portrait lens, shallow depth of field, sharp face detail, realistic facial proportions, soft background compression.

Camera angle: eye-level close portrait angle, clean and straight, no face distortion.

Composition: vertical 9:16 close-up to waist-up crop, face, sunglasses, lipstick, and blazer sharp, café glass reflection softly blurred behind, clean side space for text overlay.

Body proportion lock: keep facial structure, neck length, shoulder width, hand size, and finger length realistic. Avoid changed face, stretched neck, oversized fingers, warped sunglasses, or distorted lips.

Mood: candid personal moment, polished, feminine, dark café editorial, caught between moments energy.

Color grading: deep black blazer and sunglasses, soft natural skin tones, muted nude-rose lip color, cool gray glass reflections, warm café bokeh, gentle contrast, subtle film grain, luxury editorial finish.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: phone, warped lipstick, distorted fingers, extra fingers, changed face, warped sunglasses, plastic skin, over-smoothed beauty filter, heavy glam makeup, cartoonish AI style, CGI, fantasy lighting, blur, compression haze.`,
  },
  {
    number: "68",
    id: "dark-feminine-cafe-shot-5",
    title: "Dark Feminine Café · Detail Cutaway",
    whenToUse: "The atmospheric detail shot — coffee, rings, blazer sleeve, leather boots. No full face needed. Use as a carousel filler or as a standalone mood image that grounds the whole editorial.",
    mood: "dark feminine · detail shot · coffee · rings · leather · cutaway",
    exampleImage: "/images/ai-prompts/dark-feminine-cafe-shot-5.jpg",
    prompt: `Create image 5 of a 6-part dark feminine café coffee-run editorial photoshoot.

Use the uploaded reference photos only as identity reference if any part of the person is visible. Preserve natural skin tone, realistic hand shape, and natural texture from the reference photos.

Scene: close-up detail at the outdoor café, round marble table with white coffee cup and saucer, dark patterned stone floor below, woven café chair edge, small structured black handbag nearby, soft café window reflection blurred in the background.

Outfit: oversized black blazer sleeve draping naturally, fitted black mini dress edge, black knee-high lace-up leather boots with glossy texture, minimal gold rings.

Hair: no full face needed.

Makeup: no full face needed.

Accessories/props: white coffee cup and saucer, small structured black handbag, minimal gold rings, black boot laces. No phone.

Pose: no full face needed. One hand with minimal gold rings resting near the marble table or near the knee, blazer sleeve draped naturally, boot laces and leather texture visible in the lower frame.

Camera + lens: shot on Sony A7R V with a 70mm macro-style lens, shallow depth of field, crisp texture detail, realistic hands, fabric, leather, rings, coffee cup, and marble.

Camera angle: close-up detail angle from slightly above table or knee height, natural perspective, no hand, cup, or boot distortion.

Composition: vertical 9:16 detail shot, hand, rings, blazer sleeve, coffee cup, marble, and boot texture sharp, background softly blurred.

Body proportion lock: keep hand, wrist, knee, and boot scale realistic. Normal finger length, natural knuckles, no extra fingers, no warped wrist, no oversized boot, no plastic skin.

Mood: luxury street-style detail, café cutaway, polished Pinterest carousel image.

Color grading: creamy marble, white coffee cup highlight, deep black blazer and leather boots, muted gold rings, gray stone texture, cool glass reflections, soft low-saturation editorial finish, subtle film grain.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: phone, distorted hands, extra fingers, warped coffee cup, fake saucer shape, oversized handbag, warped boot laces, melted leather, random logos, fake brand marks, plastic skin, blur, low-resolution softness, compression haze, cluttered table.`,
  },
  {
    number: "69",
    id: "dark-feminine-cafe-shot-6",
    title: "Dark Feminine Café · Reel Cover Exit",
    whenToUse: "The exit shot. Full body, walking away with coffee, head turned back over the shoulder. The perfect reel cover. Use it as a standalone post, a reel thumbnail, or the closing image of your carousel.",
    mood: "dark feminine · reel cover · leaving · movement · head turn · full body exit",
    exampleImage: "/images/ai-prompts/dark-feminine-cafe-shot-6.jpg",
    prompt: `Create image 6 of a 6-part dark feminine café coffee-run editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos.

Scene: sidewalk outside the café after picking up coffee, glass windows and café chairs behind, dark stone floor, quiet urban street atmosphere, soft reflections on the café window.

Outfit: oversized black structured blazer with strong shoulders and relaxed long sleeves, fitted black square-neck mini dress, black knee-high lace-up leather boots with glossy leather finish, black rectangular sunglasses, minimal gold rings.

Hair: long loose hair moving naturally as she turns, smooth at the roots with relaxed face-framing layers. Keep the person's natural hair color from the uploaded reference photos.

Makeup: polished natural editorial makeup with blurred skin, softly sculpted cheeks, subtle brown eye definition, and muted nude-rose satin lips.

Accessories/props: black rectangular sunglasses, minimal gold rings, and one simple takeaway coffee cup held naturally in one hand. Optional small structured black handbag carried low at the side only if minimal. No phone.

Pose: walking away from the café, body angled three-quarters away, head turned back over the shoulder toward the camera, blazer moving slightly, coffee cup held naturally, confident relaxed expression.

Camera + lens: shot on Canon EOS R5 with a 35mm lens from a proper distance, full-body lifestyle framing, natural proportions, no wide-angle distortion.

Camera angle: waist-height angle, pulled back enough to keep the body balanced and realistic.

Composition: vertical 9:16 full-body reel-cover shot with clean space at the top or side for text overlay, café chairs and glass windows behind, movement visible in the blazer and hair.

Body proportion lock: preserve natural full-body proportions from the uploaded reference photos. Normal leg length, natural boot size, balanced torso, normal head size, realistic hips and shoulders. Avoid stretched legs, tiny head, warped feet, oversized hands, or exaggerated runway body.

Mood: leaving-the-café candid, cool, mysterious, effortless street-style editorial, strong Pinterest reel cover energy.

Color grading: deep black outfit, muted gray pavement, beige chair accents, cool glass reflections, warm coffee-cup highlight, soft city shadows, slightly desaturated Pinterest editorial finish, subtle film grain.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.

Avoid: phone, stiff walking pose, distorted feet, extra toes, unrealistic body proportions, stretched legs, tiny head, oversized coffee cup, warped cup lid, plastic skin, over-smoothed beauty filter, cartoonish AI style, CGI, messy anatomy, blur, low-resolution softness, compression haze, cluttered props.`,
  },
]

// ---------------------------------------------------------------------------
// COLLECTION 05 — Dark Balcony Luxury City Editorial (9 shots)
// ---------------------------------------------------------------------------

export const DARK_BALCONY_SERIES: PromptCard[] = [
  {
    number: "55",
    id: "dark-balcony-shot-1",
    title: "Dark Balcony · Balcony Kiss Hero",
    whenToUse: "Your hero shot for the series. Full editorial statement — black outfit, oversized sunglasses, blowing a kiss from the balcony. Use as your single-image post or carousel cover.",
    mood: "quiet luxury · city editorial · moody · balcony · hero",
    exampleImage: "/images/ai-prompts/dark-balcony-shot-1.png",
    prompt: `Create image 1 of a 6-part dark balcony luxury city editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Scene: an elegant European-style apartment balcony or tall window overlooking a blurred city street below. Cream stone building facade, black balcony railing, soft evening light, and a moody luxury atmosphere.

Outfit: minimal black fitted off-shoulder top or black strapless bodysuit, elegant and simple. Keep the styling sleek, feminine, and expensive.

Hair: natural hair color from the uploaded reference photos, worn loose with big soft volume and slightly undone movement around the face. Polished but not perfect.

Accessory: oversized black sunglasses only. No phone, no bag, no extra props.

Pose: leaning out from the balcony or tall window, one arm resting on the railing, the other hand lifted near the lips as if blowing a kiss toward the city. Face angled slightly downward or toward the camera, lips softly pursed, calm playful expression.

Composition: vertical editorial crop from waist or chest up, balcony railing visible, city street softly blurred below, face and sunglasses as the focal point.

Mood: private luxury, playful but expensive, feminine confidence, Paris apartment energy, living my best life quietly.

Color grading: dark warm cinematic tones, deep shadows, muted cream walls, soft golden highlights on skin and hair, blurred city lights, low contrast matte finish, subtle film grain. Keep it moody and slightly underexposed like the inspiration, not bright or clean.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, crisp sunglasses, realistic hair texture, clean balcony detail, no blur on the subject.

Avoid: bright daylight, colorful outfit, extra props, distorted hands, extra fingers, warped sunglasses, fake city background, plastic skin, over-smoothed beauty filter, CGI, overly staged influencer pose.`,
  },
  {
    number: "56",
    id: "dark-balcony-shot-2",
    title: "Dark Balcony · Window Lean Side Profile",
    whenToUse: "Side profile shot at the balcony — strong editorial line, moody city depth. Use mid-carousel or as a standalone story-style post.",
    mood: "side profile · city romance · moody · urban · editorial",
    exampleImage: "/images/ai-prompts/dark-balcony-shot-2.png",
    prompt: `Create image 2 of the same dark balcony luxury city editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Scene: leaning from a tall apartment window or narrow balcony with cream stone walls and a blurred city street below. The background should feel romantic, moody, and urban.

Outfit: fitted black off-shoulder top or black bodysuit, simple and sleek.

Hair: natural hair color from the uploaded reference photos, loose with soft volume, side-swept movement, and natural texture.

Accessory: oversized black sunglasses only.

Pose: side profile or three-quarter profile, leaning one shoulder toward the balcony railing, one hand resting on the railing, the other hand lightly touching the hair or collarbone. Lips relaxed, expression calm and confident.

Composition: vertical portrait crop showing the upper body, balcony/window frame, cream wall, and blurred street below. Keep the person close to the frame with a cinematic city depth behind.

Mood: quiet luxury, city romance, moody feminine confidence, soft glam without being too polished.

Color grading: warm dark beige shadows, deep black outfit, muted cream architecture, soft skin highlights, dark city blur, subtle film grain, cinematic matte finish.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face profile, crisp sunglasses, realistic hair detail, no low-resolution softness.

Avoid: overly bright exposure, cluttered city details, distorted hand near face, extra fingers, warped railing, plastic skin, CGI, generic fashion ad look.`,
  },
  {
    number: "57",
    id: "dark-balcony-shot-3",
    title: "Dark Balcony · Hair Movement Portrait",
    whenToUse: "Cinematic movement shot — hair in motion, balcony railing, city blur. Strong mid-carousel energy or reel thumbnail.",
    mood: "movement · cinematic · hair · balcony · moody",
    exampleImage: "/images/ai-prompts/dark-balcony-shot-3.png",
    prompt: `Create image 3 of the same dark balcony luxury city photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Scene: elegant apartment balcony with black railing, cream stone walls, and blurred city street below.

Outfit: minimal black fitted off-shoulder top or black bodysuit. Keep the outfit clean and understated.

Hair: natural hair color from the uploaded reference photos, worn loose with soft wind movement. Hair should feel voluminous and cinematic, partly moving across one side of the face, but still realistic.

Accessory: oversized black sunglasses only.

Pose: leaning slightly over the balcony railing, one hand holding the railing, the other hand lifting or touching the hair. Head turned slightly away from camera, lips relaxed, calm confident expression.

Composition: medium close-up portrait, focus on hair movement, sunglasses, black outfit, railing, and soft city blur.

Mood: cinematic, private, expensive, feminine, effortless, moody city balcony moment.

Color grading: dark warm shadows, muted cream wall, deep black outfit, soft golden highlights in the hair, slightly desaturated city tones, subtle film grain, low-light editorial finish.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, realistic hair movement, crisp sunglasses, no blur on the main subject.

Avoid: overly dramatic wind, messy fake hair, distorted hands, extra fingers, warped sunglasses, bright clean influencer lighting, plastic skin, CGI.`,
  },
  {
    number: "58",
    id: "dark-balcony-shot-4",
    title: "Dark Balcony · From Inside Looking Out",
    whenToUse: "Interior-to-balcony cinematic frame — moody doorway, cream curtains, city light. Use for 'day in my life' or quiet lifestyle content.",
    mood: "interior · cinematic · mysterious · night-before energy · main character",
    exampleImage: "/images/ai-prompts/dark-balcony-shot-4.png",
    prompt: `Create image 4 of the same dark balcony luxury day-in-my-life photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Scene: inside a dim elegant apartment, looking toward an open balcony door or tall window. Cream curtains, dark interior shadows, city light outside, balcony railing visible.

Outfit: fitted black off-shoulder top or black bodysuit, simple and elegant.

Hair: natural hair color from the uploaded reference photos, loose and softly voluminous.

Accessory: phone only if it fits naturally, held low in one hand. No extra props.

Pose: standing near the open balcony door, one hand holding the curtain or resting on the doorframe, body angled toward the city. Face turned back slightly toward the camera, calm mysterious expression.

Composition: vertical cinematic shot from inside the room toward the balcony, with the person framed by the doorway and soft city light outside. Keep clean negative space and moody shadows.

Mood: private apartment moment, quiet luxury, night-before-going-out energy, soft main-character confidence.

Color grading: dark warm interior shadows, muted cream curtains, deep black outfit, soft golden city highlights, matte cinematic finish, subtle film grain.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, crisp doorway lines, realistic fabric texture, no blur.

Avoid: cluttered room, bright daylight, distorted hands, extra fingers, warped curtains, plastic skin, CGI, hotel-ad look.`,
  },
  {
    number: "59",
    id: "dark-balcony-shot-5",
    title: "Dark Balcony · Detail Shot",
    whenToUse: "B-roll detail card — hand on railing, sunglasses edge, black outfit, city blur. Use as a filler slide in a carousel or story frame.",
    mood: "detail · b-roll · tactile · luxury · close-up",
    exampleImage: "/images/ai-prompts/dark-balcony-shot-5.png",
    prompt: `Create image 5 as the detail shot of this dark balcony luxury city editorial photoshoot.

No full face needed.

Scene: close-up at an apartment balcony with black railing, cream stone wall, and blurred city street below.

Outfit details: black fitted off-shoulder top or black sleeve edge, hand resting on the balcony railing, soft hair falling into frame, oversized black sunglasses partly visible.

Accessory: no extra accessories. Optional simple rings only if natural.

Composition: close-up crop showing the hand on the railing, sunglasses edge, black outfit texture, soft hair, and blurred city below. Keep it intimate and minimal.

Mood: quiet luxury detail, private balcony moment, moody feminine b-roll, cinematic and tactile.

Color grading: dark warm shadows, matte black outfit, muted cream wall, soft golden highlights, blurred city lights, subtle film grain.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp hand detail, crisp sunglasses edge, realistic railing texture, no blur on the main detail.

Avoid: distorted fingers, extra hands, cluttered props, warped railing, fake jewelry, plastic textures, CGI, staged product-photo look.`,
  },
  {
    number: "60",
    id: "dark-balcony-shot-6",
    title: "Dark Balcony · Reel Cover Hero",
    whenToUse: "Your strongest reel cover — clean composition, negative space for text, full main-character energy. Use as a Reel thumbnail or grid anchor.",
    mood: "reel cover · main character · luxury city · moody · confident",
    exampleImage: "/images/ai-prompts/dark-balcony-shot-6.png",
    prompt: `Create image 6 as the strongest reel-cover image from this dark balcony luxury city editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, body proportions, age, and natural texture from the reference photos.

Scene: elegant apartment balcony or tall window overlooking a blurred city street at golden hour or early evening. Cream stone building facade, black railing, moody urban depth.

Outfit: fitted black off-shoulder top or black bodysuit, sleek and minimal.

Hair: natural hair color from the uploaded reference photos, loose with soft volume and movement.

Accessory: oversized black sunglasses only.

Pose: leaning out from the balcony with one arm resting on the railing, body angled, head turned slightly toward the camera, lips soft, calm confident expression. Not blowing a kiss in this shot, so it feels different from Shot 1.

Composition: vertical 9:16 reel-cover crop with clean negative space at the top or side for text overlay. Strong silhouette, sunglasses, black outfit, balcony railing, and blurred city depth.

Mood: luxury city woman, private main-character moment, moody, expensive, soft glam, confident but not loud.

Color grading: dark warm cinematic edit, deep shadows, muted cream architecture, soft golden skin highlights, dark city blur, matte finish, subtle film grain. Keep it intentionally moody and slightly underexposed.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp face, sharp sunglasses, realistic hair texture, clean railing detail, no blur, no compression haze.

Avoid: repeating the exact blowing-kiss pose from Shot 1, bright clean daylight, extra props, distorted hands, warped sunglasses, fake city background, plastic skin, CGI, generic influencer face.`,
  },
  {
    number: "61",
    id: "dark-balcony-shot-7",
    title: "Dark Balcony · Overhead Balcony Street View",
    whenToUse: "Creative overhead angle looking down at the city. Artistic and unexpected — use as a carousel ender or standalone art-direction post.",
    mood: "overhead · creative · high-rise · depth · cinematic",
    exampleImage: "/images/ai-prompts/dark-balcony-shot-7.png",
    prompt: `Create image 7 as a creative overhead shot from the same dark balcony luxury city photoshoot.

No full face needed.

Scene: looking down from an apartment balcony toward a blurred city street below, with the black balcony railing and cream stone edge visible.

Outfit details: black fitted outfit, hand resting on railing, soft hair falling into frame if natural.

Accessory: no extra accessories.

Pose: overhead angle from above, showing the hand on the railing, part of the shoulder or hair, and the city street far below.

Composition: vertical 9:16 artistic crop, using depth, railing lines, and city blur to create a cinematic view.

Mood: private city moment, high-rise luxury, quiet, cinematic, reflective.

Color grading: dark warm tones, muted city blur, cream stone, deep black outfit, soft grain, matte finish.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp railing and hand, realistic city blur, no low-resolution softness.

Avoid: distorted fingers, fake city depth, cluttered props, CGI.`,
  },
  {
    number: "62",
    id: "dark-balcony-shot-8",
    title: "Dark Balcony · Close-Up Sunglasses + Lips",
    whenToUse: "Tight beauty close-up — sunglasses, lips, moody light. Use as a beauty slide mid-carousel or a standalone close-up post.",
    mood: "beauty · close-up · sunglasses · soft glam · editorial",
    exampleImage: "/images/ai-prompts/dark-balcony-shot-8.png",
    prompt: `Create image 8 as a close-up beauty portrait from the same dark balcony luxury city editorial shoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, age, hair color, and natural texture from the reference photos.

Scene: apartment balcony or cream stone wall softly blurred behind.

Outfit: black off-shoulder top or black bodysuit visible at the neckline.

Hair: natural hair color from the uploaded reference photos, loose and softly voluminous around the face.

Accessory: oversized black sunglasses only.

Pose: close-up from shoulders up, face angled slightly downward or to the side, lips softly pursed or relaxed, calm confident expression. One hand may lightly touch the sunglasses if natural.

Composition: tight editorial crop focusing on sunglasses, lips, hair movement, cheekbone, and dark moody light.

Mood: soft glam, private luxury, moody beauty, cinematic city woman.

Color grading: dark warm shadows, golden skin highlights, deep black sunglasses, muted cream background, subtle film grain, matte editorial finish.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, crisp sunglasses, realistic skin texture, no blur.

Avoid: heavy glam makeup, overfilled lips, plastic skin, warped sunglasses, distorted hand near face, CGI.`,
  },
  {
    number: "63",
    id: "dark-balcony-shot-9",
    title: "Dark Balcony · Shadow Silhouette",
    whenToUse: "Creative shadow silhouette — partially hidden in warm low evening light. Use as an artistic series closer or a moody atmospheric post.",
    mood: "silhouette · shadow · mysterious · cinematic · low light",
    prompt: `Create image 9 as a creative shadow silhouette shot from the same dark balcony luxury photoshoot.

Use the uploaded reference photos as the only source for identity if the face is visible.

Scene: balcony or tall window with warm low evening light creating shadows on a cream wall or curtain.

Outfit: fitted black off-shoulder top or black bodysuit.

Hair: loose soft volume, natural hair color from the uploaded reference photos.

Accessory: oversized black sunglasses only if visible.

Pose: standing near the window or balcony door, body in partial shadow, one hand touching the railing or wall, head turned slightly to the side. The face can be partly hidden by shadow.

Composition: vertical artistic crop using silhouette, shadow, curtain/wall lines, and a soft city glow.

Mood: mysterious, cinematic, luxury apartment, quiet confidence, private main-character moment.

Color grading: deep warm shadows, muted cream wall, black silhouette, soft amber highlights, subtle film grain, low-light editorial finish.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp silhouette, realistic shadow texture, no blur.

Avoid: muddy underexposure, fake shadows, distorted body, cluttered room, CGI.`,
  },
]

// ---------------------------------------------------------------------------
// NEWEST — Coastal White Dress Sunset Editorial (9 shots)
// ---------------------------------------------------------------------------

export const COASTAL_WHITE_SERIES: PromptCard[] = [
  {
    number: "46",
    id: "coastal-white-shot-1",
    title: "Coastal White · Cliffside Hero",
    whenToUse: "Your hero shot for the series. Full-body at the terrace wall with ocean and cliffs behind. Use as your single-image post or carousel cover.",
    mood: "quiet luxury · coastal · full body · sunset · editorial",
    exampleImage: "/images/ai-prompts/coastal-white-shot-1.jpg",
    prompt: `Create image 1 of a 6-part coastal white dress sunset editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Scene: a luxury coastal terrace overlooking calm ocean water and pale rocky cliffs. The background should show soft cliff textures, quiet water, and a clean minimal terrace wall. The setting should feel like a private Mediterranean villa at sunset.

Outfit: elegant white long-sleeve maxi dress with a clean fitted silhouette, soft draping, and a slightly fluid hem that reaches the floor. The dress should feel minimal, expensive, and feminine, not bridal. Soft open-back or subtle back detail can be included if natural, but keep the front hero shot elegant and covered.

Hair: sleek low bun or soft low chignon. Keep the person's natural hair color from the uploaded reference photos. Hair should feel polished, clean, and resort-luxury.

Accessory: no extra accessories except minimal small earrings if natural. No phone in this shot.

Pose: standing by the terrace wall, one hand resting lightly on the ledge, the other hand near the face or collarbone. Body angled softly, head turned slightly toward the ocean, calm confident expression.

Composition: vertical full-body or three-quarter editorial shot. Show the full dress silhouette, white terrace wall, ocean, and rocky cliffs behind. Keep the background cinematic but not too busy.

Mood: quiet luxury, coastal elegance, soft feminine power, private villa, sunset calm, living my best life in a very refined way.

Color grading: cool blue-gray ocean tones, pale stone cliffs, soft champagne sunset highlights, creamy white dress, muted contrast, gentle shadows, slightly desaturated luxury editorial finish, subtle film grain. The image should feel soft, expensive, and cinematic, not overly warm or orange.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, crisp dress texture, realistic cliff detail, clean water texture, no blur, no compression haze.

Avoid: bridal styling, wedding dress look, heavy glam makeup, cluttered resort props, distorted hands, extra fingers, warped dress hem, plastic skin, CGI, fantasy lighting, overexposed white dress.`,
  },
  {
    number: "47",
    id: "coastal-white-shot-2",
    title: "Coastal White · Backless Ocean View",
    whenToUse: "The intimate back-view shot. Reveals the open-back dress detail with the ocean as backdrop. Strong as slide 2 of a carousel or a standalone mood post.",
    mood: "backless · ocean view · intimate · from behind · sunset",
    exampleImage: "/images/ai-prompts/coastal-white-shot-2.jpg",
    prompt: `Create image 2 of the same coastal white dress sunset editorial photoshoot.

Use the uploaded reference photos as the only source for the person's identity. Preserve the person's skin tone, hair color, body proportions, age, and natural texture from the reference photos.

Scene: luxury coastal terrace with an infinity pool or dark reflective water in the foreground, ocean and rocky cliffs in the distance, soft sunset sky.

Outfit: elegant white long-sleeve maxi dress with a dramatic open-back design and soft draping. The back should be low and elegant, with the fabric crossing or falling softly around the shoulders. The silhouette should feel refined and expensive, not bridal.

Hair: sleek low bun or soft chignon, showing the neckline and open back. Keep the person's natural hair color from the uploaded reference photos.

Accessory: no extra accessories except minimal earrings if natural. No phone.

Pose: photographed from behind or three-quarter back view, seated or standing near the terrace edge, looking out over the ocean. Shoulders relaxed, posture elegant, arms resting softly near the body or on the ledge.

Composition: vertical editorial crop from behind, focusing on the open back, dress drape, sleek bun, ocean, and cliffs. The body should feel calm and natural, not overly posed.

Mood: quiet luxury, reflective, intimate, soft coastal evening, peaceful main-character energy.

Color grading: soft pastel sunset sky, muted blue-gray ocean, pale beige cliffs, creamy white fabric, warm peach highlights, cool shadows, matte luxury editorial finish, subtle grain. Keep the colors soft and cinematic, like a faded luxury travel campaign.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp dress draping, realistic skin texture, crisp water and cliff details, no blur, no low-resolution softness.

Avoid: bridal look, veil, wedding styling, overexposed white fabric, distorted back anatomy, awkward shoulders, plastic skin, CGI, fantasy resort look.`,
  },
  {
    number: "48",
    id: "coastal-white-shot-3",
    title: "Coastal White · Terrace Wall With Wine",
    whenToUse: "The seated evening moment. Pairs well with captions about slowing down, a slow evening, or living with intention.",
    mood: "seated · wine glass · terrace · soft evening · feminine",
    exampleImage: "/images/ai-prompts/coastal-white-shot-3.jpg",
    prompt: `Create image 3 of the same coastal white dress sunset editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Scene: white coastal terrace wall overlooking calm ocean water and pale rocky cliffs. Soft evening light, minimal architecture, quiet luxury atmosphere.

Outfit: elegant white long-sleeve maxi dress with soft draping and a fitted silhouette. The dress should pool naturally around the body when seated.

Hair: sleek low bun or soft low chignon. Keep the person's natural hair color from the uploaded reference photos.

Accessory: one delicate wine glass only if it feels natural, held lightly near the face or resting near the terrace ledge. No phone, no bag, no extra props.

Pose: seated gracefully on or beside the terrace wall, one hand resting on the ledge, the other holding a wine glass near the lips or collarbone. Body angled slightly, face turned toward the cliffs or ocean, calm relaxed expression.

Composition: vertical seated editorial shot with the dress draping, terrace wall, ocean, and rocky cliffs visible. Keep the pose elegant and natural.

Mood: slow evening, soft luxury, feminine confidence, vacation but refined, quiet rich energy.

Color grading: pale blue-gray ocean, soft lavender-gray cliffs, creamy white dress, muted sunset warmth, gentle peach highlights, low contrast, subtle film grain, editorial matte finish.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, clear wine glass, detailed dress folds, realistic water texture, no blur.

Avoid: too many props, bridal styling, distorted fingers, warped wine glass, plastic skin, overly staged resort ad, CGI.`,
  },
  {
    number: "49",
    id: "coastal-white-shot-4",
    title: "Coastal White · Walking The Terrace",
    whenToUse: "The movement shot. Shows the dress in motion and creates a day-in-my-life coastal feeling. Great for carousel slide 3 or a standalone reel cover.",
    mood: "walking · movement · terrace · coastal · main character",
    exampleImage: "/images/ai-prompts/coastal-white-shot-4.jpg",
    prompt: `Create image 4 of the same coastal white dress day-in-my-life editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.

Scene: minimalist white terrace path beside the ocean, with rocky cliffs and soft sunset sky in the background. The environment should feel serene, open, and expensive.

Outfit: elegant white long-sleeve maxi dress with a fluid hem that moves slightly while walking. The dress should be modern and minimal, not bridal.

Hair: sleek low bun or soft chignon. Keep the person's natural hair color from the uploaded reference photos.

Accessory: no extra accessories. No phone. Keep the image clean.

Pose: walking slowly along the terrace, one hand lightly lifting the dress hem or resting near the waist, head turned slightly toward the ocean. The dress should move naturally with the step.

Composition: vertical full-body walking shot. Show the long dress silhouette, terrace lines, ocean, and cliffs. Keep lots of clean negative space for a luxury editorial feel.

Mood: coastal main-character moment, calm confidence, soft evening walk, feminine and free.

Color grading: muted cool ocean blues, pale stone cliffs, creamy whites, soft peach-pink sunset highlights, gentle contrast, subtle grain, slightly desaturated cinematic travel editorial look.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, crisp dress movement, realistic fabric folds, clean cliff and water details, no blur.

Avoid: awkward walking pose, distorted legs, warped dress hem, bridal train, plastic skin, CGI, overexposed whites.`,
  },
  {
    number: "50",
    id: "coastal-white-shot-5",
    title: "Coastal White · Detail Shot",
    whenToUse: "The carousel detail slide. No face needed. Pairs with captions about the dress, the moment, or the feeling of being somewhere beautiful.",
    mood: "detail · no face · hand · terrace · tactile · quiet luxury",
    exampleImage: "/images/ai-prompts/coastal-white-shot-5.jpg",
    prompt: `Create image 5 as the detail shot of this coastal white dress sunset editorial photoshoot.

No full face needed.

Scene: close-up near a white terrace ledge overlooking blue-gray ocean water and pale cliffs. Soft evening light.

Outfit details: white long-sleeve dress fabric, soft draped sleeve, hand resting on the terrace ledge, natural skin texture, subtle fabric folds. The dress should look creamy and tactile, not overexposed.

Accessory: no extra accessories, or one simple wine glass resting near the ledge only if it feels natural. No phone.

Composition: close-up crop showing the hand, sleeve, dress draping, white terrace edge, and blurred ocean/cliff background. The image should feel like a Pinterest carousel detail slide, soft and minimal.

Mood: quiet luxury detail, calm evening, feminine, tactile, coastal softness.

Color grading: creamy white fabric, muted blue-gray ocean, pale cliff tones, soft peach sunset highlights, gentle shadows, matte editorial finish, subtle film grain.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp fabric texture, sharp hand detail, realistic terrace texture, no blur, no low-resolution softness.

Avoid: distorted fingers, extra hands, overexposed fabric, fake-looking dress texture, cluttered props, CGI, product-ad feeling.`,
  },
  {
    number: "51",
    id: "coastal-white-shot-6",
    title: "Coastal White · Reel Cover Hero",
    whenToUse: "Your reel cover or the strongest single image from the series. Strong silhouette, clean text space at the top.",
    mood: "reel cover · hero · sunset · iconic · clean text space",
    exampleImage: "/images/ai-prompts/coastal-white-shot-6.jpg",
    prompt: `Create image 6 as the strongest reel-cover image from this coastal white dress sunset editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, body proportions, age, and natural texture from the reference photos.

Scene: luxury coastal terrace at sunset with ocean water, pale rocky cliffs, and a soft pastel sky in the background.

Outfit: elegant white long-sleeve maxi dress with a minimal fitted silhouette and soft fluid hem. The dress should feel modern, refined, and quiet luxury, not bridal.

Hair: sleek low bun or soft chignon. Keep the person's natural hair color from the uploaded reference photos.

Accessory: no extra accessories. Keep the shot clean and iconic.

Pose: standing at the terrace edge with the ocean behind, body angled slightly, one hand resting on the ledge and the other relaxed near the dress. Face turned softly toward the camera or toward the sunset. Calm confident expression.

Composition: vertical 9:16 reel-cover crop with clean space at the top or side for text overlay. Strong white dress silhouette, ocean and cliffs visible, face clear, elegant negative space.

Mood: living my best life, soft luxury, coastal freedom, feminine main-character energy, serene and expensive.

Color grading: soft pastel sunset tones, muted blue-gray water, pale beige cliffs, creamy white dress, warm peach highlights, cool shadows, low contrast, subtle grain, cinematic luxury editorial finish.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, clean dress silhouette, realistic water and cliff detail, no blur, no compression haze.

Avoid: bridal styling, wedding mood, veil, overexposed dress, fantasy sunset, distorted hands, warped body proportions, plastic skin, CGI, generic resort ad.`,
  },
  {
    number: "52",
    id: "coastal-white-shot-7",
    title: "Coastal White · Overhead Pool Detail",
    whenToUse: "Creative bonus shot. Overhead angle looking down at the dress hem and ocean water. Artistic carousel slide or standalone detail post.",
    mood: "overhead · creative · abstract · pool · fabric detail",
    exampleImage: "/images/ai-prompts/coastal-white-shot-7.jpg",
    prompt: `Create image 7 as a creative overhead detail shot from the same coastal white dress editorial photoshoot.

No full face needed.

Scene: white terrace or infinity pool edge overlooking dark blue-gray ocean water.

Outfit details: flowing white dress hem, long sleeve, hand resting near the ledge, soft fabric folds.

Accessory: no extra accessories.

Pose: overhead angle from above, showing the dress fabric flowing near the terrace edge, one hand resting softly, and ocean water below or beyond.

Composition: vertical 9:16 overhead editorial crop focused on fabric, ledge lines, water texture, and negative space.

Mood: minimal, soft, quiet luxury, artistic, coastal detail.

Color grading: creamy whites, muted blue-gray water, pale stone, soft sunset highlights, subtle film grain, matte editorial finish.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp fabric texture, realistic water detail, no blur.

Avoid: distorted hands, overexposed fabric, messy water, cluttered props, CGI.`,
  },
  {
    number: "53",
    id: "coastal-white-shot-8",
    title: "Coastal White · Close-Up Beauty Portrait",
    whenToUse: "Tight face shot with ocean behind. Strong for beauty-focused posts, profile photo updates, or pairing with a personal caption.",
    mood: "beauty · close up · face · ocean blur · soft · feminine",
    exampleImage: "/images/ai-prompts/coastal-white-shot-8.jpg",
    prompt: `Create image 8 as a close-up beauty portrait from the same coastal white dress sunset editorial photoshoot.

Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, age, hair color, and natural texture from the reference photos.

Scene: coastal terrace with ocean and pale cliffs softly blurred in the background.

Outfit: white long-sleeve dress neckline visible, soft elegant fabric near the shoulders.

Hair: sleek low bun or soft chignon. Keep the person's natural hair color from the uploaded reference photos.

Accessory: no extra accessories except minimal earrings if natural.

Pose: close-up from shoulders up, face turned slightly toward the ocean light, calm soft expression, one hand lightly near the neckline or jaw if natural.

Composition: tight editorial portrait, shallow depth of field, ocean and cliffs blurred behind.

Mood: soft coastal beauty, calm, feminine, elegant, quiet luxury.

Color grading: creamy skin highlights, muted blue-gray background, soft peach sunset glow, gentle shadows, subtle grain, natural editorial finish.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, realistic skin texture, crisp hairline, no blur on face.

Avoid: heavy glam makeup, plastic skin, bridal beauty styling, overexposed highlights, distorted hand near face, CGI.`,
  },
  {
    number: "54",
    id: "coastal-white-shot-9",
    title: "Coastal White · Back View Sunset Reflection",
    whenToUse: "Cinematic back-view with pool reflection and pastel sky. Use as a final carousel slide or a standalone reflective/mood post.",
    mood: "back view · pool reflection · sunset sky · cinematic · peaceful",
    prompt: `Create image 9 as a creative back-view shot from the same coastal white dress sunset editorial photoshoot.

Use the uploaded reference photos as the only source for the person's identity where visible. Preserve the person's skin tone, hair color, body proportions, and natural texture from the reference photos.

Scene: infinity pool or glass railing overlooking ocean and cliffs at sunset. The water surface softly reflects the sky.

Outfit: white open-back or softly draped-back long-sleeve maxi dress, elegant and minimal.

Hair: sleek low bun or soft chignon.

Accessory: no extra accessories.

Pose: photographed from behind, seated or standing near the pool edge, looking out at the ocean. Shoulders relaxed, back line elegant, posture calm.

Composition: vertical cinematic crop showing the back of the dress, ocean view, pool reflection, and pastel sky.

Mood: reflective, quiet, expensive, peaceful, living my best life privately.

Color grading: muted blue-gray ocean, soft peach-pink sky, creamy white dress, cool shadows, warm highlights, subtle grain, cinematic matte finish.

Image quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp dress drape, realistic water reflection, clean silhouette, no blur.

Avoid: bridal styling, distorted back anatomy, fake reflection, overexposed dress, CGI, fantasy sunset.`,
  },
]

// ---------------------------------------------------------------------------
// NEWEST — Cozy Leather + Oversized Knit Mirror Editorial (13 shots)
// ---------------------------------------------------------------------------

export const COZY_LEATHER_SERIES: PromptCard[] = [
  {
    number: "33",
    id: "cozy-leather-shot-1",
    title: "Cozy Leather · Full Mirror Check",
    whenToUse: "Hero shot for the set. Full-body mirror selfie showing the complete look. Use as your single post or carousel cover.",
    mood: "cozy luxury · mirror selfie · full body · fall/winter · editorial",
    exampleImage: "/images/ai-prompts/cozy-leather-shot-1.png",
    prompt:
      "Create image 1 of a 6-part cozy luxury mirror selfie photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: warm minimal bedroom or dressing room with beige built-in wardrobes, light wood floor, soft indoor lighting, and a clean full-length mirror. The room should feel calm, expensive, and lived-in, not showroom-perfect.\n\nOutfit: oversized charcoal gray chunky knit sweater worn as a sweater dress, oversized black leather biker jacket draped over the shoulders, sheer black tights or bare legs depending on what looks natural, black pointed ankle boots. The outfit should feel cozy, sexy, and expensive without being too polished.\n\nHair: sleek low bun or clean slicked-back bun. Keep the person's natural hair color from the uploaded reference photos.\n\nAccessory: Apple iPhone Pro Max only, held naturally in front of part of the face for a mirror selfie. Optional simple gold rings or bracelets only if they feel natural. Do not over-accessorize.\n\nPose: standing in front of the mirror, phone covering part of the face, one hand lightly holding the sweater hem or resting near the thigh, leather jacket sitting loosely on the shoulders. Legs relaxed, body slightly angled.\n\nComposition: full-body vertical mirror selfie showing the oversized knit shape, leather jacket, legs, boots, and warm room background.\n\nMood: cozy luxury, fall/winter outfit check, soft confidence, Pinterest mirror selfie, effortless but styled.\n\nColor grading: warm beige indoor tones, charcoal gray knit, deep black leather, soft golden shadows, creamy skin tones, muted contrast, subtle grain, cozy editorial Pinterest edit.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp mirror reflection, sharp knit texture, detailed leather texture, clear boot shape, no blur, no compression haze.\n\nAvoid: distorted legs, extra fingers, warped phone, messy mirror reflection, plastic skin, fake-looking leather, cluttered room, CGI, overly staged showroom look.",
  },
  {
    number: "34",
    id: "cozy-leather-shot-2",
    title: "Cozy Leather · Closer Mirror Selfie",
    whenToUse: "Tighter crop focusing on the sweater texture and jacket. Good as slide 2 of a carousel or a standalone texture post.",
    mood: "close crop · texture · sweater · leather · intimate",
    exampleImage: "/images/ai-prompts/cozy-leather-shot-2.png",
    prompt:
      "Create image 2 of the same cozy leather and oversized knit mirror photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: warm minimal dressing room or bedroom mirror with beige wardrobes and soft indoor lighting.\n\nOutfit: oversized charcoal gray chunky knit sweater dress, black leather biker jacket draped loosely over the shoulders, black ankle boots partly visible, minimal gold jewelry if natural.\n\nHair: sleek low bun or slicked-back bun. Keep the person's natural hair color from the uploaded reference photos.\n\nAccessory: Apple iPhone Pro Max only, held close to the face in the mirror selfie.\n\nPose: closer mirror selfie crop from head to mid-thigh. The phone covers part of the face. One hand is lightly pulling the oversized sweater hem or resting near the side of the sweater. The leather jacket collar and sleeve should feel relaxed and oversized.\n\nComposition: vertical mirror crop focused on upper body, sweater texture, leather jacket shape, phone, hand, and warm wardrobe background.\n\nMood: cozy but elevated, intimate outfit check, quiet luxury, fall dressing, Pinterest mirror selfie.\n\nColor grading: warm muted beige, dark charcoal knit, glossy black leather, soft golden indoor highlights, gentle shadows, subtle film grain, realistic iPhone mirror edit.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp phone edge, crisp knit texture, detailed leather folds, clear mirror reflection, no blur.\n\nAvoid: distorted fingers, extra hands, warped phone, unrealistic sweater texture, plastic-looking jacket, heavy glam, cluttered room, CGI.",
  },
  {
    number: "35",
    id: "cozy-leather-shot-3",
    title: "Cozy Leather · Getting Ready",
    whenToUse: "The seated morning moment. Pairs well with captions about routine, slowing down, or getting dressed with intention.",
    mood: "seated · bed · getting ready · morning · day-in-my-life",
    exampleImage: "/images/ai-prompts/cozy-leather-shot-3.png",
    prompt:
      "Create image 3 of the same cozy leather and oversized knit day-in-my-life photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: minimal bedroom with light bedding, beige wardrobe or soft neutral wall, warm indoor light, calm fall/winter atmosphere.\n\nOutfit: oversized charcoal gray chunky knit sweater dress, black leather biker jacket resting beside the person or draped over the shoulders, black pointed ankle boots on or placed nearby.\n\nHair: sleek low bun or slicked-back bun. Keep the person's natural hair color from the uploaded reference photos.\n\nAccessory: phone only, held naturally in one hand or resting beside the person on the bed.\n\nPose: seated on the edge of the bed, one leg slightly crossed or bent, adjusting the ankle boot or sweater sleeve. Expression calm and focused, like a real getting-ready moment before leaving.\n\nComposition: vertical editorial lifestyle shot, showing the cozy knit, leather jacket, boots, bed edge, and warm room tones.\n\nMood: getting ready, cozy luxury, quiet morning, soft confidence, day-in-my-life editorial.\n\nColor grading: warm beige and cream interior tones, charcoal gray knit, black leather contrast, soft golden highlights, gentle shadows, subtle grain, muted Pinterest lifestyle edit.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, detailed knit texture, realistic boot detail, no blur, no low-resolution softness.\n\nAvoid: awkward seated pose, distorted legs, extra fingers, warped phone, messy bed, cluttered props, plastic skin, CGI.",
  },
  {
    number: "36",
    id: "cozy-leather-shot-4",
    title: "Cozy Leather · Hallway Walk",
    whenToUse: "The leaving-the-house shot. Works for any caption about showing up, going out, or moving through the day with intention.",
    mood: "walking · hallway · leaving · movement · fall/winter",
    exampleImage: "/images/ai-prompts/cozy-leather-shot-4.png",
    prompt:
      "Create image 4 of the same cozy leather and oversized knit day-in-my-life photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: warm apartment hallway or dressing room exit with beige walls, wood floor, soft indoor lighting, and clean minimal background. The person is leaving the room.\n\nOutfit: oversized charcoal gray chunky knit sweater dress, oversized black leather biker jacket worn over the shoulders or fully on, black pointed ankle boots.\n\nHair: sleek low bun or slicked-back bun. Keep the person's natural hair color from the uploaded reference photos.\n\nAccessory: Apple iPhone Pro Max only, held casually in one hand. No coffee, laptop, headphones, or extra props.\n\nPose: walking out of the room or down the hallway, one hand holding the phone, the other hand lightly adjusting the leather jacket. Body turned slightly, one foot forward, calm confident expression.\n\nComposition: vertical full-body or three-quarter editorial shot showing movement, outfit silhouette, boots, warm interior, and clean hallway lines.\n\nMood: leaving for the day, cozy but powerful, quiet luxury, fall/winter outfit in motion, Pinterest editorial.\n\nColor grading: warm beige interior, light wood floor, charcoal knit, black leather, creamy skin tones, soft shadows, slight film grain, muted cozy editorial edit.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, crisp jacket texture, detailed sweater knit, clear boot shape, no blur.\n\nAvoid: distorted walking pose, warped shoes, extra fingers, cluttered background, plastic skin, CGI, overly staged fashion campaign look.",
  },
  {
    number: "37",
    id: "cozy-leather-shot-5",
    title: "Cozy Leather · Texture Detail",
    whenToUse: "The carousel detail slide. No full face. Pairs with outfit breakdown captions or texture-focused posts.",
    mood: "detail · texture · knit · leather · boots · no face",
    exampleImage: "/images/ai-prompts/cozy-leather-shot-5.png",
    prompt:
      "Create image 5 as the detail shot of this cozy leather and oversized knit photoshoot.\n\nNo full face needed.\n\nScene: warm bedroom or dressing room with light wood floor, beige wardrobe, or soft neutral interior background.\n\nOutfit details: oversized charcoal gray chunky knit sweater sleeve, black leather biker jacket sleeve or collar, black pointed ankle boots, bare legs or sheer tights depending on what fits naturally.\n\nAccessory: Apple iPhone Pro Max only. Optional simple gold rings or bracelet if they appear naturally with the hand.\n\nComposition: close-up crop from above or waist-level. Show the phone in hand, chunky knit texture, black leather jacket texture, boot detail, and warm wood floor. Keep the frame minimal and tactile.\n\nMood: cozy outfit detail, Pinterest carousel slide, quiet luxury, fall/winter texture story, not a product ad.\n\nColor grading: warm beige, charcoal gray, deep black leather, creamy highlights, natural shadows, subtle grain, soft editorial finish.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp knit fibers, sharp leather texture, clean phone edge, realistic boot detail, no blur, no compression softness.\n\nAvoid: distorted fingers, extra hands, warped phone, fake-looking leather, messy floor, cluttered props, plastic textures, CGI.",
  },
  {
    number: "38",
    id: "cozy-leather-shot-6",
    title: "Cozy Leather · Reel Cover",
    whenToUse: "Your reel cover or strongest single image from the set. Clean space at the top for text.",
    mood: "reel cover · mirror · strong · text space · cozy luxury",
    exampleImage: "/images/ai-prompts/cozy-leather-shot-6.png",
    prompt:
      "Create image 6 as the strongest reel-cover image from this cozy leather and oversized knit photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, body proportions, age, and natural texture from the reference photos.\n\nScene: warm minimal bedroom or dressing room with beige wardrobes, light wood floor, soft indoor light, and a full-length mirror.\n\nOutfit: oversized charcoal gray chunky knit sweater dress, oversized black leather biker jacket draped over the shoulders, black pointed ankle boots, slim minimal styling.\n\nHair: sleek low bun or slicked-back bun. Keep the person's natural hair color from the uploaded reference photos.\n\nAccessory: Apple iPhone Pro Max only, held naturally for a mirror selfie.\n\nPose: standing in front of the mirror, phone covering part of the face, one hand lightly holding the sweater hem, leather jacket draped dramatically but naturally over the shoulders. Legs slightly angled, confident relaxed posture.\n\nComposition: vertical 9:16 reel-cover crop with clean space at the top or side for text overlay. Strong outfit silhouette, mirror reflection, warm room background, and clear textures.\n\nMood: cozy luxury, fall/winter outfit check, soft power, expensive but effortless, Pinterest mirror selfie.\n\nColor grading: warm beige indoor tones, charcoal gray knit, deep black leather, creamy highlights, soft shadows, slight film grain, muted cozy editorial color edit.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp mirror reflection, sharp outfit texture, clear leather shine, realistic boots, no blur, no compression haze.\n\nAvoid: distorted hands, extra fingers, warped phone, warped mirror, unrealistic legs, plastic skin, fake-looking leather, cluttered background, CGI, generic influencer mirror selfie.",
  },
  {
    number: "39",
    id: "cozy-leather-shot-7",
    title: "Cozy Leather · Overhead Texture",
    whenToUse: "The graphic overhead angle. No face needed. Use as a carousel insert or standalone texture post.",
    mood: "overhead · texture · floor · graphic · no face",
    exampleImage: "/images/ai-prompts/cozy-leather-shot-7.png",
    prompt:
      "Create image 7 as an overhead creative outfit detail from the same cozy leather and knit photoshoot.\n\nNo full face needed.\n\nScene: warm light wood floor or soft neutral bedroom setting.\n\nOutfit details: charcoal gray chunky knit sweater dress, black leather biker jacket spread naturally over one shoulder or beside the person, black pointed ankle boots, bare legs or sheer tights if natural.\n\nAccessory: Apple iPhone Pro Max only, held low or resting naturally near the outfit.\n\nPose: overhead angle from above, showing the person seated on the floor or edge of the bed, one leg bent, one boot visible, hand resting on the knit sweater. Focus on outfit textures and body lines, not the face.\n\nMood: cozy, intimate, editorial, tactile, Pinterest detail shot.\n\nColor grading: warm beige floor, charcoal knit, glossy black leather, soft shadows, creamy highlights, subtle film grain.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp knit texture, sharp leather folds, realistic boot shape, no blur.\n\nAvoid: distorted legs, extra fingers, warped phone, fake leather, clutter, CGI.",
  },
  {
    number: "40",
    id: "cozy-leather-shot-8",
    title: "Cozy Leather · Beauty Portrait",
    whenToUse: "Close-up face shot with the leather collar framing everything. Use for a profile photo, a beauty post, or any caption where the face is the focus.",
    mood: "beauty · close-up · leather collar · fall · quiet luxury",
    exampleImage: "/images/ai-prompts/cozy-leather-shot-8.png",
    prompt:
      "Create image 8 as a close-up beauty portrait from the same cozy leather and oversized knit photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, and natural texture from the reference photos.\n\nScene: warm neutral interior with beige wardrobe or soft wall blurred in the background.\n\nOutfit: oversized black leather biker jacket collar visible over chunky charcoal knit sweater neckline.\n\nHair: sleek low bun or slicked-back bun. Keep the person's natural hair color from the reference photos.\n\nAccessory: no extra accessories except minimal earrings if natural. No phone in this shot unless needed for a mirror crop.\n\nPose: close-up portrait from shoulders up, face turned slightly to the side, calm confident expression, soft lips, natural makeup, leather collar framing the face.\n\nComposition: tight editorial portrait, shallow depth of field, warm interior background, focus on face, skin texture, leather collar, and knit neckline.\n\nMood: cozy but powerful, quiet luxury, fall beauty, soft confidence.\n\nColor grading: warm beige background, deep black leather, charcoal knit, creamy skin tones, gentle shadows, subtle grain, realistic editorial finish.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, realistic skin texture, crisp hairline, detailed leather collar, no blur.\n\nAvoid: plastic skin, heavy glam makeup, distorted earrings, fake-looking leather, CGI, overly smoothed beauty filter.",
  },
  {
    number: "41",
    id: "cozy-leather-shot-9",
    title: "Cozy Leather · Floor-Level Walk",
    whenToUse: "Cinematic low-angle b-roll. Works well for reels, a carousel surprise slide, or any caption about moving through the day.",
    mood: "low angle · boots · hallway · cinematic · movement",
    exampleImage: "/images/ai-prompts/cozy-leather-shot-9.png",
    prompt:
      "Create image 9 as a creative cinematic detail shot from the same cozy leather and oversized knit photoshoot.\n\nUse the uploaded reference photos as the only source for the person's identity if the face appears. Preserve the person's natural look, hair color, body proportions, and skin tone from the reference photos.\n\nScene: warm apartment hallway or bedroom doorway with light wood floor, beige walls, and soft indoor light.\n\nOutfit: oversized charcoal gray chunky knit sweater dress, oversized black leather biker jacket, black pointed ankle boots.\n\nHair: sleek low bun or slicked-back bun if visible. Keep the person's natural hair color from the uploaded reference photos.\n\nAccessory: Apple iPhone Pro Max only, held casually at the side or partly visible. No coffee, laptop, headphones, handbag, or extra props.\n\nPose: low floor-level angle showing the person walking past the camera. One boot steps forward, the leather jacket moves slightly, and the hem of the oversized knit sweater is visible. The upper body can be partly cropped, with the face only softly visible or not visible at all.\n\nComposition: vertical 9:16 cinematic low-angle crop, focused on movement, boots, knit texture, leather jacket, and warm hallway lines.\n\nMood: leaving the room, cozy luxury, quiet power, candid day-in-my-life b-roll, editorial but real.\n\nColor grading: warm beige interior tones, light wood floor, charcoal knit, deep black leather, creamy highlights, soft shadows, subtle film grain, muted cozy Pinterest edit.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp boot shape, crisp knit texture, detailed leather folds, realistic floor texture, no blur on the main subject.\n\nAvoid: distorted feet, warped boots, unrealistic walking pose, extra fingers, warped phone, cluttered hallway, plastic textures, CGI, overly staged fashion campaign look.",
  },
  {
    number: "42",
    id: "cozy-leather-shot-10",
    title: "Cozy Leather · Doorframe Portrait",
    whenToUse: "The editorial statement shot. Strong silhouette, cinematic mood. Use as a reel cover alternative or a single high-impact post.",
    mood: "doorframe · cinematic · editorial · silhouette · warm light",
    prompt:
      "Create image 10 as a creative portrait from the same cozy leather and oversized knit photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, age, hair color, body proportions, and natural texture from the reference photos.\n\nScene: warm bedroom doorway or hallway with beige walls, soft indoor light, and a clean minimal background. Natural light from a nearby window creates a soft shadow across the wall or doorway.\n\nOutfit: oversized charcoal gray chunky knit sweater dress, oversized black leather biker jacket worn loosely over the shoulders, black pointed ankle boots.\n\nHair: sleek low bun or slicked-back bun. Keep the person's natural hair color from the uploaded reference photos.\n\nAccessory: Apple iPhone Pro Max only, held low in one hand. The phone should not cover the face.\n\nPose: standing in the doorway, body slightly turned, one shoulder leaning gently against the frame, one hand adjusting the leather jacket collar. Face visible, calm confident expression, eyes looking slightly away from camera.\n\nComposition: vertical 9:16 editorial portrait with the doorway framing the body. Include soft wall shadows, negative space, and a cinematic silhouette.\n\nMood: quiet luxury, soft power, cozy but strong, leaving-the-house energy, Pinterest editorial portrait.\n\nColor grading: warm beige wall tones, deep black leather, charcoal knit, creamy skin tones, soft golden highlights, gentle shadows, subtle film grain, muted cozy editorial finish.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, crisp leather texture, detailed knit, clean doorway lines, no blur, no compression softness.\n\nAvoid: mirror selfie composition, phone covering face, cluttered background, distorted hands, extra fingers, fake-looking leather, plastic skin, CGI, generic influencer pose.",
  },
  {
    number: "43",
    id: "cozy-leather-shot-11",
    title: "Cozy Leather · Overhead Bed Moment",
    whenToUse: "Cozy lifestyle overhead. No face needed. Works for a carousel detail slide or a quiet lifestyle post.",
    mood: "overhead · bed · cozy · lifestyle · intimate · no face",
    prompt:
      "Create image 11 as an overhead creative lifestyle shot from the same cozy leather and oversized knit photoshoot.\n\nNo full face needed.\n\nScene: minimal bedroom with white or cream bedding, beige wall, warm indoor light, and soft cozy atmosphere.\n\nOutfit: oversized charcoal gray chunky knit sweater dress, oversized black leather biker jacket placed naturally beside the person or partly draped over the body, black pointed ankle boots either worn or placed near the bed.\n\nHair: if visible, sleek low bun or slicked-back bun. Keep the person's natural hair color from the uploaded reference photos.\n\nAccessory: Apple iPhone Pro Max only, resting naturally on the bed or held loosely in one hand. No coffee, laptop, headphones, handbag, or extra props.\n\nPose: overhead angle from above, showing the person seated or reclining on the bed while adjusting the knit sweater sleeve or leather jacket. One leg bent naturally, boots partly visible, phone nearby. The focus is on texture, shape, and mood.\n\nComposition: vertical 9:16 overhead editorial crop. Show chunky knit texture, black leather jacket, soft bedding, phone, boots, and warm neutral interior tones.\n\nMood: cozy getting-ready moment, intimate day-in-my-life b-roll, quiet luxury, soft fall/winter aesthetic, Pinterest lifestyle detail.\n\nColor grading: warm cream bedding, beige shadows, charcoal gray knit, glossy black leather, soft natural skin tones, gentle highlights, subtle film grain, cozy editorial color edit.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp knit fibers, sharp leather folds, realistic bedding texture, clean phone edge, no blur, no low-resolution softness.\n\nAvoid: distorted legs, extra fingers, warped phone, messy bed, cluttered props, fake-looking leather, plastic textures, CGI, overly staged product-photo look.",
  },
  {
    number: "44",
    id: "cozy-leather-shot-12",
    title: "Cozy Leather · Overhead Texture (Alt)",
    whenToUse: "A second overhead angle variant. Swap in for the carousel if you want a different crop or floor background.",
    mood: "overhead · floor · texture · alternative · no face",
    prompt:
      "Create image 12 as an overhead creative outfit detail from the same cozy leather and knit photoshoot.\n\nNo full face needed.\n\nScene: warm light wood floor or soft neutral bedroom setting.\n\nOutfit details: charcoal gray chunky knit sweater dress, black leather biker jacket spread naturally over one shoulder or beside the person, black pointed ankle boots, bare legs or sheer tights if natural.\n\nAccessory: Apple iPhone Pro Max only, held low or resting naturally near the outfit.\n\nPose: overhead angle from above, showing the person seated on the floor or edge of the bed, one leg bent, one boot visible, hand resting on the knit sweater. Focus on outfit textures and body lines, not the face.\n\nMood: cozy, intimate, editorial, tactile, Pinterest detail shot.\n\nColor grading: warm beige floor, charcoal knit, glossy black leather, soft shadows, creamy highlights, subtle film grain.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp knit texture, sharp leather folds, realistic boot shape, no blur.\n\nAvoid: distorted legs, extra fingers, warped phone, fake leather, clutter, CGI.",
  },
  {
    number: "45",
    id: "cozy-leather-shot-13",
    title: "Cozy Leather · Beauty Portrait (Alt)",
    whenToUse: "A second beauty portrait variant. Slightly different crop or lighting mood — run both and pick the stronger result.",
    mood: "beauty · leather collar · face · alternative · close-up",
    prompt:
      "Create image 13 as a close-up beauty portrait from the same cozy leather and oversized knit photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, and natural texture from the reference photos.\n\nScene: warm neutral interior with beige wardrobe or soft wall blurred in the background.\n\nOutfit: oversized black leather biker jacket collar visible over chunky charcoal knit sweater neckline.\n\nHair: sleek low bun or slicked-back bun. Keep the person's natural hair color from the reference photos.\n\nAccessory: no extra accessories except minimal earrings if natural. No phone in this shot unless needed for a mirror crop.\n\nPose: close-up portrait from shoulders up, face turned slightly to the side, calm confident expression, soft lips, natural makeup, leather collar framing the face.\n\nComposition: tight editorial portrait, shallow depth of field, warm interior background, focus on face, skin texture, leather collar, and knit neckline.\n\nMood: cozy but powerful, quiet luxury, fall beauty, soft confidence.\n\nColor grading: warm beige background, deep black leather, charcoal knit, creamy skin tones, gentle shadows, subtle grain, realistic editorial finish.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, realistic skin texture, crisp hairline, detailed leather collar, no blur.\n\nAvoid: plastic skin, heavy glam makeup, distorted earrings, fake-looking leather, CGI, overly smoothed beauty filter.",
  },
]

// ---------------------------------------------------------------------------
// Soft Blazer + Light Denim Street Editorial (14 shots)
// ---------------------------------------------------------------------------

export const DENIM_STREET_SERIES: PromptCard[] = [
  {
    number: "19",
    id: "denim-street-shot-1",
    title: "Denim Street · Full Outfit Hero",
    whenToUse: "Your hero shot for the series. Full-body against a dark wall. Use as your single-image post or carousel cover.",
    mood: "quiet luxury · street style · full body · dark wall · editorial",
    exampleImage: "/images/ai-prompts/denim-street-shot-1.jpg",
    prompt:
      "Create image 1 of a 6-part editorial day-in-my-life photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: a modern city sidewalk with a dark charcoal wall or black building facade behind the person. The location should feel minimal, expensive, and editorial, with gray stone pavement and clean architectural lines.\n\nOutfit: oversized soft taupe or warm gray blazer with structured shoulders, fitted white crop top or white bralette-style top underneath, high-waisted light-wash wide-leg jeans with subtle knee distressing, pointed white heels or white pointed slingback heels. Add slim black Celine-style sunglasses.\n\nHair: natural hair color from the uploaded reference photos, worn loose with soft movement or slightly wind-swept around the shoulders. Keep it polished but not too perfect.\n\nAccessory: one minimal leather shoulder bag only if it fits naturally, Bottega Veneta-style or The Row-style, held low in one hand. Do not add extra props.\n\nPose: standing full-body, one hand placed at the waist or lightly inside the blazer, the other hand holding the bag. Body angled slightly, head turned to the side as if looking down the street. Calm confident expression, not smiling too much.\n\nComposition: full-body vertical editorial street-style shot. Show the whole outfit clearly from head to heels, including blazer shape, white top, wide-leg jeans, and pointed shoes.\n\nMood: quiet luxury street style, confident, feminine, polished but effortless, Pinterest outfit inspiration.\n\nColor grading: muted cool city tones, dark charcoal background, soft taupe blazer, pale blue denim, creamy white highlights, gentle shadows, slightly desaturated Pinterest editorial edit, subtle film grain.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, crisp blazer structure, detailed denim texture, clear shoe shape, no blur, no compression haze.\n\nAvoid: cluttered background, extra props, distorted hands, extra fingers, warped shoes, unrealistic denim folds, plastic skin, CGI, overly staged stock-photo look.",
  },
  {
    number: "20",
    id: "denim-street-shot-2",
    title: "Denim Street · Walking Moment",
    whenToUse: "The in-motion shot. Works perfectly as slide 2 of a carousel or a standalone day-in-my-life post.",
    mood: "walking · city · candid · movement · effortless",
    exampleImage: "/images/ai-prompts/denim-street-shot-2.jpg",
    prompt:
      "Create image 2 of the same soft blazer and light denim street editorial photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: quiet modern city street with dark building walls, gray stone pavement, and soft daylight. The background should be minimal and slightly blurred.\n\nOutfit: oversized taupe or warm gray blazer, fitted white crop top, high-waisted light-wash wide-leg jeans with subtle knee distressing, pointed white heels, slim black Celine-style sunglasses.\n\nHair: natural hair color from the reference photos, loose and softly moving as if caught by a little wind.\n\nAccessory: phone only, held naturally in one hand as if checking where to go next. Do not add coffee, laptop, headphones, or extra props.\n\nPose: walking slowly across the frame, one foot forward, one hand near the blazer or waist, phone relaxed in the other hand. Head turned slightly to the side. Expression calm, focused, and confident.\n\nComposition: vertical three-quarter or full-body street-style shot, showing movement, outfit silhouette, wide-leg denim, and blazer shape.\n\nMood: day-in-my-life, walking into the city, elevated errands, modern woman energy, effortless Pinterest street-style.\n\nColor grading: dark charcoal background, muted stone gray, soft taupe, faded light denim, creamy skin tones, gentle contrast, subtle grain, clean editorial finish.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp outfit silhouette, sharp face, realistic movement, no blur on the main subject.\n\nAvoid: awkward walking pose, distorted legs, extra fingers, warped phone, overly dramatic wind, plastic skin, CGI, generic fashion stock-photo look.",
  },
  {
    number: "21",
    id: "denim-street-shot-3",
    title: "Denim Street · City Steps",
    whenToUse: "The seated pause shot. Good for quotes, captions about slowing down, or mid-carousel variety.",
    mood: "seated · city steps · calm · quiet confidence · architectural",
    exampleImage: "/images/ai-prompts/denim-street-shot-3.jpg",
    prompt:
      "Create image 3 of the same soft blazer and light denim day-in-my-life photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: seated on clean gray stone steps outside a modern building or old city entrance. The background should feel calm, architectural, and minimal.\n\nOutfit: oversized taupe or warm gray blazer, fitted white crop top, high-waisted light-wash wide-leg jeans with subtle knee distressing, pointed white heels, slim black sunglasses.\n\nHair: natural hair color from the uploaded reference photos, worn loose with soft movement around the face and shoulders.\n\nAccessory: phone only, resting naturally in one hand or beside the person on the step. Optional minimal leather bag placed beside her if it fits the composition.\n\nPose: seated casually on the steps with one knee bent and one leg extended slightly, one hand resting near the blazer, the other hand holding the phone. Head turned to the side, calm confident expression.\n\nComposition: vertical editorial seated shot. Show the blazer shape, white top, denim texture, pointed shoes, and stone steps.\n\nMood: quiet confidence, city break, soft power outfit, casual but expensive, Pinterest editorial.\n\nColor grading: muted gray stone, soft taupe blazer, pale denim blue, creamy white top, natural skin tones, soft shadows, slight film grain.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, crisp denim, realistic stone texture, no blur, no low-resolution softness.\n\nAvoid: distorted legs, awkward seated pose, extra fingers, warped phone, messy background, plastic skin, CGI, overly posed catalog look.",
  },
  {
    number: "22",
    id: "denim-street-shot-4",
    title: "Denim Street · Mirror Selfie",
    whenToUse: "The 'about to leave' moment. Pairs well with outfit captions, morning routine content, or an honest personal brand post.",
    mood: "mirror selfie · outfit check · morning · real · personal brand",
    exampleImage: "/images/ai-prompts/denim-street-shot-4.jpg",
    prompt:
      "Create image 4 of the same soft blazer and light denim day-in-my-life photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: minimal bedroom or hallway mirror selfie before leaving for the day. Clean neutral wall, soft daylight, simple full-length mirror, minimal background.\n\nOutfit: oversized taupe or warm gray blazer, fitted white crop top, high-waisted light-wash wide-leg jeans with subtle knee distressing, pointed white heels, slim black sunglasses either worn or held.\n\nHair: natural hair color from the reference photos, loose and softly styled, slightly undone.\n\nAccessory: Apple iPhone Pro Max only, held naturally for the mirror selfie. No coffee, laptop, headphones, or extra props.\n\nPose: standing in front of the mirror, phone covering part of the face, one hand lightly adjusting the blazer or waistband. Body angled slightly to show the blazer, waist, jeans, and shoes.\n\nComposition: full-body vertical mirror selfie, realistic iPhone feel, clean frame, not over-staged.\n\nMood: outfit check before leaving, simple but elevated, personal brand day-in-my-life, Pinterest mirror selfie.\n\nColor grading: soft neutral indoor light, muted beige and gray tones, pale denim, creamy white highlights, gentle shadows, subtle film grain, realistic mirror texture.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp mirror reflection, clear outfit details, sharp phone edge, no blur, no compression softness.\n\nAvoid: distorted phone, warped mirror, extra fingers, messy room, fake-looking mirror reflection, plastic skin, CGI, overly polished showroom look.",
  },
  {
    number: "23",
    id: "denim-street-shot-5",
    title: "Denim Street · Detail Shot",
    whenToUse: "The carousel detail slide. No full face. Pairs well with outfit breakdown captions or accessory-focused posts.",
    mood: "detail · tactile · accessories · no face · quiet luxury",
    exampleImage: "/images/ai-prompts/denim-street-shot-5.jpg",
    prompt:
      "Create image 5 as the detail shot of this soft blazer and light denim editorial photoshoot.\n\nNo full face needed.\n\nScene: close-up detail either on gray stone pavement, city steps, or a minimal indoor mirror area. Keep it connected to the same day-in-my-life outfit story.\n\nOutfit details: oversized taupe blazer sleeve, fitted white crop top edge, light-wash wide-leg denim with subtle knee distressing, pointed white heels, slim black sunglasses.\n\nAccessory: Apple iPhone Pro Max only. Optional minimal leather shoulder bag if it fits naturally in the corner of the frame.\n\nComposition: close-up crop from above or waist-level. Show one hand holding the phone, blazer sleeve texture, denim texture, sunglasses, pointed shoe detail, and clean pavement or mirror-floor background.\n\nMood: Pinterest outfit detail, quiet luxury, minimal, tactile, real lifestyle b-roll, not a product ad.\n\nColor grading: muted charcoal and stone gray, soft taupe, pale denim blue, creamy white, natural shadows, subtle film grain, clean editorial finish.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp phone edge, crisp denim texture, clear blazer fabric, realistic shoe detail, no blur, no low-resolution softness.\n\nAvoid: distorted fingers, extra hands, warped phone, warped shoes, fake-looking logos, cluttered props, plastic textures, overly staged product-photo look.",
  },
  {
    number: "24",
    id: "denim-street-shot-6",
    title: "Denim Street · Reel Cover",
    whenToUse: "Your reel cover or strongest single image from the set. Clean space at the top for text overlay.",
    mood: "reel cover · strong silhouette · dark wall · text space · editorial",
    exampleImage: "/images/ai-prompts/denim-street-shot-6.jpg",
    prompt:
      "Create image 6 as the strongest reel-cover image from this soft blazer and light denim photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, body proportions, age, and natural texture from the reference photos.\n\nScene: modern city sidewalk with a dark charcoal wall or black building facade behind the person. Clean stone pavement, minimal architecture, soft daylight.\n\nOutfit: oversized soft taupe or warm gray blazer with strong shoulders, fitted white crop top, high-waisted light-wash wide-leg jeans with subtle knee distressing, pointed white heels, slim black Celine-style sunglasses.\n\nHair: natural hair color from the uploaded reference photos, loose with soft wind movement.\n\nAccessory: phone only or one minimal leather shoulder bag if it fits naturally. Keep the styling clean and not over-accessorized.\n\nPose: standing or walking slightly toward the camera, one hand at the waist under the blazer, the other relaxed by the side. Head turned to the side, hair moving softly, calm confident expression behind sunglasses.\n\nComposition: vertical 9:16 reel-cover crop with clean space at the top or side for text overlay. Strong outfit silhouette, clear face, dark wall background, and enough negative space for overlay text.\n\nMood: soft power, elevated everyday outfit, Pinterest street-style, living my best life, calm confidence, modern feminine energy.\n\nColor grading: dark charcoal backdrop, muted taupe blazer, pale denim blue, creamy white highlights, soft natural skin tones, gentle shadows, subtle film grain, slightly desaturated Pinterest editorial edit.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, sharp face, clear blazer silhouette, detailed denim texture, no blur, no compression softness.\n\nAvoid: extra props, distorted hands, extra fingers, warped shoes, unrealistic body proportions, plastic skin, CGI, generic influencer face, overly staged stock-photo look.",
  },
  {
    number: "25",
    id: "denim-street-shot-7",
    title: "Denim Street · Overhead Shot",
    whenToUse: "The unexpected angle. Stops the scroll. Use for a single post or as a carousel surprise slide.",
    mood: "overhead · bird's-eye · pavement · graphic · unexpected",
    exampleImage: "/images/ai-prompts/denim-street-shot-7.jpg",
    prompt:
      "Create image 7 of the same soft blazer and light denim day-in-my-life photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: clean gray stone pavement outside a modern city building with a dark charcoal wall nearby. The setting should feel minimal, expensive, and urban.\n\nOutfit: oversized soft taupe or warm gray blazer, fitted white crop top, high-waisted light-wash wide-leg jeans with subtle knee distressing, pointed white heels, slim black sunglasses.\n\nHair: natural hair color from the uploaded reference photos, loose with soft natural movement.\n\nAccessory: Apple iPhone Pro Max only, held casually in one hand. Optional minimal leather shoulder bag if it fits naturally.\n\nPose: overhead shot taken from above, as if someone is standing on a step or balcony looking down. The person is walking across the pavement, one hand lightly holding the phone, the other hand adjusting the blazer. Face slightly turned down or to the side, not looking directly at the camera.\n\nComposition: high-angle vertical 9:16 editorial shot. Show the full outfit from above, wide-leg denim shape, pointed heels, blazer silhouette, and clean pavement lines.\n\nMood: candid city outfit moment, Pinterest street-style, calm confidence, soft power, not overly posed.\n\nColor grading: muted charcoal gray pavement, soft taupe blazer, pale denim blue, creamy white highlights, natural skin tones, subtle film grain, slightly desaturated Pinterest editorial edit.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp outfit silhouette, crisp denim texture, clean pavement detail, no blur, no compression haze.\n\nAvoid: distorted legs, warped shoes, extra fingers, unrealistic overhead angle, cluttered background, plastic skin, CGI, stock-photo look.",
  },
  {
    number: "26",
    id: "denim-street-shot-8",
    title: "Denim Street · Low-Angle Walk",
    whenToUse: "Makes the outfit feel powerful and fashion-forward. Works well for outfit caption posts or when you want a strong editorial feel.",
    mood: "low angle · fashion · strong · denim · dynamic",
    exampleImage: "/images/ai-prompts/denim-street-shot-8.jpg",
    prompt:
      "Create image 8 of the same soft blazer and light denim street editorial photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: modern city sidewalk with a dark charcoal or black building facade behind the person. Clean stone pavement, minimal architecture, soft daylight.\n\nOutfit: oversized soft taupe or warm gray blazer, fitted white crop top, high-waisted light-wash wide-leg jeans with subtle knee distressing, pointed white heels, slim black sunglasses.\n\nHair: natural hair color from the reference photos, loose and moving slightly in the wind.\n\nAccessory: phone only, held naturally in one hand.\n\nPose: low-angle walking shot from slightly below waist level, as if the camera is held lower while the person walks past. One leg forward, blazer moving slightly, phone in hand, head turned to the side. The pose should feel candid and in motion.\n\nComposition: vertical 9:16 low-angle editorial street-style frame. Make the wide-leg jeans and pointed shoes feel strong and fashion-forward without distorting the body.\n\nMood: confident, cool, modern, elevated everyday outfit, Pinterest editorial street style.\n\nColor grading: dark charcoal background, muted taupe blazer, faded light denim, creamy white top, soft shadows, gentle contrast, subtle film grain, slightly desaturated fashion edit.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, crisp blazer shape, detailed denim, clean shoe detail, no blur on the main subject.\n\nAvoid: distorted legs, overly long feet, warped shoes, extra fingers, awkward walking pose, plastic skin, CGI, overly staged campaign look.",
  },
  {
    number: "27",
    id: "denim-street-shot-9",
    title: "Denim Street · Phone Check",
    whenToUse: "The realistic pause moment. Good for founder content, productivity posts, or any caption about being in the city.",
    mood: "seated · phone · city ledge · candid · real",
    exampleImage: "/images/ai-prompts/denim-street-shot-9.jpg",
    prompt:
      "Create image 9 of the same soft blazer and light denim day-in-my-life photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: seated on a low stone ledge or city bench outside a modern building. Dark wall or clean stone architecture in the background.\n\nOutfit: oversized soft taupe or warm gray blazer, fitted white crop top, high-waisted light-wash wide-leg jeans with subtle knee distressing, pointed white heels, slim black sunglasses.\n\nHair: natural hair color from the uploaded reference photos, loose and softly styled, slightly undone.\n\nAccessory: Apple iPhone Pro Max only. Optional minimal leather bag beside the person if it fits naturally.\n\nPose: seated sideways on the ledge, one leg bent slightly and the other extended forward, phone held in both hands or one hand as if checking a message. Head slightly lowered toward the phone, sunglasses on, calm focused expression.\n\nComposition: side-angle vertical editorial shot. Show the blazer, waistline, denim shape, pointed shoes, phone, and clean city background. Make it feel like a real pause in the day.\n\nMood: quiet city moment, outfit check meets day-in-my-life, soft power, relaxed confidence, Pinterest street-style.\n\nColor grading: muted gray stone, dark charcoal background, soft taupe blazer, pale denim blue, creamy highlights, natural shadows, subtle grain, clean editorial finish.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, crisp phone edge, clear denim texture, realistic stone detail, no blur, no low-resolution softness.\n\nAvoid: awkward seated pose, distorted legs, extra fingers, warped phone, cluttered props, plastic skin, CGI, generic influencer stock-photo look.",
  },
  {
    number: "28",
    id: "denim-street-shot-10",
    title: "Denim Street · Glass Reflection",
    whenToUse: "The editorial statement shot. Stops the scroll and makes the whole set feel more like a campaign. Use as a single post or reel cover alternative.",
    mood: "reflection · glass · editorial · moody · campaign",
    exampleImage: "/images/ai-prompts/denim-street-shot-10.jpg",
    prompt:
      "Create image 10 of the same soft blazer and light denim day-in-my-life photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: modern city street with a dark glass storefront or reflective building window. The person is visible both directly and as a soft reflection in the glass.\n\nOutfit: oversized soft taupe or warm gray blazer, fitted white crop top, high-waisted light-wash wide-leg jeans with subtle knee distressing, pointed white heels, slim black sunglasses.\n\nHair: natural hair color from the uploaded reference photos, loose with soft movement, slightly wind-swept but polished.\n\nAccessory: Apple iPhone Pro Max only, held casually in one hand. Do not add extra props.\n\nPose: standing close to the reflective glass, body angled slightly away from the camera, head turned to the side. One hand lightly touches the blazer or rests at the waist, the other hand holds the phone. The reflection should show a second soft version of the outfit, creating an editorial layered effect.\n\nComposition: vertical 9:16 editorial street-style shot. The direct view and glass reflection should both be visible, with the dark window creating a moody fashion backdrop.\n\nMood: quiet luxury, reflective city moment, soft power, Pinterest street-style, calm confident energy.\n\nColor grading: dark charcoal reflection, muted taupe blazer, pale denim blue, creamy white top, soft natural skin tones, faded highlights, gentle shadows, subtle film grain, slightly desaturated editorial finish.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face, crisp blazer texture, detailed denim, realistic glass reflection, no blur, no compression haze.\n\nAvoid: distorted reflection, doubled face errors, warped phone, extra fingers, unrealistic glass, cluttered background, plastic skin, CGI, overly staged stock-photo look.",
  },
  {
    number: "29",
    id: "denim-street-shot-11",
    title: "Denim Street · Shadow Detail",
    whenToUse: "The creative b-roll detail. No face. Pairs well with a quote or a short caption about presence.",
    mood: "shadow · artistic · shoes · pavement · cinematic",
    exampleImage: "/images/ai-prompts/denim-street-shot-11.jpg",
    prompt:
      "Create image 11 as a creative detail shot from the same soft blazer and light denim photoshoot.\n\nNo full face needed.\n\nScene: clean gray stone pavement beside a dark charcoal wall, with soft daylight creating a long natural shadow.\n\nOutfit details: light-wash wide-leg denim, pointed white heels, hem of the oversized taupe blazer, fitted white crop top edge slightly visible if natural.\n\nAccessory: Apple iPhone Pro Max only, held low in one hand so the phone and hand appear partly in frame. No extra props.\n\nComposition: artistic low-angle or top-down crop showing the pointed white heels, denim hem, blazer edge, phone in hand, and the person's shadow stretching across the pavement. The shadow should make the image feel cinematic and intentional.\n\nMood: minimal, editorial, quiet luxury, creative Pinterest detail, day-in-my-life b-roll.\n\nColor grading: muted stone gray, soft taupe, pale denim, creamy whites, strong but natural shadows, slightly desaturated Pinterest editorial edit, subtle film grain.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp shoe detail, sharp denim texture, clean shadow shape, realistic pavement texture, no blur, no low-resolution softness.\n\nAvoid: distorted feet, warped shoes, extra fingers, warped phone, fake-looking shadows, cluttered props, plastic textures, CGI.",
  },
  {
    number: "30",
    id: "denim-street-shot-12",
    title: "Denim Street · Windy Side Profile",
    whenToUse: "A reel cover alternative. The movement and hair create energy without needing a direct-camera pose.",
    mood: "side profile · wind · movement · cinematic · reel cover",
    exampleImage: "/images/ai-prompts/denim-street-shot-12.jpg",
    prompt:
      "Create image 12 of the same soft blazer and light denim street editorial photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, age, body proportions, and natural texture from the reference photos.\n\nScene: quiet modern city sidewalk with a dark charcoal wall, clean gray pavement, and soft daylight.\n\nOutfit: oversized soft taupe or warm gray blazer, fitted white crop top, high-waisted light-wash wide-leg jeans with subtle knee distressing, pointed white heels, slim black sunglasses.\n\nHair: natural hair color from the uploaded reference photos, worn loose with stronger natural wind movement. The hair should move across the shoulder and slightly away from the face, polished but real.\n\nAccessory: phone only, held loosely at the side.\n\nPose: walking in side profile, head turned slightly away from the camera, one hand near the blazer waist, the other holding the phone. The blazer and hair should have subtle motion, like the person was caught mid-walk.\n\nComposition: vertical 9:16 cinematic side-profile walking shot. Keep clean negative space around the person for text overlay.\n\nMood: soft power, living my best life, calm confidence, elevated everyday outfit, Pinterest editorial street-style.\n\nColor grading: dark charcoal backdrop, muted taupe, pale denim blue, creamy white highlights, natural skin tones, gentle contrast, subtle film grain, slightly desaturated fashion edit.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp face profile, crisp blazer shape, detailed denim, realistic hair movement, no blur on the main subject.\n\nAvoid: overly dramatic wind, distorted legs, warped shoes, extra fingers, warped phone, plastic skin, CGI, stock-photo pose.",
  },
  {
    number: "31",
    id: "denim-street-shot-13",
    title: "Denim Street · Waist Close-Up",
    whenToUse: "Fashion detail without showing the face. Great for outfit breakdown posts or pairing with a style caption.",
    mood: "waist · blazer · denim · fashion detail · close-up",
    exampleImage: "/images/ai-prompts/denim-street-shot-13.jpg",
    prompt:
      "Create image 13 as a close-up fashion detail shot from the same soft blazer and light denim photoshoot.\n\nNo full face needed.\n\nScene: clean gray stone pavement or dark charcoal wall background, modern city setting.\n\nOutfit details: oversized soft taupe or warm gray blazer, fitted white crop top, high-waisted light-wash wide-leg jeans with subtle knee distressing, slim black sunglasses partly visible in hand or tucked naturally into the blazer.\n\nAccessory: Apple iPhone Pro Max only if it fits naturally in one hand. No extra props.\n\nPose: close crop from shoulders to hips. One hand lightly holds the blazer open or rests at the waistband. The other hand can hold the phone casually at the side. Focus on the outfit shape: blazer structure, white top, waistline, denim texture.\n\nComposition: vertical fashion detail crop, showing the contrast between the soft blazer, white top, and light denim.\n\nMood: effortless outfit detail, quiet luxury, Pinterest fashion close-up, minimal and expensive.\n\nColor grading: muted taupe, pale denim blue, creamy white highlights, charcoal shadows, natural skin tones, subtle film grain, clean editorial finish.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp blazer texture, sharp denim detail, clean waistline, realistic fabric folds, no blur, no low-resolution softness.\n\nAvoid: distorted hands, extra fingers, warped phone, unrealistic waist proportions, plastic fabric texture, cluttered props, CGI, overly staged product-photo look.",
  },
  {
    number: "32",
    id: "denim-street-shot-14",
    title: "Denim Street · Phone Close-Up",
    whenToUse: "Candid founder-on-the-go detail. Works as a b-roll slide in a carousel or paired with a caption about being present in the city.",
    mood: "phone · candid · close-up · lifestyle · founder",
    prompt:
      "Create image 14 as a candid close-up from the same soft blazer and light denim day-in-my-life photoshoot.\n\nUse the uploaded reference photos as the only source for the person's identity if any part of the face appears. Preserve the person's natural look from the reference photos.\n\nScene: modern city sidewalk with dark charcoal wall, clean gray pavement, and soft daylight.\n\nOutfit details: oversized soft taupe or warm gray blazer sleeve, fitted white crop top edge, light-wash denim, slim black sunglasses either worn or partly visible.\n\nAccessory: Apple iPhone Pro Max only, held naturally in one hand.\n\nPose: close-up crop of the person holding the phone while walking or pausing near the dark wall. Show the hand, phone, blazer sleeve, part of the denim, and a soft partial face or sunglasses crop if natural.\n\nComposition: candid editorial close-up, like a real day-in-my-life b-roll frame. The phone should feel natural, not like a product ad.\n\nMood: modern, casual, quiet luxury, founder-on-the-go, Pinterest lifestyle detail.\n\nColor grading: muted charcoal gray, soft taupe, pale denim, creamy skin tones, gentle contrast, subtle film grain, slightly desaturated editorial edit.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp phone edge, crisp hand detail, realistic blazer texture, no blur, no compression haze.\n\nAvoid: distorted fingers, extra hands, warped phone, fake-looking Apple logo, cluttered props, plastic skin, CGI, stock-photo pose.",
  },
]

export const REUSABLE_STARTER =
  "Use my uploaded selfie as the facial identity reference. Preserve my facial identity, age, skin tone, facial structure, and natural features. Do not alter my face, smooth my skin unnaturally, or create a more idealised version of me. You may change the styling, outfit, background, lighting, crop, camera angle, pose energy, and mood. The face stays the same. Everything else can transform. The result should look like a photograph, not AI art."

export const MAIN_LOOKS: PromptCard[] = [
  {
    number: "01",
    id: "bw-supermodel",
    title: "90s Black and White Supermodel",
    whenToUse: "You want something dramatic for a black and white post. Strong, fashion-editorial, and scroll-stopping.",
    mood: "contrast · 90s editorial · monochrome · film",
    prompt:
      "Use my uploaded selfie as the facial identity reference. Preserve my facial identity, age, skin tone, facial structure, and natural features. Do not alter my face, smooth my skin unnaturally, or create a more idealised version of me. You may change the crop, lighting, background, expression energy, and overall mood entirely. Recreate this as a high-contrast black and white portrait in the style of a 1990s fashion magazine editorial. Strong directional light that defines the cheekbones and jaw. One soft flash reflected in the eyes. Natural skin texture with visible pores. Subtle silver halide film grain. Studio-gray background. The crop should feel like a magazine portrait, not a selfie. The expression should feel direct, cool, and present. Photographic, not illustrated. This should look like it was shot on film in a photography studio, not generated by AI.",
  },
  {
    number: "02",
    id: "car-mirror-noir",
    title: "Car Mirror Lipstick Noir",
    whenToUse: "You want something cinematic and unexpected. One of the most distinctive looks in the pack.",
    mood: "cinematic · noir · late night · shadow",
    prompt:
      "Use my uploaded selfie as the facial identity reference. Preserve my facial identity, age, skin tone, facial structure, and natural features. Do not alter my face, smooth my skin unnaturally, or create a more idealised version of me. You may change the crop, angle, lighting, setting, and mood entirely. Create a black and white cinematic portrait seen through a car side mirror. My face fills the mirror, partial and cropped, showing mostly my eyes, nose, and the top of my lips. One hand near my jaw or collarbone. Deep shadow on one side of the face. A single stripe of light crossing the eyes and the bridge of the nose. Rim light from behind on the hair. The blurred car door and mirror frame surround the reflection like a border. Fine film grain. The mood is late night, private, cinematic. Photographic, not illustrated. This should look like a still from a film, not an AI image.",
  },
  {
    number: "03",
    id: "y2k-selfie",
    title: "Compact Camera Y2K Selfie",
    whenToUse: "You want something fun and nostalgic. A lighter post, a throwback feel.",
    mood: "Y2K · direct flash · warm · candid · found photo",
    prompt:
      "Use my uploaded selfie as the facial identity reference. Preserve my facial identity, age, skin tone, facial structure, and natural features. Do not alter my face or create a more idealised version of me. You may change the lighting, colour grade, crop, background, and overall era. Recreate this as a photo taken on a cheap compact digital camera in 2002. Direct on-camera flash hitting my face straight on. Slight overexposure on the forehead and cheekbones from the flash. Warm white balance with a faint yellow cast. Soft flat digital grain, not film grain. The background can shift to a casual indoor setting: a bedroom, bathroom, or kitchen. Add a white timestamp in the bottom right corner. This should look like a photo found in an old digital album, not an AI image.",
  },
  {
    number: "04",
    id: "window-light-brand",
    title: "Window Light Brand Portrait",
    whenToUse: "You need a personal brand photo that looks natural, not corporate. Good for bios, press, and website use.",
    mood: "morning light · approachable · real · personal brand",
    prompt:
      "Use my uploaded selfie as the facial identity reference. Preserve my facial identity, age, skin tone, facial structure, and natural features. Do not alter my face, smooth my skin unnaturally, or create a more idealised version of me. You may change the lighting, background, crop, and overall image quality entirely. Create a personal brand portrait with soft diffused morning window light falling across my face from one side. Clean neutral background in warm white or soft off-white tones. Real skin texture with natural pores visible. Relaxed shoulders, present, grounded. The mood is real and approachable, not corporate, not a studio shot, not aspirational in a manufactured way. It should feel like a photographer came to my home on a quiet morning and found me in good light. Photorealistic, no beauty filter, no dramatic retouching.",
  },
  {
    number: "05",
    id: "mirror-selfie-upgrade",
    title: "Expensive Mirror Selfie Upgrade",
    whenToUse: "You took a mirror selfie but the lighting or background is not working. You want the same moment, elevated.",
    mood: "clean · elevated · editorial · same moment, better light",
    prompt:
      "Use my uploaded mirror selfie as the facial identity reference. Preserve my facial identity, age, skin tone, facial structure, and natural features. Do not alter my face or create a more idealised version of me. Keep my outfit and body position. You may change everything else: the background, the lighting, the room, and the overall quality of the image. Replace the background and room behind me with a clean minimal interior in warm neutral tones, a white wall or pale plaster in soft light. Adjust the lighting to soft and directional, coming from slightly above and to one side. Straighten the composition. Sharpen the mirror detail. Natural skin texture. The result should feel like the same moment, same outfit, same body, same energy, but photographed in a well-styled space by someone who knew what they were doing. Editorial mirror selfie quality. Real, not filtered.",
  },
]

export const BONUS_LOOKS: PromptCard[] = [
  {
    number: "06",
    id: "clean-editorial",
    title: "Clean Editorial Selfie",
    whenToUse: "Your selfie is good but looks casual. You want it to feel polished and shareable.",
    mood: "editorial · soft light · neutral tones · iPhone quality",
    prompt:
      "Use my uploaded selfie as the facial identity reference. Preserve my facial identity, age, skin tone, facial structure, and natural features. Do not alter my face, smooth my skin unnaturally, or create a more idealised version of me. You may change the lighting, background, crop, and overall editorial quality. Turn this into a clean editorial portrait with soft window light, natural skin texture, minimal background in neutral tones, shallow depth of field, and subtle film grain. The result should feel polished but real, like a high-quality iPhone photo with clean editing, not AI art.",
  },
  {
    number: "07",
    id: "narrow-light",
    title: "Narrow Light Portrait",
    whenToUse: "You want a moody, high-contrast look. Works well for quotes and single-image posts.",
    mood: "dramatic · shadow · moody · sharp",
    prompt:
      "Use my uploaded selfie as the facial identity reference. Preserve my facial identity, age, skin tone, facial structure, and natural features. Do not alter my face or smooth my skin unnaturally. You may change the lighting, background, and crop entirely. Create a close-up portrait where most of my face is in deep shadow, with one narrow band of light crossing my eyes and the bridge of my nose. Plain muted gray-blue background. High-contrast cinematic lighting. Sharp focus on the eyes. Realistic photography with soft grain.",
  },
  {
    number: "08",
    id: "bathroom-magazine",
    title: "Bathroom Selfie to Magazine Shot",
    whenToUse: "You have a bathroom selfie you like but it is not quite there yet. Keep the moment, improve everything around it.",
    mood: "editorial · clean · elevated · same moment, better room",
    prompt:
      "Use my uploaded bathroom selfie as the facial identity reference. Preserve my facial identity, age, skin tone, facial structure, and natural features. Do not alter my face or create a more idealised version of me. Keep my hair, outfit, phone, and body position. You may change the lighting, background, room detail, and overall quality. Improve the lighting so it is soft and even. Clean up the background so it is minimal and neutral. Straighten the lines and composition. The result should feel like a high-end editorial bathroom mirror photo, the same moment but photographed well. Real skin texture. Not filtered.",
  },
]

export const WORKFLOW_PROMPTS: PromptCard[] = [
  {
    number: "09",
    id: "selfie-audit",
    title: "Selfie Audit",
    whenToUse: "You know something is off but you cannot identify what. Use this before you try any of the visual prompts.",
    mood: "This prompt does not change your photo. It gives you a written critique.",
    prompt:
      "Analyse this selfie like an iPhone photography coach. Tell me exactly what is working and what is making it look less polished. Give me 5 simple fixes for lighting, angle, pose, crop, and editing. Keep the advice beginner-friendly and specific to iPhone selfies. Give me the fastest way to make this photo look better before I post it.",
  },
  {
    number: "10",
    id: "edit-bridge",
    title: "Prompt-to-Edit Bridge",
    whenToUse: "You love an AI result and want to recreate that same mood in Lightroom or iPhone editing without AI.",
    mood: "This prompt does not change your photo. It gives you manual editing steps.",
    prompt:
      "Look at this AI-edited version of my selfie. Help me recreate the same mood manually in iPhone editing or Lightroom. Break the look into simple steps: exposure, contrast, highlights, shadows, warmth, colour, sharpness, crop, and grain. Keep the steps beginner-friendly. The goal is a natural, realistic result, not an over-edited one.",
  },
  {
    number: "11",
    id: "content-caption",
    title: "Content Caption From My Selfie",
    whenToUse: "You have a photo but do not know what to write. Use this to turn a selfie into an Instagram caption.",
    mood: "This prompt does not change your photo. It generates caption copy.",
    prompt:
      "Use this selfie as the starting point for an Instagram caption. Write a warm, honest caption about showing up online before you feel fully ready. Write it as a real woman speaking to another woman, not as a brand. Keep it short and direct. Include one practical line about using your phone, your face, and everyday life to start building online. End with a soft CTA to comment GUIDE for the free selfie guide.",
  },
  {
    number: "12",
    id: "studio-workflow",
    title: "SSELFIE Studio Workflow",
    whenToUse: "You want a full content plan from one photo. Hook, caption, edit direction, reel idea, and CTA.",
    mood: "This prompt does not change your photo. It generates a content plan.",
    prompt:
      "Act like my personal content assistant. I am uploading one selfie. Give me: 1. what this photo says about me right now, 2. the strongest Instagram hook for this image, 3. one caption idea, 4. one simple edit direction, 5. one carousel or reel idea, 6. the best CTA to use: GUIDE, KIT, or Studio. Keep the advice short, confident, and made for a woman building her brand from her phone.",
  },
]

export const MARBLE_CAFE_SERIES: PromptCard[] = [
  {
    number: "13",
    id: "marble-wine-shot-1",
    title: "Marble Café · Hero Wine Sip",
    whenToUse: "Your hero shot for the series. Intimate, editorial, and fashion-forward. Use this as the single-image post or the carousel cover.",
    mood: "quiet luxury · marble café · wine · editorial · fashion-forward",
    exampleImage: "/images/ai-prompts/marble-wine-shot-1.jpg",
    prompt:
      "Create image 1 of a 6-part editorial photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, body proportions, age, and natural texture from the reference photos.\n\nScene: an elegant outdoor marble café terrace with gray-white marble walls, dark wooden window frames, a round white marble café table, and a quiet luxury city atmosphere.\n\nOutfit: oversized black structured blazer with strong shoulders, simple fitted white crew-neck top underneath, black sheer floral lace skirt or lace trousers visible in the lower frame. Styling should feel minimal, expensive, and fashion-forward.\n\nAccessories: slim black Celine Triomphe-style oval sunglasses, small polished silver or gold hoop earrings, simple Cartier-style rings, dark burgundy Chanel Le Vernis-style manicured nails, and a black Bottega Veneta Intrecciato-style woven leather handbag placed near the table.\n\nHair: sleek low bun or low ponytail with a clean center part, polished but not overly perfect. Keep the person's natural hair color from the uploaded reference photos.\n\nPose: seated close to the marble table, body angled slightly sideways, one knee raised into the frame with lace fabric visible, holding a large Riedel-style red wine glass near the lips as if taking a sip. Face in three-quarter profile, calm and confident expression, sunglasses on.\n\nCamera: close editorial crop from chest to knee, slightly low and intimate angle, like a candid iPhone fashion photo but polished.\n\nMood: cool, quiet luxury, marble café terrace, Pinterest fashion editorial, feminine but sharp, expensive without looking staged.\n\nLighting: soft natural daylight, muted gray marble tones, black-white contrast, realistic skin texture, subtle film grain, clean shadows.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp facial detail, sharp lace texture, sharp blazer structure, realistic wine glass reflections, no blur, no compression softness.\n\nAvoid: distorted hands, extra fingers, warped wine glass, messy jewelry, fake-looking logos, plastic skin, over-smoothed beauty filter, CGI, cartoonish AI style, overly staged stock-photo look.",
  },
  {
    number: "14",
    id: "marble-wine-shot-2",
    title: "Marble Café · Outfit Shot",
    whenToUse: "Slide 2 of the carousel or a standalone outfit post. Shows the full look with the marble setting.",
    mood: "quiet luxury · café · outfit · editorial · effortless",
    exampleImage: "/images/ai-prompts/marble-wine-shot-2.jpg",
    prompt:
      "Create image 2 of the same marble café wine editorial photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, body proportions, age, and natural texture from the reference photos.\n\nScene: seated at a round white marble café table on an outdoor terrace with gray-white marble walls, dark wood-framed windows, and a clean expensive European city feel.\n\nOutfit: oversized black structured blazer with strong shoulders, fitted white crew-neck top, black sheer floral lace skirt or lace trousers, slim black oval sunglasses, small hoop earrings, simple rings, dark manicured nails.\n\nBrand-coded details: Celine Triomphe-style black oval sunglasses, Bottega Veneta Intrecciato-style black woven leather handbag, Cartier-style rings, Riedel-style red wine glass.\n\nHair: sleek low bun or low ponytail with a center part, polished but natural. Keep the person's natural hair color from the uploaded reference photos.\n\nPose: wider seated outfit shot. The person is leaning back slightly in the chair, one arm resting on the chair or table, the other holding a red wine glass at chest height. One knee is bent and visible with lace texture. The black woven leather handbag sits on the marble table or chair beside her.\n\nExpression: relaxed, cool, confident, not smiling too much. Sunglasses on, head turned slightly away from the camera.\n\nCamera: medium-wide editorial composition with enough space to show the marble wall, table, bag, outfit, lace detail, and wine glass.\n\nMood: quiet luxury café, modern fashion editorial, calm confidence, expensive but effortless.\n\nLighting: soft overcast daylight, muted contrast, realistic shadows, subtle film grain, natural iPhone-editorial sharpness.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp outfit silhouette, sharp handbag texture, clear wine glass, crisp lace fabric, no blur, no low-resolution softness.\n\nAvoid: distorted hands, extra fingers, warped glass, fake-looking logos, unrealistic handbag texture, plastic skin, overly commercial pose, CGI.",
  },
  {
    number: "15",
    id: "marble-wine-shot-3",
    title: "Marble Café · Looking Away",
    whenToUse: "The mysterious candid shot. Works for quotes, captions about presence and stillness, or as a mid-carousel break.",
    mood: "candid · mysterious · café moment · quiet · fashion",
    exampleImage: "/images/ai-prompts/marble-wine-shot-3.jpg",
    prompt:
      "Create image 3 of the same marble café wine editorial photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, skin tone, hair color, body proportions, age, and natural texture from the reference photos.\n\nScene: outdoor marble café terrace with gray-white marble wall, dark wooden window frame, round marble table, and soft city atmosphere.\n\nOutfit: oversized black blazer, fitted white crew-neck top, black sheer floral lace skirt or lace trousers, slim black oval sunglasses, hoop earrings, simple rings, dark manicured nails.\n\nAccessories: Celine Triomphe-style black oval sunglasses, Bottega Veneta Intrecciato-style woven black leather handbag placed near the table, Cartier-style rings, Riedel-style red wine glass.\n\nHair: sleek low bun or low ponytail with a clean center part. Keep the person's natural hair color from the uploaded reference photos.\n\nPose: seated at the marble table, holding the stem of a red wine glass lightly in one hand, looking away to the side as if watching the street. The other hand rests naturally near the blazer lapel or on the lap. Body language calm, elegant, and slightly mysterious.\n\nComposition: side-profile or three-quarter profile, face partly turned away, marble wall and wood window behind, wine glass in focus, table edge visible in the foreground.\n\nMood: quiet, expensive, fashion-editorial, not overly posed. It should feel like a real candid café moment that accidentally looks like a campaign.\n\nLighting: soft natural daylight, gentle highlights on cheekbones and sunglasses, realistic shadows, gray marble background, subtle film grain.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp face profile, sharp wine glass, sharp hand and rings, detailed lace texture, no blur, no compression haze.\n\nAvoid: distorted hands, extra fingers, warped wine glass, stiff pose, over-smoothed skin, fake-looking product details, CGI, stock-photo feeling.",
  },
  {
    number: "16",
    id: "marble-wine-shot-4",
    title: "Marble Café · Beauty Portrait",
    whenToUse: "Use for your profile photo, a close-up post, or any moment where you want the face to be the focus.",
    mood: "beauty · close-up · editorial · quiet luxury · sharp",
    exampleImage: "/images/ai-prompts/marble-wine-shot-4.jpg",
    prompt:
      "Create image 4 as a close-up beauty portrait from the same marble café wine editorial photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's real facial structure, skin tone, natural texture, hair color, body proportions, and age from the reference photos.\n\nScene: marble café terrace with gray-white marble wall, dark wood window frame, and soft blurred wine glass or café table in the background.\n\nStyling: oversized black blazer collar visible, fitted white top peeking through, slim black Celine Triomphe-style oval sunglasses pushed slightly low on the nose but not fully hiding the face, small polished hoop earrings, soft nude lips, natural polished makeup, realistic skin texture.\n\nHair: sleek low bun or low ponytail with a clean center part, polished but not stiff. Keep the person's natural hair color from the uploaded reference photos.\n\nPose: seated at the café terrace, face turned slightly toward camera, chin relaxed, expression calm and confident. One hand lightly touches the sunglasses or blazer collar. Wine glass and marble wall can be softly blurred in the background.\n\nCamera: tight portrait crop from shoulders up, shallow depth of field, editorial Pinterest beauty shot, realistic iPhone-editorial hybrid.\n\nMood: cool, elegant, quiet luxury, soft but powerful, feminine without looking too glam.\n\nLighting: soft natural daylight, cool marble reflections, gentle shadow under cheekbones, subtle grain, realistic pores and skin texture.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, ultra-sharp face, crisp sunglasses, sharp hairline, realistic skin detail, no blur, no low-resolution softness.\n\nAvoid: distorted hand near face, fake-looking sunglasses reflections, heavy glam makeup, over-filled lips, plastic skin, airbrushed beauty filter, CGI.",
  },
  {
    number: "17",
    id: "marble-wine-shot-5",
    title: "Marble Café · Detail Shot",
    whenToUse: "The carousel detail slide. No face needed. Pairs perfectly with a caption about the outfit, the accessories, or the mood.",
    mood: "detail · tactile · quiet luxury · accessories · no face",
    exampleImage: "/images/ai-prompts/marble-wine-shot-5.jpg",
    prompt:
      "Create image 5 as the detail shot of this same marble café wine editorial photoshoot.\n\nNo full face needed.\n\nFocus on the details: hands with dark burgundy manicured nails holding the stem of a Riedel-style red wine glass, simple Cartier-style rings, oversized black blazer sleeve, black sheer floral lace fabric over one knee, a black Bottega Veneta Intrecciato-style woven leather handbag on the round white marble table, and the edge of the fitted white top or black blazer visible.\n\nScene: round white marble café table, gray-white marble wall, soft outdoor terrace light, quiet luxury café mood.\n\nComposition: close-up detail crop from above or slightly side angle. Show the wine glass, hand, rings, lace texture, blazer sleeve, handbag, and marble surface. The image should feel like a real Pinterest carousel detail slide.\n\nMood: expensive, minimal, tactile, fashion detail shot, quiet luxury, not overly staged.\n\nLighting: soft daylight, realistic reflections in the wine glass, natural shadows, subtle film grain, black-white-gray palette with deep red wine as the only color accent.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, sharp hand details, crisp rings, crisp lace texture, sharp handbag weave, realistic marble texture, no blur, no low-resolution softness.\n\nAvoid: distorted fingers, extra hands, warped wine glass, fake-looking logos, messy handbag details, unrealistic wine, plastic textures, overly staged product-photo look.",
  },
  {
    number: "18",
    id: "marble-wine-shot-6",
    title: "Marble Café · Reel Cover",
    whenToUse: "Your reel cover or the strongest single image from the series. Strong silhouette, clean space for text at the top.",
    mood: "reel cover · editorial · silhouette · strong · vertical",
    exampleImage: "/images/ai-prompts/marble-wine-shot-6.jpg",
    prompt:
      "Create image 6 as the strongest reel-cover image from this marble café wine editorial photoshoot.\n\nUse the uploaded reference photos as the only source for the person's face and identity. Preserve the person's real facial structure, skin tone, hair color, body proportions, age, and natural texture from the reference photos.\n\nScene: elegant marble café terrace with gray-white marble walls, dark wooden window frames, a round white marble table, and refined city atmosphere.\n\nOutfit: oversized black structured blazer with strong shoulders, fitted white crew-neck top, black sheer floral lace skirt or lace trousers, slim black oval sunglasses, small hoop earrings, rings, dark manicured nails.\n\nBrand-coded styling: Celine Triomphe-style black oval sunglasses, Bottega Veneta Intrecciato-style black woven leather handbag, Cartier-style rings, Riedel-style red wine glass.\n\nHair: sleek low bun or low ponytail with a clean center part, polished but slightly natural. Keep the person's natural hair color from the uploaded reference photos.\n\nPose: seated with one knee raised into frame, leaning slightly back with confident posture, holding a red wine glass near the face, head turned slightly to the side. The black blazer should create a strong silhouette, and the lace detail should be visible but elegant.\n\nComposition: vertical 9:16 reel-cover crop with clean space at the top or side for text overlay. Make it look like a Pinterest fashion reel cover.\n\nMood: cool, quiet luxury, expensive, calm, confident, feminine, not overly glam, not too polished, not AI-looking.\n\nLighting: soft natural daylight, muted marble tones, realistic shadows, subtle film grain, sharp but natural iPhone editorial feel.\n\nImage quality: vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, sharp face, clear outfit silhouette, sharp lace texture, sharp wine glass, clean text space, no blur, no compression softness.\n\nAvoid: distorted hands, extra fingers, warped wine glass, fake-looking logos, plastic skin, overly generic influencer face, stock-photo pose, CGI.",
  },
]


// ---------------------------------------------------------------------------
// VAULT COLLECTION METADATA
//
// Thumbnail image paths + shot counts for each paid collection.
// Used by the freebie page to render the thumbnail strip below each preview
// card — without importing full paid series arrays (respects SOP).
//
// Keep in the same order as FREEBIE_COLLECTION_PREVIEWS (newest at top).
// When adding a new collection: add a new entry at the TOP of this array.
// ---------------------------------------------------------------------------

export type VaultCollectionMeta = {
  /** Matches the `id` field of the corresponding FREEBIE_COLLECTION_PREVIEWS card */
  previewCardId: string
  name: string
  /** Total number of prompts (shots) in the full collection */
  shotCount: number
  /** Image paths that exist — may be fewer than shotCount */
  thumbnails: string[]
}

export const VAULT_COLLECTION_META: VaultCollectionMeta[] = [
  {
    previewCardId: "quiet-luxury-london-shot-1",
    name: "Quiet Luxury London Editorial",
    shotCount: 9,
    thumbnails: [
      "/images/ai-prompts/quiet-luxury-london-shot-1.jpg",
      "/images/ai-prompts/quiet-luxury-london-shot-2.jpg",
      "/images/ai-prompts/quiet-luxury-london-shot-3.jpg",
      "/images/ai-prompts/quiet-luxury-london-shot-4.jpg",
      "/images/ai-prompts/quiet-luxury-london-shot-5.jpg",
      "/images/ai-prompts/quiet-luxury-london-shot-6.jpg",
      "/images/ai-prompts/quiet-luxury-london-shot-7.jpg",
      "/images/ai-prompts/quiet-luxury-london-shot-8.jpg",
      "/images/ai-prompts/quiet-luxury-london-shot-9.jpg",
    ],
  },
  {
    previewCardId: "noir-femme-shot-1",
    name: "NOIR FEMME Editorial",
    shotCount: 9,
    thumbnails: [
      "/images/ai-prompts/noir-femme-shot-1.png",
      "/images/ai-prompts/noir-femme-shot-2.png",
      "/images/ai-prompts/noir-femme-shot-3.png",
      "/images/ai-prompts/noir-femme-shot-4.png",
      "/images/ai-prompts/noir-femme-shot-5.png",
      "/images/ai-prompts/noir-femme-shot-6.png",
      "/images/ai-prompts/noir-femme-shot-7.png",
      "/images/ai-prompts/noir-femme-shot-8.png",
      "/images/ai-prompts/noir-femme-shot-9.png",
    ],
  },
  {
    previewCardId: "clean-girl-morning-shot-1",
    name: "Clean Girl Founder Morning Editorial",
    shotCount: 10,
    thumbnails: [
      "/images/ai-prompts/clean-girl-morning-shot-1.jpg",
      "/images/ai-prompts/clean-girl-morning-shot-2.jpg",
      "/images/ai-prompts/clean-girl-morning-shot-3.jpg",
      "/images/ai-prompts/clean-girl-morning-shot-4.jpg",
      "/images/ai-prompts/clean-girl-morning-shot-5.jpg",
      "/images/ai-prompts/clean-girl-morning-shot-6.jpg",
      "/images/ai-prompts/clean-girl-morning-shot-7.jpg",
      "/images/ai-prompts/clean-girl-morning-shot-8.jpg",
      "/images/ai-prompts/clean-girl-morning-shot-9.jpg",
      "/images/ai-prompts/clean-girl-morning-shot-10.jpg",
    ],
  },
  {
    previewCardId: "dark-feminine-cafe-shot-1",
    name: "Dark Feminine Café Coffee-Run Editorial",
    shotCount: 6,
    thumbnails: [
      "/images/ai-prompts/dark-feminine-cafe-shot-1.jpg",
      "/images/ai-prompts/dark-feminine-cafe-shot-2.jpg",
      "/images/ai-prompts/dark-feminine-cafe-shot-3.jpg",
      "/images/ai-prompts/dark-feminine-cafe-shot-4.jpg",
      "/images/ai-prompts/dark-feminine-cafe-shot-5.jpg",
      "/images/ai-prompts/dark-feminine-cafe-shot-6.jpg",
      "/images/ai-prompts/dark-feminine-cafe-shot-7.jpg",
      "/images/ai-prompts/dark-feminine-cafe-shot-8.jpg",
    ],
  },
  {
    previewCardId: "dark-balcony-shot-1",
    name: "Dark Balcony Luxury City Editorial",
    shotCount: 9,
    thumbnails: [
      "/images/ai-prompts/dark-balcony-shot-1.png",
      "/images/ai-prompts/dark-balcony-shot-2.png",
      "/images/ai-prompts/dark-balcony-shot-3.png",
      "/images/ai-prompts/dark-balcony-shot-4.png",
      "/images/ai-prompts/dark-balcony-shot-5.png",
      "/images/ai-prompts/dark-balcony-shot-6.png",
      "/images/ai-prompts/dark-balcony-shot-7.png",
      "/images/ai-prompts/dark-balcony-shot-8.png",
    ],
  },
  {
    previewCardId: "coastal-white-shot-1",
    name: "Coastal White Dress Sunset Editorial",
    shotCount: 9,
    thumbnails: [
      "/images/ai-prompts/coastal-white-shot-1.jpg",
      "/images/ai-prompts/coastal-white-shot-2.jpg",
      "/images/ai-prompts/coastal-white-shot-3.jpg",
      "/images/ai-prompts/coastal-white-shot-4.jpg",
      "/images/ai-prompts/coastal-white-shot-5.jpg",
      "/images/ai-prompts/coastal-white-shot-6.jpg",
      "/images/ai-prompts/coastal-white-shot-7.jpg",
      "/images/ai-prompts/coastal-white-shot-8.jpg",
    ],
  },
  {
    previewCardId: "cozy-leather-shot-1",
    name: "Cozy Leather + Oversized Knit Mirror Editorial",
    shotCount: 13,
    thumbnails: [
      "/images/ai-prompts/cozy-leather-shot-1.png",
      "/images/ai-prompts/cozy-leather-shot-2.png",
      "/images/ai-prompts/cozy-leather-shot-3.png",
      "/images/ai-prompts/cozy-leather-shot-4.png",
      "/images/ai-prompts/cozy-leather-shot-5.png",
      "/images/ai-prompts/cozy-leather-shot-6.png",
      "/images/ai-prompts/cozy-leather-shot-7.png",
      "/images/ai-prompts/cozy-leather-shot-8.png",
      "/images/ai-prompts/cozy-leather-shot-9.png",
    ],
  },
  {
    previewCardId: "denim-street-shot-1",
    name: "Soft Blazer + Light Denim Street Editorial",
    shotCount: 14,
    thumbnails: [
      "/images/ai-prompts/denim-street-shot-1.jpg",
      "/images/ai-prompts/denim-street-shot-2.jpg",
      "/images/ai-prompts/denim-street-shot-3.jpg",
      "/images/ai-prompts/denim-street-shot-4.jpg",
      "/images/ai-prompts/denim-street-shot-5.jpg",
      "/images/ai-prompts/denim-street-shot-6.jpg",
      "/images/ai-prompts/denim-street-shot-7.jpg",
      "/images/ai-prompts/denim-street-shot-8.jpg",
      "/images/ai-prompts/denim-street-shot-9.jpg",
      "/images/ai-prompts/denim-street-shot-10.jpg",
      "/images/ai-prompts/denim-street-shot-11.jpg",
      "/images/ai-prompts/denim-street-shot-12.jpg",
      "/images/ai-prompts/denim-street-shot-13.jpg",
    ],
  },
  {
    previewCardId: "marble-wine-shot-1",
    name: "Marble Café Wine Editorial",
    shotCount: 6,
    thumbnails: [
      "/images/ai-prompts/marble-wine-shot-1.jpg",
      "/images/ai-prompts/marble-wine-shot-2.jpg",
      "/images/ai-prompts/marble-wine-shot-3.jpg",
      "/images/ai-prompts/marble-wine-shot-4.jpg",
      "/images/ai-prompts/marble-wine-shot-5.jpg",
      "/images/ai-prompts/marble-wine-shot-6.jpg",
    ],
  },
]

// ---------------------------------------------------------------------------
// FREEBIE COLLECTION PREVIEWS
//
// One shot per paid collection — shown in the freebie access page with an
// upgrade CTA to the full Prompt Vault.
//
// HOW TO UPDATE WHEN ADDING A NEW COLLECTION:
//   Add the new series's first card here at the TOP of this array:
//   FREEBIE_COLLECTION_PREVIEWS.unshift(NEW_SERIES[0])
//   (or manually add it above the existing entries below)
//
// Rule: newest collection preview at the top, oldest at the bottom.
// ---------------------------------------------------------------------------

export const FREEBIE_COLLECTION_PREVIEWS: PromptCard[] = [
  // Newest collection preview at top — add new ones above this line
  ...(QUIET_LUXURY_LONDON_SERIES.length > 0  ? [QUIET_LUXURY_LONDON_SERIES[0]]  : []),
  ...(NOIR_FEMME_SERIES.length > 0           ? [NOIR_FEMME_SERIES[0]]           : []),
  ...(CLEAN_GIRL_MORNING_SERIES.length > 0   ? [CLEAN_GIRL_MORNING_SERIES[0]]   : []),
  ...(DARK_FEMININE_CAFE_SERIES.length > 0 ? [DARK_FEMININE_CAFE_SERIES[0]] : []),
  ...(DARK_BALCONY_SERIES.length > 0   ? [DARK_BALCONY_SERIES[0]]   : []),
  ...(COASTAL_WHITE_SERIES.length > 0  ? [COASTAL_WHITE_SERIES[0]]  : []),
  ...(COZY_LEATHER_SERIES.length > 0   ? [COZY_LEATHER_SERIES[0]]   : []),
  ...(DENIM_STREET_SERIES.length > 0   ? [DENIM_STREET_SERIES[0]]   : []),
  ...(MARBLE_CAFE_SERIES.length > 0    ? [MARBLE_CAFE_SERIES[0]]    : []),
]
