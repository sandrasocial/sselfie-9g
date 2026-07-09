# Maya × Vault Style Bridge — Engineering Brief

*Author: Claude (Cowork) · For: the agent working on the membership app · Last updated: 2026-06-09*

---

## TL;DR diagnosis

Maya generates **generic** images because Maya's image generation and the **Prompt Vault**
are two completely separate systems that share nothing.

- The Vault holds our **rich, specific editorial prompts** (the look we actually want).
- Maya's "styles" are **thin one-line presets**.
- **Maya never reads the Vault.** Confirmed: nothing under `lib/maya/`, `app/api/maya/`,
  or `components/sselfie/maya/` imports `lib/ai-prompts/prompt-data.ts`.

The fix is to bridge the Vault's style DNA into Maya's prompt builder — **adapted** for
Maya's identity mechanism, not copied verbatim.

---

## The two systems

### 1. The Vault — the styles we want (source of truth)

- **File:** `lib/ai-prompts/prompt-data.ts` — the single source of truth. **No database table**
  holds prompt content. New collections are added here per our Add-Collection SOP and flow live
  on each deploy.
- **Shape:** 11+ collections, each an exported `*_SERIES` array (e.g. `QUIET_LUXURY_LONDON_SERIES`,
  `MYSTERIOUS_VOGUE_SERIES`, `DARK_FEMININE_CAFE_SERIES`) of `PromptCard`:

  ```ts
  type PromptCard = {
    number: string        // sequential across ALL collections
    id: string            // e.g. "quiet-luxury-london-shot-1"
    title: string         // "Quiet Luxury London · Seated Marble Hero"
    whenToUse: string     // posting guidance (Sandra's voice)
    mood: string          // " · "-separated tags
    prompt: string        // the full editorial brief (the gold)
    exampleImage?: string // /images/ai-prompts/...
  }
  ```

- **Also exported:** `VAULT_COLLECTION_META` (per-collection `{ previewCardId, name, shotCount,
  thumbnails[] }`) and `FREEBIE_COLLECTION_PREVIEWS`.
- **Why the prompts look like real photoshoots:** every prompt is deeply specific —
  **scene, outfit, hair, makeup, camera + lens, composition, body-proportion lock, color grading,
  and an avoid-list.** That specificity is the whole point.
- **Format reference:** `.agents/skills/vault-prompt-writer/SKILL.md` documents the exact anatomy.
  Collection source briefs are the per-shoot `.md` files.
- **Important:** Vault prompts are written for a user to paste into **ChatGPT/Gemini with their own
  uploaded selfie**. They are NOT wired to Maya.

### 2. Maya — the membership-app generator

- **Entry:** `app/api/maya/generate-concepts/route.ts`
- **Canonical builder:** the **Prompt Authority Layer** — `lib/maya/prompt-authority.ts` /
  `lib/maya/prompt-constructor.ts` (`buildPrompt` / `buildPromptWithFeatures`). See
  `docs/_CANONICAL/PROMPT_AUTHORITY_POLICY.md`.
- **Knowledge libraries Maya already pulls:** `flux-prompting-principles.ts`,
  `fashion-knowledge-2025.ts`, `lifestyle-contexts.ts`, `instagram-location-intelligence.ts`,
  `nano-banana-*`, `flux-examples.ts`, system prompt via `mode-adapters.ts`.
- **The root cause:** the user-pickable **style presets** come from `lib/maya/concept-templates.ts`,
  and they are one-liners, e.g.:

  ```ts
  { value: "editorial-portrait", label: "Editorial Portrait",
    prompt: "Fashion editorial portrait — high-end, magazine-style" }
  ```

  A one-sentence prompt produces a generic image. This is the gap.

---

## The fix — bridge Vault DNA into Maya's builder

**Goal:** when a user picks a style, Maya's generated Flux/NanoBanana prompt carries a full
collection's editorial DNA (scene, outfit, lens, grading, avoid) — not a one-liner.

### Step 1 — Create a Vault style-preset module

`lib/maya/vault-style-presets.ts` — a curated layer that distills each Vault collection into
**Maya-ready** DNA. (Curated, not parsed: the freeform `prompt` strings use two different
layouts, so hand-distilling per collection is more reliable than string-parsing.)

