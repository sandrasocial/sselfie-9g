"use client"

import Image from "next/image"
import Link from "next/link"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { Cormorant_Garamond, Inter } from "next/font/google"
import ReactMarkdown, { type Components } from "react-markdown"
import {
  extractImageMarker,
  parseSelfieGuideChapters,
  type SelfieGuideChapter,
  type GuidePersonalization,
  type GuidePhoneType,
  type GuidePostingFrequency,
  getGuideProgress,
  saveGuideProgress,
} from "@/lib/selfie-guide/experience"
import ChapterProgressBar from "@/components/selfie-guide/chapter-progress-bar"
import BeforeAfterSlider from "@/components/selfie-guide/before-after-slider"
import ChallengeTracker from "@/components/selfie-guide/challenge-tracker"
import MayaMoment from "@/components/selfie-guide/maya-moment"
import OnboardingQuiz from "@/components/selfie-guide/onboarding-quiz"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

function withGuideStarterKitAttribution(destination: string, token?: string) {
  if (destination !== "/starter-kit" && destination !== "/checkout/starter-kit") {
    return destination
  }

  const params = new URLSearchParams({
    utm_source: "free_guide",
    utm_medium: "guide",
    utm_campaign: "selfie_guide_to_starter_kit",
    utm_content: "guide_access_bridge",
    guide_cta: "starter_kit",
    source: "selfie_guide_access",
    checkout_source: "selfie_guide_access_bridge",
    cta_keyword: "SELFIE",
    buyer_stage: "lead",
  })
  const cleanToken = token?.trim()
  if (cleanToken) {
    params.set("freebie_token", cleanToken)
  }

  return `${destination}?${params.toString()}`
}

// ─── Types ──────────────────────────────────────────────────────────────────

type GuideImage = {
  src: string
  alt: string
  caption: string
  width: number
  height: number
  layout?: "feature" | "feature-wide" | "portrait" | "landscape" | "square"
}

type VisualSpec = {
  label: string
  caption: string
  src?: string
  alt?: string
}

type ChallengeDay = {
  day: string
  title: string
  description: string
}

type ComparisonImage = GuideImage & {
  label: string
}

type ChapterMoodSpec = {
  match: RegExp
  eyebrow: string
  title: string
  copy: string
  items: GuideImage[]
}

// ─── Image Data ─────────────────────────────────────────────────────────────

const HERO_IMAGE: GuideImage = {
  src: "/images/selfie-guide/window-editorial-portrait.jpg",
  alt: "Sandra taking a selfie with her phone in soft window light for an editorial guide portrait",
  caption: "",
  width: 762,
  height: 1143,
}

const MAYA_GALLERY_IMAGES: readonly GuideImage[] = [
  {
    src: "/images/selfie-guide/feed-post-1.png",
    alt: "Before and after comparison showing Sandra's selfie enhanced with AI to create professional brand photography",
    caption: "Original selfie → AI-enhanced brand photo",
    width: 1856,
    height: 2304,
  },
  {
    src: "/images/selfie-guide/black-blazer-seated-coffee.jpg",
    alt: "Sandra seated with a coffee in hand in a dark editorial interior, maintaining a polished consistent visual style",
    caption: "Consistent editorial vibe",
    width: 1134,
    height: 2016,
  },
  {
    src: "/images/selfie-guide/feed-post-5.png",
    alt: "Professional portrait of Sandra with warm, approachable expression and polished editorial style",
    caption: "Warm + approachable (but still polished)",
    width: 1856,
    height: 2304,
  },
  {
    src: "/images/selfie-guide/feed-post-7.png",
    alt: "Sandra's brand photo balancing professional quality with natural, authentic presence",
    caption: "Professional without being stiff",
    width: 1856,
    height: 2304,
  },
  {
    src: "/images/selfie-guide/parisian-cafe-tranquility.png",
    alt: "AI-generated brand photo of Sandra in Parisian cafe setting with editorial aesthetic",
    caption: "AI-generated scene that still feels like me",
    width: 2048,
    height: 2048,
  },
] as const

