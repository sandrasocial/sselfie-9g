// ---------------------------------------------------------------------------
// AI Prompts data — edit this file to add, change, or remove prompts.
// Each section maps to a section on the access page.
//
// ORDERING RULE: newest collection goes at the TOP of this file.
// Add new COLLECTION arrays above COZY_LEATHER_SERIES, then add the section
// to the page in app/ai-prompts/access/[token]/page.tsx (same top order).
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
