## Overview

The high-end brand prompt system gives Maya Pro a structured way to generate **on-brand, studio-grade image prompts** for specific aesthetics (Alo Yoga, Chanel, Glossier, etc.).

Instead of writing long prompt strings by hand, we:
- **Detect brand + category intent** from what the user types.
- **Select a brand template** that knows the right outfit, lighting, environment, and camera language.
- **Build a Nano Banana–ready prompt** that feels like real campaign content for that brand or style.

This keeps prompts:
- Consistent with real-world brand visuals.
- Easier to extend (add a brand once, reuse everywhere).
- Safer (we avoid old FLUX trigger words and legacy camera boilerplate).

---

## Available Brands

These are the high-end brands and styles currently modeled in the system. Categories come from `BrandCategoryKey` in `brand-registry.ts`.

### Wellness
- **Alo Yoga** (`ALO`, categories: `wellness`, `fitness`, `lifestyle`)
  - Premium athletic wear, neutral palettes, aspirational wellness, natural movement.
- **Lululemon** (`LULULEMON`, categories: `wellness`, `fitness`, `lifestyle`)
  - Empowered active lifestyle, performance-forward looks, urban + studio fitness.

### Luxury
- **Chanel** (`CHANEL`, categories: `luxury`, `fashion`)
  - Timeless French elegance, tweed, pearls, quilted bags, editorial lighting.
- **Dior** (`DIOR`, categories: `luxury`, `fashion`)
  - Romantic femininity, soft pastels, haute couture silhouettes, dreamy light.

### Lifestyle
- **Glossier** (`GLOSSIER`, categories: `beauty`, `lifestyle`)
  - Clean girl aesthetic, dewy skin, minimal set design, "skin first" philosophy.
- **Free People** (`FREE_PEOPLE`, categories: `lifestyle`, `fashion`)
  - Bohemian romantic, vintage-inspired, free-spirited travel and interiors.

### Fashion (contemporary)
- **Reformation** (fashion templates in `fashion-brands.ts`)
  - Sustainable feminine dresses, vintage-inspired, sunlit city or vacation scenes.
- **Everlane** (fashion templates in `fashion-brands.ts`)
  - Radical transparency, quality basics, neutral palettes, minimal styling.
- **Aritzia** (fashion templates in `fashion-brands.ts`)
  - Elevated everyday looks, sophisticated casual, modern city interiors.

### Non-brand categories built on top
- **Travel & Airport Lifestyle** (`TRAVEL_LIFESTYLE_CATEGORY` in `travel-lifestyle.ts`)
  - It-girl airport content, designer luggage, headphones, coffee props.
- **Seasonal Christmas / Holiday** (`SEASONAL_CHRISTMAS_CATEGORY` in `seasonal-christmas.ts`)
  - Cozy luxury Christmas, candy cane PJs, red bows, tree-light bokeh.

---

## User Experience

From the user’s perspective, the system should feel **effortless**:

- **Brand name in request**
  - "Create Alo yoga style content" → system detects **ALO** as wellness brand.
  - "I want Chanel editorial" → detects **Chanel** in `luxury/fashion`.
  - "Clean girl aesthetic like Glossier" → detects **Glossier**.

- **Category-only intent**
  - "Luxury fashion editorial" → maps to `luxury` category, and may bias toward Chanel/Dior templates.
  - "Wellness lifestyle content" → maps to `wellness` and `lifestyle`, surfacing Alo/Lululemon.

- **Studio Pro flow**
  - User chats with Maya in Studio Pro, mentions a brand or aesthetic.
  - Maya responds with short text + `[GENERATE_CONCEPTS]` trigger.
  - On the backend, `/api/maya/generate-concepts` and `buildNanoBananaPrompt` use brand detection + templates to:
    - Build **concept cards** that already reflect that brand look.
    - Generate **Nano Banana prompts** that match the chosen brand scene template.

The user never has to choose a template file; they just say “Alo Yoga” or “Chanel” and the system routes to the right style.

---

## Adding New Brands

The high-end brand system is intentionally modular. To add a new brand (for example, **Hermès**):

### 1. Add to `brand-registry.ts`

1. **Extend** the `BrandKey` union:
   ```ts
   export type BrandKey = "ALO" | "LULULEMON" | "GLOSSIER" | "CHANEL" | "DIOR" | "FREE_PEOPLE" | "HERMES"
   ```
2. **Add a `BrandProfile` entry** in `BRAND_PROFILES`:
   - Include:
     - **`categories`** (e.g. `['luxury', 'fashion']`).
     - **`aesthetic`**: color palette, typography, mood, composition, lighting.
     - **`visuals`**: photo style, settings, cameraType, postProcessing, commonElements, avoid.

### 2. Create a prompt template in the right file

