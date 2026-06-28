# Blueprint Workflow Explainer

Last updated: 2026-06-28

Purpose: explain the old Blueprint product in simple language so future AI agents can understand and recreate the workflow later.

This is not a model or code spec.

This explains:

- what Blueprint does
- what the user gets
- how the workflow feels
- how the feed grid works
- how one image is generated after the grid is planned
- what styles exist now
- how the image prompts are structured

## Short Version

Blueprint helps a woman turn her selfies and brand direction into a visual Instagram plan.

The core promise is:

1. choose a visual style
2. create a planned feed grid
3. fill each post slot with a photo idea
4. generate or add images one by one
5. use the post/caption/plan tools to know what to post next

The user is not buying random AI images.

She is buying a simple way to see her brand visually, stop staring at an empty feed, and know what the next posts could look like.

## Current Repo Reality

The old public `/blueprint` product surface is legacy.

Current behavior:

- `/blueprint` redirects to `/feed-planner`
- `/blueprint/paid` redirects to `/feed-planner`
- old public Blueprint image endpoints are retired and return `410`
- existing paid Blueprint buyers now use Feed Planner

So, when agents say "Blueprint" in this repo, they usually mean the legacy product promise that now lives through the Feed Planner experience.

Do not rebuild from the retired `/api/blueprint/generate-*` endpoints.

Use this doc only to understand the workflow.

## What The User Gets

A Blueprint / Feed Planner user gets:

- a feed planning workspace
- a 3x3 Instagram-style grid
- a chosen visual style for the whole feed
- optional style variations inside that style
- empty post slots the user can generate into
- generated photos that fit the selected style
- post/caption support
- a plan area for content direction
- an ideas/pillars area
- the ability to open a post, add an image, generate an image, or rearrange the grid

For legacy paid Blueprint buyers, the delivery email frames it as:

- your 9-post grid
- your content strategy
- your caption framework
- start by reviewing the grid
- pick one slot
- write one caption
- come back and do the next one

## User Workflow

### 1. User Opens The Planner

The user lands in Feed Planner.

If she is a first-time or legacy paid Blueprint buyer, she may see a short welcome walkthrough.

The walkthrough says, in plain terms:

- your credits are ready
- create a complete 9-post feed
- click an empty slot to create a photo
- use the Post tab for captions
- use the Plan tab for what to make next

### 2. User Chooses A Feed Style

The user chooses the visual world for the feed.

This is the most important creative decision.

The style controls:

- color palette
- locations
- lighting
- mood
- outfit direction
- props and objects
- how all nine posts feel together

The UI currently shows seven curated feed styles:

1. Dark & Moody
2. Beige Aesthetic
3. Light & Minimalistic
4. Luxury Future Self
5. Casual Bohemian
6. Athletic & Wellness
7. Coastal Aesthetics

Each style also has style variations. These are smaller worlds inside the main style.

Example:

- main style: Dark & Moody
- variation: Urban Night
- variation: Industrial Edge
- variation: Luxury Darkness

### 3. System Creates A Grid

The grid is a 3x3 layout.

There are nine post positions.

Each position has a role, so the feed does not feel like nine random selfies.

Current position roles:

1. Anchor portrait
2. Flatlay detail
3. Full-body portrait
4. Close-up detail
5. Brand statement / sign
6. Texture detail
7. Walking moment
8. Flatlay detail
9. Mirror selfie

The grid should feel cohesive, but not repetitive.

The simple rule:

Same visual world. Different moments.

### 4. User Generates Images One By One

The user can click an empty slot.

That single slot gets its own prompt.

The prompt is based on:

- selected feed style
- selected variation
- post position
- uploaded reference selfies
- the slot role
- the style's approved prompt template

The generated image goes into that slot.

The user can keep filling slots one by one until the grid feels usable.

### 5. User Uses The Content Layer

After images exist, the user can use:

- Grid: see the whole feed
- Posts: work with individual post slots
- Plan: understand what to make next
- Ideas: see brand/content ideas

Free users may see Captions instead of Posts.

Paid and membership users usually see Posts.

## Feed Grid Logic In Plain English

The grid is not just a collage.

It is a planned visual story.

Each slot has a job:

| Position | Job | What It Usually Looks Like |
|---|---|---|
| 1 | Anchor | Strong portrait or full-body image that sets the tone |
| 2 | Detail | Flatlay, object, lifestyle texture, coffee, notebook, accessory |
| 3 | Movement | Full-body image, walking, outfit, active moment |
| 4 | Close-up | Face, hands, outfit detail, intimate crop |
| 5 | Statement | Bold brand statement or visual message |
| 6 | Texture | Fabric, object, close crop, material detail |
| 7 | Lifestyle | Walking, working, coffee, wellness, city, beach, or routine moment |
| 8 | Detail | Another flatlay or balancing non-face image |
| 9 | Closing | Mirror selfie or final strong identity shot |