const CHAPTER_MOOD_LIBRARY: readonly ChapterMoodSpec[] = [
  {
    match: /camera|iphone|settings/i,
    eyebrow: "The Foundation",
    title: "Set the phone up like you mean it",
    copy: "A clean settings setup and a camera you can trust will make every chapter after this feel easier.",
    items: [
      {
        src: "/images/selfie-guide/mirror-selfie-side-profile.jpg",
        alt: "Side-profile mirror selfie of Sandra in a cream ribbed top showing clean phone framing",
        caption: "A simple setup is easier to repeat than a complicated one.",
        width: 454,
        height: 807,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/face-covered-selfie.jpg",
        alt: "Front-facing mirror selfie with the phone centered in front of Sandra's face to show framing and hand placement",
        caption: "Clean framing starts before you press the shutter.",
        width: 521,
        height: 926,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/cream-shirt-closeup.jpg",
        alt: "Close portrait of Sandra in a cream ribbed top showing soft indoor light and natural skin texture",
        caption: "Even the simplest setup looks stronger when the basics are correct.",
        width: 454,
        height: 807,
        layout: "portrait",
      },
    ],
  },
  {
    match: /light/i,
    eyebrow: "Light Direction",
    title: "This is the difference-maker",
    copy: "The guide reads better when the lesson is visual. Use these references to see exactly how light changes the whole mood of a selfie.",
    items: [
      {
        src: "/images/selfie-guide/sg-window-01.png",
        alt: "Sandra in soft window light showing the natural, flattering quality of indirect daylight",
        caption: "Soft daylight gives shape without harshness.",
        width: 1024,
        height: 1536,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-window-02.png",
        alt: "Sandra using window light for a selfie, demonstrating frontal placement relative to the light source",
        caption: "Face the window directly. Stand back a little.",
        width: 1024,
        height: 1536,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-window-03.png",
        alt: "Sandra in window light showing how natural indirect light creates even, flattering skin tones",
        caption: "No ring light required.",
        width: 1024,
        height: 1536,
        layout: "portrait",
      },
    ],
  },
  {
    match: /angle|pose|presence/i,
    eyebrow: "Presence On Camera",
    title: "Structure the shot before you judge the face",
    copy: "Angles and posture should support your expression, not overpower it. The visual goal is relaxed control.",
    items: [
      {
        src: "/images/selfie-guide/sg-angles-01.png",
        alt: "Sandra taking a mirror selfie with the phone held above eye level, showing the flattering 15-degree angle in practice",
        caption: "Phone slightly above eye level. Chin softly down.",
        width: 1024,
        height: 1536,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-angles-02.png",
        alt: "Four-panel pose guide showing Turn 45 degrees, Shift your weight, Use a prop, and Move between shots",
        caption: "Four small shifts. None of them require posing.",
        width: 1122,
        height: 1402,
        layout: "portrait",
      },
    ],
  },
  {
    match: /edit/i,
    eyebrow: "Refine, Don't Overwork",
    title: "Editing should support what was already there",
    copy: "The best edit still looks like skin, daylight, and a human being. Keep it close to reality.",
    items: [
      {
        src: "/images/selfie-guide/sg-editing-01.png",
        alt: "Four editing apps worth using: Lightroom Mobile, CapCut, Hypic, and VSCO",
        caption: "Four tools. Lightroom for everything.",
        width: 1122,
        height: 1402,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-editing-02.png",
        alt: "Your 5-step Lightroom edit showing Exposure, Contrast, Highlights, Shadows, and Warmth",
        caption: "Five adjustments. Two minutes.",
        width: 1122,
        height: 1402,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-editing-03.png",
        alt: "Save a preset in Lightroom: edit once and apply your entire look to any new photo in one tap",
        caption: "Edit once. Apply forever.",
        width: 1122,
        height: 1402,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-editing-04.png",
        alt: "What not to do when editing — over-smoothing, saturation, inconsistent filters",
        caption: "Keep the skin real. Pull back before you post.",
        width: 1122,
        height: 1402,
        layout: "portrait",
      },
    ],
  },
  {
    match: /confidence/i,
    eyebrow: "Confidence",
    title: "Visibility gets easier when the frame feels familiar",
    copy: "You do not need a different face for the camera. You need repetition, calm, and a setup that already works for you.",
    items: [
      {
        src: "/images/selfie-guide/black-blazer-coffee-standing.jpg",
        alt: "Sandra standing in a black blazer with coffee in hand, looking composed in a modern interior",
        caption: "Calm expression reads stronger than a forced smile.",
        width: 980,
        height: 1741,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/mirror-sunglasses-blazer.jpg",
        alt: "Sandra in a black blazer and sunglasses standing in front of a round mirror",
        caption: "Presence is usually a quieter choice than people think.",
        width: 1152,
        height: 2048,
        layout: "portrait",
      },
    ],
  },
  {
    match: /mirror/i,
    eyebrow: "Mirror Selfies",
    title: "Distance, placement, no flash",
    copy: "Done right, a mirror selfie shows your outfit, your room, and your face in one frame. Two arm-lengths back. Flash off. Window light on.",
    items: [
      {
        src: "/images/selfie-guide/sg-mirror-01.png",
        alt: "Sandra taking a mirror selfie two arm-lengths back, showing full outfit framing with clean background",
        caption: "Two arm-lengths back. Full outfit in frame.",
        width: 1122,
        height: 1402,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-mirror-02.png",
        alt: "Sandra demonstrating mirror selfie phone placement at chest height with flash off and window light on",
        caption: "Flash off. Window light only.",
        width: 1086,
        height: 1448,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-mirror-03.png",
        alt: "Mirror selfie showing clean room context with Sandra slightly angled to the mirror",
        caption: "Show just enough room to give context.",
        width: 1086,
        height: 1448,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-mirror-04.png",
        alt: "Sandra in a mirror selfie with natural window light falling across her face",
        caption: "Light on the face, not the mirror.",
        width: 1122,
        height: 1402,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-mirror-05.png",
        alt: "Full-length mirror selfie of Sandra showing outfit detail and clean background",
        caption: "One shot. Outfit, room, face.",
        width: 1122,
        height: 1402,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-mirror-06.png",
        alt: "Sandra mirror selfie with phone held at a natural angle, showing relaxed hand placement",
        caption: "Relaxed hold. No white-knuckle grip.",
        width: 1086,
        height: 1448,
        layout: "portrait",
      },
    ],
  },
  {
    match: /car/i,
    eyebrow: "Car Selfies",
    title: "The most underrated location you have",
    copy: "Soft diffused window light, clean neutral background, no clutter. Overcast day, parked in shade, phone above eye level.",
    items: [
      {
        src: "/images/selfie-guide/sg-car-01.png",
        alt: "Sandra taking a car selfie with soft diffused light through the car window, phone held above eye level",
        caption: "Diffused window light. No clutter. Clean result.",
        width: 941,
        height: 1672,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-car-02.png",
        alt: "Car selfie of Sandra with the steering wheel visible, showing a natural candid look",
        caption: "Wrist on the wheel. Looks real.",
        width: 941,
        height: 1672,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-car-03.png",
        alt: "Sandra in a car selfie using overcast natural light through the windshield for an even, flattering tone",
        caption: "Overcast sky through the glass. Natural softbox.",
        width: 941,
        height: 1672,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-car-04.png",
        alt: "Car selfie showing Sandra with seatbelt on, parked, looking candid and approachable",
        caption: "Seatbelt on reads candid. Either way works.",
        width: 1024,
        height: 1536,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-car-05.png",
        alt: "Sandra photographing herself in the car with the window frame providing a natural crop",
        caption: "The car frame does the editorial work for you.",
        width: 1024,
        height: 1536,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-car-06.png",
        alt: "Close car selfie of Sandra with even window light and a neutral headrest background",
        caption: "Neutral background. Even light. Zero effort.",
        width: 1024,
        height: 1536,
        layout: "portrait",
      },
    ],
  },
  {
    match: /full.?body/i,
    eyebrow: "Full-Body Selfies",
    title: "The self-timer is your tripod",
    copy: "You do not need a tripod. You need something to lean the phone against, burst mode, and hip-height placement.",
    items: [
      {
        src: "/images/selfie-guide/sg-fullbody-01.jpg",
        alt: "Sandra full-body selfie using self-timer with phone propped at hip height showing a clean full-length result",
        caption: "Phone at hip height. Timer set. Burst mode on.",
        width: 1916,
        height: 3406,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-fullbody-02.jpg",
        alt: "Full-body selfie of Sandra leaning against a wall showing natural posture and clean vertical framing",
        caption: "Lean into something. It looks intentional.",
        width: 2268,
        height: 4032,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-fullbody-03.jpg",
        alt: "Sandra full-body selfie with phone propped against a stable object showing the elongating effect of lower camera placement",
        caption: "Below the waist elongates. Above the head does not.",
        width: 1763,
        height: 3135,
        layout: "portrait",
      },
    ],
  },
  {
    match: /7[-\s]?day|challenge/i,
    eyebrow: "Practice",
    title: "Make the challenge feel tangible",
    copy: "The challenge should look achievable, not abstract. Use the cards below as your tracker.",
    items: [
      {
        src: "/images/selfie-guide/sg-challenge-hero.png",
        alt: "Sandra holding her phone ready for a 7-day selfie challenge photo session",
        caption: "Seven days. One photo each. That is it.",
        width: 1086,
        height: 1448,
        layout: "portrait",
      },
      {
        src: "/images/selfie-guide/sg-challenge-01.png",
        alt: "Sandra taking a window light selfie for Day 1 of the 7-day selfie challenge",
        caption: "Day 1 starts with a window and ten shots.",
        width: 1122,
        height: 1402,
        layout: "portrait",
      },
    ],
  },
] as const

const SETTINGS_WALKTHROUGH_IMAGES: readonly GuideImage[] = [
  {
    src: "/images/selfie-guide/sg-settings-01.jpg",
    alt: "Steps 01–02: Open Settings app, scroll down and tap Camera",
    caption: "01–02 · Go to Settings → Camera",
    width: 1055,
    height: 1491,
  },
  {
    src: "/images/selfie-guide/sg-settings-02.jpg",
    alt: "Steps 03–04: Tap Formats then tap Preserve Settings inside Camera settings",
    caption: "03–04 · Formats + Preserve Settings",
    width: 1055,
    height: 1491,
  },
  {
    src: "/images/selfie-guide/sg-settings-03.jpg",
    alt: "Step 05: Back in main Camera settings, check Record Video and Photographic Styles",
    caption: "05 · Back in Camera Settings",
    width: 1055,
    height: 1491,
  },
  {
    src: "/images/selfie-guide/sg-settings-04.jpg",
    alt: "Step 06: Turn Grid, Mirror Front Camera, Smart HDR ON — turn Live Photos and View Outside the Frame OFF",
    caption: "06 · Turn ON / Turn OFF",
    width: 1055,
    height: 1491,
  },
  {
    src: "/images/selfie-guide/sg-settings-05.jpg",
    alt: "Step 07: iPhone 15 and 16 users — Photographic Styles, Action Mode, Portrait Mode",
    caption: "07 · iPhone 15 & 16 Users",
    width: 1055,
    height: 1491,
  },
  {
    src: "/images/selfie-guide/sg-settings-06.jpg",
    alt: "Step 08: Quick Camera Access — swipe left from lock screen or set shortcut via Accessibility",
    caption: "08 · Quick Camera Access",
    width: 1055,
    height: 1491,
  },
  {
    src: "/images/selfie-guide/sg-settings-07.jpg",
    alt: "Step 09: Video format — go to Settings → Camera → Record Video and select 1080p HD at 30 fps",
    caption: "09 · Video Format: 1080p at 30fps",
    width: 1055,
    height: 1491,
  },
] as const

const LIGHTING_COMPARISON_IMAGES: readonly ComparisonImage[] = [
  {
    label: "Window / natural light",
    src: "/images/selfie-guide/window-natural-guide-portrait.jpg",
    alt: "Sandra standing by a bright window in natural light with soft contrast across her face",
    caption: "Soft, even, and the easiest place to start.",
    width: 762,
    height: 1143,
  },
  {
    label: "Golden hour",
    src: "/images/selfie-guide/golden-hour-guide-portrait.jpg",
    alt: "Sandra standing beside a pool during golden hour with warm light on her face",
    caption: "Warm and glowy, especially for lifestyle content.",
    width: 1361,
    height: 2420,
  },
  {
    label: "Ring light",
    src: "/images/selfie-guide/ring-light-guide-portrait.png",
    alt: "Sandra seated in front of a ring light with the full face visible and centered in frame",
    caption: "Clean and controlled when the light stays in front.",
    width: 645,
    height: 1398,
  },
  {
    label: "Cloudy day",
    src: "/images/selfie-guide/cloudy-mountain-guide-portrait.jpg",
    alt: "Sandra outdoors in front of a mountain landscape under overcast light",
    caption: "Soft outdoor light that works like a giant natural softbox.",
    width: 576,
    height: 1024,
  },
] as const

