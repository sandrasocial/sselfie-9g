# Selfie To Brand Shoot Module 2 Brand World Cards

Date: 2026-06-02
Status: Approved for Module 2 UI build
Product: Selfie to Brand Shoot System
Module: 2 - Choose Your Signature Visual World

> Scope update — 2026-08-30: Colors and aesthetic language in the teaching content describe the learner's chosen photography world, not the SSELFIE interface palette. The product shell and every UI component follow `docs/SSELFIE_DESIGN_SYSTEM.md`.

## Module 2 Lock

Module 2 is not a prompt gallery.

Module 2 helps the buyer choose one repeatable visual identity direction for her personal brand.

The buyer should leave this module knowing:

- the visual world she wants to become recognizable for,
- the mood her audience should associate with her,
- the colors, light, wardrobe, and backgrounds she will repeat,
- how to use one world across profile images, reel covers, stories, carousels, offer visuals, and lifestyle posts,
- how to adjust the intensity without abandoning the visual identity.

Core teaching line:

> Do not choose a different aesthetic every time. Choose a visual world you can repeat.

Core outcome:

> My Signature Visual World is: ______

## Module 2 Sections

1. Hero: Choose Your Signature Visual World
2. Sandra's Rule: choose a visual world you can repeat
3. Why Your Visual World Matters
4. Signature Visual World Selector
5. Visual Consistency Code
6. One World, Different Uses
7. Stay In Your World, Adjust The Volume
8. Action Step

## Approved Visual Source

Use current Vault/Prompt Pack worlds from:

- `lib/ai-prompts/prompt-data.ts`
- `public/images/ai-prompts/`

Do not use random stock images.
Do not invent new aesthetic categories for Module 2.
If Sandra rejects an image choice, replace it before building UI.

## Teaching Section: Why Your Visual World Matters

Purpose:

Show the student that this is not about one cute AI photo. It is about building a recognizable visual identity across her Instagram profile, content, website, and offers.

This section should sit near the top of Module 2, before the Brand World Cards.

Teaching copy:

> Your audience should not have to relearn your brand every time they see you. When your images share the same mood, light, colors, styling, and emotional signal, your profile starts to feel intentional. That is what makes your personal brand easier to recognize and remember.

Additional teaching copy:

> Your feed does not need to be perfect. But it should feel like the same woman lives there.

Core lesson:

> A beautiful image can get attention. A repeatable visual world builds recognition.

### Cohesive Grid Principle

A cohesive visual world should include variety inside consistency.

The goal is not nine identical images. The goal is one recognizable world expressed through different content roles.

A strong signature feed can include:

- face / identity,
- full body / outfit,
- detail / object,
- lifestyle moment,
- work or coffee moment,
- close-up,
- movement or transition,
- quiet negative-space image,
- content-use image such as profile photo, reel cover, story intro, or offer image.

The grid should not include:

- nine similar full-body shots,
- nine similar portraits,
- random images from the same folder with no composition logic,
- mismatched crops,
- too many face shots,
- too many object-only shots,
- images that do not support the same emotional world.

### Visual Comparison

Create a clean editorial Instagram-style profile/grid mockup with two side-by-side examples on desktop and stacked examples on mobile.

Do not use a literal Instagram screenshot UI. Use a minimal SSELFIE teaching mockup:

- Pearl or Paper frame as defined in `docs/SSELFIE_DESIGN_SYSTEM.md`,
- thin silver border,
- small profile/header row,
- 3x3 grid,
- muted labels,
- no colorful social UI,
- no emojis,
- no generic app icons.

The goal is to teach mood, consistency, and recognition.

### Example 1: Scattered Visual Identity

Label:

Scattered Visual Identity

Supporting copy:

> When every image belongs to a different world, your audience has to re-learn your brand every time.

Direction:

This example should feel realistic, not ugly or shame-based. It should show beautiful images that do not belong to one recognizable brand world.

Use existing SSELFIE/Vault images, deliberately mixed across worlds:

Use similar content roles where possible, but from mismatched worlds. The teaching point is inconsistency, not bad images.