```ts
import { VAULT_COLLECTION_META } from "@/lib/ai-prompts/prompt-data"

/**
 * Maya-ready distillation of a Vault collection's editorial DNA.
 * Mirrors the Vault look WITHOUT the "use uploaded reference photos" identity line
 * (Maya preserves identity via the trained Flux LoRA trigger word / model instead).
 */
export type VaultStylePreset = {
  /** Must match a collection id stem in prompt-data.ts, e.g. "quiet-luxury-london" */
  collectionId: string
  label: string                 // "Quiet Luxury London"
  /** Location + materials + light. */
  scene: string
  /** Every garment, fabric, fit, finish. */
  outfit: string
  /** Hair + makeup direction. */
  hairMakeup: string
  /** Camera body + lens + framing, e.g. "Canon EOS R5, 50mm, three-quarter seated". */
  cameraLens: string
  /** Named palette + film-grain/contrast notes. */
  colorGrading: string
  /** Shot-agnostic failure list to suppress. */
  avoid: string
}

export const VAULT_STYLE_PRESETS: VaultStylePreset[] = [
  {
    collectionId: "quiet-luxury-london",
    label: "Quiet Luxury London",
    scene:
      "quiet upscale London street outside a white-painted café, pale stone pavement, " +
      "black-and-white woven bistro chairs, marble bistro table, soft overcast morning light",
    outfit:
      "oversized camel-taupe tailored blazer over a fitted cream high-neck top, matching " +
      "wide-leg trousers, black pointed slingback heels, small black quilted chain bag, " +
      "black rectangular sunglasses, minimal gold jewelry",
    hairMakeup:
      "long soft waves, clean middle part; blurred natural skin, soft brown eye, warm nude satin lip",
    cameraLens: "Canon EOS R5, 35–50mm, full-body to three-quarter, no wide-angle distortion",
    colorGrading:
      "warm camel and cream tones, soft black accents, muted gray London light, gentle gold warmth, " +
      "low-saturation quiet-luxury edit, subtle film grain",
    avoid:
      "distorted hands, warped heels, plastic skin, heavy glam, stiff posed stance, CGI, " +
      "cluttered background, random logos",
  },
  // ...one preset per collection in VAULT_COLLECTION_META (newest first)
]

const PRESETS_BY_ID = new Map(VAULT_STYLE_PRESETS.map((p) => [p.collectionId, p]))

export function getVaultStylePreset(collectionId: string): VaultStylePreset | null {
  return PRESETS_BY_ID.get(collectionId) ?? null
}

/**
 * Build a Maya-ready style fragment to inject into the Prompt Authority builder.
 * NOTE: no identity line here — Maya's trigger word / trained model handles likeness.
 */
export function buildVaultStyleFragment(p: VaultStylePreset): string {
  return [
    `Scene: ${p.scene}.`,
    `Outfit: ${p.outfit}.`,
    `Hair & makeup: ${p.hairMakeup}.`,
    `Camera: ${p.cameraLens}.`,
    `Color grading: ${p.colorGrading}.`,
    `Avoid: ${p.avoid}.`,
  ].join(" ")
}
```

### Step 2 — Wire it into the Prompt Authority Layer

In `lib/maya/prompt-authority.ts` / `prompt-constructor.ts`, when the chosen style maps to a Vault
collection, inject `buildVaultStyleFragment(preset)` into the prompt assembly **alongside** Maya's
existing Flux/NanoBanana principles and identity mechanism. Replace or map the generic
`concept-templates.ts` entries to these presets.

### Step 3 — Keep it in sync (guard test)

Add a test so every shipped collection has a Maya preset (no silent gaps as we add collections):

```ts
// every VAULT_COLLECTION_META entry must have a matching VaultStylePreset
for (const meta of VAULT_COLLECTION_META) {
  const stem = meta.previewCardId.replace(/-shot-\d+$/, "")
  expect(getVaultStylePreset(stem)).not.toBeNull()
}
```

---

## Critical adaptation rule (read this twice)

**Do NOT copy Vault prompt text verbatim.** Vault prompts open with *"Use the uploaded reference
photos as the only source for the face."* That is for paste-your-selfie tools. Maya preserves
identity via the **trained Flux LoRA trigger word / model** (or NanoBanana / OpenAI). So:

- **Keep:** scene, outfit, styling, hair/makeup, camera+lens, composition, color grading, avoid.
- **Drop:** the "uploaded reference photos / do not change my face" identity lines.
- **Keep using:** Maya's existing identity mechanism + `flux-prompting-principles.ts`,
  `flux-examples.ts`, `nano-banana-*`.

---

## Guardrails

- **Do not touch the Feed Planner** — `app/feed-planner/`, `app/api/feed/*`,
  `lib/maya/feed-generation-handler.ts` are a live paid product.
- **Use the canonical Prompt Authority Layer.** Do not create new "direct" prompt builders;
  `direct-prompt-generation.ts` is validation-only and being deprecated.
- **Do not alter the Vault product.** You are *reading* style DNA derived from `prompt-data.ts`,
  not changing the Vault, its access page, or the freebie.
- **No new `chat_type` values** without a DB migration + load/save/new-chat/test coverage.

---

## Acceptance test

Pick a style mapped to (say) **Quiet Luxury London**. Maya's generated Flux/NanoBanana prompt must
contain that collection's specific scene, outfit, lens, and grading — and the resulting image should
read like that collection's shoot (camel tailoring, café, marble, that grade), **not** a generic
"woman in a city." Repeat for one dark collection (e.g. Mysterious Vogue) and one lifestyle
collection (e.g. Clean Girl Morning) to confirm the DNA carries across moods.
