export type SelfieToBrandShootVisualCode = {
  signatureVisualWorld: string
  mainColors: string
  lighting: string
  wardrobeDirection: string
  backgroundWorld: string
  emotionalSignal: string
  desiredFeeling?: string
  repeatRules?: string
  avoidRules?: string
  firstShootDirection?: string
}

export type SelfieToBrandShootPromptCard = {
  title: string
  purpose: string
  copy: string
  prompt: string
}

export type SelfieToBrandShootPromptPack = {
  starterShoot: SelfieToBrandShootPromptCard[]
  extraImages: SelfieToBrandShootPromptCard[]
  fixPrompts: SelfieToBrandShootPromptCard[]
  consistencyNotes: string[]
}

export const SELFIE_TO_BRAND_SHOOT_VISUAL_CODE_MEMORY_KEY = "selfie_to_brand_shoot_visual_code"

const FIELD_LIMIT = 700

function cleanText(value: unknown, limit = FIELD_LIMIT) {
  if (typeof value !== "string") return ""
  return value.replace(/\s+/g, " ").trim().slice(0, limit)
}

export function normalizeSelfieToBrandShootVisualCode(
  value: unknown
): SelfieToBrandShootVisualCode {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {}

  return {
    signatureVisualWorld: cleanText(record.signatureVisualWorld),
    mainColors: cleanText(record.mainColors),
    lighting: cleanText(record.lighting),
    wardrobeDirection: cleanText(record.wardrobeDirection),
    backgroundWorld: cleanText(record.backgroundWorld),
    emotionalSignal: cleanText(record.emotionalSignal),
    desiredFeeling: cleanText(record.desiredFeeling),
    repeatRules: cleanText(record.repeatRules),
    avoidRules: cleanText(record.avoidRules),
    firstShootDirection: cleanText(record.firstShootDirection),
  }
}

export function hasUsefulVisualCode(code: SelfieToBrandShootVisualCode) {
  return Boolean(
    code.signatureVisualWorld ||
    code.mainColors ||
    code.lighting ||
    code.wardrobeDirection ||
    code.backgroundWorld ||
    code.emotionalSignal
  )
}

function valueOrPlaceholder(value: string | undefined, placeholder: string) {
  return value?.trim() || placeholder
}