| Slot | Role | Image |
| --- | --- | --- |
| 1 | Hero identity / portrait from a soft home world | `/images/ai-prompts/clean-girl-morning-shot-10.jpg` |
| 2 | Full-body / outfit from a dark fashion world | `/images/ai-prompts/noir-femme-shot-1.png` |
| 3 | Lifestyle detail from a marble cafe world | `/images/ai-prompts/marble-wine-shot-5.jpg` |
| 4 | Movement / street from a casual denim world | `/images/ai-prompts/denim-street-shot-1.jpg` |
| 5 | Strong brand image from a dark balcony world | `/images/ai-prompts/dark-balcony-shot-6.png` |
| 6 | Texture/detail from a cozy indoor world | `/images/ai-prompts/cozy-leather-shot-5.png` |
| 7 | Coffee / everyday authority from a dark cafe world | `/images/ai-prompts/dark-feminine-cafe-shot-3.jpg` |
| 8 | Close-up / profile candidate from a coastal world | `/images/ai-prompts/coastal-white-shot-8.jpg` |
| 9 | Quiet object/detail from a clean founder world | `/images/ai-prompts/clean-girl-morning-shot-6.jpg` |

What this teaches:

- mixed color grading,
- different lighting styles,
- unrelated backgrounds,
- inconsistent wardrobe direction,
- no single emotional signal,
- pretty images, but no clear brand recognition.

### Example 2: Signature Visual World

Label:

Signature Visual World

Supporting copy:

> A signature visual world makes your profile feel intentional, recognizable, and easier to remember.

Direction:

Use one current SSELFIE world to show the same identity across different content uses.

Recommended cohesive world for the teaching mockup:

Clean Girl Founder Morning.

Reason:

It has enough images for a full 3x3 grid, includes profile/story/work/lifestyle/detail moments, and clearly shows how one world can support different content needs without changing identity.

Use these images:

| Slot | Role | Image |
| --- | --- | --- |
| 1 | Hero identity image - clear close-up that establishes the woman | `/images/ai-prompts/clean-girl-morning-shot-10.jpg` |
| 2 | Outfit / full-body image - silhouette, styling, wardrobe direction | `/images/ai-prompts/clean-girl-morning-shot-1.jpg` |
| 3 | Lifestyle detail - objects, coffee, phone, laptop, beauty texture | `/images/ai-prompts/clean-girl-morning-shot-6.jpg` |
| 4 | Movement / transition - getting ready, morning action, world in motion | `/images/ai-prompts/clean-girl-morning-shot-5.jpg` |
| 5 | Strongest brand image - center of the visual identity | `/images/ai-prompts/clean-girl-morning-shot-4.jpg` |
| 6 | Detail / texture / close crop - intimacy and rhythm break | `/images/ai-prompts/clean-girl-morning-shot-2.jpg` |
| 7 | Work / creator lifestyle / everyday moment | `/images/ai-prompts/clean-girl-morning-shot-9.jpg` |
| 8 | Close-up or profile-image candidate | `/images/ai-prompts/clean-girl-morning-shot-7.jpg` |
| 9 | Quiet editorial image / softer ending / breathing room | `/images/ai-prompts/clean-girl-morning-shot-3.jpg` |

What this teaches:

- consistent color mood,
- similar soft morning light,
- related wardrobe direction,
- repeated home/founder background world,
- clear emotional signal,
- different uses, same identity.

### Mockup Crop Rules

- Use square 3x3 thumbnails for teaching clarity.
- Use `object-fit: cover`.
- Favor `object-position: center top` for portrait shots where face/outfit matters.
- Keep crops large enough that the mood is readable on mobile.
- Avoid tiny details as the main proof.
- Do not crop through faces awkwardly.
- Subject should be centered enough that the same image would still make sense in modern Instagram 3:4 or 4:5 preview behavior.
- No important face, body, or object detail should be trapped at the extreme top/bottom edge.
- If a crop feels off during screenshot review, mark `NEEDS_SANDRA_DECISION: grid crop`.

## Brand World Cards

### 1. NOIR FEMME

Brand signal:

Power, mystery, editorial confidence.

Brand feeling:

The woman who has entered her next era and does not need to explain herself.

Color mood:

Black, charcoal, silver-gray, cool shadows, high contrast.

Lighting:

Flat overcast light, deep shadows, underexposed editorial contrast, film grain.

Wardrobe direction:

Black blazer, lace, structured layers, dark tailoring, sharp accessories.

Background world:

European street, stone facades, cobblestones, architectural dark texture.

Emotional signal:

