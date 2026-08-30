# Email Visual Assets

Last updated: 2026-08-30

SSELFIE emails can now use a small curated set of production-safe visual assets through `lib/email/email-image-assets.ts`.

These assets support the current email shells. New or redesigned email work must follow SSELFIE
Noir Glass in `docs/SSELFIE_DESIGN_SYSTEM.md`: a Paper or Pearl readable body, an Obsidian CTA,
cool Silver rules, and photography only when it adds proof. Pearl Neon is not an email button or
body-copy color. Bold Editorial, warm champagne, espresso, ivory, parchment, and oxblood guidance
is superseded.

## Where Images Live

Email-ready images live in:

`public/images/email/`

The current manifest lives in:

`lib/email/email-image-assets.ts`

Email templates should use the manifest helpers instead of hardcoding image paths.

## How To Use In An Email

Use `getEmailHeroImage` and pass the result into `renderStoneShell`.

```ts
import { getEmailHeroImage } from "@/lib/email/email-image-assets"

const hero = getEmailHeroImage("starter_kit_ai_ready_selfie")

const html = renderStoneShell({
  eyebrow: "Starter Kit",
  headline: "Your selfie is the starting point.",
  bodyHtml,
  heroImageUrl: hero.heroImageUrl,
  heroImageAlt: hero.heroImageAlt,
})
```

The helper returns canonical absolute URLs such as:

`https://www.sselfie.ai/images/email/starter-kit-ai-ready-selfie.jpg`

## Available Images

| Key                           | File                              | Intended use                                                                        |
| ----------------------------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| `prompt_pack_hero`            | `prompt-pack-hero.jpg`            | PROMPT pack delivery/nurture and prompt-to-Starter Kit bridge emails.               |
| `starter_kit_ai_ready_selfie` | `starter-kit-ai-ready-selfie.jpg` | Starter Kit emails that explain AI-ready selfies and better input photos.           |
| `selfie_guide_foundation`     | `selfie-guide-foundation.jpg`     | Free Selfie Guide emails about light, posing, and one strong phone photo.           |
| `studio_visual_workspace`     | `studio-visual-workspace.jpg`     | Studio/Maya emails where the app is positioned as the calm ongoing execution layer. |

## File Size Guidance

Keep email hero images lightweight.

Target:

1. 60-180 KB per image when possible.
2. 960-1200 px wide for hero images.
3. JPG for photo-heavy images.
4. WebP only if the target email clients are verified.
5. No giant originals in email templates.

Current starter set:

1. `selfie-guide-foundation.jpg` - 67 KB
2. `starter-kit-ai-ready-selfie.jpg` - 109 KB
3. `prompt-pack-hero.jpg` - 99 KB
4. `studio-visual-workspace.jpg` - 97 KB

## Alt Text Guidance

Alt text should be:

1. Descriptive.
2. Specific to the visual.
3. Aligned with the email promise.
4. Plain enough to make sense when images are blocked.

Do not write alt text as sales hype.

Good:

`Sandra standing by a window in a clean editorial phone photo with natural light.`

Not good:

`Amazing transformational SSELFIE result you need to see.`

## Adding A New Email Image

1. Pick only one image for a clear email purpose.
2. Confirm it matches `docs/SSELFIE_DESIGN_SYSTEM.md` and does not reintroduce soft, beige, pastel,
   floral, generic SaaS, or purple-AI styling.
3. Resize/compress it before committing.
4. Save it under `public/images/email/` with a descriptive lowercase filename.
5. Add a manifest entry in `lib/email/email-image-assets.ts`.
6. Include alt text, intended use, recommended emails, and notes.
7. Run checks before committing.

## Safety Rules

Never use:

1. Local desktop paths.
2. `file://` URLs.
3. `localhost` URLs.
4. Unhosted images.
5. Image-only emails.
6. Private customer images without explicit permission.

Body text must still carry the message if the image does not load.

## Current Implementation Note

No live email templates use these images yet.

The next safe step is a targeted email visual test for one revenue-critical flow, likely the PROMPT pack nurture or Starter Kit bridge, using `heroImageUrl` and `heroImageAlt` from the manifest.