This gives the feed rhythm.

Too many portraits feel repetitive.

Too many flatlays feel empty.

The Blueprint mixes people, objects, movement, and details.

## Style System

### Dark & Moody

Urban, dramatic, and editorial.

Uses blacks, charcoal, gray, concrete, evening light, bars, streets, coffee shops, modern architecture, wine glasses, espresso, iPhone, jewelry, and designer-coded accessories.

Feels confident, cinematic, modern, and city-based.

Current variations:

- Urban Night
- Industrial Edge
- Luxury Darkness
- Street Shadow
- Minimalist Noir

### Beige Aesthetic

Warm, cozy, coffee-centered, and soft.

Uses beige, cream, tan, caramel, soft knits, cafes, warm home interiors, books, candles, latte art, croissants, blankets, and wooden surfaces.

Feels calm, inviting, everyday, and comforting.

Current variations:

- Morning Ritual
- Cafe Culture
- Cozy Home
- Autumn Wandering
- Slow Morning

### Light & Minimalistic

Bright, airy, clean, and Scandinavian.

Uses white, off-white, cream, light gray, bright interiors, minimal spaces, clean architecture, white ceramics, simple flowers, light wood, clean surfaces, and soft daylight.

Feels fresh, peaceful, minimal, and clear.

Current variations:

- Morning Light
- Clean Living
- Airy Simplicity
- Fresh Mornings
- Serene Spaces

### Luxury Future Self

High-end, aspirational, and polished.

Uses silk, cashmere, leather, designer-coded outfits, luxury hotels, upscale restaurants, stores, car interiors, high-rise views, champagne, fine dining, handbags, and high-end technology.

Feels powerful, grown, expensive, and future-self coded.

Current variations:

- Executive Power
- Fine Living
- Jet Set
- Designer Wardrobe
- Penthouse Life

### Casual Bohemian

Relaxed, artsy, natural, and creative.

Uses linen, cotton, earth tones, layered jewelry, outdoor markets, art galleries, nature, vintage shops, artisan cafes, plants, woven bags, journals, and handmade details.

Feels authentic, creative, soft, and grounded.

Current variations:

- That Girl Era
- Aesthetic Living
- Coastal Granddaughter
- Sunday Reset
- Main Character Energy

### Athletic & Wellness

Active, clean, strong, and wellness-focused.

Uses premium athletic wear, yoga sets, leggings, athletic jackets, gyms, yoga studios, running paths, juice bars, wellness spaces, AirPods, gym bags, water bottles, yoga mats, smoothies, green juice, and fitness trackers.

Feels healthy, capable, fresh, and energetic.

Current variations:

- Morning Sweat
- Yoga Flow
- Hot Girl Walk
- Pilates Princess
- Wellness Reset

### Coastal Aesthetics

Breezy, soft, travel-based, and coastal.

Uses linen dresses, white cotton, blush pink, powder blue, sage green, beaches, coastal resorts, oceanfront cafes, beach clubs, pools, villas, sun hats, sunglasses, beach bags, tropical drinks, shells, and golden hour.

Feels relaxed, pretty, vacation-ready, and soft-luxury.

Current variations:

- Sunset Resort
- Beach Club Elegance
- Island Villa
- Morning Beach Walk
- Mediterranean Escape

## Prompt Structure

Blueprint prompts are structured, even when they read like natural language.

They are not just:

"Make a pretty Instagram photo."

They usually include:

1. identity lock
2. realism instruction
3. scene
4. outfit or object details
5. pose or composition
6. lighting
7. color grade
8. quality notes
9. avoid list

The image prompt should keep the woman recognizable.

The image should look like brand imagery around her real identity, not a fake new person.

## Prompt Template: Single Image

Use this shape when generating one feed slot.

```text
Professional iPhone photo maintaining exactly the same physical characteristics of the woman in the attached image: face, body, skin tone, hair, age, and visual identity. Preserve natural skin texture and real human detail.

Scene: [specific location from the selected style and variation].

Outfit: [specific outfit direction that matches the style].

Pose: [specific pose or action for this grid position].

Composition: [close-up / mid-shot / full-body / flatlay / mirror selfie / environmental frame]. This is position [number] in a 3x3 Instagram feed, so it should work as [position role].

Details: [objects, accessories, phone, coffee, book, bag, texture, sign, or other relevant details].

Lighting: [style-specific lighting].

Color grade: [style palette, contrast, shadows, warmth/coolness, skin tone preservation].

Mood: [simple emotional mood].

Quality: realistic editorial phone photography, sharp details, natural proportions, subtle grain, no fake skin, no CGI, no distorted hands, no warped objects.
```

## Prompt Template: 3x3 Grid Preview

Use this shape when generating a whole feed preview in one image.