Commanding, private, cinematic, untouchable.

Best for:

Strong personal brand presence, launch visuals, editorial profile images, high-impact reel covers, new-era identity content.

Choose this if:

You want your brand to feel powerful, fashion-led, confident, and a little mysterious.

Avoid if:

Your brand needs to feel soft, bright, highly approachable, playful, or wellness-light.

One world, different uses:

- Profile photo: close portrait with direct eye contact and deep contrast.
- Reel cover: walking toward camera or looking back over shoulder.
- Story intro: softer black-and-white movement shot.
- Offer visual: strong full-body blazer image.
- About-me image: less severe portrait with relaxed expression.

Recommended images:

- Hero: `/images/ai-prompts/noir-femme-shot-3.png`
- Supporting 1: `/images/ai-prompts/noir-femme-shot-1.png`
- Supporting 2: `/images/ai-prompts/noir-femme-shot-6.png`

Recommended grid rhythm:

Lead with movement and power, anchor the center with the over-shoulder identity shot, then soften the grid with one direct portrait or detail.

Best content-use images:

- Profile photo: `/images/ai-prompts/noir-femme-shot-6.png`
- Reel cover: `/images/ai-prompts/noir-femme-shot-1.png`
- Detail/lifestyle support: `/images/ai-prompts/noir-femme-shot-4.png`

### 2. Clean Girl Founder Morning

Brand signal:

Fresh, clean, modern founder energy.

Brand feeling:

The woman who builds her next chapter from calm routines, soft discipline, and a polished everyday life.

Color mood:

White, ivory in imagery, oat, soft beige in the photo world, pale gray, gentle natural skin tones.

Lighting:

Soft morning window light, airy shadows, low contrast, natural glow.

Wardrobe direction:

White tanks, cream knits, soft cardigans, wide-leg trousers, clean loungewear, minimal founder styling.

Background world:

Bedroom, bathroom, kitchen, living room, laptop, coffee, skincare, soft home interiors.

Emotional signal:

Fresh, trustworthy, calm, focused, quietly ambitious.

Best for:

Founder lifestyle, work-from-home visuals, profile refreshes, morning routine stories, soft authority, approachable expert positioning.

Choose this if:

You want your personal brand to feel clean, fresh, organized, feminine, modern, and easy to trust.

Avoid if:

You want a darker, more mysterious, high-fashion, night-time, or dramatic brand world.

One world, different uses:

- Profile photo: window-light close selfie.
- Reel cover: clean mirror selfie or laptop founder moment.
- Story intro: coffee, skincare, or kitchen counter selfie.
- Offer visual: living room laptop moment.
- About-me image: soft morning mirror or FaceTime-style selfie.

Recommended images:

- Hero: `/images/ai-prompts/clean-girl-morning-shot-10.jpg`
- Supporting 1: `/images/ai-prompts/clean-girl-morning-shot-4.jpg`
- Supporting 2: `/images/ai-prompts/clean-girl-morning-shot-1.jpg`

Recommended grid rhythm:

Mix face, mirror, laptop, coffee, skincare, and morning detail so the feed feels like one founder life, not nine similar selfies.

Best content-use images:

- Profile photo: `/images/ai-prompts/clean-girl-morning-shot-10.jpg`
- Reel cover: `/images/ai-prompts/clean-girl-morning-shot-4.jpg`
- Detail/lifestyle support: `/images/ai-prompts/clean-girl-morning-shot-6.jpg`

### 3. Dark Feminine Cafe

Brand signal:

Polished, cinematic, city authority.

Brand feeling:

The woman who is feminine, strategic, and seen in the room before she says a word.

Color mood:

Black, espresso, muted stone, city neutrals, soft cafe reflections, cool brown-gray shadows.

Lighting:

Soft urban light, cafe window reflections, moody but still readable, polished street editorial contrast.

Wardrobe direction:

Black structured blazer, sleek dress, boots, sunglasses, minimal gold jewelry.

Background world:

City cafe, marble tables, street arrival, coffee run, glass windows, polished urban texture.

Emotional signal:

Feminine power, intention, elegance, social confidence.

Best for:

Personal brand authority, coffee chat content, service provider visibility, city-lifestyle posts, launches with a softer but still powerful tone.

Choose this if:

You want your brand to feel polished, feminine, cinematic, and grown-up without going full dark fashion editorial.