Depending on the brand type, add a `PromptTemplate` in:
- `wellness-brands.ts`
- `luxury-brands.ts`
- `lifestyle-brands.ts`
- `fashion-brands.ts`

Each template should:
- Include **`brandProfile: BRAND_PROFILES.[BRAND_ID]`**.
- Implement **`promptStructure(context: PromptContext): string`** with:
  - Outfit & styling details.
  - Setting, lighting, composition.
  - Aesthetic + technical camera notes.
- Optionally define **`variations: PromptVariation[]`** for different moods or use cases.

### 3. Wire it into the template index

- Ensure it’s exported from `high-end-brands/index.ts` via its category file.
- Add it to the **`ALL_BRAND_TEMPLATES`** map automatically by being part of `WELLNESS_BRANDS`, `LUXURY_BRANDS`, etc.

### 4. Map a default template ID for Studio Pro (optional, but recommended)

In `nano-banana-prompt-builder.ts`, `BRAND_DEFAULT_TEMPLATE_IDS` chooses a default brand template for `brand-scene` mode:

```ts
const BRAND_DEFAULT_TEMPLATE_IDS: Record<string, string> = {
  ALO: 'alo_yoga_lifestyle',
  LULULEMON: 'lululemon_lifestyle',
  // Add new brand mapping
  HERMES: 'hermes_editorial',
}
```

This lets `buildNanoBananaPrompt` auto-select a brand template when `detectCategoryAndBrand` finds a high-confidence match.

### 5. Extend detection

In `category-mapper.ts`:
- Add **brand-name keywords** to `BRAND_KEYWORDS` map (via `BRAND_PROFILES` loop or explicit aliases).
- Optionally add **aesthetic phrases** under `BRAND_AESTHETIC_KEYWORDS` to bias detection.

### 6. Add tests

Create/update tests under:
- `lib/maya/prompt-templates/high-end-brands/__tests__/`

Tests should cover:
- Brand detection for new brand
- `getBrandTemplate` returns the template
- `getAllTemplatesForCategory` includes the new brand.

### 7. Update documentation

Finally, update:
- `docs/HIGH-END-BRAND-PROMPTS.md` – add new brand to **Available Brands** and **Examples**.
- Any UX copy that refers to available brand styles.

---

## Technical Architecture

### Core pieces

- **Brand registry** – `lib/maya/prompt-templates/high-end-brands/brand-registry.ts`
  - Defines `BrandProfile`, `BrandCategory`, `BrandAesthetic`, `VisualStyleGuide` and `BRAND_PROFILES`.

- **Templates** – one file per cluster:
  - `wellness-brands.ts` – Alo, Lululemon.
  - `luxury-brands.ts` – Chanel, Dior.
  - `lifestyle-brands.ts` – Glossier, Free People.
  - `fashion-brands.ts` – Reformation, Everlane, Aritzia.
  - `travel-lifestyle.ts` – Travel/airport templates (not tied to a specific brand ID).
  - `seasonal-christmas.ts` – Christmas/holiday templates and category.

- **Index & helpers** – `high-end-brands/index.ts`
  - Re-exports all templates and utilities.
  - `ALL_BRAND_TEMPLATES: Record<string, PromptTemplate>` merges all brand template objects.
  - `getBrandTemplate(id: string): PromptTemplate | null` – ID lookup.
  - `getAllTemplatesForCategory(category: BrandCategory): PromptTemplate[]` – filter by brand categories.

- **Detection** – `category-mapper.ts`
  - `detectCategoryAndBrand(userIntent: string, userImages?: any[]): CategoryDetectionResult`:
    - Parses free text.
    - Scores category keywords (`wellness`, `luxury`, `lifestyle`, `fashion`, `travel_lifestyle`, etc.).
    - Scores brand keywords (e.g. "alo", "glossier").
    - Returns:
      - `category: BrandCategory`
      - `suggestedBrands: BrandProfile[]`
      - `confidence: number`
      - `keywords: string[]` (what matched).

### Integration points

- **Studio Pro concept generation** – `app/api/maya/generate-concepts/route.ts`
  - Imports `detectCategoryAndBrand`.
  - Detects brand intent from combined `userRequest + aesthetic + context + conversationContext`.
  - If `confidence >= 0.7` and a brand is found, it appends **brandGuidance** to the system prompt sent to the AI:
    - Includes `brand.aesthetic`, `brand.visuals`, common elements and avoid list.
    - Instructs Maya to "match this brand’s photography style, composition, and mood exactly".