const VISUAL_LIBRARY: Record<string, VisualSpec> = {
  "window-lighting-setup.png": {
    label: "THE WINDOW TECHNIQUE",
    caption: "Face the light, stand back a little, and let the phone do less work.",
    src: "/images/selfie-guide/sg-window-01.png",
    alt: "Sandra taking a selfie in soft window light with her phone raised at a flattering angle",
  },
  "angle-comparison-grid.png": {
    label: "ANGLE GUIDE",
    caption: "Phone slightly above eye level, chin softly down. That is the combination.",
    src: "/images/selfie-guide/sg-angles-01.png",
    alt: "Sandra taking a mirror selfie with the phone held above eye level, demonstrating the flattering 15-degree angle",
  },
  "pose-guide-grid.png": {
    label: "NATURAL POSES",
    caption: "Turn 45°. Shift your weight. Use a prop. Move between shots.",
    src: "/images/selfie-guide/sg-angles-02.png",
    alt: "Four-panel grid showing natural pose variations: Turn 45 degrees, Shift your weight, Use a prop, Move between shots",
  },
  "editing-apps.png": {
    label: "THE APPS",
    caption: "Four tools. Lightroom for everything. The others when you need them.",
    src: "/images/selfie-guide/sg-editing-01.png",
    alt: "Four editing apps worth using: Lightroom Mobile, CapCut, Hypic, and VSCO with descriptions",
  },
  "editing-before-after.png": {
    label: "YOUR 5-STEP EDIT",
    caption: "Exposure, Contrast, Highlights, Shadows, Warmth. Two minutes. Done.",
    src: "/images/selfie-guide/sg-editing-02.png",
    alt: "Your 5-step edit in Lightroom Mobile showing the exact slider values for each adjustment",
  },
  "editing-preset.png": {
    label: "SAVE A PRESET",
    caption: "Edit once. Apply in one tap. Same look, every photo.",
    src: "/images/selfie-guide/sg-editing-03.png",
    alt: "Save a preset in Lightroom: edit once and apply your entire look to any new photo in one tap",
  },
  "editing-what-not.png": {
    label: "WHAT NOT TO DO",
    caption: "Over-smoothed, over-saturated, over-filtered. Pull back before you post.",
    src: "/images/selfie-guide/sg-editing-04.png",
    alt: "What not to do when editing: over-smoothing, pushing saturation, and inconsistent filters — with a before/after comparison",
  },
  "feed-post-3.png": {
    label: "THE RESULT",
    caption: "Consistent editorial vibe, built from your own face instead of stock imagery.",
    src: "/images/selfie-guide/feed-post-3.png",
    alt: "Sandra's brand photo with consistent editorial style and cohesive aesthetic",
  },
}

