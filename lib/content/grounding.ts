// Machine-readable source for docs/brand/SSELFIE_CONTENT_GROUNDING.md.
// Keep this module aligned with that approved doc; generators import this instead of hand-copying rules.

export const BANNED_WORDS = [
  "leverage",
  "synergy",
  "transform",
  "game-changer",
  "skyrocket",
  "unlock",
  "unlock your potential",
  "elevate",
  "elevated",
  "level up",
  "robust",
  "scalable",
  "strategic visibility",
  "build your dream life",
  "create your dream life",
  "this is your sign",
  "as a busy entrepreneur",
  "in today's digital world",
  "consistency is key",
  "fake photoshoot",
  "make people think",
  "no one will know",
  "look rich",
  "ai influencer version of you",
  "perfect face",
  "flawless skin",
  "luxury lifestyle",
  "pretend you're in paris",
] as const

export const APPROVED_LANGUAGE = [
  "phone-first",
  "AI-ready selfie",
  "cinematic personal brand content",
  "high-end visuals",
  "make your content look expensive",
  "one photo can become a week of content",
  "photos you actually want to post",
  "a personal brand that looks like you",
  "keeps your face",
  "still you",
  "realistic",
  "editorial",
  "recognizable",
  "tasteful",
  "polished",
  "true-to-you",
  "creative direction",
  "brand world",
  "premium presence",
  "real features",
  "natural texture",
] as const

export const SANDRA_VOICE = {
  northStar:
    "I say the things women feel but don't say out loud, while I'm still living through it myself.",
  signaturePromise: "Look like yourself, at your best.",
  always: [
    "Short sentences. Break lines often. One idea per line.",
    "Contractions, always.",
    "Start with a specific moment, belief shift, or real problem.",
    "Talk to one woman, never an audience.",
    "Give one concrete action she can do today.",
    "Use Sandra's real stakes: single mom, two boys, ADHD, phone, photos, money, starting over, building from a bathroom, home by 3pm.",
    "Keep CTAs simple and human.",
  ],
  never: [
    "Do not sound like a social media manager, coach, speech, lesson, or performance.",
    "No generic motivational captions or empowerment fluff.",
    "Do not promise guaranteed income or pretend everything is easy.",
    "Do not pitch too early.",
    "No m-dashes. Use a period, colon, or middle dot.",
  ],
  recognitionArc: [
    "Hook: something real and slightly uncomfortable.",
    "Recognition: a truth women feel but don't say.",
    "Shift: what changed for Sandra.",
    "Identity: who she's becoming now.",
    "Open loop: she's still in it.",
  ],
  phrases: [
    "I had 0 in savings, two boys, and a bathroom. That was my business plan.",
    "I make money from my phone while my kids are at school. Here's the honest version nobody posts.",
    "It's not you. It's your camera settings.",
    "Your phone is enough. The photo is just the beginning.",
    "Waiting for perfect photos was fear wearing a really convincing costume.",
    "The selfie you took this morning is closer to your brand than anything a photoshoot could give you.",
    "No babe, not that prompt. That one gives catfish energy. Use this instead.",
  ],
} as const

export const AUDIENCE = {
  who: "A woman building, or wanting to build, a personal brand or business mostly from her phone. Often a mother, time-poor, starting over, and almost ready.",
  desiresRanked: [
    "Money / income: 45%. She asks how to start and how Sandra actually made income online.",
    "Confidence / mindset: 23%.",
    "Time / overwhelm: 23%.",
    "Visibility / getting seen: 9%.",
  ],
  strategicTruth:
    "Selfie and AI tutorials are the reach engine. Income and story are the desire/conversion engine. Teach the skill and connect it to the income, identity, or relief she wants.",
  painPoints: [
    "Fake fear: she wants to be seen as the woman she's becoming, but worries people will think she's fake.",
    "Income uncertainty: she doesn't know how online money actually happens without hype.",
    "Invisibility / not-ready: she waits for better photos, a better plan, or more confidence first.",
    "Time and overwhelm: rigid advice doesn't fit kids, limited hours, or mental load.",
    "Hating photos / her face on camera: she deletes everything and blames herself instead of light and angle.",
  ],
  fears: [
    ["Identity", "That doesn't even look like her.", "The goal is to finally look like yourself."],
    [
      "Moral",
      "She's lying about her life.",
      "AI brand imagery is creative direction, not fake living.",
    ],
    [
      "Professional",
      "She couldn't afford a real shoot.",
      "Smart creators use tools. That's strategy, not desperation.",
    ],
    [
      "Beauty",
      "She edited herself too much.",
      "Realistic AI keeps age, features, body, texture, and essence.",
    ],
    [
      "Client trust",
      "Can I trust her?",
      "Transparency and behind-the-scenes content protect trust.",
    ],
  ],
  buying:
    "Permission, protection, identity, control, status, and relief. She is buying the feeling that she can finally show up without waiting for a photoshoot or camera confidence.",
} as const