export function buildFallbackPromptPack(
  code: SelfieToBrandShootVisualCode,
  useCases: string[] = []
): SelfieToBrandShootPromptPack {
  const world = valueOrPlaceholder(code.signatureVisualWorld, "my chosen Signature Visual World")
  const colors = valueOrPlaceholder(code.mainColors, "my chosen color world")
  const lighting = valueOrPlaceholder(code.lighting, "my chosen lighting style")
  const wardrobe = valueOrPlaceholder(code.wardrobeDirection, "my chosen wardrobe direction")
  const background = valueOrPlaceholder(code.backgroundWorld, "my chosen background world")
  const signal = valueOrPlaceholder(code.emotionalSignal, "my chosen emotional signal")

  const codeLine = `Keep this visual code consistent: ${world}; colors: ${colors}; lighting: ${lighting}; wardrobe: ${wardrobe}; background: ${background}; emotional signal: ${signal}.`

  const starterShoot: SelfieToBrandShootPromptCard[] = [
    {
      title: "Signature Profile Portrait",
      purpose: "Profile photo, about page, first impression.",
      copy: "Use this when you need a clear first-impression image for your profile, about page, or bio. The goal is not perfection. The goal is to still look like you, inside the visual world you chose.",
      prompt: `Use my uploaded source selfie as the identity reference. Create one clean, recognizable Signature Profile Portrait inside ${world}. Preserve my face, skin tone, hair, expression, and natural proportions. ${codeLine} Make it polished, realistic, and easy for my audience to connect with immediately. Vertical 4:5. No text, no logo, no extra people.`,
    },
    {
      title: "Editorial Reel Cover",
      purpose: "Reel cover, carousel cover, hook visual.",
      copy: "Use this when you need a stronger image for Reels, carousel covers, or a post that needs to stop the scroll. Keep you recognizable, plus the colors, lighting, and mood, but make the composition more editorial.",
      prompt: `Use my uploaded source selfie as the identity reference. Create an Editorial Reel Cover inside ${world}. Preserve my face and keep the same visual code. ${codeLine} Make the composition stronger with clean negative space for text, a confident crop, and a premium editorial feeling. Vertical 9:16 or 4:5 safe. No text, no logo, no extra people.`,
    },
    {
      title: "Lifestyle Brand Image",
      purpose: "Stories, soft sell, behind the scenes.",
      copy: "Use this when you want the image to feel less posed and more like a real moment from your brand world. This is the one that makes your content feel lived-in, not staged.",
      prompt: `Use my uploaded source selfie as the identity reference. Create a Lifestyle Brand Image inside ${world}. Preserve my face and keep the same visual code. ${codeLine} Show a natural elevated brand moment that feels lived-in, useful for Stories, and not overly staged. Vertical 4:5. No text, no logo, no extra people.`,
    },
  ]

  const allExtraImages: SelfieToBrandShootPromptCard[] = [
    {
      title: "Offer / Launch Visual",
      purpose: "Sales post, story CTA, offer page.",
      copy: "Use this when you need an image that can support a sales post, story CTA, offer page, or launch moment without feeling corporate.",
      prompt: `Use my uploaded source selfie as the identity reference. Create an Offer or Launch Visual inside ${world}. ${codeLine} Make it clean, polished, and spacious enough to support sales copy while still feeling personal and editorial. No text, no logo, no extra people.`,
    },
    {
      title: "Story Image",
      purpose: "Daily content, story intro, quiet brand moment.",
      copy: "Use this for softer daily content, behind-the-scenes, story intros, or quiet brand moments that still match your visual world.",
      prompt: `Use my uploaded source selfie as the identity reference. Create a softer Story Image inside ${world}. ${codeLine} Make it natural, calm, and personal enough for daily presence without losing the brand direction. Vertical 9:16. No text, no logo, no extra people.`,
    },
    {
      title: "Website / About Image",
      purpose: "Website, media kit, intro post.",
      copy: "Use this when you need a polished image that feels trustworthy, recognizable, and clean enough for a website, media kit, or intro post.",
      prompt: `Use my uploaded source selfie as the identity reference. Create a Website or About Image inside ${world}. ${codeLine} Make it polished, trustworthy, clean, and professional without feeling stiff. Vertical 4:5 or horizontal-safe composition. No text, no logo, no extra people.`,
    },
  ]

  const requestedExtraImages = allExtraImages.filter(card => {
    if (!useCases.length) return true
    const needle = card.title.toLowerCase()
    return useCases.some(useCase => needle.includes(useCase.toLowerCase().split(" ")[0]))
  })

  return {
    starterShoot,
    extraImages: requestedExtraImages.length ? requestedExtraImages : allExtraImages,
    fixPrompts: [
      {
        title: "Make it look more like me",
        purpose: "Face identity fix.",
        copy: "Use this when the image is close, but the face does not feel enough like you.",
        prompt:
          "Make the face look more like my source selfie while keeping the same visual world, colors, lighting, wardrobe, background, and mood.",
      },
      {
        title: "Make it less AI",
        purpose: "Realism fix.",
        copy: "Use this when the image feels too glossy, too plastic, or too generated.",
        prompt:
          "Make the image feel more realistic and less AI-generated while keeping the same visual world and composition.",
      },
      {
        title: "Make it softer",
        purpose: "Lifestyle adjustment.",
        copy: "Use this when the direction is right, but the image feels too strong.",
        prompt:
          "Keep the same visual world, but make it softer and more lifestyle. Soften the light, expression, pose, and contrast.",
      },
      {
        title: "Make it more editorial",
        purpose: "Stronger composition.",
        copy: "Use this when the image is too plain and needs more authority.",
        prompt:
          "Keep the same visual world, but make it stronger and more editorial with cleaner framing, better negative space, and stronger posture.",
      },
      {
        title: "Improve pose, crop, or lighting",
        purpose: "Detail refinement.",
        copy: "Use this when only one part feels off.",
        prompt:
          "Improve the pose, crop, or lighting without changing the visual world, face identity, colors, wardrobe, background, or emotional mood.",
      },
    ],
    consistencyNotes: [
      `Stay inside ${world} for the full first shoot.`,
      `Repeat ${colors}, ${lighting}, and ${wardrobe} before trying a new aesthetic.`,
      "Fix face, pose, crop, or light before changing the whole direction.",
    ],
  }
}
