/**
 * Universal Prompts Library
 * 
 * High-quality 250-500 word prompts organized by category.
 * Used as fallback/reference in Studio Pro Mode when prompt constructor
 * doesn't have a match, or as direct selection for proven results.
 * 
 * Each prompt includes:
 * - Character consistency instructions
 * - Detailed outfit/styling
 * - Specific pose and expression
 * - Rich environment description
 * - Professional lighting details
 * - Camera technical specs
 * - Mood and aesthetic
 */

export interface UniversalPrompt {
  id: string
  title: string
  description: string
  category: string
  prompt: string // 250-500 words
  tags: string[]
  useCases: string[]
}

// ============================================
// TRAVEL & AIRPORT PROMPTS (10 prompts)
// ============================================

export const TRAVEL_UNIVERSAL_PROMPTS: UniversalPrompt[] = [
  {
    id: 'travel-airport-lounge-1',
    title: 'Airport Lounge It Girl',
    description: 'Seated in minimalist airport lounge with iced latte, beige sweater and wide-leg pants',
    category: 'travel-airport',
    tags: ['travel', 'airport', 'lounge', 'casual-chic', 'seated'],
    useCases: ['travel content', 'airport lifestyle', 'coffee moment', 'influencer style'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in it girl style. The woman is seated in a minimalist airport lounge, holding an iced latte with transparent lid while smiling softly at the camera.

Look: cropped beige sweater, wide-leg off-white pants, and clean white sneakers. Hair with volume and waves falling over shoulders. Silver bag next to her, structured bag over the suitcase.

The woman is seated on a modern gray sofa, with body slightly turned to camera and relaxed posture. Clear facial expression, soft direct gaze. Natural and spontaneous aesthetic.

Soft and diffused light from large adjacent windows, creating clarity in face and reflecting in hair. Neutral tones and minimalist environment.

Background: corridor with blurred movement of travelers and gate signs in blur. Modern architectural lines and soft gray tones.

Camera: 50mm lens, depth of field f/2.0, camera positioned at chest height for frontal composition. Sharp focus on face, smooth bokeh in background.

Refined, comfortable and contemporary airport aesthetic. 4K resolution. Hyper-realistic quality.`
  },
  {
    id: 'travel-airport-departure-1',
    title: 'Airport Departure Influencer Shot',
    description: 'Standing with pink suitcases in airport departure area, oversized beige loungewear',
    category: 'travel-airport',
    tags: ['travel', 'airport', 'departure', 'luggage', 'standing'],
    useCases: ['travel content', 'departure moment', 'luggage styling', 'comfortable chic'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy attached photo. She is looking at the camera.

Ultra-realistic 2:3 portrait in influencer style, focused on face with maximum sharpness and soft blurred background. The stylish young woman poses relaxed in the outdoor area of the airport departure zone.

She wears oversized beige sweatshirt and matching sweatpants, with white New Balance sneakers with thick sole. Hair pulled into a casual low bun, with some loose natural strands around the face. Sunglasses with pastel pink lenses rest on top of her head or are held in hand to guarantee total facial sharpness.

She holds the handles of two rigid pink-light suitcases positioned to the side, with realistic texture. On the front suitcase there is a textured beige bag with pink-light letters and a hanging teddy bear keychain.

Lighting: soft natural light filtered through window shadows, highlighting real skin texture, natural shine in hair and material details.

Environment: modern airport exterior, with smooth concrete floor and metallic pillars; glass doors blurred in background with real depth of field f/2.8.

Camera: 35mm lens, vertical 2:3 composition, framing from shoulders up, ensuring sharpness on face and keeping luggage visible.

Clean, minimalist and comfortable aesthetic, conveying confident humor and light travel vibe. 4K resolution. Hyper-realistic quality.`
  },
  {
    id: 'travel-airport-walking-1',
    title: 'Airport Terminal Walking Shot',
    description: 'Walking through terminal pulling silver suitcase, black athleisure outfit',
    category: 'travel-airport',
    tags: ['travel', 'airport', 'walking', 'terminal', 'movement'],
    useCases: ['travel lifestyle', 'in-motion content', 'athleisure travel', 'editorial style'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment. She is looking at the camera.

Ultra-realistic portrait in influencer style, in vertical 2:3 composition. The woman is walking confidently through the modern airport terminal, pulling a silver aluminum carry-on suitcase with one hand, looking over her shoulder at the camera with a soft confident expression.

She wears Lululemon Scuba Oversized hoodie in heathered grey, matching Lululemon Align high-rise joggers, white Common Projects Achilles Low sneakers, Lululemon Everywhere Belt Bag in black worn crossbody, black New Era baseball cap, and oversized black sunglasses pushed up on the cap.

Hair loose in waves with natural volume visible under the cap. Natural glam makeup with luminous skin.

Walking with relaxed confident stride, one hand pulling the suitcase handle, the other swinging naturally at her side or holding her phone. Body slightly turned toward camera, capturing mid-stride motion with natural movement.

Lighting: soft natural diffused light entering through floor-to-ceiling windows, creating gentle highlights on hair and realistic skin texture without artificial smoothing. Blue-tinted daylight typical of modern airports.

Environment: modern airport terminal with polished floors reflecting light, floor-to-ceiling glass windows, blurred travelers in background moving in both directions, departure boards softly visible, clean architectural lines and spacious feel.

Camera: 35mm lens at f/2.0, camera positioned at mid-body height slightly below eye line, capturing motion while maintaining sharp focus on face. Slight motion blur on background travelers to enhance sense of movement while subject remains sharp.

Mood: comfortable luxury travel aesthetic, confident and relaxed, aspirational yet authentic, effortless style. 4K resolution, hyper-realistic quality with visible fabric textures and natural lighting.`
  },
  {
    id: 'travel-airport-seated-bench-1',
    title: 'Airport Bench Seated Portrait',
    description: 'Seated on leather bench with headphones, black lounge outfit and silver suitcase',
    category: 'travel-airport',
    tags: ['travel', 'airport', 'seated', 'waiting', 'headphones'],
    useCases: ['waiting area content', 'travel downtime', 'relaxed moment', 'lifestyle editorial'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic portrait in influencer style, in vertical 2:3 composition. The woman is seated in airport terminal waiting area, facing camera, maintaining her original facial characteristics with maximum sharpness. Hair loose, in waves with natural volume.

She wears a black lounge outfit — soft jacket with zipper and wide-leg pants — with clean white sneakers. Uses white over-ear headphones on ears. Seated comfortably on a black leather bench, with one leg casually folded, she looks directly at camera with soft and confident expression.

In front of her, there is a silver rigid suitcase with a cream sherpa tote bag resting on it, with minimalist logo in relief and a teddy bear keychain on handle.

Lighting: natural blue light entering through wide terminal windows, creating soft shine on hair and realistic skin texture, without artificial smoothing. Natural reflectors on glass reinforce realism.

Environment: modern airport terminal with large windows, soft reflections on polished floors, blurred travelers passing in background, departure gates softly visible in distance.

Camera: travel lifestyle aesthetic, 35mm lens at f/2.0, slightly below eye line angle to enhance face and keep it perfectly sharp. Realistic visible texture in fabrics, hair, glass reflections and luggage details.

Mood: calm, sophisticated, aspirational — a real moment before boarding. Comfortable minimalism with touch of luxury. 4K resolution. Hyper-realistic quality.`
  },
  {
    id: 'travel-airport-coffee-1',
    title: 'Airport Coffee Shop Moment',
    description: 'Standing at coffee counter with latte, cream outfit and Away suitcase nearby',
    category: 'travel-airport',
    tags: ['travel', 'airport', 'coffee', 'standing', 'morning'],
    useCases: ['coffee content', 'morning travel', 'casual moment', 'lifestyle branding'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in lifestyle influencer style. The woman stands at modern airport coffee shop counter, holding a large iced latte with straw, smiling softly at camera with warm genuine expression.

She wears oversized cream cable knit sweater, Levi's 501 straight-leg jeans in light vintage wash, white Veja sneakers, cream baseball cap with hair in loose waves underneath. Lululemon Everywhere Belt Bag in taupe worn crossbody. Away aluminum carry-on in champagne gold positioned next to her.

Standing with relaxed posture, one hand holding the latte cup close to chest level, other hand in pocket or resting naturally at side. Body slightly angled toward camera, weight shifted casually to one leg, creating natural authentic stance.

Hair flowing in soft waves from under the cap, framing face naturally. Fresh morning makeup look with dewy skin, natural glow, minimal eye makeup, nude-pink lips.

Lighting: warm soft morning light mixed with ambient coffee shop lighting, creating gentle highlights on face and reflective shine on latte cup. Natural skin texture clearly visible, realistic hair shine, fabric textures sharp.

Environment: modern airport coffee shop with clean minimalist design, marble or light wood counters, espresso machines softly blurred in background, other travelers queuing behind in soft bokeh, menu boards slightly visible, plants or modern decor elements.

Camera: 50mm lens at f/1.8, camera at chest height capturing three-quarter shot, sharp focus on face with cup in secondary focus, background in soft beautiful bokeh. Vertical framing emphasizes height and creates editorial feel.

Mood: comfortable morning luxury, cozy travel vibes, relatable yet aspirational, that "airport coffee ritual" aesthetic. 4K resolution. Hyper-realistic quality with visible pores, realistic fabric textures, authentic lighting.`
  },
  {
    id: 'travel-airport-window-1',
    title: 'Airport Window Gazing',
    description: 'Standing by floor-to-ceiling window watching planes, elegant casual outfit',
    category: 'travel-airport',
    tags: ['travel', 'airport', 'window', 'contemplative', 'planes'],
    useCases: ['dreamy travel content', 'wanderlust vibes', 'thoughtful moment', 'editorial style'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic portrait in editorial influencer style, vertical 2:3 composition. The woman stands by massive floor-to-ceiling airport window, body turned toward the glass watching planes on tarmac, face turned back over shoulder toward camera with soft dreamy expression.

She wears elegant casual travel outfit: beige trench coat over cream ribbed turtleneck, Levi's Ribcage jeans in classic blue, white leather sneakers, Away carry-on in navy positioned beside her. Hair in effortless low bun with face-framing pieces, gold hoop earrings catching light.

Standing with one hand gently touching the window glass, other hand holding phone or resting on suitcase handle. Body creates elegant line from shoulder to hip, weight shifted naturally, posture relaxed yet refined. Looking back at camera with contemplative soft smile, eyes conveying wanderlust and anticipation.

Lighting: dramatic natural light flooding through massive windows, creating beautiful rim light on hair and profile, soft fill light on face from terminal. Blue-tinted daylight from tarmac side, warmer ambient light from terminal side, creating dimensional lighting. Visible realistic skin texture, natural hair shine, fabric details crisp.

Environment: modern airport terminal with soaring glass walls, airplanes visible on tarmac outside (slightly out of focus), gate seating area softly blurred behind, architectural lines leading eye to subject, reflections on polished floors adding depth.

Camera: 85mm lens at f/2.0, camera positioned at eye level capturing elegant three-quarter pose, sharp focus on face with beautiful bokeh on background. Frame includes both subject and sense of vast airport space, window reflection subtly visible.

Mood: dreamy wanderlust aesthetic, sophisticated travel elegance, that "pre-adventure anticipation" feeling, aspirational yet authentic, timeless editorial quality. 4K resolution. Hyper-realistic with visible pores, natural skin texture, realistic reflections and light behavior.`
  },
  {
    id: 'travel-airport-gate-1',
    title: 'Gate Area Priority Boarding',
    description: 'Standing in priority boarding line with boarding pass, polished travel outfit',
    category: 'travel-airport',
    tags: ['travel', 'airport', 'gate', 'boarding', 'premium'],
    useCases: ['boarding content', 'premium travel', 'organized traveler', 'lifestyle branding'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in polished lifestyle influencer style. The woman stands in priority boarding line at gate, holding phone with mobile boarding pass visible on screen, looking at camera with confident ready-to-go expression and slight smile.

She wears elevated travel outfit: black Lululemon Define jacket, black Align high-rise pants, white sneakers, black Lululemon belt bag worn crossbody, Away aluminum carry-on in black positioned beside her, structured leather tote bag over shoulder. Hair in sleek low ponytail with clean middle part, natural glam makeup with defined eyes.

Standing with polished confident posture, phone held up displaying boarding pass, other hand on suitcase handle, body angled three-quarters toward camera. Expression projects organized, prepared traveler energy—calm confidence, slight excitement, completely put-together aesthetic.

Lighting: clean even airport lighting from overhead and natural light from nearby windows, creating clear visibility on face with no harsh shadows. Skin appears natural with visible texture, realistic shine on hair, fabric textures crisp and detailed.

Environment: gate area with blue boarding sign visible in soft background, priority boarding line markers subtly visible, other travelers in soft blur behind and beside, gate podium and staff slightly out of focus, clean modern airport aesthetic, departure board glowing in background.

Camera: 50mm lens at f/2.2, camera at chest height capturing polished full-length editorial framing, sharp focus on face and boarding pass phone screen, background in gentle bokeh while maintaining contextual clarity.

Mood: premium travel aesthetic, organized sophistication, that "frequent flyer who has it together" vibe, aspirational business-casual travel, confident and capable energy. 4K resolution. Hyper-realistic quality with realistic lighting behavior, visible fabric weaves, natural skin appearance.`
  },
  {
    id: 'travel-airport-escalator-1',
    title: 'Airport Escalator in Motion',
    description: 'Riding escalator with suitcase, casual cool outfit with sunglasses',
    category: 'travel-airport',
    tags: ['travel', 'airport', 'escalator', 'movement', 'cool'],
    useCases: ['dynamic travel content', 'movement shots', 'editorial style', 'cool-girl aesthetic'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic portrait in editorial street style, vertical 2:3 composition. The woman rides airport escalator going up, suitcase on step below her, looking directly at camera with cool confident expression and slight smirk, sunglasses on but pushed slightly down nose so eyes are visible.

She wears effortlessly cool travel outfit: oversized black leather jacket, white ribbed tank underneath, black Levi's jeans, white Adidas Samba sneakers, black baseball cap worn forward, large black sunglasses, gold layered necklaces, Away carry-on in aluminum silver on escalator step beside her.

Standing on escalator with relaxed confident stance, one hand on suitcase handle, other hand holding sunglasses pulling them slightly down to make eye contact with camera. Hip slightly popped, body language projecting effortless cool. Hair in loose waves visible flowing from under cap. Expression is subtly confident, knowing, that perfect "caught in motion but make it fashion" vibe.

Lighting: mixed airport lighting—overhead fluorescents creating even base light, backlight from upper level creating slight glow around edges, natural window light from side catching face. Realistic skin texture visible, hair has natural shine, leather jacket shows realistic surface texture and shine.

Environment: modern airport with escalators and moving walkways, travelers in motion around creating dynamic background blur, architectural steel and glass structures, directional signage softly visible, sense of upward movement and activity.

Camera: 35mm lens at f/2.0, camera positioned on same escalator going down (opposite direction) capturing face-to-face angle, slight motion blur on background while subject remains sharp, vertical framing emphasizes escalator lines and creates editorial magazine feel.

Mood: effortless cool travel aesthetic, street-style editorial meets airport chic, that "I travel so much this is second nature" confidence, edgy yet sophisticated, authentic candid-but-styled vibe. 4K resolution. Hyper-realistic with visible fabric textures, realistic motion blur, authentic lighting behavior.`
  },
  {
    id: 'travel-airport-baggage-claim-1',
    title: 'Baggage Claim Carousel Wait',
    description: 'Waiting at baggage carousel on phone, relaxed post-flight outfit',
    category: 'travel-airport',
    tags: ['travel', 'airport', 'baggage-claim', 'arrival', 'waiting'],
    useCases: ['arrival content', 'post-flight moment', 'relatable travel', 'casual style'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in relatable lifestyle influencer style. The woman stands at baggage claim carousel, leaning casually against the metal railing, scrolling on phone while waiting for luggage, glancing up at camera with tired but genuine smile.

She wears comfortable post-flight outfit: oversized grey hoodie (Lululemon or similar), black leggings, white sneakers, hair in messy bun with flyaways and pieces falling out, minimal makeup giving natural just-landed appearance, Lululemon belt bag worn crossbody. Carry-on tote bag on shoulder.

Leaning back against baggage carousel railing with relaxed exhausted-but-happy posture, phone in one hand at comfortable viewing angle, other arm resting on railing or in hoodie pocket. Body language conveys "finally here" relief mixed with tired traveler realness. Natural smile or slight laugh at camera, authentic energy.

Lighting: harsh overhead fluorescent airport lighting typical of baggage claim areas, creating very realistic flat illumination with slight shadows under eyes enhancing "just got off plane" authenticity. Skin texture highly visible, realistic hair including flyaways and frizz, fabric wrinkles from sitting on plane clearly visible.

Environment: baggage claim area with moving carousel in background, other travelers waiting around in soft blur, luggage pieces on carousel moving past in background bokeh, arrival screens and exit signs glowing in distance, industrial airport basement aesthetic with concrete and metal.

Camera: 50mm lens at f/2.0, camera at chest height capturing authentic candid framing, sharp focus on face and phone with carousel in gentle bokeh, vertical composition emphasizes relatable waiting moment.

Mood: authentic post-flight realness, tired-but-made-it energy, relatable travel content not overly polished, that "just landed" vibe everyone knows, comfortable casual aesthetic. 4K resolution. Hyper-realistic quality prioritizing authentic exhausted traveler details—messy hair, wrinkled clothes, real fluorescent lighting.`
  },
  {
    id: 'travel-airport-taxi-exit-1',
    title: 'Airport Exit Taxi Line',
    description: 'Exiting airport toward taxi area, pulling suitcase with destination energy',
    category: 'travel-airport',
    tags: ['travel', 'airport', 'exit', 'departure', 'taxi'],
    useCases: ['departure content', 'leaving airport', 'journey beginning', 'editorial movement'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic portrait in cinematic lifestyle style, vertical 2:3 composition. The woman exits through automatic airport doors toward taxi/rideshare area, pulling suitcase confidently, looking back over shoulder at camera with excited smile and sense of adventure in her expression.

She wears chic arrival outfit: camel wool coat over black turtleneck, black straight-leg jeans, black leather boots, black leather gloves, hair down in polished waves, sophisticated makeup with defined eyes, Away carry-on in aluminum, structured black leather tote on shoulder.

Walking with confident purposeful stride, one hand pulling suitcase handle, body turned back toward camera while moving forward creating dynamic composition. Coat flowing slightly with movement, hair catching breeze from outside, posture conveys excitement and anticipation of adventure ahead.

Lighting: transitional lighting from indoor airport fluorescents to outdoor natural light streaming through exit doors, creating beautiful mixed light scenario—warm backlight from outside creating glow around hair and body edges, cooler fill light from inside on face. Golden hour or overcast daylight visible outside. Realistic skin texture, natural hair shine with movement, fabric textures detailed.

Environment: airport exit area with automatic sliding doors, "Ground Transportation" and "Taxi" signs visible in background, other travelers with luggage moving in both directions in soft blur, taxis or rideshare vehicles slightly visible outside through doors, sense of transition from indoor to outdoor space.

Camera: 35mm lens at f/1.8, camera positioned at mid-body level catching moment of exit and backward glance, slight motion blur on legs and suitcase wheels suggesting movement while face remains sharp, shallow depth of field on background.

Mood: cinematic arrival energy, adventure beginning, sophisticated traveler chic, that "here we go" excitement, polished yet authentic, editorial fashion meets real travel moment. 4K resolution. Hyper-realistic quality with realistic motion, authentic lighting transition, visible environmental details.`
  }
]

// ============================================
// ALO YOGA / ATHLETIC PROMPTS (10 prompts)
// ============================================

export const ALO_WORKOUT_UNIVERSAL_PROMPTS: UniversalPrompt[] = [
  {
    id: 'alo-yoga-studio-warrior-1',
    title: 'Yoga Studio Warrior Pose',
    description: 'Warrior II pose in bright yoga studio, Alo Airlift bra and Airbrush leggings',
    category: 'alo-workout',
    tags: ['yoga', 'studio', 'warrior-pose', 'alo', 'athletic'],
    useCases: ['yoga content', 'athletic wear showcase', 'studio lifestyle', 'fitness editorial'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in athletic editorial style. The woman holds Warrior II yoga pose in bright modern yoga studio, arms extended parallel to floor, front knee bent at 90 degrees, back leg straight and strong, gaze over front hand with focused serene expression.

She wears Alo Yoga Airlift bralette in sage green with signature strappy back detail, high-waisted Alo Airbrush leggings in matching sage, bare feet grounded on bamboo floor. Hair pulled into high ponytail with face-framing pieces, minimal makeup with natural glow, delicate gold necklace only accessory.

Body demonstrates perfect warrior alignment—shoulders stacked over hips, arms forming straight line, core engaged, chest open and proud. Facial expression shows calm focus and inner strength, slight softness around eyes, breathing steadily. Visible muscle definition in arms and legs, realistic body with natural athletic build.

Lighting: abundant natural light flooding through large floor-to-ceiling windows, creating soft even illumination with gentle shadows defining muscle tone. Warm morning sunlight casting subtle golden glow, no harsh shadows, skin appears luminous and natural with visible texture and realistic shine from light exertion.

Environment: minimalist yoga studio with light bamboo floors, white walls, large windows showing greenery outside in soft bokeh, other yoga mats rolled up against wall in background blur, plants in corners, calm serene atmosphere.

Camera: 50mm lens at f/2.0, camera positioned at torso height directly in front capturing full warrior pose, sharp focus on face and upper body with gentle bokeh on background, vertical framing emphasizes pose lines and height.

Mood: zen athletic elegance, inner strength and outer grace, aspirational yet achievable, that "yoga is my sanctuary" aesthetic, peaceful power. 4K resolution. Hyper-realistic quality with visible skin texture, realistic fabric appearance showing slight stretch, natural athletic body definition.`
  },
  {
    id: 'alo-tennis-court-1',
    title: 'Tennis Court Movement',
    description: 'Mid-action on tennis court, Alo tennis dress and visor, athletic energy',
    category: 'alo-workout',
    tags: ['tennis', 'outdoor', 'sport', 'alo', 'movement'],
    useCases: ['tennis content', 'athletic action', 'sport lifestyle', 'energy shots'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in sports lifestyle editorial style. The woman captured mid-movement on professional tennis court, just finished forehand swing, tennis racket following through, body twisted with athletic grace, looking toward camera with energized confident smile and flushed cheeks from activity.

She wears Alo Yoga tennis dress in crisp white with built-in shorts, feminine silhouette with racerback design, white Alo visor, white tennis shoes (Nike or similar), white crew socks, Alo wristbands. Hair in sleek high ponytail swishing with movement, sport-glam makeup—waterproof mascara, tinted lip, natural glow, skin showing realistic flush and slight sheen from exertion.

Body position captures dynamic athletic movement—torso twisted, racket extended from follow-through, one foot planted with knee bent, other leg extended showing power and balance. Expression radiates joy and competitive energy, genuine smile, eyes bright with focus and enjoyment. Visible realistic athletic muscle tone, body in natural movement.

Lighting: bright outdoor sunlight creating high-key sports photography aesthetic, sun highlighting hair and creating natural rim light on body edges, shadows under visor creating editorial drama on face, skin shows realistic sun-kissed glow and perspiration sheen, whites appear brilliant and clean.

Environment: professional outdoor tennis court with bright blue surface, net visible in background blur, court lines crisp and sharp in foreground, blurred trees or sky in far background suggesting upscale club setting, chain-link fence barely visible far back.

Camera: 85mm lens at f/2.2, camera positioned at court level capturing full body in vertical frame with slight upward angle emphasizing athletic power, fast shutter speed freezing motion while maintaining slight blur on racket and ponytail showing movement, sharp focus on face and torso.

Mood: athletic femininity, competitive joy, luxury sport lifestyle, that "tennis is my happy place" energy, powerful grace, aspirational fitness aesthetic. 4K resolution. Hyper-realistic quality with visible perspiration, realistic fabric stretch and movement, authentic outdoor lighting, natural athletic body.`
  },
  {
    id: 'alo-outdoor-running-1',
    title: 'Morning Run Trail Movement',
    description: 'Running on forest trail in athletic wear, natural outdoor setting',
    category: 'alo-workout',
    tags: ['running', 'outdoor', 'trail', 'alo', 'cardio', 'nature'],
    useCases: ['running content', 'outdoor fitness', 'cardio lifestyle', 'athletic action'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic portrait in athletic lifestyle style, vertical 2:3 composition. The woman runs along tree-lined trail in natural morning light, mid-stride with one foot planted and arms in natural running motion.

She wears Alo Yoga Airlift bralette in black, Alo Airbrush 7/8 leggings in black with white side stripe, white running shoes, wireless earbuds, hair in high ponytail secured with black scrunchie. Minimal sport makeup with natural skin showing realistic light perspiration from exertion.

Body demonstrates natural running form with slight forward lean, arms bent pumping in rhythm with stride, core engaged. She looks toward camera with focused calm expression, face showing natural athletic determination without artificial intensity.

Lighting: early morning natural light filtering through trees creating dappled patterns on trail, rim light on shoulders from backlight, sun highlighting natural perspiration creating authentic athletic appearance, fresh outdoor light quality.

Environment: forest running trail with packed dirt path, fallen leaves, tall trees creating natural canopy with morning sunlight streaming through, blurred greenery suggesting forward movement, trail curves naturally ahead with morning atmosphere.

Camera: 85mm lens at f/2.2, camera positioned at trail level capturing dynamic running angle, sharp focus on face and upper body with trail in gentle bokeh, vertical framing with slight motion blur on moving limbs showing action while subject remains sharp.

Mood: athletic dedication, morning runner's focus, outdoor fitness lifestyle, natural movement beauty, healthy active life. 4K resolution. Hyper-realistic quality with visible perspiration detail, realistic fabric movement, authentic outdoor lighting, natural athletic form.`
  },
  {
    id: 'alo-pilates-reformer-1',
    title: 'Pilates Reformer Practice',
    description: 'On reformer in pilates studio, controlled movement with precision',
    category: 'alo-workout',
    tags: ['pilates', 'reformer', 'studio', 'alo', 'strength', 'control'],
    useCases: ['pilates content', 'reformer shots', 'strength training', 'studio fitness'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in sophisticated fitness editorial style. The woman performs footwork exercise on pilates reformer, legs extended pressing against foot bar with controlled precision, upper body supported on carriage.

She wears Alo Yoga Alosoft Highlight bralette in dusty rose with ribbed texture, matching Alosoft Highlight leggings creating monochromatic sophisticated look, bare feet with natural pedicure on foot bar, hair in low sleek ponytail, minimal makeup with natural glow, small gold stud earrings.

Body demonstrates precise pilates alignment—core engaged with visible muscle definition, legs fully extended with feet in controlled position, toes spread showing deliberate form, shoulders positioned correctly, spine neutral, ribcage controlled. She looks at camera with focused serene expression showing mind-body connection and concentrated control.

Lighting: clean natural light flooding through large studio windows creating soft even illumination, light highlighting body alignment and muscle engagement without harsh shadows, skin appears luminous with realistic healthy sheen from controlled work, fabric texture clearly visible.

Environment: sophisticated pilates studio with light wood floors, white walls, large mirrors reflecting natural light, other reformers visible in soft background, plants in corners, minimalist aesthetic with modern equipment, sense of focused peaceful studio energy.

Camera: 50mm lens at f/2.0, camera positioned at reformer level capturing full body showing leg extension and core engagement, sharp focus on face and form with background in soft bokeh, vertical framing emphasizes length and extension, slight low angle shows strength.

Mood: sophisticated fitness precision, mind-body connection, controlled strength, refined athletic practice, peaceful determination, graceful power. 4K resolution. Hyper-realistic quality with visible muscle definition, realistic fabric texture, authentic studio lighting, precise athletic form.`
  },
  {
    id: 'alo-gym-weights-1',
    title: 'Gym Strength Training',
    description: 'Using dumbbells in gym, focused strength work, powerful energy',
    category: 'alo-workout',
    tags: ['gym', 'weights', 'strength', 'alo', 'training', 'power'],
    useCases: ['strength content', 'gym lifestyle', 'weight training', 'empowerment shots'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in powerful fitness editorial style. The woman performs bicep curls with dumbbells in modern gym, arms bent mid-curl showing muscle engagement, standing with strong athletic stance.

She wears Alo Yoga Airlift Intrigue bralette in black with strappy back detail, Alo Airlift capri leggings with mesh panel detail, white training shoes, black wrist wraps on both wrists, hair in high bun with headband, sport makeup with waterproof products showing natural flush from exertion.

Body demonstrates proper lifting form—core engaged, shoulders back, elbows controlled close to sides, controlled movement with proper weight, stance wide and grounded, visible muscle definition in arms and shoulders from exertion and lighting. She looks at camera with direct focused expression showing strength and determination, face calm with controlled breathing.

Lighting: bright overhead gym lighting creating high-key athletic aesthetic with shadows defining muscle tone, side lighting from large gym windows creating dimensional light, skin shows realistic sheen from workout without artificial smoothing, natural shine on hair, visible fabric texture.

Environment: modern gym with black rubber floor, weight rack with various dumbbells in background blur, large mirrors reflecting light, other gym equipment visible—squat racks, benches, cable machines softly blurred, industrial gym aesthetic with clean modern equipment.

Camera: 85mm lens at f/2.0, camera positioned at chest height capturing upper body with dumbbells in focus, sharp focus on face showing determination with gym equipment in bokeh, vertical framing emphasizes strength, slight low angle adds power to composition.

Mood: feminine strength, gym dedication, powerful fitness focus, confident athletic energy, strong capable presence, authentic training moment. 4K resolution. Hyper-realistic quality with visible perspiration, realistic muscle definition, authentic gym lighting, natural athletic power.`
  },
  {
    id: 'alo-beach-yoga-sunset-1',
    title: 'Beach Sunset Yoga',
    description: 'Tree pose on beach at golden hour, serene ocean background',
    category: 'alo-workout',
    tags: ['yoga', 'beach', 'sunset', 'alo', 'outdoor', 'peaceful'],
    useCases: ['beach yoga', 'sunset content', 'outdoor wellness', 'travel fitness'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in serene wellness editorial style. The woman holds tree pose (Vrksasana) on sandy beach at golden hour, standing leg grounded in wet sand, other foot pressed against inner thigh, arms extended overhead with palms together, ocean waves in soft background.

She wears Alo Yoga Airlift bralette in sunset coral with delicate strappy detail, matching Alo Airbrush 7/8 leggings creating monochromatic beach aesthetic, bare feet grounding into sand, hair loose in natural windswept waves with salt-air texture, minimal makeup with bronzed natural glow, small gold necklace.

Body demonstrates perfect tree pose alignment—standing leg strong with micro-adjustments for balance, foot pressed firmly against inner thigh, pelvis neutral, core engaged, chest lifted, shoulders relaxed, arms extended gracefully. She looks at camera with peaceful centered expression, eyes soft and calm, breath visible and controlled, face showing serene presence.

Lighting: golden hour light creating warm orange-pink glow on skin and scene, sun low on horizon creating dreamy backlight with rim light on hair and body edges, light reflecting off ocean creating fill light, skin glows with warm tones, fabric luminous in sunset light, realistic sun-kissed appearance.

Environment: pristine beach with smooth wet sand reflecting sunset colors, gentle waves rolling in background with soft motion, ocean stretching to horizon with sunset sky in oranges and pinks, distant coastal features barely visible, beach empty and peaceful, sense of tranquil solitude.

Camera: 50mm lens at f/2.8 maintaining focus on subject and some sunset context, camera at mid-body level capturing full pose with ocean visible, sharp focus on face and body with ocean in gentle bokeh, vertical framing emphasizes pose height, slight low angle shows grace.

Mood: peaceful wellness, sunset yoga ritual, beach serenity, connection to nature, calm feminine strength, quiet meditation. 4K resolution. Hyper-realistic quality with visible skin texture, windswept hair movement, authentic sunset lighting, natural beach environment, realistic balance.`
  },
  {
    id: 'alo-home-yoga-morning-1',
    title: 'Home Morning Yoga',
    description: 'Seated meditation in home yoga space, peaceful morning ritual',
    category: 'alo-workout',
    tags: ['yoga', 'home', 'meditation', 'alo', 'morning', 'peaceful'],
    useCases: ['home yoga', 'morning routine', 'meditation content', 'wellness lifestyle'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in peaceful wellness lifestyle style. The woman sits in easy pose (Sukhasana) on yoga mat in serene home space, spine lengthened with hands resting on knees in meditation mudra, eyes softly closed or opening to look at camera.

She wears Alo Yoga Accolade hoodie in heather grey with hood down, Alo Muse leggings in matching grey, bare feet showing natural pedicure, hair in effortless messy bun with natural face-framing pieces, fresh morning face with minimal makeup showing natural glow, small gold hoop earrings.

Body demonstrates proper meditation posture—sitting bones grounded into mat, spine naturally lengthened, shoulders relaxed down and back, chest gently lifted, hands resting lightly on knees with mudra, neck long with crown reaching upward. She looks at camera with peaceful expression, soft gentle gaze, face completely relaxed showing inner calm and morning tranquility.

Lighting: soft warm morning light streaming through window creating beautiful side lighting, light creates gentle highlights showing peaceful glow, shadows minimal and flattering, dust particles visible in morning light rays adding ethereal quality, natural light creates calm atmosphere, skin appears dewy with realistic morning texture.

Environment: dedicated home yoga corner with light wood floors, large window with sheer white curtains filtering morning light, yoga mat in neutral tone, meditation cushion nearby, small altar with candles and plants, white walls creating peaceful minimal space, rolled blanket and blocks neatly arranged, potted plants adding life.

Camera: 50mm lens at f/1.8, camera positioned at floor level creating intimate seated perspective at eye level, sharp focus on face with yoga space in soft bokeh, vertical framing creates peaceful portrait, natural morning light creates soft aesthetic.

Mood: peaceful morning ritual, home wellness sanctuary, meditation practice, quiet morning dedication, accessible yoga, calm inner strength. 4K resolution. Hyper-realistic quality with visible natural skin texture, realistic morning light, authentic peaceful environment, serene expression.`
  },
  {
    id: 'alo-hiking-trail-1',
    title: 'Mountain Hiking',
    description: 'Hiking uphill on mountain trail, outdoor adventure energy',
    category: 'alo-workout',
    tags: ['hiking', 'outdoor', 'trail', 'alo', 'adventure', 'nature'],
    useCases: ['hiking content', 'outdoor adventure', 'trail lifestyle', 'active travel'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in adventure lifestyle editorial style. The woman hikes uphill on mountain trail, one foot stepping up on rock showing stride, using hiking poles for support, looking back toward camera with calm focused expression.

She wears Alo Yoga Uplift bralette in forest green visible under black athletic jacket worn open, Alo Airlift 7/8 leggings in black, hiking boots in grey and green, black baseball cap with ponytail through back, small belt bag worn crossbody, hair in high ponytail showing movement, minimal adventure makeup with natural outdoor glow.

Body demonstrates active hiking form—strong push from back leg showing power, core engaged for balance on terrain, slight forward lean for uphill hiking, arms using poles naturally, shoulders back despite effort, visible athletic definition. She looks back at camera with direct calm gaze, face showing natural healthy flush from exertion and altitude, composed outdoor presence.

Lighting: bright natural outdoor mountain light, sun creating high-key outdoor aesthetic with dynamic shadows from trees, side lighting highlighting face, sunlight catching flyaway hairs from wind, realistic skin showing natural flush, authentic outdoor light with no artificial fill.

Environment: mountain hiking trail with rocky path winding upward, pine trees lining trail, mountain vista barely visible through trees, rocks and roots creating natural trail, wildflowers beside path, trail markers subtly visible, sense of elevation and wilderness, distant mountains softly visible.

Camera: 35mm lens at f/2.8 maintaining environmental context, camera positioned on trail behind capturing look-back moment, sharp focus on face and upper body with trail in gentle bokeh, vertical framing emphasizes mountain journey, slight low angle adds drama.

Mood: adventure lifestyle, outdoor fitness, mountain dedication, nature connection, active outdoor strength, peaceful determination. 4K resolution. Hyper-realistic quality with visible windswept hair, realistic outdoor flush, authentic mountain lighting, natural hiking movement, real trail environment.`
  },
  {
    id: 'alo-barre-studio-1',
    title: 'Barre Class Practice',
    description: 'At barre doing leg lift, graceful athletic control',
    category: 'alo-workout',
    tags: ['barre', 'studio', 'ballet', 'alo', 'grace', 'strength'],
    useCases: ['barre content', 'studio fitness', 'ballet-inspired', 'graceful strength'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in elegant fitness editorial style. The woman performs attitude derrière at barre, standing leg stable with proper alignment, working leg lifted behind with knee bent, one hand lightly on barre, other arm extended in port de bras, looking at camera with focused composed expression.

She wears Alo Yoga Airlift Intrigue bralette in blush pink with strappy detail, Alo Moto leggings in black with mesh panels, ballet-inspired grip socks in nude, hair in perfect high ballet bun secured with pink ribbon, minimalist makeup with soft natural tones, small gold stud earrings.

Body demonstrates precise barre form—standing leg turned out from hip, foot in forced arch, standing knee soft, core deeply engaged and lifted, working leg extended high behind with pointed foot and turned hip, knee bent creating attitude line, torso properly aligned, supporting arm soft on barre, free arm beautifully extended. She looks at camera with concentrated graceful expression, face showing controlled focus and elegant strength.

Lighting: bright clean studio lighting with large mirrors reflecting natural window light, even soft illumination highlighting body lines and alignment, light catching ballet bun, shadows minimal and flattering defining muscle tone subtly, skin appears luminous with realistic sheen, fabric textures clearly visible.

Environment: pristine barre studio with ballet barres along mirrored wall, light wood floors, large windows with white curtains filtering daylight, mirror showing subject's reflection adding depth, other barre clients in soft background blur, small weights and bands on shelves, plants adding organic element, sophisticated studio aesthetic.

Camera: 50mm lens at f/2.2, camera positioned at barre level capturing elegant full-body composition showing ballet line, sharp focus on face and torso with gentle bokeh on background, vertical framing emphasizes height and elegance of pose, mirror reflection subtly visible.

Mood: elegant strength, barre sophistication, ballet-inspired grace, controlled powerful femininity, refined athletic beauty, studio dedication. 4K resolution. Hyper-realistic quality with visible muscle definition showing control, realistic alignment, authentic studio lighting, natural graceful form.`
  },
  {
    id: 'alo-bike-ride-1',
    title: 'Scenic Bike Ride',
    description: 'On road bike during coastal ride, active outdoor lifestyle',
    category: 'alo-workout',
    tags: ['cycling', 'outdoor', 'bike', 'alo', 'cardio', 'adventure'],
    useCases: ['cycling content', 'bike lifestyle', 'outdoor cardio', 'active adventure'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in active lifestyle editorial style. The woman rides road bike on scenic coastal path, hands on handlebars in athletic cycling position with slight forward lean, looking toward camera with calm focused expression showing outdoor contentment.

She wears Alo Yoga Airlift bralette in navy blue, Alo Airbrush 7/8 capri leggings with reflective details, cycling shoes clipped into pedals, white helmet with ponytail pulled through back opening, cycling sunglasses pushed up on helmet exposing eyes for shot, small cycling gloves, hair in ponytail flowing behind, athletic makeup with waterproof products and natural outdoor glow.

Body demonstrates proper cycling form—slight forward lean from hips, core engaged for stability, arms bent reaching handlebars, shoulders relaxed, legs showing power with one extended pedaling and other bent at top of stroke, visible athletic muscle definition. She looks at camera with direct calm gaze, face showing healthy flush from cardio work, composed outdoor athlete presence.

Lighting: bright outdoor coastal light, sun creating high-key active aesthetic, dynamic lighting from partially cloudy sky, sun catching reflective details on leggings, backlight from ocean reflecting light upward, realistic skin showing natural outdoor flush, natural shine from exertion.

Environment: scenic coastal bike path with ocean visible in background, path smooth and maintained winding along coastline, guardrail on ocean side, coastal vegetation beside path, distant cliffs or beaches in background blur, sense of open road, few other cyclists very blurred in distance.

Camera: 85mm lens at f/2.8 maintaining environmental context, camera positioned at bike level slightly ahead capturing dynamic approaching angle, fast shutter freezing subject with slight motion blur on wheels showing speed, sharp focus on face and upper body, vertical framing emphasizes cyclist and coastal beauty.

Mood: outdoor cycling freedom, cardio dedication, active coastal lifestyle, athletic empowerment, powerful outdoor athlete energy, peaceful movement. 4K resolution. Hyper-realistic quality with visible wind movement, realistic cycling motion, authentic coastal lighting, natural athletic body in action, real outdoor cycling environment.`
  }
]

// ============================================
// CHRISTMAS / HOLIDAY PROMPTS (10 prompts)
// ============================================

export const CHRISTMAS_UNIVERSAL_PROMPTS: UniversalPrompt[] = [
  {
    id: 'christmas-tree-mug-1',
    title: 'Christmas Tree Hot Chocolate',
    description: 'Seated by illuminated Christmas tree holding hot chocolate mug, cozy red outfit',
    category: 'seasonal-christmas',
    tags: ['christmas', 'cozy', 'tree', 'hot-chocolate', 'indoor'],
    useCases: ['holiday content', 'cozy season', 'christmas morning', 'festive lifestyle'],
    prompt: `Cozy Christmas living room with warm golden lights woven through decorated tree and garland on fireplace mantel.

Woman maintaining exact characteristics from Image 1 (skin tone, body proportions, hair and facial identity), without copying the original photo.

**OUTFIT:**
Red knit dress with fitted bodice and relaxed midi skirt, soft ribbed texture clearly visible, styled in comfort-luxury aesthetic that feels both cozy and visually elevated for the holidays. Over-the-knee knit socks in cream adding warmth and texture.

**ACTIVITY & PROPS:**
Ceramic mug of hot chocolate topped with marshmallows, visible steam and small cinnamon detail, held close to face with both hands wrapped around warmth. Gesture should feel natural—hands wrapped comfortably around the mug—never stiff or overly posed.

**SETTING DETAILS:**
Cozy living room with lit fireplace, garland on mantel with warm lights and greenery. Christmas tree with bokeh lights, red bows and silver ornaments creating soft magical blur behind model. Red floral arrangements and candles on surfaces, wrapped gifts subtly visible near tree base. Background remains softly out of focus but clearly festive.

**POSE & EXPRESSION:**
Woman seated on cream sofa or soft rug near tree, body turned toward camera with legs tucked comfortably to one side. Mug held close to face at chest level, creating iconic "cozy Christmas" composition. Expression is warm and gentle—soft closed smile, eyes conveying contentment and holiday peace. Natural relaxed energy, no tension.

**HAIR STYLING:**
Hair pulled into chic and sophisticated bun decorated with large red velvet bow. Two soft strands frame the face naturally, adding softness and romance.

**MAKEUP & EXPRESSION:**
Light glow clean girl style with soft glam finish—luminous skin, subtle highlight on cheekbones and nose, nude or soft pink lips. Elegant closed smile, calm and feminine expression with direct but gentle gaze to camera. Real skin texture with visible pores, no artificial smoothing.

**LIGHTING:**
Warm yellow and golden Christmas lights creating glow on face, mixed with soft natural window light filtered through sheer curtains. Fireplace adds warm orange undertones. Lighting feels magical and intimate, like a captured Pinterest Christmas editorial moment. Realistic skin texture clearly visible, natural shine on hair, visible steam from hot chocolate catching light.

**CAMERA:**
35mm lens for full scene or 50mm for focused portrait, f/2.0 depth of field, always with sharp focus on face and realistic texture. Framing centers the mug and face, using hot chocolate cup close to face as part of composition. Camera positioned at eye level or slightly above creating flattering angle.

**MOOD:**
Pinterest Christmas editorial—feminine, cozy luxury, highly shareable yet grounded in real textures and warmth. Aspirational but authentic, that perfect "Christmas morning at home" aesthetic. 4K resolution. Hyper-realistic quality with visible fabric weaves, realistic steam, authentic holiday lighting.`
  },
  {
    id: 'christmas-fireplace-morning-1',
    title: 'Christmas Morning Fireplace',
    description: 'By fireplace in cozy pajamas opening gift, warm morning light',
    category: 'seasonal-christmas',
    tags: ['christmas', 'morning', 'fireplace', 'cozy', 'gifts', 'pajamas'],
    useCases: ['christmas morning', 'gift opening', 'cozy holiday', 'family content'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in cozy lifestyle editorial style. The woman sits cross-legged on plush cream rug in front of fireplace on Christmas morning, unwrapping elegant gift box with ribbon, looking up at camera with soft content expression.

She wears luxury Christmas pajamas—cream silk camisole with delicate lace trim, matching silk wide-leg pajama pants with subtle pattern, cozy cream cashmere cardigan worn open, barefoot with natural pedicure, hair in effortless low messy bun with face-framing pieces, fresh morning face with minimal makeup showing natural glow, small diamond stud earrings.

Seated comfortably on rug with legs tucked to side, gift box in lap partially unwrapped showing tissue paper and ribbon, hands delicately pulling ribbon, body language relaxed, shoulders soft. She looks at camera with gentle peaceful expression, eyes showing quiet gratitude, face calm with natural Christmas morning contentment.

Lighting: warm golden firelight creating primary light source with flickering glow on face, soft natural morning light from nearby window mixing with fire creating dimensional lighting, Christmas tree lights in background adding bokeh twinkle, warm cozy atmosphere with golden orange tones, skin appears luminous, silk catching light with subtle sheen.

Environment: luxurious living room with fireplace blazing with real fire, cream stone fireplace surround, mantel decorated with lush greenery garland and candles, Christmas stockings hanging, cream sofa visible in background, decorated tree with white lights and elegant ornaments in soft bokeh, wrapped presents under tree and scattered around, plush rug, sophisticated cozy aesthetic.

Camera: 50mm lens at f/1.8, camera positioned at floor level creating intimate perspective, sharp focus on face and gift with beautiful bokeh on fireplace and tree, vertical framing creates warm portrait, natural documentary style capturing quiet moment.

Mood: Christmas morning peace, luxury cozy lifestyle, intimate holiday moment, grateful calm happiness, sophisticated comfort, family warmth. 4K resolution. Hyper-realistic quality with visible firelight flicker, realistic silk texture, authentic Christmas atmosphere, natural peaceful expression.`
  },
  {
    id: 'christmas-market-outdoor-1',
    title: 'Christmas Market Visit',
    description: 'At outdoor Christmas market with hot cider, cozy winter outfit',
    category: 'seasonal-christmas',
    tags: ['christmas', 'market', 'outdoor', 'winter', 'festive', 'city'],
    useCases: ['christmas market', 'holiday shopping', 'winter activities', 'festive outings'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in festive lifestyle editorial style. The woman stands at outdoor Christmas market holding steaming cup of mulled cider in gloved hands, surrounded by twinkling lights and festive decorations, looking at camera with warm composed expression, cheeks naturally flushed from cold.

She wears elegant winter outfit—camel wool coat with luxe texture, cream chunky knit turtleneck sweater underneath, black jeans, brown leather boots with slight heel, cream knit beanie with faux fur pom-pom, matching cream scarf wrapped warmly, brown leather gloves, small crossbody bag, hair in loose waves flowing from under beanie, winter makeup with natural rosy tones and berry lip, natural cold-weather glow.

Standing with relaxed posture, cup of cider held in both gloved hands at chest level, slight lean creating approachable presence, shoulders relaxed despite winter cold, body angled three-quarters to camera. She looks at camera with soft warm expression, eyes calm with quiet holiday contentment, face showing natural rosy flush from cold, steam from cider rising and catching light.

Lighting: magical golden hour winter light mixing with thousands of Christmas lights creating dreamy warm glow, string lights overhead and on market stalls creating beautiful bokeh, slight backlight from market lights creating rim light on hat and coat, golden hour sun adding warm tones, realistic winter skin with natural rosy flush, visible breath in cold air.

Environment: bustling outdoor Christmas market with wooden vendor stalls decorated with evergreen garland and lights, festive decorations—wreaths, ornaments, twinkling fairy lights creating magical canopy, other market-goers in soft background blur, market stalls visible but blurred, Christmas tree in background with lights, overall festive atmosphere.

Camera: 50mm lens at f/1.8, camera positioned at eye level capturing warm portrait, sharp focus on face and cider cup with market lights in soft bokeh, vertical framing captures subject and magical market atmosphere, environmental context clear while subject remains focal point.

Mood: festive holiday calm, Christmas market tradition, winter lifestyle peace, seasonal celebration, cozy sophistication, quiet communal joy. 4K resolution. Hyper-realistic quality with visible winter breath, realistic cold-weather flush, authentic market lighting, natural festive contentment, real outdoor winter environment.`
  },
  {
    id: 'christmas-baking-cookies-1',
    title: 'Christmas Cookie Baking',
    description: 'In kitchen decorating cookies, apron over cozy outfit, flour dusted',
    category: 'seasonal-christmas',
    tags: ['christmas', 'baking', 'kitchen', 'cookies', 'cozy', 'domestic'],
    useCases: ['baking content', 'holiday traditions', 'kitchen lifestyle', 'festive activities'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in warm lifestyle editorial style. The woman stands at kitchen counter decorating Christmas sugar cookies with icing, piping bag in hand mid-decoration, flour dusted on apron and hands, looking at camera with soft focused expression, slight flour smudge on cheek adding authentic detail.

She wears cozy casual outfit—oversized cream cable knit sweater, high-waisted jeans rolled at ankle, linen apron in sage green with simple festive detail tied over outfit, bare feet, hair pulled into casual messy bun with pieces escaping, minimal natural makeup with flour-dusted glow, small gold hoop earrings, comfortable domestic aesthetic.

Standing at counter with body angled toward camera, one hand holding piping bag decorating cookie on marble counter, other hand resting on counter or holding finished cookie, shoulders relaxed, posture comfortable and natural. She looks at camera with gentle calm expression, face showing quiet creative satisfaction, relaxed authentic domestic presence.

Lighting: warm natural kitchen light from large window creating soft even illumination, afternoon golden light highlighting flour particles in air creating gentle sparkle, warm pendant lights over island adding cozy ambiance, light catching flour dust, realistic skin showing natural glow, marble counter reflecting light creating bright workspace.

Environment: beautiful modern farmhouse kitchen with white marble counters, white subway tile backsplash, wooden cutting boards and rolling pins, red stand mixer visible, baking sheets with unbaked cookies, cooling racks with finished cookies, festive cookie cutters scattered—stars, trees, snowflakes, icing in festive colors in bowls, sprinkles and decorating supplies organized, small Christmas greenery in window, warm inviting atmosphere.

Camera: 50mm lens at f/2.0, camera positioned across counter at counter height capturing intimate kitchen portrait, sharp focus on face and decorating activity with kitchen in soft bokeh, vertical framing emphasizes portrait while showing baking context, cookies visible in frame.

Mood: cozy holiday baking tradition, domestic Christmas peace, creative holiday activity, warm family traditions, comfortable home ritual. 4K resolution. Hyper-realistic quality with visible flour particles, realistic baking textures, authentic kitchen lighting, natural domestic moment, genuine holiday calm.`
  },
  {
    id: 'christmas-tree-decorating-1',
    title: 'Decorating Christmas Tree',
    description: 'Hanging ornament on tree, casual cozy outfit, focused moment',
    category: 'seasonal-christmas',
    tags: ['christmas', 'tree', 'decorating', 'ornaments', 'tradition', 'cozy'],
    useCases: ['tree decorating', 'holiday traditions', 'festive preparation', 'cozy lifestyle'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in cozy lifestyle editorial style. The woman stands reaching up to hang ornament on upper branches of Christmas tree, arm extended gracefully upward, looking toward camera with soft focused expression showing calm concentration.

She wears comfortable cozy outfit—oversized cream chenille sweater with comfortable drape, black leggings, cozy cream socks with subtle festive pattern, hair down in natural waves with one side tucked behind ear, minimal makeup with natural glow, small simple jewelry—thin gold necklace barely visible, effortless comfortable home aesthetic.

Standing naturally with one arm extended toward tree branch holding delicate glass ornament catching light, other arm at side or touching tree branch gently for balance, body creating graceful line with slight stretch. She looks at camera with gentle composed expression, face showing quiet decorating focus, calm authentic tradition moment.

Lighting: warm ambient living room lighting with Christmas tree lights already on creating magical glow and beautiful bokeh throughout scene, soft overhead lighting mixing with natural afternoon light from nearby window, tree lights creating points of bokeh in foreground and background, light catching glass ornament creating sparkle, warm golden tones creating cozy atmosphere.

Environment: cozy living room with large Christmas tree partially decorated showing work in progress, ornament boxes open on floor with tissue paper, various beautiful ornaments waiting to be hung, comfortable sofa in background, throw blankets draped on furniture, stockings on fireplace mantel in soft background, wrapped presents already under tree, warm family tradition aesthetic.

Camera: 50mm lens at f/1.8, camera positioned at mid-body level capturing reaching moment and tree bokeh, sharp focus on face and ornament in hand with tree lights creating dreamy bokeh throughout, vertical framing emphasizes upward motion and tree height, intimate documentary feel capturing authentic decorating.

Mood: cozy holiday tradition, tree decorating ritual, family Christmas preparation, memory-making warmth, nostalgic calm, comfortable home lifestyle, authentic seasonal moment. 4K resolution. Hyper-realistic quality with visible tree light bokeh, realistic sweater texture, authentic home atmosphere, natural decorating movement, genuine tradition feeling.`
  },
  {
    id: 'christmas-dinner-party-1',
    title: 'Elegant Holiday Dinner',
    description: 'Seated at beautifully set holiday table, elegant dress, candlelight',
    category: 'seasonal-christmas',
    tags: ['christmas', 'dinner', 'elegant', 'entertaining', 'sophisticated', 'formal'],
    useCases: ['holiday entertaining', 'dinner party', 'elegant celebrations', 'festive sophistication'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in sophisticated holiday editorial style. The woman sits at head of beautifully set holiday dinner table, elegant crystal wine glass in hand held at proper angle, looking at camera with poised composed expression, candlelight creating romantic glow.

She wears elegant festive dress—emerald green velvet midi dress with modest neckline and elegant drape, delicate gold jewelry—layered necklaces, statement earrings, tennis bracelet, subtle ring, pointed-toe velvet pumps in black, hair in sophisticated low chignon, polished makeup with defined eyes and deep berry lip, refined holiday elegance.

Seated with impeccable posture—shoulders back, spine lengthened, one hand holding wine glass stem delicately at chest level, other hand resting gracefully on table near place setting, body angled toward camera. She looks at camera with warm sophisticated expression, direct calm gaze showing gracious hostess presence, face composed with elegant confidence.

Lighting: romantic candlelight from tall taper candles on table creating primary warm light source, soft golden glow on face from multiple candles creating flickering warm shadows, chandelier overhead providing ambient fill, candlelight reflecting off crystal and china creating sparkle, realistic skin showing elegant glow, velvet fabric depth enhanced by lighting.

Environment: formal dining room with beautifully set table for holiday dinner, fine china with gold rim, crystal wine glasses catching candlelight, silver flatware, linen napkins folded elegantly, tall gold candlesticks with ivory tapers, fresh evergreen garland runner with berries and small ornaments, place cards in calligraphy, blurred elegant furnishings in background, subtle Christmas tree with white lights visible in adjacent room, sophisticated entertaining aesthetic.

Camera: 85mm lens at f/2.0, camera positioned at table level across from subject creating intimate dinner perspective, sharp focus on face with beautiful candlelight bokeh on table settings and background, vertical framing creates elegant portrait emphasizing sophisticated setting, shallow depth keeps focus on subject while showing environment.

Mood: sophisticated holiday elegance, gracious entertaining, formal Christmas dinner, refined celebration, hostess composure, timeless holiday sophistication, warm elegant gathering. 4K resolution. Hyper-realistic quality with visible candlelight flicker, realistic velvet texture, authentic formal table setting, natural elegant presence, real holiday dinner ambiance.`
  },
  {
    id: 'christmas-reading-nook-1',
    title: 'Christmas Reading Nook',
    description: 'Curled up reading in cozy nook with hot cocoa, peaceful moment',
    category: 'seasonal-christmas',
    tags: ['christmas', 'cozy', 'reading', 'peaceful', 'hygge', 'relaxation'],
    useCases: ['cozy content', 'quiet moments', 'self-care', 'peaceful holiday'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in peaceful hygge editorial style. The woman curls up in cozy window reading nook, holding open book in one hand and mug of hot chocolate in other, surrounded by soft pillows and throws, looking toward camera with peaceful content expression.

She wears ultimate cozy outfit—oversized cream cable knit cardigan worn like robe over cream ribbed henley, matching cream lounge pants, thick knit socks in fair isle pattern, hair in effortless low braid with face-framing pieces, completely natural face with just lip balm showing morning beauty, no jewelry creating pure comfort, reading glasses resting on nose or pushed into hair.

Curled comfortably in window seat with legs tucked to side, book open in lap with one hand holding pages, other hand wrapped around ceramic mug, body language completely relaxed, surrounded by throw pillows and chunky knit blanket partially draped over legs. She looks at camera with soft peaceful expression, eyes calm with quiet contentment, face completely relaxed showing serene comfort.

Lighting: soft natural daylight from large window behind creating beautiful diffused glow, snowy day outside creating bright even light without harsh shadows, Christmas tree lights in room adding warm bokeh points, candlelight from nearby candles adding warmth, light streaming through window creating dreamy ethereal atmosphere, realistic skin with natural peaceful glow, visible steam from hot chocolate catching light.

Environment: cozy built-in window seat with many soft pillows in cream and natural tones, chunky knit throws, wooden window frame with frosted glass showing snow falling outside, Christmas decorations visible—small tree with lights on side table, garland on bookshelf, candles creating warm glow, stack of books nearby, soft area rug on floor, perfect cozy reading sanctuary aesthetic.

Camera: 50mm lens at f/1.8, camera positioned at reading nook level creating intimate perspective, sharp focus on face and book with window light creating soft bokeh, vertical framing captures cozy nook environment while emphasizing peaceful portrait, natural documentary style showing authentic quiet moment.

Mood: peaceful hygge Christmas, quiet cozy moment, self-care holiday, simple holiday pleasures, warm comfortable solitude, Scandinavian cozy aesthetic, calm contentment. 4K resolution. Hyper-realistic quality with visible knit textures, realistic book pages, authentic cozy lighting, natural peaceful expression, real hygge atmosphere.`
  },
  {
    id: 'christmas-gift-wrapping-1',
    title: 'Gift Wrapping Station',
    description: 'At table wrapping presents, surrounded by ribbons and paper, creative moment',
    category: 'seasonal-christmas',
    tags: ['christmas', 'wrapping', 'gifts', 'creative', 'preparation', 'thoughtful'],
    useCases: ['gift wrapping', 'holiday prep', 'creative activities', 'thoughtful giving'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in warm lifestyle editorial style. The woman sits at dining table covered in gift wrapping supplies, hands tying velvet ribbon bow on wrapped present, surrounded by rolls of paper and ribbons, looking at camera with focused calm expression.

She wears comfortable creative outfit—soft grey cashmere sweater, high-waisted jeans, cozy socks, hair in low ponytail with pencil tucked behind ear, minimal natural makeup with slight concentration flush, small simple jewelry, relaxed creative mode aesthetic, readers if age appropriate.

Seated at table with gift in front being wrapped, hands captured mid-motion tying elegant bow, scissors nearby, roll of tape within reach, comfortable working posture leaned slightly over table, shoulders relaxed. She looks at camera with gentle focused expression, face showing quiet creative satisfaction, calm thoughtful presence.

Lighting: warm afternoon light from nearby window creating soft even illumination on workspace, overhead pendant light adding warm glow to table, natural light highlighting wrapping paper textures and ribbons, realistic skin with natural glow, metallic gift paper catching light with subtle sparkle, warm cozy working atmosphere.

Environment: dining table covered with beautiful gift wrapping supplies—rolls of quality wrapping paper in festive patterns and solids, spools of velvet and satin ribbon in various colors, gift tags, decorative elements like dried oranges or small pine sprigs, scissors and tape, some presents already wrapped beautifully in background, name tags being written with calligraphy pen, organized creative holiday preparation aesthetic.

Camera: 50mm lens at f/2.0, camera positioned across table at seated eye level, sharp focus on face and hands wrapping with supplies in soft bokeh creating colorful festive background, vertical framing captures subject and creative workspace, documentary style showing authentic wrapping process.

Mood: thoughtful gift giving, creative holiday preparation, personal touch traditions, organized holiday readiness, warm domestic creativity, joy of giving care. 4K resolution. Hyper-realistic quality with visible ribbon texture, realistic paper details, authentic working atmosphere, natural creative focus, real gift wrapping environment.`
  },
  {
    id: 'christmas-morning-coffee-1',
    title: 'Christmas Morning First Coffee',
    description: 'In kitchen with coffee before family wakes, peaceful pajama moment',
    category: 'seasonal-christmas',
    tags: ['christmas', 'morning', 'coffee', 'peaceful', 'pajamas', 'quiet'],
    useCases: ['morning routine', 'quiet moments', 'coffee content', 'peaceful Christmas'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in peaceful morning editorial style. The woman stands in kitchen at sunrise on Christmas morning, holding ceramic coffee mug with both hands, leaning against counter, looking toward camera with peaceful content expression, Christmas tree lights glowing in background through doorway.

She wears luxury pajama set—silk camisole and matching pajama pants in festive red or cream with subtle pattern, cozy robe in complementary color worn open, barefoot on kitchen floor, hair in natural messy bun with sleep-mussed texture, fresh morning face with no makeup showing natural beauty, minimal jewelry or none, authentic just-woke Christmas morning aesthetic.

Leaning comfortably against kitchen counter with relaxed posture, mug held in both hands at chest level, body angled toward camera creating approachable composition, shoulders soft and relaxed, slight lean into counter showing comfortable at-home energy. She looks at camera with soft peaceful expression, eyes calm with quiet anticipation and gratitude, face showing natural morning glow.

Lighting: magical early morning light—soft blue dawn light mixing with warm Christmas tree lights visible through kitchen doorway, under-cabinet kitchen lights creating warm glow on counter, candlelight from advent candle adding warmth, ethereal peaceful morning atmosphere, realistic skin with natural morning appearance, visible steam from coffee catching early light, peaceful transition between night and day.

Environment: beautiful modern kitchen in predawn quiet, marble counters clean and ready for Christmas cooking later, festive touches visible—small evergreen arrangement, Christmas hand towels, advent candle burning, Christmas cards on counter, through doorway into living room the decorated tree glowing with lights, stockings hanging on fireplace visible in soft background, wrapped presents under tree, peaceful home on Christmas morning before activity begins.

Camera: 50mm lens at f/1.8, camera positioned in kitchen at counter height creating intimate morning perspective, sharp focus on face with beautiful bokeh on Christmas tree lights in background, vertical framing creates peaceful portrait while showing cozy morning environment, natural documentary style capturing authentic quiet moment.

Mood: peaceful Christmas morning, quiet coffee ritual, contemplative calm, anticipation mixed with peace, gratitude and contentment, simple morning pleasure, calm before celebration. 4K resolution. Hyper-realistic quality with visible steam, realistic morning light mixing, authentic pajama texture, natural morning beauty, real peaceful Christmas atmosphere.`
  },
  {
    id: 'christmas-winter-walk-1',
    title: 'Snowy Winter Walk',
    description: 'Walking in snow with winter coat and scarf, peaceful snowy landscape',
    category: 'seasonal-christmas',
    tags: ['christmas', 'winter', 'outdoor', 'snow', 'walk', 'peaceful'],
    useCases: ['winter walks', 'snow content', 'outdoor winter', 'peaceful nature'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in serene winter editorial style. The woman walks through fresh snow on peaceful tree-lined path, looking back over shoulder at camera with calm content expression, snowflakes catching in hair and on coat, breath visible in cold air.

She wears elegant warm winter outfit—long wool coat in camel or charcoal grey, chunky cream cable knit scarf wrapped warmly, cream knit beanie, leather gloves, dark jeans tucked into tall winter boots, hair flowing in loose waves visible under beanie, winter makeup with natural rosy cheeks from cold and berry lip, natural winter glow from fresh air.

Walking with natural graceful stride, body turned back toward camera while moving forward creating dynamic composition, one foot forward in snow leaving footprint, coat flowing slightly with movement, scarf ends catching breeze, comfortable confident posture. She looks at camera with direct calm gaze, face showing healthy rosy flush from cold air creating natural color, breath visible adding authentic cold weather detail.

Lighting: soft diffused overcast snow light creating even beautiful illumination without harsh shadows, snow on ground reflecting light upward creating flattering fill light on face, occasional snowflakes catching light creating gentle sparkle, cool-toned winter daylight creating crisp clean atmosphere, realistic cold-weather skin with natural rosy appearance, authentic winter light behavior.

Environment: peaceful snow-covered path through trees, fresh pristine snow covering everything, snow-laden evergreen trees creating winter wonderland, footprints in snow behind showing walking path, gentle snowfall creating magical atmosphere, distant snowy landscape barely visible, sense of peaceful winter solitude, natural untouched beauty, possibly wooden fence or stone wall beside path.

Camera: 85mm lens at f/2.8 maintaining environmental context, camera positioned on path behind capturing look-back moment while walking, fast shutter freezing falling snowflakes and subject with slight motion blur on legs suggesting movement, sharp focus on face with snowy landscape in gentle bokeh, vertical framing emphasizes winter scene.

Mood: winter wonderland peace, snowy walk calm, cold weather serenity, quiet winter beauty, connection with nature, outdoor contentment. 4K resolution. Hyper-realistic quality with visible snowflakes, realistic cold weather appearance, authentic winter lighting, natural snowy environment, real winter breath visible.`
  }
]

// ============================================
// CASUAL LIFESTYLE / STREET STYLE (10 prompts)
// ============================================

export const CASUAL_LIFESTYLE_UNIVERSAL_PROMPTS: UniversalPrompt[] = [
  {
    id: 'casual-coffee-shop-1',
    title: 'Coffee Shop Casual',
    description: 'Seated at coffee shop window with latte, oversized sweater and jeans',
    category: 'casual-lifestyle',
    tags: ['coffee', 'casual', 'lifestyle', 'cozy', 'relatable'],
    useCases: ['everyday content', 'coffee lifestyle', 'casual moments', 'relatable posts'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in lifestyle influencer style. The woman sits at small cafe table by large window, hands wrapped around ceramic latte cup, looking at camera with warm genuine smile and relaxed expression.

She wears oversized cream cable knit sweater with visible chunky texture, Levi's 501 straight-leg jeans in vintage wash, white sneakers (visible under table), hair in effortless messy bun with pieces framing face, minimal makeup with natural glow, small gold hoop earrings and delicate gold necklaces.

Seated comfortably with elbows on table, cup held at chest level between both hands, body leaned slightly forward toward camera creating intimate conversational framing. Expression is authentic and warm—genuine smile reaching eyes, relaxed brow, that "catching up with friend" energy. Slight head tilt adds approachability.

Lighting: soft natural window light from large cafe window behind/beside creates beautiful dimensional lighting—gentle highlights on face and hair, creating that coveted "window seat glow." Warm ambient cafe lighting fills shadows. Realistic skin texture visible with subtle highlights on cheekbones and nose, natural shine on hair, visible sweater texture.

Environment: modern minimalist coffee shop with light wood tables, white walls, plants in background, blurred cafe customers at other tables creating authentic coffee shop atmosphere, menu board softly visible on back wall, espresso machine with warm glow in background bokeh.

Camera: 50mm lens at f/1.8, camera positioned across table at face level creating intimate eye-to-eye perspective, sharp focus on face with latte cup in secondary focus, background in soft beautiful bokeh, vertical framing emphasizes portrait intimacy.

Mood: cozy casual lifestyle, relatable everyday moment, that "perfect coffee shop morning" aesthetic, warm and inviting, aspirational yet authentic, hygge vibes. 4K resolution. Hyper-realistic quality with visible knit texture, realistic steam from latte, authentic cafe lighting, natural skin appearance.`
  },
  {
    id: 'casual-bathroom-morning-1',
    title: 'Morning Routine Mirror',
    description: 'In bathroom doing morning skincare, fresh face and natural light',
    category: 'casual-lifestyle',
    tags: ['morning', 'bathroom', 'skincare', 'routine', 'fresh', 'authentic'],
    useCases: ['morning routine', 'skincare content', 'authentic lifestyle', 'self-care'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in authentic lifestyle editorial style. The woman stands at bathroom vanity applying morning skincare product, looking at camera through mirror reflection with fresh calm expression, hair pulled back with headband.

She wears cozy morning outfit—oversized white cotton button-up shirt worn open over tank top, minimal or no makeup showing fresh natural skin, hair pulled back with soft headband keeping it off face, natural morning beauty, no jewelry, completely authentic at-home aesthetic.

Standing at vanity with body angled slightly toward mirror, hands visible applying serum to face with fingertips in natural morning routine movement, shoulders relaxed, comfortable posture. She looks at reflection and camera with soft peaceful expression, eyes clear showing fresh morning energy, face calm with natural beauty.

Lighting: beautiful soft natural morning light flooding through bathroom window creating even flattering illumination, light reflecting off white surfaces and mirror creating bright clean atmosphere without harsh shadows, realistic skin texture clearly visible showing natural pores and true morning appearance, water droplets on face catching light, fresh clean bright aesthetic.

Environment: modern clean bathroom with white marble vanity, large mirror, organized skincare products neatly displayed, fresh towels, plants adding life, morning sunlight streaming through window with sheer curtain, minimal elegant bathroom aesthetic, everything fresh and clean.

Camera: 50mm lens at f/2.0, camera capturing reflection in mirror creating intimate viewer perspective, sharp focus on face in reflection with slight bokeh on bathroom products, vertical framing emphasizes mirror portrait, natural documentary style showing authentic morning routine.

Mood: fresh morning start, authentic self-care, natural beauty confidence, real daily rituals, intimate lifestyle moment, clean simple pleasure. 4K resolution. Hyper-realistic quality with visible natural skin texture, realistic morning light, authentic bathroom environment, real self-care routine.`
  },
  {
    id: 'casual-grocery-market-1',
    title: 'Farmers Market Shopping',
    description: 'At farmers market selecting produce, casual weekend outfit',
    category: 'casual-lifestyle',
    tags: ['market', 'shopping', 'casual', 'weekend', 'healthy', 'lifestyle'],
    useCases: ['market content', 'shopping lifestyle', 'healthy living', 'weekend activities'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in lifestyle editorial style. The woman shops at vibrant farmers market, holding fresh flowers examining them, reusable tote bag over shoulder, looking at camera with soft content expression, surrounded by colorful market stalls.

She wears effortless weekend casual—oversized linen button-up shirt in white or beige tucked into high-waisted denim shorts, white canvas sneakers, minimal gold jewelry—small hoops and necklace, canvas tote bag with market finds visible, hair in casual low ponytail with sunglasses on head, minimal fresh makeup with natural glow, breezy casual market aesthetic.

Standing at produce stand with relaxed posture, one hand holding beautiful fresh flowers up examining them, other hand on tote bag strap, body angled three-quarters to camera creating natural shopping moment, shoulders relaxed. She looks at camera with gentle calm expression, eyes showing quiet weekend contentment, natural casual presence.

Lighting: bright natural outdoor morning light creating high-key market aesthetic, dappled sunlight through market tent canopy creating interesting light patterns, fresh morning light making colors vibrant, realistic skin with natural outdoor glow, sunlight catching hair creating natural highlights.

Environment: bustling farmers market with colorful produce displays, fresh flowers in buckets, other shoppers in soft background blur, market tents with striped awnings, wooden crates of fruits and vegetables, handmade signs with prices, vibrant community market atmosphere on sunny weekend morning.

Camera: 50mm lens at f/2.0, camera positioned at market level across produce stand, sharp focus on face and fresh produce with market in artistic bokeh, vertical framing captures both subject and vibrant market environment, natural candid style showing authentic shopping moment.

Mood: healthy weekend lifestyle, farmers market calm, fresh food appreciation, community connection, casual weekend ease, vibrant peaceful energy. 4K resolution. Hyper-realistic quality with visible fresh produce detail, realistic outdoor market lighting, authentic casual weekend aesthetic.`
  },
  {
    id: 'casual-home-office-laptop-1',
    title: 'Home Office Working',
    description: 'At desk with laptop working from home, casual comfortable outfit',
    category: 'casual-lifestyle',
    tags: ['work', 'home-office', 'laptop', 'casual', 'productive', 'focused'],
    useCases: ['WFH content', 'productivity', 'casual work', 'modern lifestyle'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in modern lifestyle editorial style. The woman works at home office desk on laptop, hands on keyboard or reaching for coffee mug, looking toward camera with friendly focused expression, natural daylight creating bright productive atmosphere.

She wears comfortable elevated WFH outfit—oversized cream linen button-up shirt half-tucked into high-waisted jeans, minimal jewelry—small hoops and delicate necklace, hair in casual bun or half-up style, natural makeup with mascara and tinted lip balm, readers if age appropriate, "put together but comfortable" home office aesthetic.

Seated at desk with good posture, hands on laptop keyboard in natural typing position or reaching for coffee mug nearby, body angled slightly toward camera showing approachable presence, shoulders relaxed but engaged. She looks at camera with calm focused expression, face showing quiet productive concentration, warm composed professional energy.

Lighting: beautiful natural light flooding through window beside desk creating perfect WFH lighting, soft directional light on face without harsh shadows, screen light mixing with natural light, realistic skin texture in natural indoor light, bright productive workspace atmosphere, golden afternoon light creating warm glow.

Environment: clean organized home office space with desk against window, laptop open, coffee mug, notebook and pen, phone, small plant on desk, bookshelves with books in background, framed art on wall, ergonomic chair, stylish productive home workspace, minimal and organized but lived-in, Zoom-ready background.

Camera: 50mm lens at f/2.0, camera positioned as if video call perspective creating natural home office angle, sharp focus on face with desk and office in gentle bokeh, vertical framing captures three-quarter desk shot showing productive environment, natural authentic WFH moment.

Mood: productive WFH calm, focused yet relaxed, modern work lifestyle, comfortable productivity, professional casual balance, relatable remote work life. 4K resolution. Hyper-realistic quality with visible laptop glow on face, realistic home office lighting, authentic WFH environment, natural productive expression.`
  },
  {
    id: 'casual-cooking-dinner-1',
    title: 'Cooking Dinner at Home',
    description: 'In kitchen cooking dinner, stirring pan or chopping, domestic joy',
    category: 'casual-lifestyle',
    tags: ['cooking', 'kitchen', 'dinner', 'domestic', 'casual', 'homey'],
    useCases: ['cooking content', 'dinner prep', 'domestic lifestyle', 'food creation'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in warm lifestyle editorial style. The woman cooks dinner in kitchen, stirring pan on stove, looking toward camera with soft content expression, slight flour or ingredient on cheek adding authentic cooking detail.

She wears casual cooking outfit—soft white t-shirt, high-waisted jeans, linen apron in natural color tied at waist, bare feet on kitchen floor, hair in practical messy bun with pieces framing face, minimal makeup with natural cooking flush, small simple jewelry, comfortable home cooking aesthetic.

Standing at stove with natural cooking posture, wooden spoon in hand stirring pan, body angled toward camera while remaining engaged in cooking, shoulders relaxed, comfortable movement. She looks at camera with gentle calm expression, face showing quiet satisfaction of creating meal, peaceful authentic domestic moment.

Lighting: warm golden evening light from window mixing with warm pendant lights over kitchen island creating cozy inviting atmosphere, light from stove adding warm glow to face, realistic skin with natural cooking flush from heat, warm homey lighting creating intimate kitchen atmosphere.

Environment: beautiful modern kitchen with white counters, ingredients scattered on counter mid-prep—vegetables, fresh herbs, olive oil, cutting board with knife, pan on stove with steam rising, wine glass nearby, recipe book or phone with recipe visible, hanging plants or fresh flowers, active home cooking in beautiful space.

Camera: 50mm lens at f/2.0, camera positioned across kitchen counter at counter height, sharp focus on face and cooking activity with kitchen in soft bokeh, vertical framing captures cooking portrait and warm kitchen environment, natural documentary style showing authentic dinner prep.

Mood: domestic cooking calm, home-cooked meal satisfaction, cozy kitchen life, comfortable evening routine, simple everyday pleasure elevated. 4K resolution. Hyper-realistic quality with visible steam from cooking, realistic kitchen activity, authentic home lighting, natural domestic moment.`
  },
  {
    id: 'casual-couch-reading-evening-1',
    title: 'Evening Reading on Couch',
    description: 'Curled up on couch reading with tea, cozy evening outfit',
    category: 'casual-lifestyle',
    tags: ['reading', 'evening', 'couch', 'cozy', 'relaxation', 'peaceful'],
    useCases: ['evening routine', 'reading content', 'cozy lifestyle', 'relaxation moments'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in cozy lifestyle editorial style. The woman curls up on couch reading book, legs tucked comfortably under oversized blanket, mug of tea on side table, looking up from book toward camera with peaceful content expression, warm lamp light creating intimate evening atmosphere.

She wears ultimate cozy evening outfit—oversized soft knit sweater in cream or grey, matching joggers, thick knit socks, hair down in natural relaxed waves or loose low bun, no makeup showing natural evening beauty, readers resting on nose if age appropriate, complete comfort aesthetic.

Curled comfortably on couch with legs tucked to side under throw blanket, book open in lap with hands holding pages naturally, body language completely relaxed and at ease, slight lean into corner of couch showing comfort. She looks at camera with soft peaceful expression, eyes calm taking break from reading, face showing quiet evening contentment.

Lighting: warm cozy lamp light from floor lamp beside couch creating primary intimate light source, soft golden glow on face and book creating moody evening atmosphere, light from lamp creating warm bokeh on background wall, realistic skin with natural evening glow, intimate cozy evening lighting.

Environment: comfortable living room with overstuffed couch covered in throw pillows and soft blankets, side table with tea mug and candle, floor lamp providing warm reading light, bookshelves with books in background, soft area rug, plants adding life, minimal evening aesthetic creating peaceful sanctuary.

Camera: 50mm lens at f/1.8, camera positioned at couch level creating intimate perspective, sharp focus on face and book with lamp creating soft bokeh, vertical framing captures cozy evening portrait, natural documentary feel showing authentic relaxation moment.

Mood: peaceful evening ritual, reading sanctuary, quiet self-care, end-of-day satisfaction, cozy home life, simple evening pleasure, gentle unwinding. 4K resolution. Hyper-realistic quality with visible knit textures, realistic warm lamp lighting, authentic cozy atmosphere, natural evening peaceful expression.`
  },
  {
    id: 'casual-dog-walk-park-1',
    title: 'Walking Dog in Park',
    description: 'Walking dog on path, casual active outfit, outdoor lifestyle',
    category: 'casual-lifestyle',
    tags: ['dog', 'walking', 'park', 'outdoor', 'active', 'pet-owner'],
    useCases: ['pet content', 'outdoor lifestyle', 'active walking', 'dog owner life'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in lifestyle editorial style. The woman walks dog on tree-lined park path, leash in hand, looking toward camera with soft content expression, dog beside creating authentic pet owner moment, morning outdoor light.

She wears casual active outfit perfect for dog walking—athletic leggings, oversized hoodie, white sneakers suitable for walking, baseball cap with ponytail through back, minimal jewelry, crossbody bag for essentials, hair in practical ponytail, fresh face with natural outdoor glow, sunglasses on cap or hanging from neck.

Walking with natural stride, one hand holding leash comfortably, other hand swinging naturally or in pocket, body language shows calm outdoor activity, looking toward camera while moving forward creating dynamic composition. She looks at camera with gentle peaceful expression, face showing quiet outdoor contentment, natural authentic presence.

Lighting: bright natural outdoor light—morning fresh light creating clear illumination, sunlight filtering through trees creating dappled light, rim light from backlight creating glow on hair, realistic skin with natural outdoor flush from walking, clear outdoor lighting showing vibrant colors.

Environment: beautiful tree-lined park path with packed dirt trail, trees creating natural canopy, grass and greenery on sides, other park-goers in soft background blur, dog waste bag dispenser or park bench visible in background, peaceful active park atmosphere.

Camera: 50mm lens at f/2.2, camera positioned on path capturing dynamic walking moment, sharp focus on face with park in artistic bokeh, vertical framing emphasizes walking figure and park environment, natural candid style showing authentic dog walking moment.

Mood: active outdoor lifestyle, morning walk ritual, healthy routine, pet parent life, simple outdoor pleasure, peaceful movement. 4K resolution. Hyper-realistic quality with visible outdoor textures, realistic natural lighting, authentic park environment, genuine pet owner moment, real outdoor activity.`
  },
  {
    id: 'casual-bedtime-bedroom-1',
    title: 'Evening Bedtime Routine',
    description: 'In bedroom doing night skincare, cozy pajamas, soft evening light',
    category: 'casual-lifestyle',
    tags: ['bedtime', 'evening', 'skincare', 'bedroom', 'peaceful', 'routine'],
    useCases: ['night routine', 'evening content', 'self-care', 'bedtime rituals'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in peaceful lifestyle editorial style. The woman sits on edge of bed in evening applying night cream, looking toward camera with peaceful tired-but-content expression, bedside lamp creating warm intimate glow.

She wears cozy bedtime outfit—matching silk or soft cotton pajama set in neutral color, hair pulled back with soft headband, fresh clean face showing natural evening skin after washing, no makeup revealing authentic beauty, complete bedtime comfort aesthetic.

Sitting on edge of bed with comfortable posture, hands applying night cream to face, body relaxed and ready for sleep, shoulders soft. She looks at camera with soft peaceful expression, eyes showing that "good tired" feeling, face showing quiet contentment of day done, ready for rest calm.

Lighting: soft warm bedside lamp light creating intimate golden glow on one side of face, minimal overhead lighting, warm cozy evening atmosphere perfect for bedtime creating peaceful shadows, realistic skin showing natural clean evening texture, intimate nighttime lighting.

Environment: serene bedroom with comfortable bed with white linens and many pillows, bedside table with lamp, skincare products, book, glass of water, phone charging, subtle bedroom decor, soft area rug, peaceful sleep sanctuary aesthetic, minimal and calming.

Camera: 50mm lens at f/1.8, camera positioned at bed level creating intimate bedroom perspective, sharp focus on face with bedroom in soft bokeh, vertical framing creates peaceful evening portrait, natural documentary style capturing authentic bedtime routine.

Mood: peaceful evening wind-down, bedtime ritual calm, end-of-day self-care, quiet night preparation, intimate personal routine, gentle transition to sleep. 4K resolution. Hyper-realistic quality with realistic evening lamp lighting, authentic bedroom environment, natural peaceful expression, real night routine.`
  },
  {
    id: 'casual-brunch-cafe-friends-1',
    title: 'Weekend Brunch',
    description: 'At brunch cafe with mimosa or coffee, weekend energy',
    category: 'casual-lifestyle',
    tags: ['brunch', 'cafe', 'friends', 'weekend', 'social', 'relaxed'],
    useCases: ['brunch content', 'friend time', 'social lifestyle', 'weekend activities'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in lifestyle editorial style. The woman sits at cafe table during weekend brunch with friends (friends softly blurred), holding mimosa or iced coffee, looking at camera with soft content expression, bright weekend brunch energy.

She wears casual chic brunch outfit—flowing midi dress in neutral or pastel color, denim jacket draped over chair, delicate sandals, hair down in effortless beach waves, sunglasses on table or pushed into hair, fresh natural makeup with glowing skin and nude-pink lip, gold layered necklaces and hoops, effortlessly put-together brunch aesthetic.

Seated at table with relaxed social posture, one hand holding mimosa glass or coffee cup, other hand resting naturally, body angled toward camera but clearly engaged in social moment. She looks at camera with gentle warm expression, face showing quiet social contentment, natural calm presence.

Lighting: bright natural daylight flooding through large cafe windows creating fresh weekend light, soft shadows from outdoor trees or awning creating interesting patterns, bright high-key brunch aesthetic, realistic skin with natural glowing appearance, sunlight catching mimosa glass creating sparkle.

Environment: trendy brunch cafe with light wood tables, modern chairs, fresh flowers in small vase on table, colorful brunch plates visible with aesthetically plated food, mason jar drinks, other brunchers in soft background blur, plants throughout cafe, bright airy brunch spot aesthetic.

Camera: 50mm lens at f/2.0, camera positioned at table level across from subject, sharp focus on face with cafe in gentle bokeh, vertical framing captures brunch portrait while showing social environment, candid documentary style showing authentic friend moment.

Mood: weekend brunch calm, friend connection, social relaxation, casual chic lifestyle, genuine friendship moment, weekend celebration peace. 4K resolution. Hyper-realistic quality with realistic bright cafe lighting, authentic social environment, natural content expression.`
  },
  {
    id: 'casual-journaling-afternoon-1',
    title: 'Afternoon Journaling',
    description: 'Writing in journal at desk, thoughtful moment, natural light',
    category: 'casual-lifestyle',
    tags: ['journaling', 'writing', 'afternoon', 'thoughtful', 'peaceful', 'self-reflection'],
    useCases: ['journaling content', 'self-reflection', 'afternoon rituals', 'mindful living'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in peaceful lifestyle editorial style. The woman sits at desk writing in journal, pen in hand mid-writing or paused in thought, looking up toward camera with thoughtful peaceful expression, afternoon light streaming in.

She wears comfortable afternoon outfit—soft oversized sweater, comfortable jeans, cozy socks, hair in casual low bun or half-up style, minimal makeup with natural glow, small simple jewelry—studs and thin gold necklace, readers if age appropriate, comfortable thoughtful aesthetic.

Seated at table with contemplative posture, journal open with hand holding pen poised on page or mid-writing, other hand resting on table or holding mug of tea nearby, body language shows engaged thoughtfulness, slight lean toward journal. She looks at camera with soft peaceful expression, eyes showing quiet introspection, face calm with gentle contemplation.

Lighting: beautiful soft natural afternoon light from nearby window creating warm side lighting, dust particles visible in light rays adding peaceful atmosphere, light highlighting page of journal, realistic skin with natural peaceful glow, warm contemplative lighting creating intimate thoughtful mood.

Environment: simple peaceful desk setup, journal open with visible handwriting, cup of tea or coffee, candle nearby creating cozy atmosphere, small plant or flowers, minimal organized aesthetic, books stacked nearby, environment of peaceful reflection space.

Camera: 50mm lens at f/2.0, camera positioned at table level across from subject, sharp focus on face and journal with background in soft bokeh, vertical framing captures thoughtful portrait and journaling moment, natural documentary style showing authentic reflection time.

Mood: peaceful self-reflection, journaling practice calm, afternoon mindfulness, quiet personal growth, intentional living, gentle introspection. 4K resolution. Hyper-realistic quality with visible handwriting in journal, realistic afternoon light rays, authentic peaceful environment, natural contemplative expression, real journaling moment.`
  }
]

// ============================================
// LUXURY / FASHION EDITORIAL (10 prompts)
// ============================================

export const LUXURY_FASHION_UNIVERSAL_PROMPTS: UniversalPrompt[] = [
  {
    id: 'luxury-hotel-lobby-1',
    title: 'Hotel Lobby Elegance',
    description: 'Standing in marble hotel lobby, designer handbag, elegant neutral outfit',
    category: 'luxury-fashion',
    tags: ['luxury', 'hotel', 'elegant', 'designer', 'sophisticated'],
    useCases: ['luxury lifestyle', 'hotel content', 'elegant editorial', 'high-end branding'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in luxury editorial style. The woman stands in opulent hotel lobby with floor-to-ceiling marble columns, holding designer handbag, looking at camera with poised confident expression and slight knowing smile.

She wears sophisticated neutral outfit: cream cashmere turtleneck sweater, high-waisted wide-leg trousers in camel, pointed-toe leather pumps in nude, Bottega Veneta Jodie bag in butter yellow (small pouch style) held in crook of arm, gold jewelry—Cartier Love bracelet, delicate layered necklaces, small stud earrings. Hair in sleek low bun with clean center part, polished makeup with nude lip and subtle smokey eye, skin appears flawless yet natural with visible realistic texture.

Standing with elegant posture—shoulders back, spine lengthened, weight shifted to one leg creating subtle curve, one hand holding bag, other hand resting lightly at side or in trouser pocket. Body angled three-quarters to camera. Expression conveys quiet confidence and sophistication—slight closed-lip smile, direct eye contact, calm composed energy, that "old money elegance" attitude.

Lighting: sophisticated mixed lighting—warm golden chandelier light from above creating flattering overhead glow, natural light from large windows creating dimensional fill light on face, marble reflecting light upward creating soft lift under eyes. Lighting creates polished editorial quality while maintaining realistic skin texture, natural shine on hair, visible fabric luxury.

Environment: five-star hotel lobby with floor-to-ceiling cream marble, gold accents, massive floral arrangements on marble pedestals, crystal chandeliers glowing warmly overhead, plush seating areas softly visible in background, other elegantly dressed guests blurred in distance, sense of space and luxury.

Camera: 85mm lens at f/2.2, camera positioned at chest height capturing elegant three-quarter length portrait, sharp focus on face and bag with marble columns in soft bokeh creating depth, vertical framing emphasizes height and sophistication.

Mood: quiet luxury aesthetic, old money elegance, sophisticated confidence, that "effortless wealth" energy, timeless editorial quality, aspirational yet refined. 4K resolution. Hyper-realistic quality with visible cashmere texture, realistic leather luxury, authentic marble reflections, natural polished appearance.`
  },
  {
    id: 'luxury-designer-shopping-1',
    title: 'Luxury Shopping',
    description: 'In high-end boutique holding designer handbag, elegant outfit',
    category: 'luxury-fashion',
    tags: ['luxury', 'shopping', 'designer', 'boutique', 'sophisticated', 'handbag'],
    useCases: ['luxury shopping', 'designer content', 'handbag showcase', 'retail luxury'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in luxury editorial style. The woman stands in high-end designer boutique examining beautiful designer handbag in hands, mirror behind reflecting luxurious store, looking toward camera with poised composed expression.

She wears polished luxury outfit—tailored cream blazer over silk camisole, high-waisted wide-leg trousers in camel, pointed-toe leather pumps in nude, gold jewelry—Cartier watch, diamond studs, delicate bracelet, hair in sleek low bun or polished waves, sophisticated makeup with nude lip and defined eyes, manicured hands, refined shopping aesthetic.

Standing with elegant posture holding designer bag at waist level examining it appreciatively, one hand on bag handle, other touching bag detail showing consideration, body angled three-quarters creating sophisticated moment, shoulders back. She looks at camera with soft refined expression, eyes showing quiet appreciation of quality, face calm with composed elegance.

Lighting: sophisticated boutique lighting with spot lights highlighting merchandise, large window light creating natural fill, warm elegant atmosphere, light catching luxury leather texture on bag, realistic skin showing polished appearance, refined retail lighting.

Environment: upscale designer boutique with white marble floors, glass display cases, minimalist modern aesthetic, designer handbags displayed on illuminated shelves, attentive sales associate partially visible in soft blur background, luxurious seating areas, fresh flowers, high-end retail atmosphere.

Camera: 85mm lens at f/2.2, camera positioned at mid-body level capturing elegant shopping portrait, sharp focus on face and designer bag with boutique in soft bokeh, vertical framing emphasizes sophisticated moment and luxury environment.

Mood: luxury shopping sophistication, designer appreciation, refined taste, aspirational lifestyle, quiet luxury confidence, elegant retail experience calm. 4K resolution. Hyper-realistic quality with visible leather luxury texture, realistic boutique lighting, authentic high-end environment, natural sophisticated presence.`
  },
  {
    id: 'luxury-rooftop-bar-1',
    title: 'Rooftop Bar Sunset',
    description: 'On rooftop bar at sunset with cocktail, elegant dress, city skyline',
    category: 'luxury-fashion',
    tags: ['luxury', 'rooftop', 'cocktail', 'evening', 'city', 'elegant'],
    useCases: ['evening luxury', 'cocktail content', 'rooftop lifestyle', 'city elegance'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in sophisticated evening editorial style. The woman stands at rooftop bar railing at golden hour, holding elegant cocktail, city skyline glowing in background, looking toward camera with confident composed expression.

She wears stunning evening outfit—silk slip dress in champagne or midnight blue with delicate straps and elegant draping, statement gold jewelry—layered necklaces, cuff bracelet, chandelier earrings, strappy heels in metallic, small designer clutch on railing, hair in sophisticated waves or sleek updo, evening makeup with smokey eye and bold lip, glamorous rooftop aesthetic.

Standing at railing with elegant posture, one hand holding cocktail glass delicately, other hand resting on railing, body angled toward camera creating graceful line, hip slightly shifted, shoulders back showing confidence. She looks at camera with direct calm gaze, face showing sophisticated evening composure, elegant urban presence.

Lighting: magical golden hour light mixed with city lights beginning to twinkle, warm sunset glow on face and body from setting sun, rim light creating glow on hair edges, cocktail glass catching light creating sparkle, mixed natural and artificial light creating dimensional evening atmosphere, realistic skin with elegant golden hour glow.

Environment: luxurious rooftop bar with glass railing, city skyline visible in background with buildings catching sunset light, other elegantly dressed patrons in soft blur, modern bar furniture, plants or greenery creating ambiance, upscale urban rooftop setting, sense of height and sophistication.

Camera: 85mm lens at f/2.0, camera positioned at rooftop level capturing elegant portrait with skyline visible, sharp focus on face with city in artistic bokeh, vertical framing emphasizes elegance and urban setting, slight low angle adds sophistication.

Mood: sophisticated urban evening calm, rooftop bar elegance, city lifestyle luxury, confident feminine sophistication, aspirational evening life peace. 4K resolution. Hyper-realistic quality with visible silk texture, realistic golden hour mixing with city lights, authentic rooftop atmosphere, natural elegant presence.`
  },
  {
    id: 'luxury-art-gallery-1',
    title: 'Art Gallery Opening',
    description: 'At contemporary art gallery opening, elegant black outfit, sophisticated',
    category: 'luxury-fashion',
    tags: ['luxury', 'art', 'gallery', 'culture', 'sophisticated', 'evening'],
    useCases: ['art events', 'gallery openings', 'cultural lifestyle', 'sophisticated evenings'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in sophisticated editorial style. The woman stands in contemporary art gallery during opening, examining artwork thoughtfully, champagne flute in hand, looking toward camera with intellectual composed expression, white gallery walls and modern art in background.

She wears refined gallery outfit—tailored black blazer over black silk camisole, black wide-leg trousers with perfect break, sophisticated black leather heels, minimal elegant jewelry—gold geometric earrings, thin gold bangle, delicate watch, hair in polished low bun or sleek straight, sophisticated makeup with defined eye and nude lip, timeless elegant aesthetic.

Standing with cultured posture examining art piece nearby, champagne glass held elegantly in one hand, other hand in pocket or touching chin thoughtfully, body angled creating sophisticated composition, shoulders relaxed showing comfort in cultural space. She looks at camera with soft intellectual expression, eyes showing quiet cultural appreciation, face calm with refined presence.

Lighting: dramatic gallery lighting with spot lights on artwork, soft ambient gallery illumination, clean white walls reflecting light creating bright sophisticated atmosphere, light catching champagne glass creating sparkle, realistic skin with polished appearance in gallery lighting, clean modern art gallery aesthetic.

Environment: contemporary art gallery with white walls, large modern artwork visible but softly blurred, polished concrete or wood floors, other gallery attendees in elegant attire in background blur, gallery director or artist possibly visible in distance, minimal sophisticated gallery space.

Camera: 85mm lens at f/2.0, camera positioned at gallery floor level capturing sophisticated cultural portrait, sharp focus on face with gallery and art in soft bokeh, vertical framing emphasizes elegant presence in cultural space, natural documentary style of gallery opening.

Mood: sophisticated culture calm, art appreciation, intellectual elegance, cultural engagement peace, timeless sophistication, quiet luxury confidence. 4K resolution. Hyper-realistic quality with visible gallery lighting, realistic art gallery atmosphere, authentic cultural event, natural sophisticated presence.`
  },
  {
    id: 'luxury-car-valet-1',
    title: 'Luxury Hotel Valet Arrival',
    description: 'Stepping out of car at luxury hotel valet, elegant outfit, confident',
    category: 'luxury-fashion',
    tags: ['luxury', 'hotel', 'car', 'arrival', 'confident', 'elegant'],
    useCases: ['arrival moments', 'luxury lifestyle', 'hotel content', 'confident elegance'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in luxury lifestyle editorial style. The woman steps out of luxury car at hotel valet, one leg out showing elegant heel, hand on car door, looking toward camera with poised confident expression, valet and hotel entrance visible in background.

She wears polished arrival outfit—midi length dress in sophisticated neutral or jewel tone with modern silhouette, tailored blazer draped over shoulders, designer heels, designer handbag—Bottega Veneta or similar, oversized sunglasses just removed, hair in polished waves or sleek style, elegant makeup, manicured hands visible, put-together arrival aesthetic.

Stepping gracefully from car with one foot on ground showing elegant heel, other leg still in car, one hand on open car door, body creating elegant line emerging from vehicle, posture showing confident arrival energy. She looks at camera with direct calm gaze, face showing poised composure, elegant arrival presence.

Lighting: bright daylight or golden hour light creating clean outdoor lighting, car interior soft shadow creating dimensional lighting, natural light showing polished appearance, realistic skin with sophisticated glow, bright arrival aesthetic.

Environment: luxury hotel entrance with valet stand visible, elegant hotel facade in background, valet attendant in uniform partially visible attending to car, other luxury vehicles in soft background, red carpet or elegant walkway, landscaped entrance, five-star hotel arrival atmosphere.

Camera: 50mm lens at f/2.2, camera positioned at car level capturing elegant exit moment, sharp focus on face and upper body with hotel entrance in soft bokeh, vertical framing emphasizes elegant arrival and hotel sophistication, slight low angle adds confidence.

Mood: arrival sophistication calm, luxury lifestyle confidence, composed refinement, hotel luxury peace, poised feminine power. 4K resolution. Hyper-realistic quality with visible luxury car interior, realistic outdoor arrival lighting, authentic hotel valet atmosphere, natural confident presence.`
  },
  {
    id: 'luxury-penthouse-balcony-1',
    title: 'Penthouse Morning Coffee',
    description: 'On penthouse balcony with coffee, silk robe, city view, morning luxury',
    category: 'luxury-fashion',
    tags: ['luxury', 'penthouse', 'balcony', 'morning', 'city-view', 'sophisticated'],
    useCases: ['luxury living', 'morning lifestyle', 'penthouse content', 'aspirational living'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in luxury lifestyle editorial style. The woman stands on penthouse balcony at sunrise, holding coffee cup, wearing elegant silk robe, city skyline visible below in morning light, looking toward camera with peaceful content expression.

She wears luxury morning outfit—silk robe in champagne or white with delicate lace trim, matching silk camisole and shorts underneath barely visible, barefoot or in elegant slippers, hair in effortless morning waves or messy chic bun, fresh morning face with minimal makeup showing natural beauty, small diamond studs only jewelry, sophisticated morning elegance.

Standing at balcony railing with relaxed refined posture, coffee cup held elegantly in both hands at chest level, body angled toward camera, robe flowing slightly in morning breeze, shoulders soft showing morning comfort mixed with sophistication. She looks at camera with soft peaceful expression, eyes showing quiet contentment, face calm with grateful elegant energy.

Lighting: beautiful morning golden hour light washing over balcony and face, soft warm sunrise glow creating magical morning atmosphere, city below catching first light, backlight from sunrise creating rim light on hair and robe, realistic skin with natural morning glow, silk fabric catching light with subtle sheen.

Environment: luxury penthouse balcony with glass railing, modern furniture—elegant chair or lounge visible, city skyline stretching below with buildings catching sunrise, sense of being many stories high, plants in modern planters, sophisticated urban penthouse aesthetic, morning mist over city adding atmospheric depth.

Camera: 50mm lens at f/2.0, camera positioned on balcony at standing level, sharp focus on face with city view in soft bokeh, vertical framing captures elegant morning moment with sense of height and luxury, environmental context clear while subject remains focal point.

Mood: luxury urban living peace, penthouse morning ritual calm, peaceful sophistication, aspirational lifestyle contentment, morning elegance, grateful abundant energy. 4K resolution. Hyper-realistic quality with visible silk texture, realistic morning golden hour light, authentic penthouse atmosphere, natural peaceful elegant expression.`
  },
  {
    id: 'luxury-michelin-dining-1',
    title: 'Michelin Star Dining',
    description: 'Seated at Michelin restaurant with wine, elegant evening dress',
    category: 'luxury-fashion',
    tags: ['luxury', 'dining', 'restaurant', 'michelin', 'elegant', 'sophisticated'],
    useCases: ['fine dining', 'culinary luxury', 'sophisticated evenings', 'restaurant content'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in sophisticated dining editorial style. The woman sits at intimate table in Michelin-starred restaurant, holding crystal wine glass examining wine color in candlelight, looking toward camera with refined composed expression, artistically plated dish visible on table.

She wears stunning dinner outfit—elegant midi or maxi dress in luxe fabric—silk, velvet, or crepe in deep jewel tone or sophisticated black, statement jewelry—chandelier earrings, cocktail ring, delicate bracelet, hair in polished updo or sophisticated waves, evening makeup with elegant eye and classic lip, refined dinner elegance.

Seated with impeccable posture, wine glass held at proper angle examining color, other hand resting elegantly on table near flatware, body angled toward camera showing refined table manner, shoulders back. She looks at camera with soft cultured expression, face showing quiet culinary appreciation, elegant composed presence.

Lighting: intimate restaurant lighting with candlelight on table creating romantic glow on face, ambient restaurant lighting soft and warm, light reflecting off crystal wine glass creating sparkle, dramatic shadows creating sophisticated atmosphere, realistic skin with elegant candlelight glow, intimate fine dining lighting.

Environment: elegant Michelin restaurant with white tablecloth, fine china and crystal, modern artistic plating visible on dish, fresh floral arrangement on table, other diners in elegant dress barely visible in soft background, sommelier or server possibly in soft blur, five-star dining atmosphere, refined sophisticated aesthetic.

Camera: 85mm lens at f/2.0, camera positioned at table level across from subject creating intimate dining companion perspective, sharp focus on face and wine glass with restaurant in soft bokeh, vertical framing captures refined dining portrait, environmental context creates luxury while maintaining focus.

Mood: fine dining sophistication calm, culinary appreciation, elegant evening peace, cultured lifestyle, sophisticated pleasure, aspirational dining. 4K resolution. Hyper-realistic quality with visible crystal reflections, realistic candlelight, authentic fine dining atmosphere, natural sophisticated presence.`
  },
  {
    id: 'luxury-private-jet-1',
    title: 'Private Jet Travel',
    description: 'Seated in private jet with champagne, elegant travel outfit',
    category: 'luxury-fashion',
    tags: ['luxury', 'private-jet', 'travel', 'aviation', 'sophisticated', 'champagne'],
    useCases: ['luxury travel', 'private aviation', 'high-end lifestyle', 'aspirational travel'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in luxury travel editorial style. The woman sits in plush leather seat of private jet, champagne flute in hand, looking toward camera with poised confident expression, private jet interior visible showing ultimate luxury travel.

She wears sophisticated travel outfit—tailored neutral blazer over silk blouse, high-waisted trousers or midi skirt, designer heels or elegant flats, designer handbag on adjacent seat, oversized sunglasses on head or beside her, hair in polished low bun or sleek ponytail, refined travel makeup, elegant jewelry—watch, rings, studs, polished jet-set aesthetic.

Seated with elegant posture in luxury leather seat, champagne glass held delicately in one hand, other hand resting on armrest, legs crossed at ankle showing refined travel manner, body angled toward camera. She looks at camera with direct calm gaze, face showing sophisticated travel confidence, relaxed elegant energy.

Lighting: soft ambient cabin lighting mixed with natural light from jet windows, clean bright interior lighting showing polished appearance, light catching champagne glass creating sparkle, realistic skin with sophisticated travel glow, bright luxurious private aviation lighting.

Environment: private jet interior with cream leather seats, wood accents, modern technology, windows showing clouds or tarmac, flight attendant possibly visible in soft background, fresh flowers in cabin, aesthetic of ultimate luxury private aviation, sense of space and refinement.

Camera: 50mm lens at f/2.0, camera positioned across cabin aisle at seated level, sharp focus on face with jet interior in soft bokeh, vertical framing captures elegant travel portrait showing luxury environment, natural documentary style of private aviation lifestyle.

Mood: ultimate luxury travel calm, private jet sophistication, jet-set lifestyle confidence, effortless elegance, abundant lifestyle peace. 4K resolution. Hyper-realistic quality with visible leather luxury, realistic jet interior lighting, authentic private aviation atmosphere, natural sophisticated presence.`
  },
  {
    id: 'luxury-yacht-deck-1',
    title: 'Yacht Deck Sunset',
    description: 'On yacht deck at sunset, flowing dress, ocean breeze, luxury maritime',
    category: 'luxury-fashion',
    tags: ['luxury', 'yacht', 'ocean', 'sunset', 'maritime', 'elegant'],
    useCases: ['yacht lifestyle', 'maritime luxury', 'sunset content', 'aspirational travel'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in luxury maritime editorial style. The woman stands on yacht deck at golden hour, flowing dress moving in ocean breeze, ocean and sunset visible in background, looking toward camera with serene confident expression.

She wears elegant yacht outfit—flowing midi or maxi dress in white or soft color with fabric catching wind, elegant flat sandals or barefoot, minimal elegant jewelry—thin gold chain, small hoops, simple bracelet, hair down flowing naturally in ocean breeze, natural glowing makeup with sun-kissed bronze, oversized sunglasses in hand or hanging from dress, effortless maritime elegance.

Standing at yacht railing with relaxed confident posture, one hand touching hair blown by breeze, other hand on railing, dress flowing dramatically in wind creating beautiful movement, shoulders back showing confidence and comfort. She looks at camera with soft serene expression, eyes looking toward horizon then camera, face showing peaceful contentment, wind-swept beauty.

Lighting: magical golden hour light creating warm glow on face and body, sun setting over ocean creating dramatic backlight with rim light on hair and dress, light reflecting off ocean creating fill light, realistic skin with sun-kissed glow, warm maritime golden hour aesthetic.

Environment: luxury yacht deck with teak wood, white railings, ocean stretching to horizon with sunset painting sky in oranges and pinks, yacht wake visible in water, distant coastline or islands barely visible, sense of being at sea, nautical luxury details visible—champagne bucket, elegant seating, sophisticated maritime setting.

Camera: 50mm lens at f/2.8 capturing some ocean depth, camera positioned on deck at standing level, sharp focus on face with ocean sunset in soft bokeh, vertical framing emphasizes flowing dress and maritime elegance, slight backlight from sunset creates dreamy quality.

Mood: luxury maritime lifestyle peace, yacht sunset magic, ocean elegance calm, peaceful abundant confidence, aspirational maritime luxury, wind-swept sophisticated beauty. 4K resolution. Hyper-realistic quality with visible wind movement in dress and hair, realistic golden hour maritime lighting, authentic yacht atmosphere, natural elegant presence.`
  },
  {
    id: 'luxury-spa-relaxation-1',
    title: 'Luxury Spa Relaxation',
    description: 'In spa robe post-treatment, relaxed peaceful, ultimate self-care',
    category: 'luxury-fashion',
    tags: ['luxury', 'spa', 'wellness', 'relaxation', 'self-care', 'peaceful'],
    useCases: ['spa content', 'wellness luxury', 'self-care moments', 'relaxation lifestyle'],
    prompt: `Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in serene luxury editorial style. The woman sits in spa relaxation lounge wearing plush robe, holding cucumber water, just post-treatment, looking toward camera with completely peaceful relaxed expression.

She wears luxury spa robe in pristine white with hotel or spa embroidery, hair wrapped in white towel turban, fresh glowing face with no makeup showing natural post-facial radiance, minimal jewelry removed for treatment, barefoot or in spa slippers, pure relaxation aesthetic.

Seated comfortably in lounge chair with completely relaxed posture, holding glass of cucumber water, body language shows total relaxation with no tension, shoulders completely soft, slight lean back into chair showing comfort. She looks at camera with soft peaceful expression, eyes relaxed, face showing quiet contentment, skin visibly glowing from treatment, authentic spa peace.

Lighting: soft diffused spa lighting creating calming even illumination, natural light from window with sheer curtains creating gentle glow, candlelight adding warm ambiance, light enhancing post-treatment skin glow, realistic skin showing natural luminous spa results, peaceful spa lighting creating sanctuary atmosphere.

Environment: luxury spa relaxation lounge with comfortable white furniture, fresh towels, candles burning creating ambiance, fresh flowers, water feature with gentle sound barely visible, tropical plants, modern spa aesthetic, sense of peace and tranquility, other robed spa-goers in distant soft blur maintaining privacy.

Camera: 50mm lens at f/2.0, camera positioned at lounge level creating intimate relaxation perspective, sharp focus on face showing glowing post-treatment skin with spa in soft bokeh, vertical framing captures peaceful spa portrait, natural documentary style of ultimate relaxation.

Mood: luxury spa peace, ultimate self-care calm, post-treatment bliss, wellness luxury contentment, pampered serenity, abundant self-care, quiet feminine indulgence. 4K resolution. Hyper-realistic quality with visible skin glow from treatment, realistic spa lighting, authentic luxury spa atmosphere, natural peaceful blissful expression.`
  }
]

// ============================================
// EXPORTS & MAPPING
// ============================================

export const UNIVERSAL_PROMPT_LIBRARIES = {
  'travel-airport': TRAVEL_UNIVERSAL_PROMPTS,
  'alo-workout': ALO_WORKOUT_UNIVERSAL_PROMPTS,
  'seasonal-christmas': CHRISTMAS_UNIVERSAL_PROMPTS,
  'casual-lifestyle': CASUAL_LIFESTYLE_UNIVERSAL_PROMPTS,
  'luxury-fashion': LUXURY_FASHION_UNIVERSAL_PROMPTS,
}

/**
 * Get prompts for a category
 */
export function getPromptsForCategory(category: string): UniversalPrompt[] {
  if (category in UNIVERSAL_PROMPT_LIBRARIES) {
    return UNIVERSAL_PROMPT_LIBRARIES[category as keyof typeof UNIVERSAL_PROMPT_LIBRARIES]
  }
  return []
}

/**
 * Get random prompts from category
 */
export function getRandomPrompts(category: string, count: number): UniversalPrompt[] {
  const prompts = getPromptsForCategory(category)
  if (prompts.length === 0) return []
  
  // Shuffle and take count
  const shuffled = [...prompts].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/**
 * Get prompt by ID across all categories
 */
export function getPromptById(id: string): UniversalPrompt | null {
  for (const category of Object.keys(UNIVERSAL_PROMPT_LIBRARIES) as Array<keyof typeof UNIVERSAL_PROMPT_LIBRARIES>) {
    const prompt = UNIVERSAL_PROMPT_LIBRARIES[category].find((p: UniversalPrompt) => p.id === id)
    if (prompt) return prompt
  }
  return null
}

/**
 * Find matching prompt by category and keywords
 */
export function findMatchingPrompt(
  category: string,
  keywords?: string[]
): UniversalPrompt | null {
  const prompts = getPromptsForCategory(category)
  if (prompts.length === 0) return null
  
  // If no keywords, return random
  if (!keywords || keywords.length === 0) {
    return prompts[Math.floor(Math.random() * prompts.length)]
  }
  
  // Score prompts by keyword matches
  const scored = prompts.map(prompt => {
    const promptText = `${prompt.title} ${prompt.description} ${prompt.tags.join(' ')}`.toLowerCase()
    const matches = keywords.filter(kw => promptText.includes(kw.toLowerCase())).length
    return { prompt, score: matches }
  })
  
  // Sort by score and return best match
  scored.sort((a, b) => b.score - a.score)
  return scored[0].score > 0 ? scored[0].prompt : scored[Math.floor(Math.random() * scored.length)].prompt
}