const SEVEN_DAY_CHALLENGE_DAYS: ChallengeDay[] = [
  {
    day: "Day 1",
    title: "Window Light Selfie",
    description: "Take one selfie using natural window light. No ring light. Just you and a window.",
  },
  {
    day: "Day 2",
    title: "Rule of Thirds",
    description: "Turn on your grid. Frame your eyes on the top third line. Take 5 shots.",
  },
  {
    day: "Day 3",
    title: "High Angle Test",
    description: "Hold your phone 15 degrees above eye level. Slightly tilt your chin down. Take 3 shots.",
  },
  {
    day: "Day 4",
    title: "Editing Pass",
    description: "Take your best selfie from days 1–3. Apply only light and warmth adjustments. No filters.",
  },
  {
    day: "Day 5",
    title: "Confidence Shot",
    description: "Take a selfie while doing something you love. No posing. Just do the thing.",
  },
  {
    day: "Day 6",
    title: "Caption Writing",
    description: "Write 3 different captions for your day 5 photo. Short, medium, and story format.",
  },
  {
    day: "Day 7",
    title: "Post It",
    description: "Choose your best selfie from this week. Write a caption. Post it. You're done.",
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPlainText(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getPlainText).join("")
  if (node && typeof node === "object" && "props" in node) {
    const maybeChildren = (node as { props?: { children?: unknown } }).props?.children
    return getPlainText(maybeChildren)
  }
  return ""
}

function normalizeChapterTitle(value: string): string {
  return String(value || "").trim() || "Chapter"
}

function normalizeComparableText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function parseChecklistItem(value: string): string | null {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  const match = text.match(/^\[\s\]\s*(.+)$/)
  return match?.[1]?.trim() || null
}

function getChapterMood(title: string) {
  return CHAPTER_MOOD_LIBRARY.find(spec => spec.match.test(title)) || null
}

const PHONE_TIP: Record<GuidePhoneType, string> = {
  "iphone-15-16": "Use the 1x camera, turn your grid on, and lock exposure before each shot.",
  "iphone-13-14": "Tap to focus on your eye, lower exposure slightly, and keep the phone at eye level or above.",
  android: "Use your rear camera with a timer when possible and disable heavy beauty filters.",
  "not-sure": "Start simple: natural window light, grid on, and at least 10 shots before you choose.",
}

const FREQUENCY_TIP: Record<GuidePostingFrequency, string> = {
  never: "Pick one window. Take ten shots. You do not need to post any of them yet. Just start.",
  sometimes: "Take two photos today. Save one as your backup for next time.",
  regularly: "Keep the same setup as your weekly baseline. Consistency matters more than perfection.",
}

function getQuickWinTip(chapterTitle: string, personalization: GuidePersonalization): string {
  const base = `${PHONE_TIP[personalization.phoneType]} ${FREQUENCY_TIP[personalization.postingFrequency]}`

  if (/light/i.test(chapterTitle)) {
    return `${base} Quick win: stand 45 degrees to a window and capture 5 variations before moving on.`
  }
  if (/edit/i.test(chapterTitle)) {
    return `${base} Quick win: do one gentle edit pass only, then compare against the original before exporting.`
  }
  if (/challenge/i.test(chapterTitle)) {
    return `${base} Quick win: finish Day 1 today even if the rest of the week is messy.`
  }

  return `${base} Quick win: complete this chapter and mark it done before you close the tab.`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChapterImages({ spec }: { spec: ChapterMoodSpec }) {
  return (
    <div className="chapter-images">
      {spec.items.map(image => {
        const isWide = image.layout === "feature" || image.layout === "feature-wide" || image.layout === "landscape"
        return (
          <figure key={image.src} className={`chapter-img-item ${isWide ? "is-wide" : "is-narrow"}`}>
            <div className="chapter-img-wrap">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 900px) 100vw, 50vw"
                className="chapter-img"
              />
            </div>
            <figcaption className="chapter-img-caption">{image.caption}</figcaption>
          </figure>
        )
      })}
    </div>
  )
}

function MayaGallery() {
  return (
    <div className="maya-gallery">
      {MAYA_GALLERY_IMAGES.map(image => (
        <figure key={image.src} className="maya-item">
          <div className="maya-img-wrap">
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="(max-width: 900px) 50vw, 20vw"
              className="maya-img"
            />
          </div>
          <figcaption>{image.caption}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function FeedPreview() {
  return (
    <figure className="feed-preview">
      <div className="feed-preview-wrap">
        <Image
          src="/images/selfie-guide/img-editorial-dark.png"
          alt="Instagram feed grid preview showing nine cohesive brand photos with consistent editorial style"
          width={1536}
          height={2752}
          sizes="(max-width: 700px) 100vw, 760px"
          className="feed-preview-img"
        />
      </div>
      <figcaption>This is what a coherent visual system looks like when one good selfie becomes a brand asset.</figcaption>
    </figure>
  )
}

function ProseVisualFrame({
  label,
  caption,
  children,
}: {
  label: string
  caption: string
  children: ReactNode
}) {
  return (
    <figure className="prose-img-block">
      <p className="prose-img-label">{label}</p>
      {children}
      <figcaption className="prose-img-caption">{caption}</figcaption>
    </figure>
  )
}

function SettingsWalkthroughVisual() {
  return (
    <ProseVisualFrame
      label="SETTINGS CHEAT SHEET"
      caption="Your iPhone camera settings in 60 seconds. These three screenshots are the exact original guide walkthrough."
    >
      <div className="settings-visual-grid">
        {SETTINGS_WALKTHROUGH_IMAGES.map(image => (
          <figure key={image.src} className="settings-visual-item">
            <div className="settings-visual-wrap">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 900px) 100vw, 33vw"
                className="settings-visual-image"
              />
            </div>
            <figcaption className="settings-visual-step">{image.caption}</figcaption>
          </figure>
        ))}
      </div>
    </ProseVisualFrame>
  )
}

function LightingComparisonVisual() {
  return (
    <ProseVisualFrame
      label="LIGHTING COMPARISON"
      caption="Same face, same phone, four totally different outcomes. Light changes everything."
    >
      <div className="lighting-visual-grid">
        {LIGHTING_COMPARISON_IMAGES.map(image => (
          <figure key={image.src} className="lighting-visual-item">
            <div className="lighting-visual-wrap">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 900px) 100vw, 50vw"
                className="lighting-visual-image"
              />
            </div>
            <figcaption className="lighting-visual-label">{image.label}</figcaption>
          </figure>
        ))}
      </div>
    </ProseVisualFrame>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SelfieGuideExperienceProps {
  firstName: string
  guideMarkdown: string
  checkoutSessionId?: string
  brandStrategyBumpSelected?: boolean
  hasBrandStrategyAccess?: boolean
  token?: string
}

export default function SelfieGuideExperience({
  firstName,
  guideMarkdown,
  brandStrategyBumpSelected = false,
  hasBrandStrategyAccess = false,
  token,
}: SelfieGuideExperienceProps) {
  const chapters = useMemo(() => {
    const parsed = parseSelfieGuideChapters(guideMarkdown)
    if (parsed.length > 0) return parsed
    return [{ id: "guide-1", title: "Guide", markdown: guideMarkdown }] satisfies SelfieGuideChapter[]
  }, [guideMarkdown])

  const [activeChapterIndex, setActiveChapterIndex] = useState(0)
  const [completedChapters, setCompletedChapters] = useState<number[]>([])
  const [challengeDays, setChallengeDays] = useState<number[]>([])
  const [personalization, setPersonalization] = useState<GuidePersonalization | null>(null)
  const [guideComplete, setGuideComplete] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [checkedChecklistItems, setCheckedChecklistItems] = useState<Set<string>>(() => new Set())

  // Restore progress from localStorage on mount
  useEffect(() => {
    const progress = getGuideProgress()
    setActiveChapterIndex(Math.min(progress.chapterIndex, chapters.length - 1))
    setCompletedChapters(Array.from({ length: Math.min(progress.chapterIndex, chapters.length) }, (_, index) => index))
    setChallengeDays(progress.challengeDays)
    setPersonalization(progress.personalization)
    if (progress.chapterIndex >= chapters.length) setGuideComplete(true)
    setHydrated(true)
  }, [chapters.length])

  const currentChapter = chapters[Math.min(activeChapterIndex, Math.max(chapters.length - 1, 0))]
  const currentChapterTitle = normalizeChapterTitle(currentChapter.title)
  const currentChapterComparable = normalizeComparableText(currentChapterTitle)
  const showSevenDayChallenge = /7[-\s]?day|challenge/i.test(currentChapter.title)
  const isEditChapter = /edit/i.test(currentChapter.title)
  const currentChapterMood = getChapterMood(currentChapter.title)
  const partNumber = activeChapterIndex + 1
  const quickWinTip = personalization ? getQuickWinTip(currentChapterTitle, personalization) : null

  function persistProgress(nextChapterIndex: number, nextChallengeDays: number[]) {
    saveGuideProgress(nextChapterIndex, nextChallengeDays, personalization)
  }

  function trackGuideUpsellClick(destination: string, product: string) {
    trackAnalyticsEvent({
      event: "selfie_guide_upsell_click",
      properties: {
        source: "selfie_guide_access",
        destination,
        product,
        has_brand_strategy_access: hasBrandStrategyAccess,
        brand_strategy_bump_selected: brandStrategyBumpSelected,
      },
    })

    if (token && product === "starter_kit") {
      fetch("/api/selfie-guide/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          chapterIndex: activeChapterIndex,
          challengeDays,
          ctaClicked: true,
        }),
      }).catch(() => {})
    }
  }

  useEffect(() => {
    const target = chapters[activeChapterIndex]
    if (!target) return
    window.history.replaceState(null, "", `#${target.id}`)
  }, [activeChapterIndex, chapters])

  function markChapterComplete() {
    const nextIndex = activeChapterIndex + 1
    const newCompleted = [...completedChapters, activeChapterIndex].filter((v, i, a) => a.indexOf(v) === i)
    setCompletedChapters(newCompleted)

    const isLastChapter = activeChapterIndex === chapters.length - 1

    if (isLastChapter) {
      setGuideComplete(true)
      persistProgress(chapters.length, challengeDays)
      if (token) {
        fetch("/api/selfie-guide/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, chapterIndex: chapters.length, challengeDays, completed: true }),
        }).catch(() => {})
      }
    } else {
      setActiveChapterIndex(nextIndex)
      persistProgress(nextIndex, challengeDays)
      if (token) {
        fetch("/api/selfie-guide/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, chapterIndex: nextIndex, challengeDays }),
        }).catch(() => {})
      }
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const markdownComponents = useMemo<Components>(
    () => ({
      h1: ({ children }) => {
        const text = getPlainText(children)
        if (normalizeComparableText(text) === currentChapterComparable) return null
        return <h1 className={`prose-h1 ${cormorant.className}`}>{children}</h1>
      },
      h2: ({ children }) => {
        const text = getPlainText(children)
        if (normalizeComparableText(text) === currentChapterComparable) return null
        return <h2 className={`prose-h2 ${cormorant.className}`}>{children}</h2>
      },
      h3: ({ children }) => <h3 className="prose-h3">{children}</h3>,
      strong: ({ children }) => <strong className="prose-strong">{children}</strong>,
      em: ({ children }) => <em className="prose-em">{children}</em>,
      blockquote: ({ children }) => <blockquote className="prose-blockquote">{children}</blockquote>,
      p: ({ children }) => {
        const text = getPlainText(children).replace(/\s+/g, " ").trim()
        const imageMarker = extractImageMarker(text)

        if (!imageMarker) return <p className="prose-p">{children}</p>

        if (imageMarker === "iphone-settings-mockup.png") return <SettingsWalkthroughVisual />
        if (imageMarker === "lighting-comparison-grid.png") return <LightingComparisonVisual />
        if (imageMarker === "feed-post-1.png") return <MayaGallery />
        if (imageMarker === "img-editorial-dark.png") return <FeedPreview />

        const spec = VISUAL_LIBRARY[imageMarker]
        if (!spec?.src || !spec?.alt) return null

        return (
          <figure className="prose-img-block">
            <p className="prose-img-label">{spec.label}</p>
            <div className="prose-img-wrap">
              <Image
                src={spec.src}
                alt={spec.alt}
                width={1200}
                height={800}
                sizes="(max-width: 900px) 100vw, 860px"
                className="prose-img"
              />
            </div>
            <figcaption className="prose-img-caption">{spec.caption}</figcaption>
          </figure>
        )
      },
      ul: ({ children }) => <ul className="prose-ul">{children}</ul>,
      ol: ({ children }) => <ol className="prose-ol">{children}</ol>,
      li: ({ children }) => {
        const plainText = getPlainText(children)
        const checklistText = parseChecklistItem(plainText)

        if (!checklistText) return <li className="prose-li">{children}</li>

        const isChecked = checkedChecklistItems.has(checklistText)
        return (
          <li className={`prose-li checklist-li ${isChecked ? "is-checked" : ""}`}>
            <button
              type="button"
              className="checklist-btn"
              onClick={() => {
                setCheckedChecklistItems(prev => {
                  const next = new Set(prev)
                  if (next.has(checklistText)) next.delete(checklistText)
                  else next.add(checklistText)
                  return next
                })
              }}
              aria-pressed={isChecked}
              aria-label={`Mark "${checklistText}" as ${isChecked ? "incomplete" : "complete"}`}
            >
              <span className={`checklist-box ${isChecked ? "is-checked" : ""}`} aria-hidden />
              <span className={`checklist-label ${isChecked ? "is-checked" : ""}`}>{checklistText}</span>
            </button>
          </li>
        )
      },
      hr: () => <hr className="prose-hr" />,
      a: ({ href, children }) => (
        <a
          href={withGuideStarterKitAttribution(href || "#", token)}
          className="prose-link"
          onClick={() => {
            const destination = href || "#"
            if (destination.startsWith("/checkout/") || destination === "/starter-kit") {
              trackGuideUpsellClick(
                destination,
                destination.includes("starter-kit") ? "starter_kit" : "checkout",
              )
            }
          }}
        >
          {children}
        </a>
      ),
    }),
    [
      activeChapterIndex,
      challengeDays,
      checkedChecklistItems,
      currentChapterComparable,
      hasBrandStrategyAccess,
      brandStrategyBumpSelected,
      token,
    ],
  )

  // Don't render chapter content until hydrated (avoids SSR/localStorage mismatch)
  if (!hydrated) {
    return (
      <div className={`sg ${inter.className}`} style={{ minHeight: "100vh", background: "#0a0a0a" }}>
        <style jsx global>{`html,body{background:#0a0a0a;margin:0;padding:0;}`}</style>
      </div>
    )
  }

  if (!guideComplete && !personalization) {
    return (
      <OnboardingQuiz
        onComplete={({ phone, frequency }) => {
          const nextPersonalization: GuidePersonalization = {
            phoneType: phone,
            postingFrequency: frequency,
          }
          setPersonalization(nextPersonalization)
          saveGuideProgress(activeChapterIndex, challengeDays, nextPersonalization)
        }}
      />
    )
  }

  // Guide completion screen
  if (guideComplete) {
    return (
      <div className={`sg ${inter.className}`}>
        {/* ── Sticky top bar ────────────────────────── */}
        <header className="sg-topbar">
          <Link href="/" className={`sg-logo-text ${cormorant.className}`}>SSELFIE</Link>
          <span className="sg-topbar-label">Selfie Guide · Complete</span>
        </header>

        {/* ── Completion card ───────────────────────── */}
        <main className="sg-main sg-main-centered">
          <div className="sg-complete-card">
            <p className="sg-eyebrow">You did it</p>
            <h1 className={`sg-complete-title ${cormorant.className}`}>You have a starting point.</h1>
            <p className="sg-complete-sub">
              Seven days of real photos done. The next step is making them easier to edit and use.
            </p>
            <div className="sg-funnel-ctas" style={{ justifyContent: "flex-start", marginTop: "28px" }}>
              <Link
                href={withGuideStarterKitAttribution("/checkout/starter-kit", token)}
                className="sg-cta-primary"
                onClick={() => trackGuideUpsellClick("/checkout/starter-kit", "starter_kit")}
              >
                Get the Starter Kit · $37
              </Link>
            </div>
            <p className="sg-funnel-price" style={{ marginTop: "14px", fontSize: "12px", color: "rgba(200,196,187,0.6)" }}>
              $37 · One time. No subscription.
            </p>
          </div>
        </main>

        <style jsx global>{`
          html, body { background: #0a0a0a; margin: 0; padding: 0; }
          .sg {
            --c-black: #0a0a0a; --c-surface: #161514; --c-char: #1c1b19;
            --c-border: rgba(168,164,156,0.14); --c-stone: #e5e5e5;
            --c-smoke: #f5f5f5; --c-cream: #ffffff; --c-pale: rgba(240,237,232,0.72);
            --prose-w: 700px;
            min-height: 100vh; background: var(--c-black); color: var(--c-cream);
          }
          .sg-topbar {
            position: sticky; top: 0; z-index: 60;
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px clamp(24px,5vw,64px);
            background: rgba(13,12,11,0.92); border-bottom: 1px solid var(--c-border);
            backdrop-filter: blur(20px);
          }
          .sg-logo-text {
            font-size: 17px; font-weight: 300; letter-spacing: 0.18em;
            text-transform: uppercase; color: var(--c-cream); text-decoration: none;
          }
          .sg-topbar-label {
            font-size: 9px; font-weight: 500; letter-spacing: 0.38em;
            text-transform: uppercase; color: var(--c-smoke);
          }
          .sg-main-centered {
            display: flex; align-items: center; justify-content: center;
            min-height: calc(100vh - 60px); padding: 64px clamp(24px,5vw,64px);
          }
          .sg-complete-card {
            max-width: var(--prose-w); width: 100%;
            padding: 48px 40px;
            background: rgba(28,27,25,0.8);
            border: 1px solid rgba(195,190,182,0.25);
            border-radius: 3px;
          }
          .sg-complete-title {
            font-size: clamp(42px,7vw,88px); font-weight: 300;
            line-height: 0.96; letter-spacing: -0.02em; text-transform: uppercase;
            color: var(--c-cream); margin: 10px 0 16px;
          }
          .sg-complete-sub {
            font-size: 16px; font-weight: 300; line-height: 1.8;
            color: var(--c-stone); max-width: 44ch; margin: 0;
          }
          .sg-complete-member {
            margin-top: 20px; font-size: 13px; font-weight: 300;
            color: rgba(200,196,187,0.7);
          }
          .sg-eyebrow {
            display: block; font-size: 9px; font-weight: 500; letter-spacing: 0.48em;
            text-transform: uppercase; color: var(--c-stone); margin-bottom: 14px;
          }
          .sg-funnel-ctas { display: flex; flex-wrap: wrap; gap: 12px; }
          .sg-cta-primary, .sg-cta-secondary {
            display: inline-block; padding: 13px 22px; text-decoration: none;
            font-size: 9px; font-weight: 500; letter-spacing: 0.36em;
            text-transform: uppercase; border-radius: 999px;
            transition: opacity 0.18s ease; text-align: center;
          }
          .sg-cta-primary { background: var(--c-cream); color: var(--c-black); border: none; }
          .sg-cta-primary:hover { opacity: 0.88; }
          .prose-link { color: var(--c-cream); text-underline-offset: 3px; }
        `}</style>
      </div>
    )
  }

  return (
    <div className={`sg ${inter.className}`}>
      {/* ── Sticky top bar (replaces sidebar) ───────── */}
      <header className="sg-topbar">
        <Link href="/" className={`sg-logo-text ${cormorant.className}`}>SSELFIE</Link>
        <span className="sg-topbar-label">Selfie Guide</span>
      </header>

      {/* ── Main ────────────────────────────────────── */}
      <main className="sg-main">
        {/* ── Hero ──────────────────────────────────── */}
        <section className="sg-hero" aria-label="Guide hero">
          <div className="sg-hero-image-fill">
            <Image
              src={HERO_IMAGE.src}
              alt={HERO_IMAGE.alt}
              fill
              priority
              sizes="100vw"
              className="sg-hero-img"
            />
          </div>
          <div className="sg-hero-gradient" />

          <div className="sg-hero-content">
            <p className="sg-eyebrow">Free Selfie Guide</p>
            <h1 className={`sg-hero-title ${cormorant.className}`}>
              Better selfies.<br />With your iPhone.
            </h1>
            <p className={`sg-hero-for ${cormorant.className}`}>
              Built for {firstName}
            </p>
            <p className="sg-hero-sub">
              Mirror selfies, car selfies, window light, and simple editing. Everything you need to take a better phone photo.
            </p>
            <div className="sg-hero-badges">
              <span>iPhone selfie tips</span>
              <span>7-day challenge</span>
              <span>Mirror, car, full-body</span>
            </div>
          </div>

          <div className="sg-hero-scroll">
            <span>Begin reading</span>
            <span className="sg-scroll-arrow" aria-hidden>↓</span>
          </div>
        </section>

        {/* ── Progress bar ──────────────────────────── */}
        <div className="sg-progress-wrap">
          <ChapterProgressBar
            currentIndex={activeChapterIndex}
            totalChapters={chapters.length}
            currentTitle={currentChapterTitle}
            completedChapters={completedChapters}
          />
        </div>

        {/* ── Chapter ───────────────────────────────── */}
        <section className="sg-chapter" id={currentChapter.id}>

          {/* Chapter header */}
          <header className="sg-chapter-header">
            <p className="sg-eyebrow">
              Section {String(partNumber).padStart(2, "0")} / {String(chapters.length).padStart(2, "0")}
            </p>
            {currentChapterMood && (
              <p className="sg-chapter-eyebrow">{currentChapterMood.eyebrow}</p>
            )}
            <h2 className={`sg-chapter-title ${cormorant.className}`}>{currentChapterTitle}</h2>
            {currentChapterMood && (
              <p className={`sg-chapter-sub ${cormorant.className}`}>{currentChapterMood.copy}</p>
            )}
            {quickWinTip && (
              <div
                style={{
                  marginTop: "16px",
                  maxWidth: "620px",
                  border: "1px solid rgba(168,164,156,0.2)",
                  background: "rgba(28,27,25,0.72)",
                  padding: "14px 16px",
                }}
              >
                <p style={{ margin: "0 0 6px", fontSize: "9px", letterSpacing: "0.36em", textTransform: "uppercase", color: "rgba(240,237,232,0.7)" }}>
                  Your quick win
                </p>
                <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.7, color: "rgba(240,237,232,0.86)" }}>
                  {quickWinTip}
                </p>
              </div>
            )}
          </header>

          {/* Chapter images — editorial pair */}
          {currentChapterMood && <ChapterImages spec={currentChapterMood} />}

          {/* Chapter body prose */}
          <div className="sg-prose">
            <ReactMarkdown components={markdownComponents}>{currentChapter.markdown}</ReactMarkdown>
          </div>

          {/* Before/After slider for Part 4 (editing chapter) */}
          {isEditChapter && (
            <div className="sg-prose" style={{ marginTop: "32px" }}>
              <BeforeAfterSlider
                beforeSrc="/images/selfie-guide/after-real.png"
                afterSrc="/images/selfie-guide/before-real.png"
                beforeAlt="Before edit portrait"
                afterAlt="After edit portrait"
                beforeLabel="Before"
                afterLabel="After edit"
                width={360}
                height={640}
              />
            </div>
          )}

          {/* 7-day challenge tracker (if applicable) */}
          {showSevenDayChallenge && (
            <div className="challenge">
              <p className="challenge-eyebrow">Your 7-Day Practice Plan</p>
              <ChallengeTracker
                completedDays={challengeDays}
                onDayComplete={(day) => {
                  const next = [...challengeDays, day].filter((v, i, a) => a.indexOf(v) === i)
                  setChallengeDays(next)
                  persistProgress(activeChapterIndex, next)
                  if (token) {
                    fetch("/api/selfie-guide/progress", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ token, chapterIndex: activeChapterIndex, challengeDays: next }),
                    }).catch(() => {})
                  }
                }}
                onChallengeComplete={(completedDays) => {
                  persistProgress(activeChapterIndex, completedDays)
                  if (token) {
                    fetch("/api/selfie-guide/progress", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        token,
                        chapterIndex: activeChapterIndex,
                        challengeDays: completedDays,
                        challengeComplete: true,
                      }),
                    }).catch(() => {})
                  }
                }}
              />
            </div>
          )}

          {/* Mark complete + navigation */}
          <div className="sg-chapter-nav">
            <button
              type="button"
              className="sg-nav-btn sg-nav-prev"
              disabled={activeChapterIndex === 0}
              onClick={() => {
                setActiveChapterIndex(prev => Math.max(prev - 1, 0))
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
            >
              <span>←</span>
              <span>Previous</span>
            </button>

            <span className="sg-nav-divider" aria-hidden />

            <button
              type="button"
              className="sg-nav-btn sg-nav-complete"
              onClick={markChapterComplete}
            >
              <span>{activeChapterIndex === chapters.length - 1 ? "Finish Guide" : "Mark complete →"}</span>
            </button>
          </div>
        </section>

        {/* ── Funnel CTA ────────────────────────────── */}
        <section className="sg-funnel">
          <div className="sg-funnel-inner">
            <p className="sg-eyebrow">Starter Kit</p>
            <h3 className={`sg-funnel-title ${cormorant.className}`}>
              One session. Seven days of content.
            </h3>
            <p className="sg-funnel-copy">
              Your selfie is the foundation. The Starter Kit helps you make it camera-ready:
              the posing cheatsheet, the exact presets I use, and a simple content starter so
              your photos have somewhere to go. This is the next step before one selfie becomes
              a full brand shoot.
            </p>
            <div className="sg-funnel-product-img">
              <Image
                src="/images/selfie-guide/sg-cta-01.png"
                alt="The Selfie Starter Kit — presets, editing walkthroughs, and a 7-day content starter"
                width={1448}
                height={1086}
                style={{ width: "100%", height: "auto", borderRadius: "8px", display: "block" }}
              />
            </div>
            <p className="sg-funnel-price">$37 · One time.</p>
            <div className="sg-funnel-ctas">
              <Link
                href={withGuideStarterKitAttribution("/checkout/starter-kit", token)}
                className="sg-cta-primary"
                onClick={() => trackGuideUpsellClick("/checkout/starter-kit", "starter_kit")}
              >
                Get the Starter Kit · $37
              </Link>
            </div>
            <p className="sg-funnel-note">No subscription. Yours to keep.</p>
            <p className="sg-funnel-quiet">Questions? Reply to your welcome email.</p>
          </div>
        </section>
      </main>

      {/* ── Styles ──────────────────────────────────── */}
      <style jsx global>{`
        html, body {
          background: #0a0a0a;
          margin: 0;
          padding: 0;
        }

        .sg {
          --c-black:   #0a0a0a;
          --c-surface: #161514;
          --c-char:    #1c1b19;
          --c-border:  rgba(168, 164, 156, 0.14);
          --c-stone:   #e5e5e5;
          --c-smoke:   #f5f5f5;
          --c-cream:   #ffffff;
          --c-pale:    rgba(240, 237, 232, 0.72);
          --prose-w:   700px;
          --gap:       clamp(24px, 5vw, 64px);
          min-height: 100vh;
          background: var(--c-black);
          color: var(--c-cream);
        }

        /* ── Top bar (replaces sidebar) ─────────── */

        .sg-topbar {
          position: sticky;
          top: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px clamp(24px, 5vw, 64px);
          background: rgba(13, 12, 11, 0.92);
          border-bottom: 1px solid var(--c-border);
          backdrop-filter: blur(20px);
        }

        .sg-logo-text {
          font-size: 17px;
          font-weight: 300;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--c-cream);
          text-decoration: none;
        }

        .sg-topbar-label {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.38em;
          text-transform: uppercase;
          color: var(--c-smoke);
        }

        /* ── Progress bar wrap ────────── */

        .sg-progress-wrap {
          max-width: var(--prose-w);
          margin: 0 auto;
          padding: 28px clamp(24px, 5vw, 64px) 0;
        }

        /* ── Sidebar (kept for legacy, hidden) ─── */

        .sg-sidebar {
          display: none;
          position: fixed;
          left: 0; top: 0; bottom: 0;
          width: 260px;
          background: var(--c-char);
          border-right: 1px solid var(--c-border);
          flex-direction: column;
          flex-direction: column;
          z-index: 80;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        .sg-sidebar-logo {
          padding: 32px 28px 24px;
          border-bottom: 1px solid var(--c-border);
          flex-shrink: 0;
        }

        .sg-logo-text {
          display: block;
          font-size: 17px;
          font-weight: 300;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--c-cream);
          text-decoration: none;
        }

        .sg-logo-sub {
          margin: 4px 0 0;
          font-size: 8px;
          font-weight: 500;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: var(--c-smoke);
        }

        .sg-sidebar-progress {
          padding: 16px 28px;
          border-bottom: 1px solid var(--c-border);
          flex-shrink: 0;
        }

        .sg-progress-label {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.38em;
          text-transform: uppercase;
          color: var(--c-smoke);
          margin-bottom: 8px;
        }

        .sg-progress-track {
          height: 1px;
          background: var(--c-border);
        }

        .sg-progress-fill {
          height: 1px;
          background: var(--c-cream);
          transition: width 0.35s ease;
        }

        .sg-progress-pct {
          margin-top: 6px;
          font-size: 11px;
          color: var(--c-smoke);
        }

        .sg-sidebar-nav {
          padding: 12px 0;
          flex: 1;
        }

        .sg-nav-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
          padding: 10px 28px;
          text-align: left;
          background: none;
          border: none;
          border-left: 2px solid transparent;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease;
        }

        .sg-nav-item:hover {
          background: rgba(240, 237, 232, 0.04);
        }

        .sg-nav-item.is-active {
          border-left-color: var(--c-cream);
          background: rgba(240, 237, 232, 0.05);
        }

        .sg-nav-num {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.3em;
          color: var(--c-smoke);
          min-width: 22px;
          line-height: 1.6;
          flex-shrink: 0;
        }

        .sg-nav-item.is-active .sg-nav-num,
        .sg-nav-item.is-done .sg-nav-num {
          color: var(--c-cream);
        }

        .sg-nav-title {
          font-size: 11px;
          font-weight: 300;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--c-smoke);
          line-height: 1.55;
        }

        .sg-nav-item.is-active .sg-nav-title {
          color: var(--c-cream);
        }

        /* ── Overlay (mobile) ─────────── */

        .sg-overlay {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 70;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
        }

        /* ── Mobile header ────────────── */

        .sg-mobile-header {
          display: none;
          position: sticky;
          top: 0;
          z-index: 60;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: rgba(13, 12, 11, 0.92);
          border-bottom: 1px solid var(--c-border);
          backdrop-filter: blur(20px);
        }

        .sg-menu-btn {
          display: flex;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }

        .sg-menu-btn span {
          display: block;
          width: 22px;
          height: 1px;
          background: var(--c-cream);
        }

        .sg-mobile-logo {
          font-size: 15px;
          font-weight: 300;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--c-cream);
          text-decoration: none;
        }

        .sg-mobile-progress {
          font-size: 10px;
          letter-spacing: 0.2em;
          color: var(--c-smoke);
        }

        /* ── Main ────────────────────── */

        .sg-main {
          margin-left: 0;
          min-height: 100vh;
        }

        /* ── Hero ─────────────────────── */

        .sg-hero {
          position: relative;
          height: 100vh;
          min-height: 600px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .sg-hero-image-fill {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .sg-hero-img {
          object-fit: cover;
          object-position: center 20%;
        }

        .sg-hero-gradient {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(
              to bottom,
              rgba(13, 12, 11, 0.08) 0%,
              rgba(13, 12, 11, 0.22) 30%,
              rgba(13, 12, 11, 0.72) 62%,
              rgba(13, 12, 11, 0.97) 100%
            );
        }

        .sg-hero-content {
          position: relative;
          z-index: 2;
          padding: 0 clamp(28px, 6vw, 80px) 48px;
          max-width: 860px;
        }

        .sg-eyebrow {
          display: block;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.48em;
          text-transform: uppercase;
          color: var(--c-stone);
          margin-bottom: 14px;
        }

        .sg-hero-title {
          font-size: clamp(48px, 8vw, 108px);
          font-weight: 300;
          line-height: 0.94;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          color: var(--c-cream);
          margin: 0 0 18px;
        }

        .sg-hero-for {
          font-size: clamp(18px, 2.4vw, 28px);
          font-weight: 300;
          font-style: italic;
          color: var(--c-stone);
          margin: 0 0 14px;
        }

        .sg-hero-sub {
          font-size: clamp(13px, 1.4vw, 16px);
          font-weight: 300;
          line-height: 1.75;
          color: rgba(240, 237, 232, 0.68);
          max-width: 460px;
          margin: 0 0 20px;
        }

        .sg-hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .sg-hero-badges span {
          border: 1px solid rgba(168, 164, 156, 0.22);
          background: rgba(240, 237, 232, 0.06);
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 9px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(240, 237, 232, 0.78);
        }

        .sg-hero-scroll {
          position: absolute;
          bottom: 28px;
          right: clamp(28px, 5vw, 64px);
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: var(--c-smoke);
        }

        .sg-hero-scroll span {
          font-size: 8px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
        }

        .sg-scroll-arrow {
          font-size: 14px;
          animation: sg-bob 2s ease-in-out infinite;
        }

        @keyframes sg-bob {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(5px); }
        }

        /* ── Chapter ─────────────────── */

        .sg-chapter {
          padding: clamp(56px, 8vw, 96px) 0 64px;
          animation: sg-fade-in 0.4s ease;
        }

        @keyframes sg-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .sg-chapter-header {
          max-width: var(--prose-w);
          margin: 0 auto;
          padding: 0 clamp(24px, 5vw, 64px) 40px;
        }

        .sg-chapter-eyebrow {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.44em;
          text-transform: uppercase;
          color: var(--c-stone);
          margin: 8px 0 0;
        }

        .sg-chapter-title {
          font-size: clamp(34px, 5vw, 64px);
          font-weight: 300;
          line-height: 1.0;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          color: var(--c-cream);
          margin: 10px 0 0;
        }

        .sg-chapter-sub {
          font-size: clamp(15px, 1.8vw, 19px);
          font-weight: 300;
          font-style: italic;
          line-height: 1.7;
          color: var(--c-stone);
          margin: 14px 0 0;
          max-width: 52ch;
        }

        /* ── Chapter images ──────────── */

        .chapter-images {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 0 clamp(24px, 5vw, 64px) 48px;
          max-width: calc(var(--prose-w) + 200px);
          margin: 0 auto;
        }

        .chapter-img-item {
          margin: 0;
        }

        .chapter-img-wrap {
          overflow: hidden;
          border-radius: 3px;
          background: var(--c-surface);
        }

        .chapter-img {
          width: 100%;
          height: auto;
          display: block;
        }

        .chapter-img-caption {
          margin-top: 8px;
          font-size: 11px;
          font-style: italic;
          color: var(--c-smoke);
          line-height: 1.55;
        }

        /* ── Prose ───────────────────── */

        .sg-prose {
          max-width: var(--prose-w);
          margin: 0 auto;
          padding: 0 clamp(24px, 5vw, 64px);
        }

        .prose-p {
          font-size: 16px;
          font-weight: 300;
          line-height: 1.9;
          color: var(--c-stone);
          margin: 0 0 18px;
        }

        .prose-h1,
        .prose-h2 {
          font-size: clamp(22px, 3vw, 32px);
          font-weight: 400;
          line-height: 1.15;
          letter-spacing: 0.01em;
          text-transform: uppercase;
          color: var(--c-cream);
          margin: 48px 0 14px;
        }

        .prose-h3 {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: var(--c-cream);
          margin: 32px 0 10px;
        }

        .prose-strong {
          color: var(--c-cream);
          font-weight: 400;
        }

        .prose-em {
          font-style: italic;
          color: var(--c-pale);
        }

        .prose-blockquote {
          margin: 28px 0;
          padding: 0 0 0 22px;
          border-left: 2px solid var(--c-pale);
        }

        .prose-blockquote .prose-p {
          margin: 0 0 8px;
          font-size: 17px;
          font-style: italic;
          color: var(--c-stone);
        }

        .prose-blockquote .prose-p:last-child {
          margin-bottom: 0;
        }

        .prose-ul,
        .prose-ol {
          padding-left: 0;
          margin: 0 0 18px;
          list-style: none;
        }

        .prose-li {
          font-size: 16px;
          font-weight: 300;
          line-height: 1.8;
          color: var(--c-stone);
          padding: 4px 0 4px 20px;
          position: relative;
        }

        .prose-li::before {
          content: "—";
          position: absolute;
          left: 0;
          color: var(--c-smoke);
          font-size: 12px;
        }

        .prose-hr {
          border: none;
          border-top: 1px solid var(--c-border);
          margin: 40px 0;
        }

        .prose-link {
          color: var(--c-cream);
          text-underline-offset: 3px;
        }

        /* ── Checklist items ─────────── */

        .checklist-li {
          padding: 0;
          margin: 4px 0;
        }

        .checklist-li::before {
          display: none;
        }

        .checklist-btn {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px 0;
          text-align: left;
        }

        .checklist-box {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          border: 1px solid rgba(168, 164, 156, 0.4);
          margin-top: 3px;
          transition: background 0.18s ease, border-color 0.18s ease;
        }

        .checklist-box.is-checked {
          background: var(--c-cream);
          border-color: var(--c-cream);
        }

        .checklist-label {
          font-size: 15px;
          font-weight: 300;
          line-height: 1.7;
          color: var(--c-stone);
          transition: color 0.18s ease;
        }

        .checklist-label.is-checked {
          color: var(--c-smoke);
          text-decoration: line-through;
          text-decoration-color: rgba(168, 164, 156, 0.4);
        }

        /* ── Inline image blocks ─────── */

        .prose-img-block {
          margin: 36px -24px;
          padding: 0;
        }

        .prose-img-label {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: var(--c-smoke);
          padding: 0 24px;
          margin-bottom: 10px;
        }

        .prose-img-wrap {
          overflow: hidden;
          background: var(--c-surface);
        }

        .prose-img {
          width: 100%;
          height: auto;
          display: block;
        }

        .prose-img-caption {
          font-size: 11px;
          font-style: italic;
          color: var(--c-smoke);
          line-height: 1.55;
          padding: 8px 24px 0;
        }

        .settings-visual-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          padding: 0 24px;
        }

        .settings-visual-item,
        .lighting-visual-item {
          margin: 0;
        }

        .settings-visual-wrap,
        .lighting-visual-wrap {
          overflow: hidden;
          border: 1px solid var(--c-border);
          background: rgba(28, 27, 25, 0.92);
        }

        .settings-visual-image,
        .lighting-visual-image {
          display: block;
          width: 100%;
          height: auto;
        }

        .settings-visual-step,
        .lighting-visual-label {
          padding-top: 8px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--c-cream);
        }

        .lighting-visual-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          padding: 0 24px;
        }

        /* ── Maya gallery ────────────── */

        .maya-gallery {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin: 32px 0;
        }

        .maya-item {
          margin: 0;
        }

        .maya-img-wrap {
          overflow: hidden;
          border-radius: 2px;
          background: var(--c-surface);
        }

        .maya-img {
          width: 100%;
          height: auto;
          display: block;
        }

        .maya-item figcaption {
          margin-top: 6px;
          font-size: 10px;
          font-style: italic;
          color: var(--c-smoke);
          line-height: 1.4;
        }

        /* ── Feed preview ────────────── */

        .feed-preview {
          margin: 32px 0;
        }

        .feed-preview-wrap {
          overflow: hidden;
          border-radius: 2px;
          max-width: 480px;
          background: var(--c-surface);
        }

        .feed-preview-img {
          width: 100%;
          height: auto;
          display: block;
        }

        .feed-preview figcaption {
          margin-top: 10px;
          font-size: 12px;
          font-style: italic;
          color: var(--c-smoke);
          line-height: 1.6;
          max-width: 480px;
        }

        /* ── 7-Day challenge ─────────── */

        .challenge {
          max-width: var(--prose-w);
          margin: 48px auto 0;
          padding: 0 clamp(24px, 5vw, 64px);
        }

        .challenge-eyebrow {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.44em;
          text-transform: uppercase;
          color: var(--c-smoke);
          margin-bottom: 20px;
        }

        .challenge-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .challenge-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 14px 12px;
          background: rgba(28, 27, 25, 0.8);
          border: 1px solid var(--c-border);
          border-radius: 2px;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
        }

        .challenge-card:hover {
          border-color: rgba(168, 164, 156, 0.3);
        }

        .challenge-card.is-done {
          border-color: rgba(240, 237, 232, 0.28);
          background: rgba(240, 237, 232, 0.05);
        }

        .challenge-num {
          font-size: 20px;
          font-weight: 300;
          font-family: 'Cormorant Garamond', serif;
          color: var(--c-cream);
          line-height: 1;
        }

        .challenge-card.is-done .challenge-num {
          color: var(--c-stone);
        }

        .challenge-title {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--c-cream);
          line-height: 1.4;
        }

        .challenge-desc {
          font-size: 11px;
          font-weight: 300;
          line-height: 1.55;
          color: var(--c-smoke);
        }

        /* ── Chapter nav ─────────────── */

        .sg-chapter-nav {
          display: flex;
          align-items: center;
          gap: 0;
          max-width: var(--prose-w);
          margin: 64px auto 0;
          padding: 0 clamp(24px, 5vw, 64px);
          border-top: 1px solid var(--c-border);
        }

        .sg-nav-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 0;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: var(--c-stone);
          transition: color 0.18s ease;
        }

        .sg-nav-btn:hover:not(:disabled) {
          color: var(--c-cream);
        }

        .sg-nav-btn:disabled {
          opacity: 0.28;
          cursor: default;
        }

        .sg-nav-prev { margin-right: auto; }
        .sg-nav-next { margin-left: auto; }
        .sg-nav-complete { margin-left: auto; }

        .sg-nav-divider {
          width: 1px;
          height: 32px;
          background: var(--c-border);
        }

        /* ── Funnel CTA ──────────────── */

        .sg-funnel {
          background: var(--c-char);
          border-top: 1px solid var(--c-border);
          padding: clamp(48px, 7vw, 96px) clamp(24px, 5vw, 64px);
        }

        .sg-funnel-inner {
          max-width: var(--prose-w);
          margin: 0 auto;
        }

        .sg-funnel-title {
          font-size: clamp(30px, 4vw, 52px);
          font-weight: 300;
          line-height: 1.08;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          color: var(--c-cream);
          margin: 10px 0 16px;
        }

        .sg-funnel-copy {
          font-size: 16px;
          font-weight: 300;
          line-height: 1.85;
          color: var(--c-stone);
          max-width: 52ch;
          margin-bottom: 28px;
        }

        .sg-funnel-product-img {
          margin: 0 0 28px;
          border-radius: 8px;
          overflow: hidden;
        }

        .sg-funnel-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
        }

        .sg-cta-primary,
        .sg-cta-secondary {
          display: inline-block;
          padding: 13px 22px;
          text-decoration: none;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          border-radius: 999px;
          transition: opacity 0.18s ease;
          text-align: center;
        }

        .sg-cta-primary {
          background: var(--c-cream);
          color: var(--c-black);
          border: none;
        }

        .sg-cta-primary:hover { opacity: 0.88; }

        .sg-cta-secondary {
          background: transparent;
          color: var(--c-cream);
          border: 1px solid rgba(240, 237, 232, 0.24);
        }

        .sg-cta-secondary:hover {
          opacity: 0.88;
        }

        .sg-cta-primary.is-disabled {
          opacity: 0.72;
          cursor: wait;
        }

        .sg-funnel-price {
          margin: 0 0 20px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--c-smoke);
        }

        .sg-funnel-note {
          margin-top: 14px;
          font-size: 13px;
          font-weight: 300;
          color: var(--c-smoke);
        }

        .sg-funnel-quiet {
          margin-top: 6px;
          font-size: 12px;
          font-weight: 300;
          color: rgba(200, 196, 187, 0.55);
        }

        .sg-funnel-status {
          margin-top: 14px;
          font-size: 12px;
          line-height: 1.7;
          color: var(--c-smoke);
        }

        /* ── Mobile responsive ────────── */

        @media (max-width: 900px) {
          .sg-hero {
            height: 90vh;
          }

          .sg-hero-img {
            object-position: 70% 10%;
          }

          .chapter-images {
            grid-template-columns: 1fr;
          }

          .challenge-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .maya-gallery {
            grid-template-columns: repeat(3, 1fr);
          }

          .prose-img-block {
            margin: 28px 0;
          }

          .settings-visual-grid,
          .lighting-visual-grid {
            grid-template-columns: 1fr;
            padding: 0;
          }
        }

        @media (max-width: 480px) {
          .sg-hero-title {
            font-size: clamp(40px, 11vw, 64px);
          }

          .challenge-grid {
            grid-template-columns: 1fr 1fr;
          }

          .maya-gallery {
            grid-template-columns: repeat(2, 1fr);
          }

          .sg-funnel-ctas {
            flex-direction: column;
          }

          .sg-cta-primary {
            text-align: center;
          }

          .sg-cta-secondary {
            text-align: center;
          }
        }
      `}</style>
    </div>
  )
}