Avoid if:

Your brand needs to feel very bright, minimal, home-based, coastal, or casual.

One world, different uses:

- Profile photo: seated cafe hero or lipstick moment.
- Reel cover: street arrival.
- Story intro: counter order or detail cutaway.
- Offer visual: seated hero at cafe table.
- About-me image: softer coffee-run portrait.

Recommended images:

- Hero: `/images/ai-prompts/dark-feminine-cafe-shot-3.jpg`
- Supporting 1: `/images/ai-prompts/dark-feminine-cafe-shot-1.jpg`
- Supporting 2: `/images/ai-prompts/dark-feminine-cafe-shot-4.jpg`

Recommended grid rhythm:

Use the street arrival as movement, the seated cafe hero as the brand anchor, and lipstick/detail moments to keep the world intimate.

Best content-use images:

- Profile photo: `/images/ai-prompts/dark-feminine-cafe-shot-4.jpg`
- Reel cover: `/images/ai-prompts/dark-feminine-cafe-shot-1.jpg`
- Detail/lifestyle support: `/images/ai-prompts/dark-feminine-cafe-shot-5.jpg`

### 4. Dark Balcony

Brand signal:

Quiet luxury, private-life intrigue.

Brand feeling:

The woman with a beautiful inner world, a high-end private life, and a brand that feels like a secret people want access to.

Color mood:

Black, night, glass reflections, city lights, cool concrete, soft warm points from street or apartment light.

Lighting:

Evening light, balcony shadows, city glow, interior-to-exterior contrast.

Wardrobe direction:

Black slip dress or evening styling, sunglasses, glossy hair, minimal luxury accessories.

Background world:

Balcony, city view, windows, night streets, apartment edge, reflective glass.

Emotional signal:

Magnetic, intimate, elevated, private, cinematic.

Best for:

Reel covers, personal reinvention posts, mysterious brand identity, lifestyle luxury, "new era" storytelling.

Choose this if:

You want your audience to feel like they are watching the private cinematic version of your life.

Avoid if:

Your brand needs to feel highly open, bright, educational, playful, or casual everyday.

One world, different uses:

- Profile photo: close sunglasses/lips or window side profile.
- Reel cover: balcony kiss hero or reel cover hero.
- Story intro: from-inside-looking-out image.
- Offer visual: dark balcony hero with stronger text overlay.
- About-me image: softer window lean or hair movement portrait.

Recommended images:

- Hero: `/images/ai-prompts/dark-balcony-shot-6.png`
- Supporting 1: `/images/ai-prompts/dark-balcony-shot-1.png`
- Supporting 2: `/images/ai-prompts/dark-balcony-shot-2.png`

Recommended grid rhythm:

Build around balcony hero, window profile, city-detail, and softer inside-looking-out frames so it feels private and cinematic, not only dark.

Best content-use images:

- Profile photo: `/images/ai-prompts/dark-balcony-shot-8.png`
- Reel cover: `/images/ai-prompts/dark-balcony-shot-6.png`
- Detail/lifestyle support: `/images/ai-prompts/dark-balcony-shot-5.png`

### 5. Coastal White

Brand signal:

Soft, fresh, spacious, aspirational.

Brand feeling:

The woman who feels calm, free, visible, and expensive without trying too hard.

Color mood:

White, soft stone, sea blue-gray, pale sky, sunlit neutrals, clean highlights.

Lighting:

Golden hour, soft sunset, open natural light, airy contrast.

Wardrobe direction:

White dress, soft feminine silhouettes, minimal jewelry, clean resort-style styling.

Background world:

Ocean, terrace, cliffside, pool, white walls, coastal architecture.

Emotional signal:

Freedom, softness, clarity, aspiration, fresh next chapter.

Best for:

Wellness/lifestyle brands, soft personal brand refreshes, profile images, calming offer visuals, "becoming visible again" content.

Choose this if:

You want your brand to feel light, spacious, feminine, aspirational, and peaceful.

Avoid if:

You want your brand to feel urban, dark, mysterious, edgy, or highly structured.

One world, different uses:

- Profile photo: close beauty portrait.
- Reel cover: cliffside hero or terrace wall.
- Story intro: walking terrace moment.
- Offer visual: backless ocean view or white wall with wine.
- About-me image: sunset reflection or soft close-up.