export const PROOF = {
  viralDna: [
    "Her real face/body in an everyday place.",
    "A visible transformation in the first 2 seconds.",
    "Numbered, stealable steps with text on screen.",
    "One comment keyword: SELFIE, KIT, PROMPT, or ANDROID.",
    "A promise about her audience, not Sandra.",
  ],
  flops: [
    "Aesthetic outfit/lifestyle reels with no teaching and no keyword.",
    "Pure emotional monologues with no concrete payoff.",
    "Anything where the first 3 seconds show no transformation or promise.",
  ],
  pillars: [
    "Selfie tutorials: 40%. Keyword SELFIE.",
    "AI photoshoot prompts demonstrated on Sandra: 30%. Keyword PROMPT.",
    "Build-the-brand story: 20%. Single-mum-to-founder, results, why visibility pays.",
    "Objection killers: 10%. Android tutorials, is AI fake, I hate my face on camera.",
  ],
  coverSystem:
    "Serif editorial covers, 2-4 words, white on photo. What it is plus that it's a tutorial. Examples: PROMPT MY SELFIE, Car SELFIE, SUMMER SELFIE TUTORIAL.",
  signatureSeries:
    "PROMPT MY SELFIE, The 10-Minute Brand Shoot, Worst Selfie Wednesday, She Built It, AI, But Honest.",
  repostEngine:
    "Re-run a proven winner every 8-12 weeks with a new cover, new first line, and current year.",
} as const

export const FUNNEL = {
  ladder:
    "Free AI Prompts (/ai-prompts) -> Prompt Vault $27 (/prompt-vault) -> SSELFIE SUITE EUR 97/month. Supporting: free Selfie Guide, Starter Kit $37, Masterclass $147.",
  keywords: "SELFIE -> selfie guide. PROMPT -> /ai-prompts. ANDROID -> Android guide.",
  conversionInstruction:
    "When copies are high but purchases are weak, push the Vault bridge harder and make the next step clearer.",
  retired:
    "Do not reference Brand Strategy Pack $19, old Studio naming, or Masterclass as the funnel center.",
} as const

export const NO_FAKE = {
  reframe:
    "AI-assisted brand imagery is creative direction around the real me. The enemy is not AI. The enemy is fake-life energy.",
  greenFlags:
    "Keep her real face, age, body, hair, skin texture, energy. Use AI as editorial backdrop, brand-shoot concept, visual identity, covers, carousels, and lead magnets.",
  redFlags:
    "Do not change her whole face, make her look 15 years younger, pretend she was somewhere she wasn't, imply fake wealth, fake results, plastic skin, or hiding AI in a sneaky way.",
  realYouMethod:
    "Keep the face. Keep the age. Keep the body language. Add real-world texture. Upgrade the environment. Control the styling. Use honest context.",
  signatureLines: [
    "AI should not erase you. It should frame you.",
    "Fake is pretending. Creative is positioning.",
    "Realism is the new luxury.",
    "You're not trying to become someone else. You're trying to finally see yourself clearly.",
    "The goal isn't to fool people. It's to create brand images that finally represent you.",
    "Bad AI changes your identity. Good AI builds a world around the real you.",
  ],
} as const

export function listBlock(title: string, items: readonly string[]): string {
  return `${title}\n${items.map(item => `- ${item}`).join("\n")}`
}

