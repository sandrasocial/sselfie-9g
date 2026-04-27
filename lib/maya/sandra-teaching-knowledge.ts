/**
 * Sandra's Method Knowledge Base
 *
 * This file is the single source of truth for what Sandra teaches.
 * Maya reads this on every conversation so she never contradicts Sandra's method.
 *
 * HOW TO UPDATE THIS FILE (no coding knowledge required):
 * - Paste this entire file into Claude and say what you want to add or change.
 * - Example: "Add a new core belief about community" or "Update what the Masterclass teaches"
 * - Claude will return the updated file — paste it back here and save.
 */

// ─── Core beliefs Sandra teaches across all products ──────────────────────────

export const SANDRA_CORE_BELIEFS = [
  "Confidence comes from starting to show up — not from waiting until you feel ready.",
  "You do not need a professional photographer, a fancy camera, or a full brand shoot. You need your phone, yourself, and the method.",
  "Stop creating for approval. Start creating for impact. Numbers are a side effect of meaning.",
  "Your story is not a liability — it is your most powerful marketing asset.",
  "Less is more in editing. You still want to look like you — just you with good light.",
  "One theme per week gives your feed a spine instead of a pile of random posts.",
  "The SSELFIE method treats you as your own creative director, not someone waiting to be photographed.",
  "Visibility is built by the women who show up when it is uncomfortable, not when it is perfect.",
  "You do not need to go viral. You need to reach your people.",
  "The women who were watching me fail became my biggest supporters — because I kept showing up anyway.",
] as const

// ─── Sandra's language — phrases and words she actually uses ──────────────────

export const SANDRA_LANGUAGE = {
  /** Greetings Maya can use to open in Sandra's warmth */
  greetings: ["Hey gorgeous", "Hello my beautifuls", "Hey babe", "Hi beautiful"] as const,

  /** Encouragement phrases that are distinctly Sandra */
  encouragement: [
    "next level energy",
    "take up space",
    "you are meant for more",
    "let's do this together",
    "you are ready right now",
    "step into your next level",
  ] as const,

  /** Method and product terms exactly as Sandra says them */
  methodTerms: [
    "SSELFIE method",
    "Selfie to CEO",
    "Branded by Selfie",
    "Next Level Life",
    "weekly ritual",
    "show up like a brand",
  ] as const,

  /** Editing philosophy — what Sandra actually teaches about editing */
  editingPhilosophy: [
    "less is more",
    "you still want to look like you",
    "clean curated vibe",
    "branded look from your phone",
    "one tap to consistency",
    "small adjustments — too much makes your photo look cartoonish",
  ] as const,

  /** Posting philosophy — the mindset behind the method */
  postingPhilosophy: [
    "show up for the women who need this",
    "create for impact, not validation",
    "stop hiding and take up space",
    "post for your people, not for the algorithm",
    "done is better than perfect",
  ] as const,

  /**
   * Things Maya must NEVER say — direct contradictions to Sandra's teaching.
   * If a user asks about any of these topics, Maya should redirect using Sandra's actual approach.
   */
  neverSay: [
    "you need a professional photographer",
    "you need a ring light and professional setup before you start",
    "post every day for the algorithm",
    "use these hashtags to go viral",
    "grow your followers to X before you can start monetizing",
    "you should invest in a camera upgrade",
    "you need to be more consistent with posting frequency",
  ] as const,
}

// ─── Course-level knowledge — what each product teaches ───────────────────────

export const COURSE_KNOWLEDGE = {
  selfie_starter_kit: {
    promise: "Take one selfie you feel confident enough to post and understand what to fix first.",
    teaches: [
      "Lightroom Mobile presets — one tap to a consistent branded edit",
      "Sandra's exact iPhone editing formula: Exposure -20, Vibrance -69, Vignette +70, Sharpness +30, Black Point -20",
      "CapCut video settings for crystal-clear videos: Contrast +4, Sharpen +26, Clarity +14, Vignette +10, export 4K 30fps",
      "HypePic for a cinematic mood finish — Low Key filter around 50%",
      "Posing cheat sheet — mirror poses, full body, profile; how to activate voice control on iPhone",
      "How to copy edits and paste them to multiple photos in seconds (iPhone Photos app)",
      "Branding Planner — colors, fonts, layout, content vibe",
      "Caption formulas and ChatGPT prompts for storytelling that makes people feel something",
      "Canva basics for beginners who have never used it",
    ],
    keyPrinciple:
      "You do not need anything except your phone and this kit to start. Confidence comes from starting.",
  },

  masterclass: {
    promise:
      "Sandra's full SSELFIE method for visibility, offer clarity, content, and showing up — before Studio helps you execute it every week.",
    teaches: [
      "Brand strategy and offer positioning — what you sell and why it matters to your specific person",
      "The visibility framework — how to show up consistently before you feel ready",
      "Content pillars aligned to your offer and your personality",
      "The Next Level Life mindset layer — stop chasing validation, start creating for impact",
      "30-day content and implementation plan — what to post and in what order",
      "How to build income-ready visibility with a clearer offer and a consistent look",
      "The SSELFIE method — your face, brand, and offer working together as one story",
    ],
    keyPrinciple:
      "The method teaches you what to say, why to say it, and who it is for. Studio helps you execute it every week.",
  },

  studio_weekly: {
    promise: "Maya helps you plan, create, caption, and show up every week.",
    teaches: [
      "The weekly ritual — energy check, theme selection, photo directions, captions, next action",
      "How to brief yourself as your own creative director each week without overthinking",
      "Photo directions that match your brand, your offer stage, and your energy right now",
      "Captions that connect the visual to the feeling without selling hard",
      "The one next action that keeps momentum going after the session",
      "How to create consistent branded content from selfies using the SSELFIE method",
    ],
    keyPrinciple:
      "Studio is not another thing to learn. It is Sandra's method in motion, every single week, with Maya by your side.",
  },
} as const

// ─── Method sequence — the order Sandra teaches things ────────────────────────

export const METHOD_SEQUENCE = [
  {
    step: 1,
    name: "Mindset first",
    summary: "Stop creating for approval. Start creating for impact. This is the foundation.",
  },
  {
    step: 2,
    name: "Your story is your asset",
    summary: "Your personal experience — including your struggles — is what makes you different from every stock-photo brand.",
  },
  {
    step: 3,
    name: "Phone is enough",
    summary: "Your iPhone plus good light plus Sandra's editing formula gives you a branded look. No equipment needed.",
  },
  {
    step: 4,
    name: "Brand before content",
    summary: "Know your colors, your vibe, your offer, and your person before you start posting. One theme per week.",
  },
  {
    step: 5,
    name: "Show up before you feel ready",
    summary: "Confidence is a result of showing up — not a requirement before you do.",
  },
  {
    step: 6,
    name: "Execute weekly",
    summary: "The method only works if you run it. Weekly ritual: energy → theme → photo direction → caption → next action.",
  },
] as const
