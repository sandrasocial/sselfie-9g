// MAYA-GUIDED-TEXT-01: generate the six pre-rendered example covers for the inline style
// template picker (lib/app-v3/text-style-examples.ts). Run once (and re-run only when a style's
// design changes):
//
//   npx tsx scripts/generate-text-style-examples.ts
//
// For each of the six overlay styles this generates ONE finished-looking cover with gpt-image-2:
// an editorial detail background (no person, Scandinavian cool monochrome) with that style's
// text treatment BAKED in, using the sample copy shared with the CSS fallback preview. Each
// image is uploaded to Vercel Blob and the URL printed; paste the URLs into
// TEXT_STYLE_EXAMPLE_IMAGES in lib/app-v3/text-style-examples.ts.

import { config } from "dotenv"
import OpenAI from "openai"
import { put } from "@vercel/blob"

import { buildBakePrompt } from "../lib/app-v3/text-bake"
import { TEXT_STYLE_SAMPLE_COPY, textStyleSampleSpec } from "../lib/app-v3/text-style-examples"
import { OVERLAY_STYLE_PRESETS } from "../lib/app-v3/text-overlay"

config({ path: ".env.local" })

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"

// Editorial detail backgrounds, no person: every member sees the DESIGN, not someone else's
// face, on her template picker. Cool monochrome per docs/SSELFIE_DESIGN_SYSTEM.md.
const BACKGROUNDS: Record<string, string> = {
  "editorial-serif-center":
    "a moody editorial photograph of rumpled ivory linen bedding in soft cool morning window light, deep soft shadows, calm negative space in the lower half, muted cool gray tones, subtle film grain",
  "lower-third-accent":
    "a quiet editorial photograph of a charcoal wool coat draped over a pale birch chair against a soft gray plaster wall, cool diffused light, generous negative space low in the frame, subtle film grain",
  "top-band-minimal":
    "a minimal editorial photograph of pale morning light falling across a white plaster wall above a stone ledge with a single ceramic cup, vast calm negative space in the upper half, cool monochrome, subtle film grain",
  "quote-statement":
    "a dark cinematic editorial photograph of a marble cafe table with a black espresso cup and an open notebook, deep charcoal shadows, moody cool grade, calm center, subtle film grain",
  "series-cover":
    "an editorial photograph of a stack of matte magazines and a silver pen on a pale stone surface, cool gray tones, softly blurred background, calm centered negative space, subtle film grain",
  "cutout-editorial":
    "an editorial collage-style photograph of a softly blurred cafe interior in deep charcoal and warm gray tones, moodboard energy, generous calm space in the upper half, subtle film grain",
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!apiKey) throw new Error("OPENAI_API_KEY missing in .env.local")
  if (!blobToken) throw new Error("BLOB_READ_WRITE_TOKEN missing in .env.local")

  // Optional filter: `npx tsx scripts/generate-text-style-examples.ts cutout-editorial` re-runs
  // one style; the blob path is stable (allowOverwrite), so the pinned URL keeps working.
  const only = process.argv[2]?.trim()

  const openai = new OpenAI({ apiKey })
  const results: Record<string, string> = {}

  for (const preset of OVERLAY_STYLE_PRESETS) {
    if (only && preset.id !== only) continue
    const spec = textStyleSampleSpec(preset.id, "reel-cover")
    const copy = TEXT_STYLE_SAMPLE_COPY[preset.id]
    const textPrompt = buildBakePrompt(spec)
    // cutout-editorial keeps a person: that style composes the member as a cutout sticker, so
    // the example should show it. Every other style is a still life.
    const allowPerson = preset.id === "cutout-editorial"
    const prompt = [
      `Create a 9:16 Instagram reel cover. Background: ${BACKGROUNDS[preset.id]}.`,
      textPrompt,
      `The headline reads "${copy.headline.replace(/\*/g, "")}"${copy.subline ? ` and the supporting line reads "${copy.subline.replace(/\*/g, "")}"` : ""}.`,
      "The result should look like a finished, published cover from a premium editorial brand.",
      allowPerson
        ? ""
        : "Important override: this image is a STILL LIFE. There is no person anywhere in the frame. No face, no body, no skin, no one sleeping, sitting, or standing. Ignore any instruction above that refers to a woman's face or body; only the scene and the rendered text exist.",
    ]
      .filter(Boolean)
      .join("\n")

    console.log(`\n→ ${preset.id} ...`)
    const response = (await openai.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      n: 1,
      size: "1024x1536",
      quality: "high",
    } as Parameters<typeof openai.images.generate>[0])) as unknown as {
      data?: Array<{ b64_json?: string; url?: string }>
    }

    const first = response.data?.[0]
    let buffer: Buffer
    if (first?.b64_json) {
      buffer = Buffer.from(first.b64_json, "base64")
    } else if (first?.url) {
      const res = await fetch(first.url)
      buffer = Buffer.from(await res.arrayBuffer())
    } else {
      throw new Error(`No image returned for ${preset.id}`)
    }

    const blob = await put(`app-v3/text-style-examples/${preset.id}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: blobToken,
    })
    results[preset.id] = blob.url
    console.log(`  ${blob.url}`)
  }

  console.log("\nPaste into TEXT_STYLE_EXAMPLE_IMAGES:\n")
  console.log(JSON.stringify(results, null, 2))
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