Recommended images:

- Hero: `/images/ai-prompts/coastal-white-shot-1.jpg`
- Supporting 1: `/images/ai-prompts/coastal-white-shot-8.jpg`
- Supporting 2: `/images/ai-prompts/coastal-white-shot-3.jpg`

Recommended grid rhythm:

Balance cliffside hero, ocean/back-view moments, terrace movement, and close beauty so the feed feels spacious but still personal.

Best content-use images:

- Profile photo: `/images/ai-prompts/coastal-white-shot-8.jpg`
- Reel cover: `/images/ai-prompts/coastal-white-shot-1.jpg`
- Detail/lifestyle support: `/images/ai-prompts/coastal-white-shot-5.jpg`

### 6. Marble Cafe

Brand signal:

Expensive, refined, social, elegant.

Brand feeling:

The woman whose everyday content feels like a polished lifestyle editorial.

Color mood:

Marble white, black, wine red, candlelight, warm-cool stone, elegant neutrals.

Lighting:

Soft indoor cafe light, candlelit shadows, polished evening atmosphere.

Wardrobe direction:

Dark blazer, elevated evening styling, wine-glass elegance, refined accessories.

Background world:

Marble cafe, wine table, candlelit corners, polished stone, intimate luxury interior.

Emotional signal:

Refined, elegant, composed, social, expensive.

Best for:

Luxury lifestyle positioning, service provider authority, social proof posts, evening content, elevated personal essays, offer graphics.

Choose this if:

You want your brand to feel polished, refined, elegant, and socially magnetic.

Avoid if:

You want a very minimal, casual, sporty, bright, or home-founder visual world.

One world, different uses:

- Profile photo: beauty portrait.
- Reel cover: wine sip hero.
- Story intro: detail shot or looking away.
- Offer visual: marble table hero.
- About-me image: softer seated or outfit shot.

Recommended images:

- Hero: `/images/ai-prompts/marble-wine-shot-1.jpg`
- Supporting 1: `/images/ai-prompts/marble-wine-shot-4.jpg`
- Supporting 2: `/images/ai-prompts/marble-wine-shot-5.jpg`

Recommended grid rhythm:

Anchor with the wine hero, add an outfit or beauty portrait, then use marble/candle/detail frames to create refinement and breathing room.

Best content-use images:

- Profile photo: `/images/ai-prompts/marble-wine-shot-4.jpg`
- Reel cover: `/images/ai-prompts/marble-wine-shot-1.jpg`
- Detail/lifestyle support: `/images/ai-prompts/marble-wine-shot-5.jpg`

### 7. Denim Street

Brand signal:

Casual confidence, cool-girl relatability.

Brand feeling:

The woman who is stylish, approachable, modern, and confident in real life - not overly staged.

Color mood:

Light denim, blazer neutrals, city gray, soft blue, clean street tones.

Lighting:

Natural city daylight, soft shadows, practical street editorial light.

Wardrobe direction:

Light denim, soft blazer, casual tailoring, phone-in-hand details, modern streetwear polish.

Background world:

City steps, street, glass reflection, sidewalks, urban detail, public everyday spaces.

Emotional signal:

Cool, relatable, mobile, casual, current.

Best for:

Creators, lifestyle brands, coaches, everyday content, outfit-led posts, approachable personal brand visuals, social-first content.

Choose this if:

You want your brand to feel stylish and recognizable without looking too formal, dark, or distant.

Avoid if:

You want your brand to feel luxury-night, very soft feminine, coastal, or highly polished indoor editorial.

One world, different uses:

- Profile photo: windy side profile or glass reflection.
- Reel cover: full outfit hero or low-angle walk.
- Story intro: phone check.
- Offer visual: city steps or blazer hero.
- About-me image: walking moment.

Recommended images:

- Hero: `/images/ai-prompts/denim-street-shot-1.jpg`
- Supporting 1: `/images/ai-prompts/denim-street-shot-10.jpg`
- Supporting 2: `/images/ai-prompts/denim-street-shot-4.jpg`

Recommended grid rhythm:

Use full outfit and walking frames for movement, mirror/phone moments for relatability, and street details to keep it modern and grounded.

Best content-use images:

- Profile photo: `/images/ai-prompts/denim-street-shot-12.jpg`
- Reel cover: `/images/ai-prompts/denim-street-shot-1.jpg`
- Detail/lifestyle support: `/images/ai-prompts/denim-street-shot-5.jpg`