- **Nano Banana Pro prompt builder** – `lib/maya/nano-banana-prompt-builder.ts`
  - In `buildNanoBananaPrompt`:
    - In `brand-scene` mode, calls `detectCategoryAndBrand(userRequest)`.
    - For high-confidence matches, uses `BRAND_DEFAULT_TEMPLATE_IDS` + `getBrandTemplate` to:
      - Build a `PromptContext` from user request + base images.
      - Call `template.promptStructure(context)` to get the final prompt.
      - Label `sceneDescription` as `"${brand.name} brand scene"`.
    - Falls back to `buildBrandScenePrompt` when no brand is detected or no template exists.

- **Maya Pro personality** – `lib/maya/pro-personality.ts`
  - Contains **BRAND AESTHETIC EXPERTISE** section:
    - Teaches Maya how to talk about Alo, Lululemon, Chanel, Dior, Glossier, Free People, Reformation, Everlane, Aritzia.
    - Provides example `[GENERATE_CONCEPTS]` triggers that embed brand + category + mood words.

---

## Examples

### Example 1 – Alo Yoga wellness content

**User:**
> "Create Alo yoga style content"

**Pipeline:**
- `detectCategoryAndBrand` → `category: wellness`, `brand: Alo Yoga`, `confidence ~0.95`.
- `generate-concepts` adds brandGuidance for Alo (aesthetic + visuals).
- `buildNanoBananaPrompt` (brand-scene mode) picks `alo_yoga_lifestyle` template.
- Prompt mentions:
  - Neutral athletic set, yoga studio or outdoor deck.
  - Natural movement, aspirational wellness energy.
  - Soft golden/morning light.

### Example 2 – Chanel editorial

**User:**
> "I want high-fashion Chanel editorial content"

**Behavior:**
- Detection: `luxury` category, brand `Chanel`.
- System prompt receives Chanel aesthetic + visuals (tweed, pearls, boutique settings, controlled light).
- `buildNanoBananaPrompt` uses `chanel_editorial` template to generate:
  - Structured tweed blazer, quilted bag, pearl jewelry.
  - Boutique or Parisian street setting.
  - 50mm lens feel, editorial lighting, confident pose.

### Example 3 – Clean girl Glossier selfie

**User:**
> "I want clean girl aesthetic like Glossier"

**Behavior:**
- Detection: `lifestyle/beauty` category, brand `Glossier`.
- Template: `glossier_clean_girl` yields:
  - Close-up 4:5 portrait, dewy skin, soft window light.
  - Minimal outfit (white tee / oversized knit), neutral background.
  - Natural smartphone feel, real skin texture.

### Example 4 – Airport it girl travel

**User:**
> "I want airport it girl travel photo"

**Behavior:**
- Detection leans into `travel_lifestyle` category.
- `travel-lifestyle` templates (e.g. `AIRPORT_IT_GIRL`) can be used by flows that call them directly.
- Prompt includes:
  - Lounge/waiting area, iced latte, headphones, designer suitcase.
  - Quiet luxury mood, golden or soft terminal light.

---

## Troubleshooting

### Brand not detected even when user types the name

- **Check `category-mapper.ts`:**
  - Ensure the brand name (and common misspellings) are in `BRAND_KEYWORDS` / alias logic.
- **Check `brand-registry.ts`:**
  - Confirm the brand exists in `BRAND_PROFILES` with correct `id`.

### Template not used even though brand is detected

- **Check `BRAND_DEFAULT_TEMPLATE_IDS` in `nano-banana-prompt-builder.ts`:**
  - Make sure there is an entry mapping `BRAND_ID` → template ID (e.g. `CHANEL: 'chanel_editorial'`).
- **Check `getBrandTemplate` call:**
  - Verify the template ID matches the `PromptTemplate.id` in its file.

### `getAllTemplatesForCategory` returns empty for a category

- Ensure the brand’s `BrandProfile` lists the category key (e.g. `['luxury', 'fashion']`).
- Ensure the template includes a `brandProfile` referencing that `BrandProfile`.

### Prompts still look like old Flux-style outputs

- Confirm that **Studio Pro** is using:
  - `generate-studio-pro` (Nano Banana) and **not** Flux routes.
  - `buildNanoBananaPrompt` is being called for Studio Pro generations.
- Make sure templates do **not** include:
  - Legacy trigger words (e.g. `user_trigger`).
  - Hard-coded `shot on iPhone 15 Pro` boilerplate unless explicitly intended.

### Maya talks about a brand but outputs generic concepts

- Check `pro-personality.ts`:
  - BRAND AESTHETIC section is descriptive only; it doesn’t control concept generation by itself.
- Verify that **`/api/maya/generate-concepts`** is running brand detection and appending `brandGuidance`.
- If needed, strengthen the wording in `brandGuidance` for the specific brand.

---

This document is meant as a **living guide**. Whenever you add a new brand, category, or template set, update this file so future developers (or AI assistants) can quickly understand how to extend the system safely and consistently.