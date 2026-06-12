---
name: vault-prompt-writer
description: Write SSELFIE Prompt Vault photoshoot prompts in the exact shipped anatomy — identity lock, labeled style sections, body proportion lock, avoid list — plus the PromptCard fields (title, whenToUse, mood). Use when creating or editing vault collections, or any ChatGPT-paste photoshoot prompt for Sandra's audience.
---

# Vault Prompt Writer

*Recreated 2026-06-12 from the 10 shipped collections in `lib/ai-prompts/prompt-data.ts`
(the previous copy of this skill was lost to a broken symlink — this one is committed).
The shipped prompts ARE the spec. When in doubt, read a recent collection and match it.*

## What a vault prompt is

A copy-paste prompt a woman drops into ChatGPT (or Gemini) **with her own selfie uploaded**,
that returns an editorial photo of HER in a specific styled world. Every prompt must work
standalone for a stranger's selfie — never reference Sandra specifically.

Positioning (locked): "turn one selfie into unlimited photoshoots", never "learn prompts".
No-fake doctrine governs every word: AI-assisted, realistic, recognizable, true-to-you.
Never "no one will know", "look rich", "perfect face", "flawless skin". No em-dashes anywhere.

## Prompt anatomy (full-body / scene shots — the standard form)

Sections in this exact order, each on its own labeled paragraph:

1. **Series header** — `Create image N of a [K]-part [collection name] editorial photoshoot.`
   (Shot 2+ says `Create image N of the same [collection name] editorial photoshoot.`)
2. **Identity lock** (verbatim, never reworded):
   > Use the uploaded reference photos as the only source for the person's face and identity.
   > Preserve the person's facial structure, face shape, skin tone, natural skin texture,
   > body proportions, age, hair color, and overall look from the reference photos.
3. **Scene:** location, architecture, materials, props in the environment, light quality.
4. **Outfit:** every garment with fabric, fit, color, finish. Shoes. Bag. Specific, not vague.
5. **Hair:** style + movement. Always end with `Keep the person's natural hair color from the
   uploaded reference photos.`
6. **Makeup:** finish-first ("blurred natural skin"), named tones, always "polished, not heavy glam".
7. **Accessories/props:** what is in hand or worn. Explicitly exclude what must NOT appear
   ("No phone, no coffee yet").
8. **Pose:** body position, what each hand does, head angle, expression. Mid-motion beats static.
9. **Camera + lens:** `shot on Canon EOS R5 with a [35mm/50mm/85mm] lens`, framing
   (full-body / three-quarter / close-up), `no wide-angle distortion`.
10. **Camera angle:** height + distance ("waist-height street-style angle, pulled back enough...").
11. **Composition:** `vertical 9:16`, subject placement, background elements, leading lines.
12. **Body proportion lock** (full/three-quarter shots only): natural head size, leg length,
    torso, hips, shoulders; avoid stretched legs, tiny head, warped feet, runway exaggeration.
13. **Mood:** 3-5 short phrases naming the feeling.
14. **Color grading:** named palette per surface, saturation level, `subtle film grain`,
    editorial contrast.
15. **Image quality:** `vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available,
    crisp editorial sharpness, no blur, no low-resolution softness, no compression haze.`
16. **Avoid:** comma list. Always include: distorted hands, extra fingers, plastic skin,
    heavy glam makeup, cartoonish AI style, CGI, blur, random logos. Add shot-specific
    failure modes (warped coffee cups, fake lids, warped heels...).

**Beauty close-up variant** (e.g. Mysterious Vogue): shorter, flowing paragraphs instead of
labels, no body proportion lock, lens is 85mm f/1.4, ends with a one-line avoid. Use only
for face-first collections.

## Consistency across a series

A collection is ONE shoot: same outfit, same hair, same makeup, same location, same grade
in every shot. Only Scene details, Accessories/props, Pose, Camera, and Composition change
per shot. Copy the Outfit/Hair/Makeup/Grading blocks forward and vary the rest. 4-6 shots:
arrival/establishing → lifestyle action → seated hero → detail or close-up → closer.

## PromptCard fields (lib/ai-prompts/prompt-data.ts)

```ts
{
  number: "104",            // continuous across ALL collections — check current max
  id: "collection-slug-shot-1",
  title: "Collection Name · Shot Name",      // middle dot, never a dash
  whenToUse: "...",         // Sandra's voice: where to post it, what caption energy. 1-2 sentences, contractions, zero jargon.
  mood: "tag · tag · tag · tag · tag",       // 5 dot-separated lowercase tags
  prompt: `...`,            // the full anatomy above
  exampleImage: "/images/ai-prompts/collection-slug-shot-1.jpg",
}
```

## Where prompts go after writing

Follow `docs/PROMPT_VAULT_ADD_COLLECTION_SOP.md` for shipping a collection (freebie gets
shot 1 only, vault gets everything, landing page + delivery email + drop log + Library sync).
The Maya bridge (`lib/app-v3/maya/vault-styles.ts`) strips the identity-lock paragraph and
reuses the styling DNA, so never bury identity language inside the style sections — keep it
only in section 2, or Maya inherits broken instructions.