```text
3x3 photo grid featuring the same woman from the reference images in nine distinct photographic compositions, maintaining consistent face, body, hair, skin tone, age, and visual identity.

Visuals: clean 3x3 Instagram-style grid. Photorealistic editorial phone photography. No app UI, no device frame, no collage border unless requested.

Vibe: [selected feed style] with [selected variation].

Setting: [2-3 location types that fit the style].

Style: cohesive outfits, props, textures, lighting, and color palette across all nine frames.

Frames:
1. [anchor portrait]
2. [flatlay detail]
3. [full-body or movement portrait]
4. [close-up detail]
5. [brand statement or sign]
6. [texture detail]
7. [lifestyle or walking moment]
8. [flatlay detail]
9. [mirror selfie or closing identity shot]

Color grade: [style-specific color grade].

Keep the same visual identity across every frame. Make each frame distinct but part of the same brand world.
```

## Prompt Template: Flatlay / Detail Slot

Some grid slots should not show the full face.

This makes the feed breathe.

```text
Professional iPhone-style detail photo for a cohesive Instagram feed.

Scene: [surface or setting].

Objects: [3-5 objects that fit the selected style].

Composition: overhead flatlay or close crop. Clean spacing. Strong texture. No person needed unless hands naturally fit.

Lighting: [style-specific lighting].

Color grade: [style palette].

Mood: [quiet / cozy / clean / dramatic / wellness / coastal].

Quality: realistic object detail, natural shadows, sharp texture, no fake logos, no warped objects, no clutter.
```

## Prompt Template: Brand Statement Slot

Position 5 can act like a visual message.

```text
Professional editorial photo for the center of a 3x3 Instagram feed.

Create a clean visual statement image with the words: "[short brand statement]".

Scene: [location that matches the selected style].

Composition: bold readable typography integrated into the image naturally, not pasted like a sticker. Keep room around the text. The image should still feel like part of the same photoshoot world.

Style: [selected feed style], [selected variation], matching colors, textures, lighting, and mood.

Quality: readable text, clean composition, realistic lighting, no misspelled words, no extra text, no app UI.
```

## How To Think About Prompting

Use a layered prompt.

Layer 1: protect identity.

Layer 2: set the world.

Layer 3: define the slot role.

Layer 4: add style-specific details.

Layer 5: control realism.

Layer 6: say what to avoid.

The most important line is identity preservation.

The second most important line is the grid role.

Without the grid role, every image starts to become the same portrait.

## Simple Prompt Formula

```text
[Identity lock]
+ [Realism instruction]
+ [Selected style and variation]
+ [Grid position role]
+ [Scene]
+ [Outfit or object details]
+ [Pose/composition]
+ [Lighting]
+ [Color grade]
+ [Mood]
+ [Quality and avoid list]
```

## Example Skeleton: Dark & Moody Position 1

```text
Professional iPhone photo maintaining exactly the same physical characteristics of the woman in the attached image: face, body, skin tone, hair, age, and visual identity. Preserve natural skin texture and real human detail.

Scene: modern city street at dusk with charcoal buildings, glass reflections, and clean urban architecture.

Outfit: all-black or charcoal outfit with structured shape, minimal jewelry, and polished styling.

Pose: confident anchor portrait, standing naturally with strong posture, looking calm and self-assured.

Composition: full-body or mid-shot for position 1 of a 3x3 grid. This image should set the tone for the full feed.

Lighting: moody directional city light with soft highlights and realistic shadows.

Color grade: deep blacks, charcoal gray, cool neutrals, preserved warm skin tones, subtle film grain.

Quality: realistic editorial phone photography, sharp face, natural body proportions, no plastic skin, no distorted hands, no fake-looking fashion details.
```

## Example Skeleton: Beige Aesthetic Position 2

```text
Professional iPhone-style flatlay detail for a cohesive Instagram feed.

Scene: warm wooden cafe table beside soft window light.

Objects: latte with soft foam, cream notebook, simple pen, folded beige knit, small neutral accessory.

Composition: overhead flatlay for position 2 of a 3x3 grid. This image should give the feed a calm detail break between portraits.

Lighting: warm natural morning light with gentle shadows.

Color grade: soft beige, cream, caramel, warm highlights, natural texture.

Mood: cozy, simple, inviting, everyday brand moment.

Quality: realistic object detail, no warped cup, no fake text, no clutter, no app UI.
```

## Recreation Notes For Future Agents

If recreating this workflow later, preserve the product shape before choosing tools.

The shape is:

1. user gives selfies and simple brand/aesthetic inputs
2. user chooses one style world
3. system creates a 3x3 content plan
4. each grid slot has a different role
5. the user generates one image at a time
6. the final result is a usable feed direction, not just image outputs

Avoid these mistakes:

- do not make every slot a face portrait
- do not make the style only a color palette
- do not ignore the user's real identity
- do not generate random unrelated images
- do not make the workflow feel like prompt engineering homework
- do not make the user choose from too many technical settings

The best version feels like:

"Here is your visual direction. Here are the nine posts. Click one slot and we will make that image."