### 8. Cozy Leather

Brand signal:

Warm confidence, lifestyle polish.

Brand feeling:

The woman who feels grounded, tactile, and elevated - like her life has texture, not just polish.

Color mood:

Black leather, soft knit, warm neutral interior, muted browns, mirror light, texture-forward contrast.

Lighting:

Soft indoor light, mirror reflections, gentle lifestyle shadows.

Wardrobe direction:

Leather jacket, oversized knit, simple base layers, lived-in polish, mirror-selfie styling.

Background world:

Bedroom, hallway, mirror, bed, textures, getting-ready spaces, quiet lifestyle interiors.

Emotional signal:

Grounded, warm, tactile, confident, lived-in, elevated.

Best for:

Lifestyle creators, autumn/winter personal brand, intimate stories, mirror content, approachable but still elevated identity.

Choose this if:

You want your brand to feel stylish, textured, human, cozy, and quietly confident.

Avoid if:

You want a bright clean founder world, coastal softness, sharp city authority, or high-drama editorial power.

One world, different uses:

- Profile photo: beauty portrait.
- Reel cover: full mirror check.
- Story intro: getting ready or hallway walk.
- Offer visual: doorframe portrait or texture detail.
- About-me image: closer mirror selfie.

Recommended images:

- Hero: `/images/ai-prompts/cozy-leather-shot-1.png`
- Supporting 1: `/images/ai-prompts/cozy-leather-shot-8.png`
- Supporting 2: `/images/ai-prompts/cozy-leather-shot-3.png`

Recommended grid rhythm:

Mix mirror identity, getting-ready action, hallway movement, texture detail, and beauty portrait so the world feels lived-in but still polished.

Best content-use images:

- Profile photo: `/images/ai-prompts/cozy-leather-shot-8.png`
- Reel cover: `/images/ai-prompts/cozy-leather-shot-1.png`
- Detail/lifestyle support: `/images/ai-prompts/cozy-leather-shot-5.png`

## Visual Consistency Code

This should be the worksheet/action deliverable inside Module 2.

Fields:

- My Signature Visual World:
- My main colors:
- My lighting:
- My wardrobe direction:
- My background world:
- My emotional signal:
- What I want people to feel:
- What I will avoid so my brand does not look random:

Internal note:

For V1, this can be a polished static worksheet-style section. If safe later, it can become persistent progress/profile data.

## One World, Different Uses

Teach that she does not switch aesthetics for every content type.

She creates different use cases inside the same visual identity:

- Profile photo: clean and recognizable.
- Reel cover: stronger pose, clearer contrast.
- Story intro: softer and more lifestyle.
- Carousel cover: visual anchor with space for text.
- Offer image: more authority and polish.
- About-me image: warmer and more human.
- Lifestyle post: relaxed but still inside the same color/light world.

## Stay In Your World, Adjust The Volume

This is the taste/troubleshooting layer.

| If it feels... | Stay in your world and adjust... |
| --- | --- |
| Too dark | Keep the same wardrobe/background, soften the light. |
| Too clean | Keep the same palette, add texture or movement. |
| Too casual | Keep the same setting, add stronger styling or pose. |
| Too editorial | Keep the same colors, ask for a more natural expression. |
| Too soft | Keep the light palette, add contrast or sharper composition. |
| Too random | Repeat the same color grading, setting, and wardrobe direction. |

## Module 2 Build Notes

Do:

- Build this as a Signature Visual World decision module.
- Use large image-led brand world cards.
- Keep copy short and premium.
- Use current Vault collection images.
- Keep the course shell intact.
- Keep Module 3 as placeholder only.

Do not:

- Turn this into a Vault gallery.
- Add prompt copy buttons as the main experience.
- Recommend a different aesthetic per use case.
- Create random new aesthetics.
- Add a complex quiz in V1.
- Touch checkout, payment, access, entitlements, auth, or Vault access.

## Needs Sandra Approval

Before building Module 2 UI, approve or revise:

1. World names.
2. Brand signal for each world.
3. Hero image per world.
4. Supporting thumbnails per world.
5. "Choose this if" / "Avoid if" language.
6. Whether the Visual Consistency Code should be static in V1 or saved later as user progress.