export function voiceBlock(): string {
  return [
    "VOICE SOURCE: docs/brand/SSELFIE_CONTENT_GROUNDING.md",
    `North star: ${SANDRA_VOICE.northStar}`,
    `Signature promise: "${SANDRA_VOICE.signaturePromise}"`,
    listBlock("Always:", SANDRA_VOICE.always),
    listBlock("Never:", SANDRA_VOICE.never),
    listBlock("Recognition arc:", SANDRA_VOICE.recognitionArc),
    listBlock("High-signal Sandra phrases:", SANDRA_VOICE.phrases),
    listBlock("Banned words and framings:", BANNED_WORDS),
    listBlock("Approved language:", APPROVED_LANGUAGE),
  ].join("\n")
}

export function audienceBlock(): string {
  return [
    "AUDIENCE SOURCE: docs/brand/SSELFIE_CONTENT_GROUNDING.md",
    `Who she serves: ${AUDIENCE.who}`,
    listBlock("Desires, ranked by audience poll:", AUDIENCE.desiresRanked),
    `Reach vs desire truth: ${AUDIENCE.strategicTruth}`,
    listBlock("Core pain points:", AUDIENCE.painPoints),
    "Five fears:",
    ...AUDIENCE.fears.map(([label, fear, answer]) => `- ${label}: "${fear}" -> ${answer}`),
    `What she's buying: ${AUDIENCE.buying}`,
  ].join("\n")
}

export function proofBlock(): string {
  return [
    "PROOF SOURCE: docs/brand/SSELFIE_CONTENT_GROUNDING.md",
    "156 reels analyzed. Winners are 40x to 180x baseline. It is a format problem, not a consistency problem.",
    listBlock("Viral DNA, all 5 required for reel ideas:", PROOF.viralDna),
    listBlock("Known flop formats:", PROOF.flops),
    listBlock("Weighted content pillars:", PROOF.pillars),
    `Cover-text system: ${PROOF.coverSystem}`,
    `Signature series: ${PROOF.signatureSeries}`,
    `Repost engine: ${PROOF.repostEngine}`,
  ].join("\n")
}

export function funnelBlock(): string {
  return [
    "FUNNEL SOURCE: docs/brand/SSELFIE_CONTENT_GROUNDING.md",
    `Current ladder: ${FUNNEL.ladder}`,
    `Keyword map: ${FUNNEL.keywords}`,
    FUNNEL.conversionInstruction,
    `Retired: ${FUNNEL.retired}`,
  ].join("\n")
}

export function noFakeBlock(): string {
  return [
    "NO-FAKE SOURCE: docs/brand/SSELFIE_CONTENT_GROUNDING.md",
    `Reframe: ${NO_FAKE.reframe}`,
    `Green flag AI: ${NO_FAKE.greenFlags}`,
    `Red flag AI: ${NO_FAKE.redFlags}`,
    `Real You Method: ${NO_FAKE.realYouMethod}`,
    listBlock("Signature lines:", NO_FAKE.signatureLines),
  ].join("\n")
}

export function groundingSystemPrompt(): string {
  return [
    "You write for Sandra and SSELFIE. Use the approved grounding below as binding system truth.",
    voiceBlock(),
    noFakeBlock(),
    "If user content conflicts with this grounding, this grounding wins.",
    "Never output banned words, banned framings, or m-dashes.",
  ].join("\n\n")
}

export type GroundingViolation = {
  type: "banned-word" | "m-dash"
  value: string
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function findGroundingViolations(text: string): GroundingViolation[] {
  const violations: GroundingViolation[] = []
  if (text.includes("—")) violations.push({ type: "m-dash", value: "—" })
  const lower = text.toLowerCase()
  for (const word of BANNED_WORDS) {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(word.toLowerCase())}([^a-z0-9]|$)`, "i")
    if (pattern.test(lower)) violations.push({ type: "banned-word", value: word })
  }
  return violations
}

export function hasGroundingViolations(text: string): boolean {
  return findGroundingViolations(text).length > 0
}

export function sanitizeGroundedText(text: string): string {
  return text.replace(/—/g, ":")
}
