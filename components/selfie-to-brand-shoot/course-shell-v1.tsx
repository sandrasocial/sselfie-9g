import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { CopyPromptButton } from "./copy-prompt-button"
import { MayaPromptConcierge } from "./maya-prompt-concierge"
import { TrackedCourseLink } from "./tracked-course-link"
import type { CourseBrandStrategy } from "@/lib/selfie-to-brand-shoot/brand-strategy"
import {
  CourseExperienceProvider,
  CoursePathMap,
  LookPicker,
  ModulePanel,
  PersonalizedContentPlan,
  ResumeHero,
  SignatureWorldRecap,
  Step0Panel,
  type CourseModuleMeta,
  type LookOption,
} from "./course-experience"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-cormorant",
})
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] })

type ShellAccessMode = "token" | "academy"

type SelfieToBrandShootCourseShellProps = {
  firstName?: string | null
  vaultHref: string
  accessMode: ShellAccessMode
  hasStudioAccess?: boolean
  hasPromptVaultAccess?: boolean
  brandStrategy?: CourseBrandStrategy | null
  brandStrategyHref?: string
}

const sourceSelfies = [
  {
    label: "Clear front",
    note: "Best beginner source photo",
    image: "/images/selfie-to-brand-shoot/module-1-source-selfies/good-front-selfie.png",
    objectPosition: "center 38%",
  },
  {
    label: "Clear 3/4",
    note: "Editorial, but still readable",
    image: "/images/selfie-to-brand-shoot/module-1-source-selfies/good-3-4-selfie.png",
    objectPosition: "center 38%",
  },
  {
    label: "Mirror support",
    note: "Useful for outfit direction",
    image: "/images/selfie-to-brand-shoot/module-1-source-selfies/okay-mirror-selfie.png",
    objectPosition: "center 34%",
  },
]

const selfieExampleCards = [
  {
    label: "Good Selfie",
    eyebrow: "Use this when possible",
    images: [
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/good-front-selfie.png",
        label: "Clear front",
        objectPosition: "center 38%",
      },
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/good-3-4-selfie.png",
        label: "Clear 3/4",
        objectPosition: "center 38%",
      },
    ],
    traits: [
      "Clear face",
      "Soft natural light",
      "Full facial features visible",
      "No heavy filter",
      "Simple background",
      "Natural expression",
    ],
    note: "This gives AI the best chance of keeping you recognizable.",
  },
  {
    label: "Okay Selfie",
    eyebrow: "Can work, but may need more tries",
    images: [
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/okay-mirror-selfie.png",
        label: "Mirror support",
        objectPosition: "center 34%",
      },
    ],
    traits: [
      "Mirror selfie",
      "Busier background",
      "Phone partly visible",
      "A little farther away",
      "Still clear enough",
    ],
    note: "This might work, but expect more variation. If your first result looks off, try a clearer selfie before changing the prompt.",
  },
  {
    label: "Bad Selfie",
    eyebrow: "Do not start here",
    images: [
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/bad-blurry-selfie.png",
        label: "Blurry",
        objectPosition: "center 40%",
      },
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/bad-filtered-selfie.png",
        label: "Filtered",
        objectPosition: "center 40%",
      },
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/bad-covered-face-selfie.png",
        label: "Covered",
        objectPosition: "center 38%",
      },
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/bad-group-or-cropped-selfie.png",
        label: "Unclear",
        objectPosition: "center 40%",
      },
    ],
    traits: [
      "Face covered",
      "Blurry or dark",
      "Heavy filter",
      "Face too small",
      "Group photo",
      "Cropped face",
    ],
    note: "Bad input creates fake output. Do not fight the prompt if the source selfie is the problem.",
  },
]

const sourceSelfieChecklist = [
  "My face is clear and sharp.",
  "My full face is visible.",
  "My eyes, nose, mouth, jawline, and hairline are not hidden.",
  "The photo is well-lit.",
  "The photo is not blurry.",
  "The photo is not overly filtered.",
  "I am the only person in the image.",
  "My face is not too far away.",
  "My head is not cropped.",
  "My face is not covered by sunglasses, hair, hands, or phone.",
  "My expression feels natural.",
  "My skin tone and hair color look close to real life.",
]

const fakeResultChecks = [
  {
    problem: "Face does not look like you",
    fix: "Try a clearer front-facing selfie.",
  },
  {
    problem: "Skin tone is wrong",
    fix: "Use a natural-light selfie without a heavy filter.",
  },
  {
    problem: "Hair looks wrong",
    fix: "Use a photo where hair color and hairline are visible.",
  },
  {
    problem: "Face looks too perfect",
    fix: "Ask for natural skin texture and realistic face detail.",
  },
  {
    problem: "Result looks too AI",
    fix: "Choose a calmer look before changing everything.",
  },
]

const scatteredGridImages = [
  {
    role: "No visual anchor",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/before-grid-01-casual-low-light.jpeg",
    objectPosition: "center 30%",
  },
  {
    role: "Different story",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/before-grid-02-random-party.jpeg",
    objectPosition: "center 34%",
  },
  {
    role: "Harsh signal",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/before-grid-03-harsh-mirror.jpeg",
    objectPosition: "center 34%",
  },
  {
    role: "Event-only identity",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/before-grid-04-event-backdrop.jpeg",
    objectPosition: "center 34%",
  },
  {
    role: "Lost mood",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/before-grid-05-travel-shadow.jpeg",
    objectPosition: "center 35%",
  },
  {
    role: "Weak clarity",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/before-grid-06-blurry-selfie.png",
    objectPosition: "center 35%",
  },
  {
    role: "Hidden identity",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/before-grid-07-covered-mirror.png",
    objectPosition: "center 34%",
  },
  {
    role: "Not recognizable",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/before-grid-08-filtered-face.png",
    objectPosition: "center 32%",
  },
  {
    role: "Not brand-led",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/before-grid-09-group-crop.png",
    objectPosition: "center 32%",
  },
]

const cohesiveGridImages = [
  {
    role: "Hero identity",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-01-hero-identity.jpeg",
    objectPosition: "center 26%",
  },
  {
    role: "Outfit",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-02-outfit-full-body.jpeg",
    objectPosition: "center 28%",
  },
  {
    role: "Lifestyle detail",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-03-lifestyle-detail.jpeg",
    objectPosition: "center 48%",
  },
  {
    role: "Transition",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-04-movement-transition.jpeg",
    objectPosition: "center 30%",
  },
  {
    role: "Brand anchor",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-05-brand-anchor.jpeg",
    objectPosition: "center 26%",
  },
  {
    role: "Close texture",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-06-detail-texture.jpeg",
    objectPosition: "center 56%",
  },
  {
    role: "Work moment",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-07-work-creator.jpeg",
    objectPosition: "center 46%",
  },
  {
    role: "Profile candidate",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-08-profile-candidate.jpeg",
    objectPosition: "center 24%",
  },
  {
    role: "Quiet ending",
    src: "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-09-quiet-ending.jpeg",
    objectPosition: "center 50%",
  },
]

const brandWorldCards = [
  {
    name: "Dark Editorial",
    swatches: ["#0A0A0A", "#3A3A3A", "#7D7E80", "#C5C6C8"],
    signal: "Power, mystery, editorial confidence.",
    feeling: "The woman who has entered her next era and does not need to explain herself.",
    colorMood: "Black, charcoal, silver-gray, cool shadows, high contrast.",
    lighting: "Flat overcast light, deep shadows, underexposed editorial contrast.",
    wardrobe: "Black blazer, lace, structured layers, dark tailoring.",
    background: "European street, stone facades, cobblestones, architectural texture.",
    emotionalSignal: "Commanding, private, cinematic, untouchable.",
    chooseIf:
      "You want your brand to feel powerful, fashion-led, confident, and a little mysterious.",
    hero: "/images/ai-prompts/noir-femme-shot-3.png",
    supporting: [
      "/images/ai-prompts/noir-femme-shot-1.png",
      "/images/ai-prompts/noir-femme-shot-6.png",
    ],
    profile: "/images/ai-prompts/noir-femme-shot-6.png",
    reel: "/images/ai-prompts/noir-femme-shot-1.png",
    detail: "/images/ai-prompts/noir-femme-shot-4.png",
    visualCode: {
      colors: "Black, charcoal, cool silver, low-saturation stone.",
      lighting: "Moody directional light, deep shadows, editorial contrast.",
      wardrobe: "Black tailoring, structured layers, lace or sleek evening pieces.",
      background: "European street, stone architecture, dark interiors, city texture.",
      signal: "Powerful, mysterious, cinematic, untouchable.",
      repeat: "Black wardrobe, strong posture, cool shadows, architectural backgrounds.",
      avoid: "Bright casual colors, playful props, soft beach settings, over-smiling.",
    },
  },
  {
    name: "Clean & Bright",
    swatches: ["#FFFFFF", "#EDE9E3", "#D6D3CC", "#E4D9CC"],
    signal: "Fresh, clean, modern founder energy.",
    feeling: "The woman who builds her next chapter from calm routines and soft discipline.",
    colorMood: "White, ivory in imagery, oat, pale gray, gentle natural skin tones.",
    lighting: "Soft morning window light, airy shadows, low contrast, natural glow.",
    wardrobe: "White tanks, cream knits, soft cardigans, wide-leg trousers.",
    background: "Bedroom, bathroom, kitchen, living room, laptop, coffee, skincare.",
    emotionalSignal: "Fresh, trustworthy, calm, focused, quietly ambitious.",
    chooseIf: "You want your personal brand to feel clean, feminine, modern, and easy to trust.",
    hero: "/images/ai-prompts/clean-girl-morning-shot-10.jpg",
    supporting: [
      "/images/ai-prompts/clean-girl-morning-shot-4.jpg",
      "/images/ai-prompts/clean-girl-morning-shot-1.jpg",
    ],
    profile: "/images/ai-prompts/clean-girl-morning-shot-10.jpg",
    reel: "/images/ai-prompts/clean-girl-morning-shot-4.jpg",
    detail: "/images/ai-prompts/clean-girl-morning-shot-6.jpg",
    visualCode: {
      colors: "White, soft gray, oat neutrals, natural skin tones.",
      lighting: "Soft morning window light, airy contrast, gentle shadows.",
      wardrobe: "White tanks, soft cardigans, simple founder basics, clean knits.",
      background: "Bedroom, bathroom, kitchen, laptop, coffee, skincare details.",
      signal: "Fresh, trustworthy, focused, quietly ambitious.",
      repeat: "Clean light, simple home routines, laptop or coffee moments, soft styling.",
      avoid: "Heavy filters, dark dramatic edits, cluttered backgrounds, loud colors.",
    },
  },
  {
    name: "Polished City",
    swatches: ["#1C1A17", "#4A3E33", "#9A958E", "#E2DFDA"],
    signal: "Polished, cinematic, city authority.",
    feeling: "The woman who is feminine, strategic, and seen in the room before she says a word.",
    colorMood: "Black, espresso, muted stone, city neutrals, soft cafe reflections.",
    lighting: "Soft urban light, cafe window reflections, moody but readable.",
    wardrobe: "Black structured blazer, sleek dress, boots, sunglasses, minimal gold.",
    background: "City cafe, marble tables, street arrival, glass windows.",
    emotionalSignal: "Feminine power, intention, elegance, social confidence.",
    chooseIf:
      "You want your brand to feel polished, cinematic, and grown-up without going full dark editorial.",
    hero: "/images/ai-prompts/dark-feminine-cafe-shot-3.jpg",
    supporting: [
      "/images/ai-prompts/dark-feminine-cafe-shot-1.jpg",
      "/images/ai-prompts/dark-feminine-cafe-shot-4.jpg",
    ],
    profile: "/images/ai-prompts/dark-feminine-cafe-shot-4.jpg",
    reel: "/images/ai-prompts/dark-feminine-cafe-shot-1.jpg",
    detail: "/images/ai-prompts/dark-feminine-cafe-shot-5.jpg",
    visualCode: {
      colors: "Black, espresso, marble, muted stone, city neutrals.",
      lighting: "Soft cafe window light, moody but readable, polished reflections.",
      wardrobe: "Black blazer, sleek dress, boots, sunglasses, minimal jewelry.",
      background: "Cafe tables, city streets, marble surfaces, glass windows.",
      signal: "Polished, cinematic, feminine, socially confident.",
      repeat: "Cafe settings, black styling, coffee moments, city authority.",
      avoid: "Beachy softness, overly casual outfits, messy light, random home clutter.",
    },
  },
  {
    name: "City Nights",
    swatches: ["#0D0E10", "#2B2E34", "#565A62", "#9AA0A8"],
    signal: "Quiet luxury, private-life intrigue.",
    feeling:
      "The woman with a high-end private life and a brand that feels like a secret people want access to.",
    colorMood: "Black, night, glass reflections, city lights, cool concrete.",
    lighting: "Evening light, balcony shadows, city glow, interior-to-exterior contrast.",
    wardrobe: "Black slip dress or evening styling, sunglasses, glossy hair.",
    background: "Balcony, city view, windows, night streets, apartment edge.",
    emotionalSignal: "Magnetic, intimate, elevated, private, cinematic.",
    chooseIf:
      "You want your audience to feel like they are watching the private cinematic version of your life.",
    hero: "/images/ai-prompts/dark-balcony-shot-6.png",
    supporting: [
      "/images/ai-prompts/dark-balcony-shot-1.png",
      "/images/ai-prompts/dark-balcony-shot-2.png",
    ],
    profile: "/images/ai-prompts/dark-balcony-shot-8.png",
    reel: "/images/ai-prompts/dark-balcony-shot-6.png",
    detail: "/images/ai-prompts/dark-balcony-shot-5.png",
    visualCode: {
      colors: "Night black, glass gray, city lights, cool concrete.",
      lighting: "Evening shadows, balcony glow, interior-to-exterior contrast.",
      wardrobe: "Black slip dress, evening styling, glossy hair, sunglasses.",
      background: "Balcony, windows, city view, private apartment edges.",
      signal: "Magnetic, private, elevated, new-era confidence.",
      repeat: "Night scenes, reflective glass, black styling, private-life framing.",
      avoid: "Flat daylight, bright beach palettes, casual denim-heavy styling.",
    },
  },
  {
    name: "Soft Coastal",
    swatches: ["#FFFFFF", "#E7E3DB", "#A7B4BB", "#CAD5DB"],
    signal: "Soft, fresh, spacious, aspirational.",
    feeling: "The woman who feels calm, free, visible, and expensive without trying too hard.",
    colorMood: "White, soft stone, sea blue-gray, pale sky, clean highlights.",
    lighting: "Golden hour, soft sunset, open natural light, airy contrast.",
    wardrobe: "White dress, soft feminine silhouettes, minimal jewelry.",
    background: "Ocean, terrace, cliffside, pool, white walls, coastal architecture.",
    emotionalSignal: "Freedom, softness, clarity, aspiration, fresh next chapter.",
    chooseIf: "You want your brand to feel light, spacious, feminine, aspirational, and peaceful.",
    hero: "/images/ai-prompts/coastal-white-shot-1.jpg",
    supporting: [
      "/images/ai-prompts/coastal-white-shot-8.jpg",
      "/images/ai-prompts/coastal-white-shot-3.jpg",
    ],
    profile: "/images/ai-prompts/coastal-white-shot-8.jpg",
    reel: "/images/ai-prompts/coastal-white-shot-1.jpg",
    detail: "/images/ai-prompts/coastal-white-shot-5.jpg",
    visualCode: {
      colors: "White, soft stone, sea blue-gray, pale sky, clean highlights.",
      lighting: "Open natural light, soft sunset, airy brightness.",
      wardrobe: "White dresses, soft feminine silhouettes, minimal jewelry.",
      background: "Ocean, terrace, white walls, cliffside, coastal architecture.",
      signal: "Soft, spacious, aspirational, peaceful, fresh.",
      repeat: "White styling, open space, ocean/terrace light, calm expressions.",
      avoid: "Heavy black edits, dark cafes, busy city clutter, harsh flash.",
    },
  },
  {
    name: "Refined Evenings",
    swatches: ["#EDE7DF", "#1A1414", "#6E2A38", "#B0875A"],
    signal: "Expensive, refined, social, elegant.",
    feeling: "The woman whose everyday content feels like a polished lifestyle editorial.",
    colorMood: "Marble white, black, wine red, candlelight, elegant neutrals.",
    lighting: "Soft indoor cafe light, candlelit shadows, polished evening atmosphere.",
    wardrobe: "Dark blazer, elevated evening styling, wine-glass elegance.",
    background: "Marble cafe, wine table, candlelit corners, polished stone.",
    emotionalSignal: "Refined, elegant, composed, social, expensive.",
    chooseIf: "You want your brand to feel polished, refined, elegant, and socially magnetic.",
    hero: "/images/ai-prompts/marble-wine-shot-1.jpg",
    supporting: [
      "/images/ai-prompts/marble-wine-shot-4.jpg",
      "/images/ai-prompts/marble-wine-shot-5.jpg",
    ],
    profile: "/images/ai-prompts/marble-wine-shot-4.jpg",
    reel: "/images/ai-prompts/marble-wine-shot-1.jpg",
    detail: "/images/ai-prompts/marble-wine-shot-5.jpg",
    visualCode: {
      colors: "Marble white, black, wine red, candlelight, refined neutrals.",
      lighting: "Soft indoor cafe light, evening shadows, polished warmth in imagery.",
      wardrobe: "Dark blazer, elevated evening styling, elegant accessories.",
      background: "Marble cafe, wine table, candlelit corner, polished stone.",
      signal: "Expensive, refined, composed, social, elegant.",
      repeat: "Marble, wine/coffee table moments, dark styling, composed posture.",
      avoid: "Low-quality selfies, gym/bathroom context, bright playful colors.",
    },
  },
  {
    name: "Casual Street",
    swatches: ["#9DB0C2", "#6E8197", "#B6B8BB", "#D7D1C6"],
    signal: "Casual confidence, cool-girl relatability.",
    feeling: "The woman who is stylish, approachable, modern, and confident in real life.",
    colorMood: "Light denim, blazer neutrals, city gray, soft blue, clean street tones.",
    lighting: "Natural city daylight, soft shadows, practical street editorial light.",
    wardrobe: "Light denim, soft blazer, casual tailoring, phone-in-hand details.",
    background: "City steps, street, glass reflection, sidewalks, urban detail.",
    emotionalSignal: "Cool, relatable, mobile, casual, current.",
    chooseIf:
      "You want your brand to feel stylish and recognizable without looking too formal or distant.",
    hero: "/images/ai-prompts/denim-street-shot-1.jpg",
    supporting: [
      "/images/ai-prompts/denim-street-shot-10.jpg",
      "/images/ai-prompts/denim-street-shot-4.jpg",
    ],
    profile: "/images/ai-prompts/denim-street-shot-12.jpg",
    reel: "/images/ai-prompts/denim-street-shot-1.jpg",
    detail: "/images/ai-prompts/denim-street-shot-5.jpg",
    visualCode: {
      colors: "Light denim, soft blue, city gray, blazer neutrals.",
      lighting: "Natural city daylight, soft street shadows, practical editorial light.",
      wardrobe: "Light denim, casual tailoring, blazer, phone-in-hand details.",
      background: "City steps, sidewalk, glass reflections, everyday urban texture.",
      signal: "Cool, relatable, modern, confident, mobile.",
      repeat: "Denim, street movement, casual tailoring, phone or coffee in hand.",
      avoid: "Overly formal evening styling, heavy luxury props, dark mystery edits.",
    },
  },
  {
    name: "Cozy & Textured",
    swatches: ["#1C1A18", "#79695A", "#A89A88", "#8A8780"],
    signal: "Warm confidence, lifestyle polish.",
    feeling: "The woman who feels grounded, tactile, and elevated - like her life has texture.",
    colorMood: "Black leather, soft knit, muted browns, mirror light, texture-forward contrast.",
    lighting: "Soft indoor light, mirror reflections, gentle lifestyle shadows.",
    wardrobe: "Leather jacket, oversized knit, simple base layers, lived-in polish.",
    background: "Bedroom, hallway, mirror, bed, textures, getting-ready spaces.",
    emotionalSignal: "Grounded, warm, tactile, confident, lived-in, elevated.",
    chooseIf: "You want your brand to feel stylish, textured, human, cozy, and quietly confident.",
    hero: "/images/ai-prompts/cozy-leather-shot-1.png",
    supporting: [
      "/images/ai-prompts/cozy-leather-shot-8.png",
      "/images/ai-prompts/cozy-leather-shot-3.png",
    ],
    profile: "/images/ai-prompts/cozy-leather-shot-8.png",
    reel: "/images/ai-prompts/cozy-leather-shot-1.png",
    detail: "/images/ai-prompts/cozy-leather-shot-5.png",
    visualCode: {
      colors: "Black leather, soft knit, muted browns, smoke gray, mirror light.",
      lighting: "Soft indoor light, mirror reflections, gentle lifestyle shadows.",
      wardrobe: "Leather jacket, oversized knit, simple base layers, lived-in polish.",
      background: "Bedroom, mirror, hallway, bed, tactile home textures.",
      signal: "Grounded, warm, tactile, confident, elevated lifestyle.",
      repeat: "Leather/knit texture, mirror moments, soft indoor scenes, relaxed posture.",
      avoid: "Beach scenes, hard corporate styling, neon color, glossy tech feeling.",
    },
  },
]

const oneWorldUses = [
  {
    label: "Profile photo",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-01-hero-identity.jpeg",
  },
  {
    label: "Reel cover",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-04-movement-transition.jpeg",
  },
  {
    label: "Story intro",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-08-profile-candidate.jpeg",
  },
  {
    label: "Carousel cover",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-02-outfit-full-body.jpeg",
  },
  {
    label: "Offer image",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-07-work-creator.jpeg",
  },
  {
    label: "About-me image",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-05-brand-anchor.jpeg",
  },
  {
    label: "Lifestyle post",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-03-lifestyle-detail.jpeg",
  },
]

const volumeAdjustments = [
  {
    label: "Softer",
    copy: "Keep the same palette and background, then soften the light and expression.",
  },
  {
    label: "Stronger",
    copy: "Keep the world, then add a sharper pose, stronger contrast, or cleaner composition.",
  },
  {
    label: "More lifestyle",
    copy: "Keep the colors and mood, then add coffee, laptop, mirror, or real daily texture.",
  },
  {
    label: "More polished",
    copy: "Keep the setting, then upgrade styling, posture, hair, and visual spacing.",
  },
  {
    label: "More sales-ready",
    copy: "Keep the identity, then choose an image with negative space or clearer authority.",
  },
  {
    label: "More cinematic",
    copy: "Keep the same world, then add movement, depth, shadow, or a stronger crop.",
  },
]

const module3HeroSequence = [
  {
    label: "Source selfie",
    image: "/images/selfie-to-brand-shoot/module-1-source-selfies/good-front-selfie.png",
    objectPosition: "center 38%",
  },
  {
    label: "Prompt direction",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-06-detail-texture.jpeg",
    objectPosition: "center top",
  },
  {
    label: "Brand shoot result",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-01-hero-identity.jpeg",
    objectPosition: "center 24%",
  },
]

const module3Outcomes = [
  "one Signature Profile Portrait",
  "one Editorial Reel Cover",
  "one Lifestyle Brand Image",
]

const brandShootLabSteps = [
  "Upload your source selfie to ChatGPT.",
  "Copy your Look from Module 2.",
  "Choose your starter shoot path: profile portrait, reel cover, or lifestyle image.",
  "Copy the starter prompt.",
  "Generate the image.",
  "Use the fix prompts if needed.",
  "Save your best result.",
  "Repeat until you have your 3-image starter shoot.",
]

const starterPromptCards = [
  {
    title: "Signature Profile Portrait",
    purpose: "A recognizable image for your profile photo, about page, or first impression.",
    when: "Use this when you need the image to clearly feel like you.",
    note: "Your face is clear, skin looks real, and the image feels polished without becoming fake.",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-08-profile-candidate.jpeg",
    prompt: `Use my uploaded source selfie as the identity reference. Create a realistic editorial personal brand portrait in my chosen Look.

Keep my facial identity, natural skin texture, real hairline, face shape, skin tone, hair color, and expression believable. Do not over-smooth or change my features.

Apply my Look:
- Look: [paste your chosen look]
- Colors: [paste your main colors]
- Lighting: [paste your lighting]
- Wardrobe: [paste your wardrobe direction]
- Background: [paste your background world]
- Emotional signal: [paste your emotional signal]

Create a close-up or half-body portrait with clean face visibility, premium editorial composition, and realistic personal brand energy. Vertical 4:5. No text, no logo, no extra people.`,
  },
  {
    title: "Editorial Reel Cover",
    purpose: "A stronger image for Reel covers, carousel covers, hooks, or your profile grid.",
    when: "Use this when the post needs more visual authority and space for text.",
    note: "The composition is stronger, the crop is vertical-safe, and the world still matches Module 2.",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-04-movement-transition.jpeg",
    prompt: `Use my uploaded source selfie as the identity reference. Create a stronger editorial brand image in the same Look.

Preserve my face, hair, skin tone, natural proportions, and recognizable expression. Keep the same colors, lighting, wardrobe direction, background world, and emotional signal from my Look.

Compose it as a premium vertical Reel cover with strong negative space for text overlay, clean silhouette, confident pose, cinematic depth, and polished personal brand feeling. Vertical 9:16 or 4:5-safe crop. No text, no logo, no extra people.`,
  },
  {
    title: "Lifestyle Brand Image",
    purpose: "A less posed image for Stories, lifestyle posts, behind the scenes, or soft selling.",
    when: "Use this when your brand needs to feel lived-in, human, and still cohesive.",
    note: "It feels like a real moment inside your look, not a random lifestyle photo.",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-07-work-creator.jpeg",
    prompt: `Use my uploaded source selfie as the identity reference. Create a realistic lifestyle personal brand image inside my Look.

Preserve my facial identity and keep the image believable. Use the same color mood, lighting, wardrobe direction, background world, and emotional signal from my Look.

Show a natural movement or real-life brand moment, such as coffee, laptop, walking, mirror, getting ready, or quiet lifestyle detail. Make it feel candid, elevated, cohesive, and usable for Stories or soft-sell content. Vertical 4:5. No text, no logo, no extra people.`,
  },
]

const starterShootSlots = starterPromptCards.map(card => ({
  title: card.title,
  image: card.image,
  purpose: card.purpose,
  note:
    card.title === "Signature Profile Portrait"
      ? "Save the version where your face feels most recognizable."
      : card.title === "Editorial Reel Cover"
        ? "Save the version with the strongest crop and cleanest text space."
        : "Save the version that feels most natural inside your brand world.",
}))

const fixPromptCards = [
  {
    title: "Make it look more like me",
    prompt:
      "Make the face look more like my source selfie while keeping the same look, outfit, lighting, background, mood, and composition. Match my face shape, eyes, nose, mouth, jawline, skin tone, hairline, and natural expression. Keep it realistic and do not over-smooth.",
  },
  {
    title: "Make it less AI",
    prompt:
      "Make the image feel more realistic and less AI-generated. Keep the same look, styling, light, and setting, but make the photo more human, natural, and believable. Avoid glossy skin, impossible fabric, warped hands, and overly dramatic retouching.",
  },
  {
    title: "Improve the pose",
    prompt:
      "Keep the same lighting, colors, wardrobe, background, and emotional mood, but make the pose more natural. Improve the body language, crop, and posture without changing the look.",
  },
  {
    title: "Make it softer",
    prompt:
      "Keep the same look, colors, wardrobe, and background, but make it softer and more lifestyle. Soften the light, expression, pose, and contrast while keeping the identity cohesive.",
  },
  {
    title: "Make it more editorial",
    prompt:
      "Keep the same look, colors, wardrobe, and background, but make it stronger and more editorial. Add cleaner negative space, stronger posture, sharper framing, and a premium magazine-style feeling.",
  },
  {
    title: "Create another version",
    prompt:
      "Create another version with the same mood, colors, styling, lighting, background, and identity reference. Vary only the pose, crop, and small composition details.",
  },
]

const module4HeroImages = [
  {
    label: "Keep",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-08-profile-candidate.jpeg",
    objectPosition: "center 24%",
  },
  {
    label: "Fix",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-04-movement-transition.jpeg",
    objectPosition: "center 30%",
  },
  {
    label: "Delete",
    image: "/images/selfie-to-brand-shoot/module-2-signature-world/before-grid-08-filtered-face.png",
    objectPosition: "center 32%",
  },
]

const keepFixDeleteColumns = [
  {
    label: "Keep",
    copy: "Use the image if it still feels recognizable, believable, and useful.",
    checks: [
      "Your face still looks like you.",
      "Your skin and hair feel believable.",
      "Your expression feels natural.",
      "Your age feels accurate.",
      "The image matches your Look.",
      "The image has a clear content use.",
      "You would actually post it.",
    ],
  },
  {
    label: "Fix",
    copy: "Refine the image if the direction is strong but one detail is off.",
    checks: [
      "Your face is close but slightly off.",
      "The lighting needs adjustment.",
      "The pose or crop is awkward.",
      "Skin looks too smooth.",
      "The image feels too AI.",
      "The concept is strong but execution is weak.",
    ],
  },
  {
    label: "Delete",
    copy: "Remove the image if it breaks likeness or pulls your brand into a random world.",
    checks: [
      "Your face changed too much.",
      "Body or hands look fake.",
      "Age, skin tone, or hair changed.",
      "The image belongs to a random aesthetic.",
      "It looks like another woman.",
      "It breaks your Look.",
    ],
  },
]

const module4VisualExamples = [
  {
    label: "Keep",
    title: "Believable + brand-aligned",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-08-profile-candidate.jpeg",
    objectPosition: "center 24%",
    works: "The face is clear, the styling belongs to one world, and the image could become a profile or about-me visual.",
    off: "Nothing major. This is the kind of result you save first.",
    next: "Keep it. Use it as one of your identity anchors.",
  },
  {
    label: "Fix",
    title: "Almost there",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-04-movement-transition.jpeg",
    objectPosition: "center 30%",
    works: "The mood, movement, and look are strong enough to keep exploring.",
    off: "If the face feels slightly off, do not change the whole aesthetic. Fix the likeness, crop, or pose first.",
    next: "Use a fix prompt and ask for the same world with a more recognizable face.",
  },
  {
    label: "Delete",
    title: "Too AI / not you",
    image: "/images/selfie-to-brand-shoot/module-2-signature-world/before-grid-08-filtered-face.png",
    objectPosition: "center 32%",
    works: "The image might look polished at first glance.",
    off: "The face signal is too distorted, and the image does not protect a recognizable personal brand identity.",
    next: "Delete it. Start from a clearer source selfie or calmer prompt direction.",
  },
]

const faceConsistencyChecks = [
  "Eyes",
  "Nose",
  "Mouth",
  "Jawline",
  "Face shape",
  "Hairline",
  "Hair color",
  "Skin tone",
  "Age",
  "Expression",
  "Overall: would my friend recognize me?",
]

const brandConsistencyChecks = [
  "My Look",
  "My main colors",
  "My lighting direction",
  "My wardrobe direction",
  "My background world",
  "My emotional signal",
  "My Instagram feed direction",
  "My profile / offer / content style",
]

const mayaReviewBrief = `Review this AI brand shoot image using my Look.

Image intended use: [profile photo / reel cover / lifestyle image / offer image / story image]

My Look:
- Look:
- Main colors:
- Lighting:
- Wardrobe direction:
- Background world:
- Emotional signal:
- What I repeat:
- What I avoid:

Please review the image as Keep / Fix / Delete.

Tell me:
1. Why you chose Keep, Fix, or Delete.
2. What still looks like me.
3. What looks off or too AI.
4. Whether it still matches my Look.
5. The best use case for this image.
6. One fix prompt I can copy if the image is close but not there yet.

Do not judge if I look perfect. Judge if the image is recognizable, believable, brand-aligned, and usable.`

const finalSelectSlots = [
  "Profile / Identity Image",
  "Reel Cover / Editorial Image",
  "Lifestyle / Brand Image",
  "Supporting Image 1",
  "Supporting Image 2",
  "Supporting Image 3",
  "Supporting Image 4",
]

const module5AssetBase = "/images/selfie-to-brand-shoot/module-5-content-use"

const module5HeroImages = [
  {
    label: "Profile",
    image: `${module5AssetBase}/profile-identity-cafe.jpg`,
    objectPosition: "center 28%",
  },
  {
    label: "Cover",
    image: `${module5AssetBase}/reel-cover-cafe.jpg`,
    objectPosition: "center 24%",
  },
  {
    label: "Story",
    image: `${module5AssetBase}/story-intro-lipstick.jpg`,
    objectPosition: "center 28%",
  },
]

const module5ContentUses = [
  {
    title: "Profile photo",
    copy: "Use the clearest identity image when your face needs to be recognized fast.",
    image: `${module5AssetBase}/profile-identity-cafe.jpg`,
    objectPosition: "center 28%",
  },
  {
    title: "Reel cover",
    copy: "Choose a strong vertical image with clean space for one readable hook.",
    image: `${module5AssetBase}/reel-cover-cafe.jpg`,
    objectPosition: "center 24%",
  },
  {
    title: "Carousel cover",
    copy: "Use an image that can hold a headline without fighting the face or outfit.",
    image: `${module5AssetBase}/carousel-cover-street.jpg`,
    objectPosition: "center 30%",
  },
  {
    title: "Story intro",
    copy: "Pick a softer, closer moment that feels like a real update from your world.",
    image: `${module5AssetBase}/story-intro-lipstick.jpg`,
    objectPosition: "center 28%",
  },
  {
    title: "Offer visual",
    copy: "Use a confident image when you are pointing people toward a product or next step.",
    image: `${module5AssetBase}/offer-visual-phone.jpg`,
    objectPosition: "center 26%",
  },
  {
    title: "About-me image",
    copy: "Choose a polished human image that makes your brand feel personal, not faceless.",
    image: `${module5AssetBase}/about-me-balcony.jpg`,
    objectPosition: "center 24%",
  },
  {
    title: "Lifestyle post",
    copy: "Use work, coffee, or daily-life images to make the shoot feel lived-in.",
    image: `${module5AssetBase}/lifestyle-work-laptop.jpg`,
    objectPosition: "center 38%",
  },
]

const module5OverlayExamples = [
  {
    label: "Reel cover",
    headline: "From one selfie to this",
    subline: "AI brand shoot",
    image: `${module5AssetBase}/reel-cover-cafe.jpg`,
    objectPosition: "center 24%",
  },
  {
    label: "Carousel cover",
    headline: "One shoot, seven posts",
    subline: "Save this content plan",
    image: `${module5AssetBase}/carousel-cover-street.jpg`,
    objectPosition: "center 30%",
  },
  {
    label: "Story CTA",
    headline: "This is your look",
    subline: "Reply SHOOT for the next step",
    image: `${module5AssetBase}/story-intro-lipstick.jpg`,
    objectPosition: "center 28%",
  },
]

const module5GridImages = [
  { role: "Profile", image: `${module5AssetBase}/profile-identity-cafe.jpg`, objectPosition: "center 28%" },
  { role: "Reel cover", image: `${module5AssetBase}/reel-cover-cafe.jpg`, objectPosition: "center 24%" },
  { role: "Detail", image: `${module5AssetBase}/detail-coffee.jpg`, objectPosition: "center center" },
  { role: "Movement", image: `${module5AssetBase}/movement-walk.jpg`, objectPosition: "center 34%" },
  { role: "Brand image", image: `${module5AssetBase}/story-intro-lipstick.jpg`, objectPosition: "center 28%" },
  { role: "Texture", image: `${module5AssetBase}/detail-wine.jpg`, objectPosition: "center center" },
  { role: "Work", image: `${module5AssetBase}/lifestyle-work-laptop.jpg`, objectPosition: "center 38%" },
  { role: "About", image: `${module5AssetBase}/about-me-balcony.jpg`, objectPosition: "center 24%" },
  { role: "Breath", image: `${module5AssetBase}/quiet-product-detail.jpg`, objectPosition: "center center" },
]

const module5StoryFrames = [
  { title: "Start here", copy: "Show the normal selfie or starting point." },
  { title: "Reveal", copy: "Show the strongest brand shoot result." },
  { title: "Why it works", copy: "Point out face, colors, mood, and look." },
  { title: "Use it", copy: "Show where it becomes a profile photo, cover, or post." },
  { title: "Invite", copy: "Give one clear next step, link, or reply keyword." },
]

const module5FinalChecklist = [
  "I chose one profile / identity image.",
  "I chose one reel or carousel cover image.",
  "I chose one lifestyle or story image.",
  "I know which image points to my offer, guide, or next step.",
  "I have one 7-day posting plan instead of a folder of random images.",
  "My first week repeats the same look.",
]

const modules = [
  {
    number: "01",
    title: "Start With One Selfie",
    outcome: "Choose the source photo that gives AI enough truth to keep you looking like you.",
    image: sourceSelfies[0].image,
    imagePosition: "center 38%",
    href: "#module-1",
    status: "Ready",
    time: "12 minutes",
    available: true,
  },
  {
    number: "02",
    title: "Choose Your Look",
    outcome: "Choose the repeatable visual identity your audience can start recognizing you for.",
    image: "/images/ai-prompts/clean-girl-morning-shot-10.jpg",
    imagePosition: "center top",
    href: "#module-2",
    status: "Ready",
    time: "15 minutes",
    available: true,
  },
  {
    number: "03",
    title: "Create Your First AI Brand Shoot",
    outcome: "Create your first three brand image anchors with starter prompts and fix prompts.",
    image: starterPromptCards[0].image,
    imagePosition: "center top",
    href: "#module-3",
    status: "Ready",
    time: "20 minutes",
    available: true,
  },
  {
    number: "04",
    title: "Pick The Images That Still Look Like You",
    outcome: "Keep the results that feel realistic, premium, and aligned with your identity.",
    image:
      "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-08-profile-candidate.jpeg",
    imagePosition: "center 24%",
    href: "#module-4",
    status: "Ready",
    time: "16 minutes",
    available: true,
  },
  {
    number: "05",
    title: "Turn The Shoot Into Content",
    outcome:
      "Turn one shoot into profile images, reel covers, stories, carousels, and offer visuals.",
    image: `${module5AssetBase}/reel-cover-cafe.jpg`,
    imagePosition: "center 24%",
    href: "#module-5",
    status: "Ready",
    time: "18 minutes",
    available: true,
  },
]

const quickLinks = [
  { label: "Open The Vault", href: "vault" },
  { label: "Course Workbook", href: "/downloads/selfie-to-brand-shoot-workbook.txt" },
  { label: "Source Selfie Checklist", href: "#source-selfie-checklist" },
  { label: "Troubleshooting", href: "#troubleshooting" },
  { label: "3x3 Mini Feed Planner", href: "#mini-feed-planner" },
]

function resolveHref(href: string, vaultHref: string) {
  return href === "vault" ? vaultHref : href
}

function ResourceQuickLinks({ vaultHref }: { vaultHref: string }) {
  return (
    <div className="sbs-quick-links" aria-label="Course quick links">
      {quickLinks.map(link => (
        <TrackedCourseLink
          key={link.label}
          href={resolveHref(link.href, vaultHref)}
          event={
            link.href.includes("workbook")
              ? "selfie_to_brand_shoot_workbook_downloaded"
              : "selfie_to_brand_shoot_module_started"
          }
          properties={{
            quick_link: link.label,
            target: link.href,
            location: "quick_links",
          }}
        >
          {link.label}
        </TrackedCourseLink>
      ))}
    </div>
  )
}

function LessonSection({
  id,
  eyebrow,
  title,
  children,
  open = false,
}: {
  id?: string
  eyebrow: string
  title: string
  children: ReactNode
  open?: boolean
}) {
  // Inline editorial block (the old accordion is gone — modules now collapse at the
  // module level, so each lesson reads like a calm magazine section, not a control panel).
  void open
  return (
    <section id={id} className="sbs2-block">
      <div className="sbs2-block-head">
        <p className="sbs2-eyebrow">{eyebrow}</p>
        <h3 className={`sbs2-block-title ${cormorant.className}`}>{title}</h3>
      </div>
      <div className="sbs2-block-body sbs-lesson-body">{children}</div>
    </section>
  )
}

function VisualExampleBlock() {
  return (
    <div className="sbs-example-grid" aria-label="Good, okay, and bad source selfie examples">
      {selfieExampleCards.map(example => (
        <article key={example.label} className="sbs-example-card">
          <div className={`sbs-example-image-grid sbs-example-image-grid-${example.images.length}`}>
            {example.images.map(image => (
              <figure key={image.src} className="sbs-example-image">
                <Image
                  src={image.src}
                  alt={`${example.label}: ${image.label}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 14vw"
                  style={{ objectFit: "cover", objectPosition: image.objectPosition }}
                />
                <figcaption>{image.label}</figcaption>
              </figure>
            ))}
          </div>
          <div className="sbs-example-copy">
            <p className="sbs-example-eyebrow">{example.eyebrow}</p>
            <h4 className={cormorant.className}>{example.label}</h4>
            <div className="sbs-trait-list">
              {example.traits.map(trait => (
                <span key={trait}>{trait}</span>
              ))}
            </div>
            <p>{example.note}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

function DecisionToolBlock() {
  return (
    <div className="sbs-decision-tool">
      <div>
        <p className="sbs-kicker">DECISION TOOL</p>
        <h4 className={cormorant.className}>Can I use this selfie?</h4>
        <p>
          If three or more answers are no, choose a clearer source photo before you touch the
          prompt.
        </p>
      </div>
      <div className="sbs-decision-list">
        {[
          "Can I clearly see both eyes?",
          "Is my face sharp if I zoom in?",
          "Is my face free from phone, hand, hair, and sunglasses?",
          "Does my skin tone and hair color look close to real life?",
          "Would a stranger recognize me from this photo?",
        ].map(question => (
          <label key={question}>
            <input type="checkbox" />
            <span>{question}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function ChecklistBlock() {
  return (
    <div className="sbs-source-checklist">
      {sourceSelfieChecklist.map(item => (
        <label key={item}>
          <input type="checkbox" />
          <span>{item}</span>
        </label>
      ))}
    </div>
  )
}

function TroubleshootingBlock() {
  return (
    <div className="sbs-trouble-list">
      {fakeResultChecks.map(check => (
        <article key={check.problem}>
          <span>{check.problem}</span>
          <p>{check.fix}</p>
        </article>
      ))}
    </div>
  )
}

function InstagramGridMockup({
  label,
  copy,
  images,
  variant,
}: {
  label: string
  copy: string
  images: typeof cohesiveGridImages
  variant: "scattered" | "signature"
}) {
  return (
    <article className={`sbs-ig-mockup sbs-ig-mockup-${variant}`}>
      <header>
        <div className="sbs-profile-mark" aria-hidden="true" />
        <div>
          <p>{label}</p>
          <span>
            {variant === "signature"
              ? "After: one world, many roles"
              : "Before: many worlds, no anchor"}
          </span>
        </div>
      </header>
      <div className="sbs-ig-grid" aria-label={`${label} example grid`}>
        {images.map((image, index) => (
          <figure key={`${image.src}-${index}`} className={index === 4 ? "is-center" : ""}>
            <Image
              src={image.src}
              alt={`${label}: ${image.role}`}
              fill
              sizes="(max-width: 768px) 30vw, 9vw"
              style={{ objectFit: "cover", objectPosition: image.objectPosition }}
            />
            <figcaption>{image.role}</figcaption>
          </figure>
        ))}
      </div>
      <p>{copy}</p>
    </article>
  )
}

function VisualWorldComparisonBlock() {
  return (
    <div className="sbs-world-comparison">
      <InstagramGridMockup
        label="Before: Scattered Visual Identity"
        copy="When every image tells a different story, your audience cannot feel the world yet. The problem is not that you need to look perfect. The problem is that your visuals need one clear direction."
        images={scatteredGridImages}
        variant="scattered"
      />
      <InstagramGridMockup
        label="After: Your Look"
        copy="One repeatable look turns face, fashion, coffee, work, and quiet details into one recognizable personal brand."
        images={cohesiveGridImages}
        variant="signature"
      />
    </div>
  )
}

function OneWorldUsesBlock() {
  return (
    <div className="sbs-one-world-uses">
      {oneWorldUses.map(item => (
        <figure key={item.label}>
          <Image
            src={item.image}
            alt={`One look used as ${item.label}`}
            fill
            sizes="(max-width: 768px) 45vw, 11vw"
            style={{ objectFit: "cover", objectPosition: "center top" }}
          />
          <figcaption>{item.label}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function VolumeAdjustmentsBlock() {
  return (
    <div className="sbs-volume-grid">
      {volumeAdjustments.map(item => (
        <article key={item.label}>
          <span>{item.label}</span>
          <p>{item.copy}</p>
        </article>
      ))}
    </div>
  )
}

function Module3HeroSequence() {
  return (
    <div className="sbs-module3-sequence" aria-label="Source selfie to prompt to brand shoot">
      {module3HeroSequence.map((item, index) => (
        <figure key={item.label}>
          <Image
            src={item.image}
            alt={`${item.label} preview`}
            fill
            sizes="(max-width: 768px) 30vw, 10vw"
            style={{ objectFit: "cover", objectPosition: item.objectPosition }}
          />
          <figcaption>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.label}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

function StepFlowBlock() {
  return (
    <div className="sbs-step-flow">
      {brandShootLabSteps.map((step, index) => (
        <article key={step}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <p>{step}</p>
        </article>
      ))}
    </div>
  )
}

function PromptCard({ card }: { card: (typeof starterPromptCards)[number] }) {
  return (
    <article className="sbs-prompt-card">
      <figure>
        <Image
          src={card.image}
          alt={`${card.title} example`}
          fill
          sizes="(max-width: 768px) 100vw, 20vw"
          style={{ objectFit: "cover", objectPosition: "center top" }}
        />
      </figure>
      <div className="sbs-prompt-card-copy">
        <p className="sbs-kicker">STARTER PROMPT</p>
        <h4 className={cormorant.className}>{card.title}</h4>
        <p>{card.purpose}</p>
        <div className="sbs-prompt-meta">
          <span>
            <strong>When to use it</strong>
            {card.when}
          </span>
          <span>
            <strong>What good looks like</strong>
            {card.note}
          </span>
        </div>
        <details className="sbs-prompt-text">
          <summary>Read prompt</summary>
          <p>{card.prompt}</p>
        </details>
        <CopyPromptButton
          text={card.prompt}
          analyticsLabel={card.title}
          analyticsContext={{ module: 3, prompt_type: "starter", prompt_title: card.title }}
        />
      </div>
    </article>
  )
}

function StarterPromptCardsBlock() {
  return (
    <div className="sbs-prompt-card-grid">
      {starterPromptCards.map(card => (
        <PromptCard key={card.title} card={card} />
      ))}
    </div>
  )
}

function StarterShootBoard() {
  return (
    <div className="sbs-starter-board">
      {starterShootSlots.map((slot, index) => (
        <article key={slot.title}>
          <figure>
            <Image
              src={slot.image}
              alt={`${slot.title} board slot`}
              fill
              sizes="(max-width: 768px) 100vw, 18vw"
              style={{ objectFit: "cover", objectPosition: "center top" }}
            />
            <figcaption>Slot {index + 1}</figcaption>
          </figure>
          <div>
            <h4 className={cormorant.className}>{slot.title}</h4>
            <p>{slot.purpose}</p>
            <span>{slot.note}</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function FixPromptCardsBlock() {
  return (
    <div className="sbs-fix-prompt-grid">
      {fixPromptCards.map(card => (
        <article key={card.title}>
          <h4>{card.title}</h4>
          <p>{card.prompt}</p>
          <CopyPromptButton
            text={card.prompt}
            label="Copy fix"
            analyticsLabel={card.title}
            analyticsContext={{ module: 3, prompt_type: "fix", prompt_title: card.title }}
          />
        </article>
      ))}
    </div>
  )
}

function Module4HeroSequence() {
  return (
    <div className="sbs-module4-sequence" aria-label="Keep fix delete image review preview">
      {module4HeroImages.map((item, index) => (
        <figure key={item.label}>
          <Image
            src={item.image}
            alt={`${item.label} image review example`}
            fill
            sizes="(max-width: 768px) 30vw, 10vw"
            style={{ objectFit: "cover", objectPosition: item.objectPosition }}
          />
          <figcaption>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.label}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

function KeepFixDeleteBlock() {
  return (
    <div className="sbs-kfd-grid">
      {keepFixDeleteColumns.map(column => (
        <article key={column.label}>
          <div>
            <h4 className={cormorant.className}>{column.label}</h4>
            <p className="sbs-kfd-intro">{column.copy}</p>
          </div>
          <div className="sbs-kfd-checks">
            {column.checks.map(check => (
              <span key={check}>{check}</span>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}

function Module4VisualExamplesBlock() {
  return (
    <div className="sbs-module4-example-grid">
      {module4VisualExamples.map(example => (
        <article key={example.label}>
          <figure>
            <Image
              src={example.image}
              alt={`${example.label}: ${example.title}`}
              fill
              sizes="(max-width: 768px) 100vw, 20vw"
              style={{ objectFit: "cover", objectPosition: example.objectPosition }}
            />
            <figcaption>{example.label}</figcaption>
          </figure>
          <div>
            <p className="sbs-kicker">{example.title}</p>
            <h4 className={cormorant.className}>{example.label}</h4>
            <span>
              <strong>What works</strong>
              {example.works}
            </span>
            <span>
              <strong>What is off</strong>
              {example.off}
            </span>
            <span>
              <strong>What to do next</strong>
              {example.next}
            </span>
          </div>
        </article>
      ))}
    </div>
  )
}

function Module4ChecklistBlock({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  return (
    <div className="sbs-module4-checklist" aria-label={title}>
      {items.map(item => (
        <label key={item}>
          <input type="checkbox" />
          <span>{item}</span>
        </label>
      ))}
    </div>
  )
}

function MayaReviewLayerBlock() {
  return (
    <div className="sbs-maya-review-layer">
      <div>
        <p className="sbs-kicker">MAYA REVIEW BRIEF</p>
        <h4 className={cormorant.className}>Ask Maya to review the image.</h4>
        <p>
          Upload your image in Maya or paste it into your AI workspace, then use this review brief
          with your Look. The goal is a clear Keep, Fix, or Delete decision.
        </p>
      </div>
      <div className="sbs-maya-review-steps">
        {["Image", "Visual Code", "Use Case", "Keep / Fix / Delete"].map((step, index) => (
          <article key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{step}</p>
          </article>
        ))}
      </div>
      <details className="sbs-prompt-text" open>
        <summary>Review brief</summary>
        <p>{mayaReviewBrief}</p>
      </details>
      <CopyPromptButton
        text={mayaReviewBrief}
        label="Copy review brief"
        analyticsLabel="Maya review brief"
        analyticsContext={{ module: 4, prompt_type: "review_brief" }}
      />
    </div>
  )
}

function FinalBrandShootSelectsBlock() {
  return (
    <div className="sbs-final-selects">
      {finalSelectSlots.map((slot, index) => (
        <article key={slot}>
          <header>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h4>{slot}</h4>
          </header>
          <div>
            {[
              "Keep / Fix / Delete",
              "Why I chose it",
              "What I will use it for",
              "What I need to fix",
              "Fix prompt if needed",
            ].map(field => (
              <label key={field}>
                <span>{field}</span>
                <i aria-hidden="true" />
              </label>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}

function Module5HeroBoard() {
  return (
    <div className="sbs-module5-hero-board" aria-label="Module 5 content use preview">
      {module5HeroImages.map((item, index) => (
        <figure key={item.label}>
          <Image
            src={item.image}
            alt={`${item.label} content use preview`}
            fill
            sizes="(max-width: 768px) 30vw, 10vw"
            style={{ objectFit: "cover", objectPosition: item.objectPosition }}
          />
          <figcaption>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.label}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

function Module5ContentUseGrid() {
  return (
    <div className="sbs-module5-use-grid">
      {module5ContentUses.map(use => (
        <article key={use.title}>
          <figure>
            <Image
              src={use.image}
              alt={`${use.title} example`}
              fill
              sizes="(max-width: 768px) 100vw, 18vw"
              style={{ objectFit: "cover", objectPosition: use.objectPosition }}
            />
          </figure>
          <div>
            <h4>{use.title}</h4>
            <p>{use.copy}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

function Module5OverlayExamplesBlock() {
  return (
    <div className="sbs-module5-overlay-grid">
      {module5OverlayExamples.map(example => (
        <article key={example.label}>
          <figure>
            <Image
              src={example.image}
              alt={`${example.label} overlay example`}
              fill
              sizes="(max-width: 768px) 100vw, 22vw"
              style={{ objectFit: "cover", objectPosition: example.objectPosition }}
            />
            <figcaption>
              <span>{example.label}</span>
              <strong className={cormorant.className}>{example.headline}</strong>
              <em>{example.subline}</em>
            </figcaption>
          </figure>
        </article>
      ))}
    </div>
  )
}

function Module5MiniFeedPlannerBlock() {
  return (
    <div className="sbs-module5-feed-planner" id="mini-feed-planner">
      {module5GridImages.map((item, index) => (
        <figure key={`${item.role}-${index}`}>
          <Image
            src={item.image}
            alt={`${item.role} grid slot`}
            fill
            sizes="(max-width: 768px) 32vw, 12vw"
            style={{ objectFit: "cover", objectPosition: item.objectPosition }}
          />
          <figcaption>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.role}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

function Module5StorySequenceBlock() {
  return (
    <div className="sbs-module5-story-sequence">
      {module5StoryFrames.map((frame, index) => (
        <article key={frame.title}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h4>{frame.title}</h4>
          <p>{frame.copy}</p>
        </article>
      ))}
    </div>
  )
}

function Module5FinalChecklistBlock() {
  return (
    <div className="sbs-module5-final-checklist">
      {module5FinalChecklist.map(item => (
        <label key={item}>
          <input type="checkbox" />
          <span>{item}</span>
        </label>
      ))}
    </div>
  )
}

export function SelfieToBrandShootCourseShell({
  firstName,
  vaultHref,
  accessMode,
  hasStudioAccess = false,
  hasPromptVaultAccess = true,
  brandStrategy = null,
  brandStrategyHref = "/academy/access/brand-strategy",
}: SelfieToBrandShootCourseShellProps) {
  const hasBrandStrategy = Boolean(brandStrategy)
  const courseModules: CourseModuleMeta[] = modules.map(module => ({
    number: Number(module.number),
    title: module.title,
    outcome: module.outcome,
  }))
  const moduleNext = (index: number) => {
    const target = courseModules[index + 1]
    return target ? { number: target.number, title: target.title } : null
  }
  const lookOptions: LookOption[] = brandWorldCards.map(world => ({
    name: world.name,
    swatches: world.swatches,
    feeling: world.feeling,
    chooseIf: world.chooseIf,
    hero: world.hero,
    code: {
      signatureVisualWorld: world.name,
      mainColors: world.visualCode.colors,
      lighting: world.visualCode.lighting,
      wardrobeDirection: world.visualCode.wardrobe,
      backgroundWorld: world.visualCode.background,
      emotionalSignal: world.visualCode.signal,
      desiredFeeling: world.feeling,
      repeatRules: world.visualCode.repeat,
      avoidRules: world.visualCode.avoid,
      firstShootDirection: "",
    },
  }))

  return (
    <main className={`sbs2-page ${inter.className} ${cormorant.variable}`}>
      <header className="sbs2-header">
        <Link href="/" className={`sbs2-logo ${cormorant.className}`}>
          SSELFIE
        </Link>
        <span className="sbs2-header-label">SELFIE TO BRAND SHOOT</span>
        <Link href={vaultHref} className="sbs2-header-link">
          Open the Vault
        </Link>
      </header>

      <CourseExperienceProvider
        firstName={firstName ?? null}
        modules={courseModules}
        hasBrandStrategy={hasBrandStrategy}
        brandStrategyHref={brandStrategyHref}
      >
        <section className="sbs2-hero" aria-label="Your course">
          <div className="sbs2-hero-copy">
            <ResumeHero serifClass={cormorant.className} />
          </div>
          <figure className="sbs2-hero-figure">
            <Image
              src="/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-01-hero-identity.jpeg"
              alt="Signature brand shoot identity image"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 46vw"
              style={{ objectFit: "cover", objectPosition: "center 20%" }}
            />
          </figure>
        </section>

        <section className="sbs2-pathwrap" aria-label="Course path">
          <div className="sbs2-section-head">
            <p className="sbs2-eyebrow">YOUR PATH</p>
            <h2 className={`sbs2-section-title ${cormorant.className}`}>
              Five steps. One first result.
            </h2>
            <p className="sbs2-section-sub">
              Not a prompt folder. You will choose the right source photo, pick one visual
              direction, create your first images, decide what still looks like you, and turn the
              shoot into a first week of content.
            </p>
          </div>
          <CoursePathMap />
          <ResourceQuickLinks vaultHref={vaultHref} />
        </section>

        <div className="sbs2-modules">
          <Step0Panel brandStrategy={brandStrategy} serifClass={cormorant.className} />

          <ModulePanel
            number={1}
            eyebrow="MODULE 01"
            title="Start With One Selfie"
            outcome="Choose the photo that gives AI enough truth to keep you looking like you."
            time="12 min"
            serifClass={cormorant.className}
            next={moduleNext(0)}
            image={
              <figure className="sbs2-cover-figure">
                <Image
                  src={sourceSelfies[0].image}
                  alt="Clear front-facing source selfie example"
                  fill
                  sizes="(max-width: 900px) 100vw, 760px"
                  style={{ objectFit: "cover", objectPosition: "center 38%" }}
                />
              </figure>
            }
          >

          <LessonSection eyebrow="OUTCOME" title="What this module helps you do" open>
            <p>
              By the end of this module, you will have one strong source selfie and a clear reason
              why that image is good enough to use for your first AI brand shoot.
            </p>
          </LessonSection>

          <LessonSection eyebrow="VISUAL EXAMPLES" title="Good, okay, and bad source photos" open>
            <VisualExampleBlock />
          </LessonSection>

          <LessonSection eyebrow="DECIDE" title="Can I use this selfie?">
            <DecisionToolBlock />
          </LessonSection>

          <LessonSection
            id="source-selfie-checklist"
            eyebrow="CHECKLIST"
            title="Source Selfie Checklist"
          >
            <ChecklistBlock />
          </LessonSection>

          <LessonSection eyebrow="SANDRA'S TASTE NOTE" title="Clear beats pretty">
            <div className="sbs-taste-note">
              <p>
                The goal is not to upload your prettiest selfie. The goal is to upload your clearest
                selfie. Pretty can happen later. Clarity comes first.
              </p>
            </div>
          </LessonSection>

          <LessonSection eyebrow="ACTION STEP" title="Choose one selfie to use">
            <div className="sbs-action-step">
              <p>
                Pick one clear front-facing or slight 3/4 selfie. Save it somewhere easy to find
                before you open the Vault or ChatGPT.
              </p>
              <TrackedCourseLink
                href="#module-2"
                className="sbs-primary"
                event="selfie_to_brand_shoot_module_completed"
                properties={{ module: 1, action: "i_have_my_selfie" }}
              >
                I Have My Selfie
              </TrackedCourseLink>
            </div>
          </LessonSection>

          <LessonSection
            id="troubleshooting"
            eyebrow="FIX"
            title="If your result looks fake, check this first"
          >
            <TroubleshootingBlock />
          </LessonSection>

          </ModulePanel>

          <ModulePanel
            number={2}
            eyebrow="MODULE 02"
            title="Choose Your Look"
            outcome="Choose the repeatable visual identity your audience can start recognizing you for."
            time="15 min"
            serifClass={cormorant.className}
            next={moduleNext(1)}
            image={
              <figure className="sbs2-cover-figure">
                <Image
                  src="/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-01-hero-identity.jpeg"
                  alt="Approved Look identity image"
                  fill
                  sizes="(max-width: 900px) 100vw, 760px"
                  style={{ objectFit: "cover", objectPosition: "center 26%" }}
                />
              </figure>
            }
          >

            <LessonSection
              eyebrow="SANDRA'S RULE"
              title="Choose a look you can repeat"
              open
            >
              <div className="sbs-taste-note sbs-taste-note-light">
                <p>
                  Do not choose a different aesthetic every time. Choose a look you can
                  repeat.
                </p>
              </div>
            </LessonSection>

            <LessonSection eyebrow="WHY IT MATTERS" title="Why your look matters" open>
              <div className="sbs-world-lesson">
                <div>
                  <p>
                    A beautiful image can get attention. A repeatable look builds
                    recognition.
                  </p>
                  <p>
                    Your feed does not need to be perfect. But it should feel like the same woman
                    lives there.
                  </p>
                </div>
                <VisualWorldComparisonBlock />
              </div>
            </LessonSection>

            <LessonSection eyebrow="CORE CONCEPT" title="One look. Many uses." open>
              <div className="sbs-worksheet-intro">
                <p>
                  Your personal brand becomes easier to recognize when your profile photos, reel
                  covers, stories, offers, and lifestyle content all repeat the same look.
                </p>
              </div>
              <OneWorldUsesBlock />
            </LessonSection>

            <LessonSection eyebrow="CHOOSE YOUR LOOK" title="Tap the look you want to be known for" open>
              <div className="sbs-worksheet-intro">
                <p>
                  Pick the one that matches how you want people to feel when they land on your
                  profile. Tap it and it becomes your look. Maya uses it to build your shoot in
                  Module 3. You can fine-tune it after.
                </p>
              </div>
              <LookPicker options={lookOptions} serifClass={cormorant.className} />
            </LessonSection>

            <LessonSection eyebrow="IF IT FEELS OFF" title="Stay in your look, adjust the volume">
              <div className="sbs-worksheet-intro">
                <p>
                  If the first result does not feel right, do not switch looks. Just turn the
                  intensity up or down.
                </p>
              </div>
              <VolumeAdjustmentsBlock />
            </LessonSection>

            <LessonSection eyebrow="ACTION STEP" title="My look is:">
              <div className="sbs-signature-line" aria-hidden="true" />
              <p>Use this look for your first 7-image brand shoot before you try another one.</p>
            </LessonSection>
          </ModulePanel>

          <ModulePanel
            number={3}
            eyebrow="MODULE 03"
            title="Create Your First AI Brand Shoot"
            outcome="Create your first three brand image anchors with starter prompts and fix prompts."
            time="20 min"
            serifClass={cormorant.className}
            next={moduleNext(2)}
            image={<Module3HeroSequence />}
          >

            <SignatureWorldRecap serifClass={cormorant.className} />

            <LessonSection eyebrow="OUTCOME" title="What this module helps you do" open>
              <div className="sbs-module3-outcome">
                <p>
                  In this module, you will use the selfie you chose in Module 1 and the Visual
                  Consistency Code you created in Module 2 to create your first AI brand shoot.
                </p>
                <div>
                  {module3Outcomes.map(outcome => (
                    <span key={outcome}>{outcome}</span>
                  ))}
                </div>
                <p>These are your first three visual anchors.</p>
              </div>
            </LessonSection>

            <LessonSection eyebrow="LAB" title="First Brand Shoot Lab" open>
              <StepFlowBlock />
            </LessonSection>

            <LessonSection eyebrow="COPY" title="Starter Shoot Prompt Cards" open>
              <StarterPromptCardsBlock />
            </LessonSection>

            <LessonSection eyebrow="BOARD" title="The 3-image starter shoot board" open>
              <div className="sbs-worksheet-intro">
                <p>
                  Your first goal is not a giant gallery. It is three useful anchors: one clear
                  identity image, one stronger cover image, and one lifestyle image that still
                  belongs to the same world.
                </p>
              </div>
              <StarterShootBoard />
            </LessonSection>

            <LessonSection
              eyebrow="FIX"
              title="If the result is close, fix it. Do not start over."
              open
            >
              <div className="sbs-worksheet-intro">
                <p>
                  Do not change the whole aesthetic every time a result is not perfect. Stay in the
                  same look and adjust the face, light, pose, crop, or intensity.
                </p>
              </div>
              <FixPromptCardsBlock />
            </LessonSection>

            <LessonSection eyebrow="SANDRA'S TASTE NOTE" title="Stay with the direction">
              <div className="sbs-taste-note">
                <p>
                  Your first result does not need to be perfect. It needs to be close enough to
                  teach you what works. Do not abandon your look because one image feels
                  off. Fix the face, lighting, pose, or crop before you change the whole direction.
                </p>
              </div>
            </LessonSection>

            <LessonSection
              eyebrow="WITH MAYA"
              title="Let Maya Build Your Brand Shoot Prompts"
              open
            >
              <MayaPromptConcierge headingClassName={cormorant.className} />
            </LessonSection>

            <LessonSection eyebrow="OPTIONAL" title="Want to generate these inside SSELFIE?">
              <div className="sbs-upgrade-bridge">
                <div>
                  <p>
                    Use these prompts in ChatGPT for the core path. If you already use Studio, you
                    can bring the same direction into your SSELFIE generation workflow with credits.
                  </p>
                </div>
                {hasStudioAccess ? (
                  <Link href="/app" className="sbs-primary">
                    Open Studio
                  </Link>
                ) : (
                  <span>Studio generation is the optional power layer.</span>
                )}
              </div>
            </LessonSection>

            <LessonSection eyebrow="ACTION STEP" title="Create your first 3-image starter shoot">
              <p>
                Make one Signature Profile Portrait, one Editorial Reel Cover, and one Lifestyle
                Brand Image. Then choose your best result from each category.
              </p>
            </LessonSection>
          </ModulePanel>

          <ModulePanel
            number={4}
            eyebrow="MODULE 04"
            title="Pick The Images That Still Look Like You"
            outcome="Keep the results that feel realistic, premium, and aligned with your identity."
            time="16 min"
            serifClass={cormorant.className}
            next={moduleNext(3)}
            image={<Module4HeroSequence />}
          >

            <SignatureWorldRecap serifClass={cormorant.className} />

            <LessonSection eyebrow="SANDRA'S RULE" title="Recognizable beats perfect" open>
              <div className="sbs-taste-note">
                <p>
                  If the image is beautiful but it does not look like you, it does not belong in
                  your personal brand. Your audience needs to recognize you, not a fantasy version
                  of you.
                </p>
              </div>
            </LessonSection>

            <LessonSection eyebrow="DECISION SYSTEM" title="Keep / Fix / Delete Framework" open>
              <KeepFixDeleteBlock />
            </LessonSection>

            <LessonSection eyebrow="VISUAL EXAMPLES" title="Keep, fix, or delete" open>
              <div className="sbs-worksheet-intro">
                <p>
                  A good AI image is not only pretty. It still has to look believable, belong to
                  your chosen look, and have a clear use in your content.
                </p>
              </div>
              <Module4VisualExamplesBlock />
            </LessonSection>

            <LessonSection eyebrow="FACE CHECK" title="Would my audience recognize me?" open>
              <div className="sbs-worksheet-intro">
                <p>
                  Before you judge the outfit, pose, or background, check the face. If the face is
                  not yours, the image does not carry your brand.
                </p>
              </div>
              <Module4ChecklistBlock
                title="Would my audience recognize me?"
                items={faceConsistencyChecks}
              />
            </LessonSection>

            <LessonSection eyebrow="BRAND CHECK" title="Does this still match my look?" open>
              <div className="sbs-worksheet-intro">
                <p>
                  Likeness matters first. Then check whether the image still fits the visual code
                  you chose in Module 2.
                </p>
              </div>
              <Module4ChecklistBlock
                title="Does this still match my look?"
                items={brandConsistencyChecks}
              />
            </LessonSection>

            <LessonSection
              eyebrow="MAYA REVIEW"
              title="Ask Maya to review this image using your Look"
              open
            >
              <MayaReviewLayerBlock />
            </LessonSection>

            <LessonSection eyebrow="YOUR SELECTS" title="My final brand shoot picks" open>
              <div className="sbs-worksheet-intro">
                <p>
                  Choose your best 3-7 images. Each selected image should have a reason, a use, and
                  a clear decision: keep it, fix it, or delete it.
                </p>
              </div>
              <FinalBrandShootSelectsBlock />
            </LessonSection>

            <LessonSection eyebrow="ACTION STEP" title="Choose your final 3-7 images">
              <p>
                Pick one profile image, one reel-cover image, one lifestyle image, and up to four
                supporting brand images.
              </p>
            </LessonSection>
          </ModulePanel>

          <ModulePanel
            number={5}
            eyebrow="MODULE 05"
            title="Turn The Shoot Into Content"
            outcome="Turn one shoot into profile images, reel covers, stories, carousels, and offer visuals."
            time="18 min"
            serifClass={cormorant.className}
            next={moduleNext(4)}
            image={<Module5HeroBoard />}
          >

            <LessonSection eyebrow="SANDRA'S RULE" title="Use the image while the feeling is fresh" open>
              <div className="sbs-taste-note">
                <p>
                  A beautiful image only becomes valuable when you use it. Do not wait until the
                  full feed is perfect. Choose the best image, give it one job, and let it help your
                  audience recognize the woman you are becoming.
                </p>
              </div>
            </LessonSection>

            <LessonSection eyebrow="CONTENT SYSTEM" title="One shoot, many uses" open>
              <div className="sbs-worksheet-intro">
                <p>
                  You do not need seven different aesthetics. You need one look that can
                  become different kinds of content.
                </p>
              </div>
              <Module5ContentUseGrid />
            </LessonSection>

            <LessonSection eyebrow="OVERLAY EXAMPLES" title="Use text as the layer, not the identity" open>
              <div className="sbs-worksheet-intro">
                <p>
                  Keep the image as the emotional proof. Add only enough text to give the post a
                  clear job.
                </p>
              </div>
              <Module5OverlayExamplesBlock />
            </LessonSection>

            <LessonSection eyebrow="FEED PREVIEW" title="3x3 Mini Feed Planner" open>
              <div className="sbs-worksheet-intro">
                <p>
                  Plan variety inside one look: face, movement, detail, work, lifestyle,
                  offer, and quiet breathing space.
                </p>
              </div>
              <Module5MiniFeedPlannerBlock />
            </LessonSection>

            <LessonSection eyebrow="YOUR 7-DAY PLAN" title="Your first week of content, already written" open>
              <div className="sbs-worksheet-intro">
                <p>
                  This plan is built from your brand strategy and your chosen look. Each day has one
                  image job and a caption starter that already sounds like you. Post in order while
                  the look is still fresh.
                </p>
                <TrackedCourseLink
                  href="/downloads/selfie-to-brand-shoot-7-day-plan.txt"
                  download
                  className="sbs-text-link"
                  event="selfie_to_brand_shoot_content_plan_completed"
                  properties={{ module: 5, resource: "7_day_plan_download" }}
                >
                  Download the blank 7-day template
                </TrackedCourseLink>
              </div>
              <PersonalizedContentPlan brandStrategy={brandStrategy} serifClass={cormorant.className} />
            </LessonSection>

            <LessonSection eyebrow="STORY FLOW" title="Turn the shoot into a story sequence" open>
              <div className="sbs-worksheet-intro">
                <p>
                  Stories should feel simple: where you started, what you made, why it matters, and
                  what she should do next.
                </p>
              </div>
              <Module5StorySequenceBlock />
            </LessonSection>

            <LessonSection eyebrow="FINAL CHECK" title="Before you call the shoot finished" open>
              <div className="sbs-worksheet-intro">
                <p>
                  You are done when the images have a job. The goal is not a bigger gallery. The
                  goal is a first week of brand visuals you can actually post.
                </p>
              </div>
              <Module5FinalChecklistBlock />
            </LessonSection>

            <LessonSection eyebrow="WORKBOOK" title="Save the decisions you made" open>
              <div className="sbs-worksheet-intro">
                <p>
                  Your real deliverable is not only the images. It is the visual direction, prompt
                  set, keep/fix/delete filter, and first-week content plan you can repeat.
                </p>
                <TrackedCourseLink
                  href="/downloads/selfie-to-brand-shoot-workbook.txt"
                  download
                  className="sbs-text-link"
                  event="selfie_to_brand_shoot_workbook_downloaded"
                  properties={{ module: 5, resource: "course_workbook" }}
                >
                  Download the course workbook
                </TrackedCourseLink>
              </div>
            </LessonSection>

            <LessonSection eyebrow="FINAL ACTION" title="Plan your first seven pieces of content">
              <p>
                Choose one profile image, one cover, one story sequence, one carousel, one offer
                visual, one about-me post, and one quiet supporting image.
              </p>
            </LessonSection>
          </ModulePanel>
        </div>

      <section className="sbs2-final-resources">
        <div>
          <p className="sbs-kicker">RESOURCES</p>
          <h2 className={cormorant.className}>Open what you need, when you need it.</h2>
        </div>
        <div className="sbs-final-actions">
          <Link href={vaultHref} className="sbs-primary">
            Open The Vault
          </Link>
          <TrackedCourseLink
            href="/downloads/selfie-to-brand-shoot-workbook.txt"
            download
            className="sbs-secondary"
            event="selfie_to_brand_shoot_workbook_downloaded"
            properties={{ resource: "course_workbook", location: "final_resources" }}
          >
            Download Workbook
          </TrackedCourseLink>
          <TrackedCourseLink
            href="/downloads/selfie-to-brand-shoot-7-day-plan.txt"
            download
            className="sbs-secondary"
            event="selfie_to_brand_shoot_content_plan_completed"
            properties={{ resource: "7_day_plan", location: "final_resources" }}
          >
            Download 7-Day Plan
          </TrackedCourseLink>
          {hasStudioAccess && (
            <Link href="/app" className="sbs-secondary">
              Open Studio
            </Link>
          )}
          {!hasPromptVaultAccess && accessMode === "academy" && (
            <Link href="/prompt-vault" className="sbs-secondary">
              Get The Vault
            </Link>
          )}
          <a href="mailto:support@sselfie.ai" className="sbs-secondary">
            Email Support
          </a>
        </div>
      </section>
      </CourseExperienceProvider>

      <style>{`
        .sbs-course-page {
          min-height: 100vh;
          background: #F8FAFA;
          color: #0D0E10;
        }
        .sbs-top-nav {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 16px clamp(18px, 4vw, 46px);
          background: rgba(248,250,250,0.94);
          border-bottom: 1px solid rgba(197,198,200,0.35);
          backdrop-filter: blur(14px);
        }
        .sbs-logo {
          color: #0D0E10;
          font-size: 16px;
          font-weight: 300;
          letter-spacing: 0.34em;
          text-decoration: none;
          text-transform: uppercase;
        }
        .sbs-top-links,
        .sbs-home-actions,
        .sbs-final-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .sbs-top-links a {
          color: #4F5052;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-decoration: none;
          text-transform: uppercase;
        }
        .sbs-kicker {
          margin: 0 0 14px;
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.32em;
          line-height: 1.7;
          text-transform: uppercase;
        }
        .sbs-buyer-home {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(420px, 1.08fr);
          gap: clamp(28px, 5vw, 72px);
          align-items: center;
          max-width: 1280px;
          margin: 0 auto;
          padding: clamp(50px, 7vw, 92px) clamp(20px, 5vw, 64px);
        }
        .sbs-home-copy h1,
        .sbs-section-heading h2,
        .sbs-final-resources h2 {
          margin: 0 0 20px;
          color: #0D0E10;
          font-size: clamp(3.6rem, 7vw, 6.8rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.92;
        }
        .sbs-home-copy > p,
        .sbs-section-heading p,
        .sbs-final-resources p {
          max-width: 610px;
          margin: 0 0 28px;
          color: #4F5052;
          font-size: 16px;
          line-height: 1.85;
        }
        .sbs-primary,
        .sbs-secondary,
        .sbs-text-link {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          text-decoration: none;
          transition: opacity 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
        }
        .sbs-primary,
        .sbs-secondary {
          padding: 14px 22px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .sbs-primary {
          background: #0D0E10;
          color: #F8FAFA;
        }
        .sbs-secondary {
          border: 1px solid rgba(13,14,16,0.18);
          color: #0D0E10;
          background: #FFFFFF;
        }
        .sbs-primary:hover,
        .sbs-secondary:hover,
        .sbs-text-link:hover,
        .sbs-top-links a:hover,
        .sbs-quick-links a:hover {
          opacity: 0.82;
          transform: translateY(-1px);
        }
        .sbs-course-progress {
          display: grid;
          gap: 10px;
          margin: 0 0 28px;
        }
        .sbs-progress-copy {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-progress-copy strong {
          color: #282728;
          font-weight: 700;
        }
        .sbs-progress-track {
          height: 7px;
          overflow: hidden;
          background: rgba(197,198,200,0.35);
        }
        .sbs-progress-track span {
          display: block;
          width: 100%;
          height: 100%;
          background: #0D0E10;
        }
        .sbs-home-board {
          position: relative;
          min-height: clamp(500px, 60vw, 680px);
        }
        .sbs-home-image {
          position: absolute;
          overflow: hidden;
          margin: 0;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
          box-shadow: 0 24px 80px rgba(13,14,16,0.08);
        }
        .sbs-home-image figcaption,
        .sbs-example-image figcaption {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
          padding: 8px 9px;
          background: rgba(13,14,16,0.62);
          color: #F8FAFA;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-home-image-0 {
          inset: 0 auto auto 8%;
          width: 48%;
          aspect-ratio: 4 / 5.4;
        }
        .sbs-home-image-1 {
          top: 12%;
          right: 0;
          width: 42%;
          aspect-ratio: 4 / 5.2;
        }
        .sbs-home-image-2 {
          left: 36%;
          bottom: 0;
          width: 38%;
          aspect-ratio: 4 / 5.1;
        }
        .sbs-home-modules,
        .sbs-final-resources {
          max-width: 1280px;
          margin: 0 auto;
          padding: clamp(46px, 6vw, 78px) clamp(20px, 5vw, 64px);
          border-top: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-section-heading {
          max-width: 720px;
          margin-bottom: 30px;
        }
        .sbs-section-heading h2,
        .sbs-final-resources h2 {
          font-size: clamp(2.8rem, 5.6vw, 5.2rem);
        }
        .sbs-module-card-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-module-card {
          display: grid;
          grid-template-rows: auto 1fr;
          background: #FFFFFF;
        }
        .sbs-module-card.is-locked {
          color: #4F5052;
        }
        .sbs-module-card-image {
          position: relative;
          aspect-ratio: 4 / 4.8;
          overflow: hidden;
          background: #F8FAFA;
        }
        .sbs-module-card-copy {
          display: grid;
          align-content: start;
          gap: 12px;
          padding: 18px;
        }
        .sbs-module-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin: 0;
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-module-meta span {
          color: #0D0E10;
        }
        .sbs-module-card h3,
        .sbs-sidebar-card h2,
        .sbs-lesson-hero h2,
        .sbs-lesson-section summary strong,
        .sbs-decision-tool h4,
        .sbs-module-next h3,
        .sbs-placeholder-module h3,
        .sbs-mini-planner h3,
        .sbs-example-copy h4 {
          margin: 0;
          color: #0D0E10;
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.98;
        }
        .sbs-module-card h3 {
          font-size: clamp(1.8rem, 2.4vw, 2.7rem);
        }
        .sbs-module-card p:not(.sbs-module-meta),
        .sbs-lesson-hero p,
        .sbs-lesson-body p,
        .sbs-decision-tool p,
        .sbs-module-next p,
        .sbs-placeholder-module p,
        .sbs-mini-planner p,
        .sbs-example-copy p {
          margin: 0;
          color: #4F5052;
          font-size: 14px;
          line-height: 1.75;
        }
        .sbs-text-link {
          justify-self: start;
          min-height: 34px;
          margin-top: 4px;
          color: #0D0E10;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          border-bottom: 1px solid #0D0E10;
        }
        .sbs-quick-links {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1px;
          margin-top: 18px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-quick-links a {
          min-height: 74px;
          display: flex;
          align-items: flex-end;
          padding: 14px;
          background: #FFFFFF;
          color: #282728;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          line-height: 1.45;
          text-decoration: none;
          text-transform: uppercase;
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .sbs-course-player {
          display: grid;
          grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
          gap: 24px;
          max-width: 1380px;
          margin: 0 auto;
          padding: clamp(34px, 5vw, 58px) clamp(16px, 4vw, 42px);
          border-top: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-course-sidebar {
          position: sticky;
          top: 78px;
          align-self: start;
          display: grid;
          gap: 12px;
        }
        .sbs-sidebar-card,
        .sbs-sidebar-modules,
        .sbs-lesson-panel,
        .sbs-final-resources {
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-sidebar-card {
          padding: 18px;
        }
        .sbs-sidebar-card h2 {
          margin-bottom: 18px;
          font-size: 2.6rem;
        }
        .sbs-sidebar-modules {
          display: grid;
        }
        .sbs-sidebar-modules a {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr);
          gap: 10px 12px;
          padding: 14px;
          border-bottom: 1px solid rgba(197,198,200,0.35);
          color: #4F5052;
          text-decoration: none;
        }
        .sbs-sidebar-modules a:last-child {
          border-bottom: 0;
        }
        .sbs-sidebar-modules a.is-active {
          background: #F8FAFA;
          color: #0D0E10;
        }
        .sbs-sidebar-modules span {
          grid-row: span 2;
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
        }
        .sbs-sidebar-modules strong {
          font-size: 12px;
          line-height: 1.35;
        }
        .sbs-sidebar-modules small {
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sbs-course-sidebar .sbs-quick-links {
          grid-template-columns: 1fr;
          margin: 0;
        }
        .sbs-course-sidebar .sbs-quick-links a {
          min-height: 54px;
        }
        .sbs-lesson-panel {
          min-width: 0;
          padding: clamp(16px, 3vw, 32px);
        }
        .sbs-lesson-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 0.42fr);
          gap: clamp(18px, 4vw, 42px);
          align-items: center;
          padding: clamp(18px, 4vw, 34px);
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-lesson-hero h2 {
          margin-bottom: 16px;
          font-size: clamp(3rem, 6vw, 5.4rem);
        }
        .sbs-lesson-hero-image {
          position: relative;
          min-height: 430px;
          overflow: hidden;
          background: #FFFFFF;
        }
        .sbs-mobile-module-list {
          display: none;
        }
        .sbs-mobile-player-progress {
          display: none;
        }
        .sbs-lesson-section {
          margin-top: 14px;
          border: 1px solid rgba(197,198,200,0.35);
          background: #FFFFFF;
        }
        .sbs-lesson-section summary {
          cursor: pointer;
          display: grid;
          grid-template-columns: minmax(0, 0.28fr) minmax(0, 1fr);
          gap: 18px;
          align-items: baseline;
          padding: 18px;
          list-style: none;
        }
        .sbs-lesson-section summary::-webkit-details-marker {
          display: none;
        }
        .sbs-lesson-section summary span {
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .sbs-lesson-section summary strong {
          font-size: clamp(2rem, 3.6vw, 3.6rem);
        }
        .sbs-lesson-section[open] summary {
          border-bottom: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-lesson-body {
          padding: 18px;
        }
        .sbs-example-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .sbs-example-card {
          display: grid;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-example-image-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          min-height: 330px;
          background: rgba(197,198,200,0.35);
        }
        .sbs-example-image-grid-1 {
          grid-template-columns: 1fr;
        }
        .sbs-example-image-grid-4 {
          grid-template-rows: repeat(2, minmax(0, 1fr));
        }
        .sbs-example-image {
          position: relative;
          min-height: 164px;
          margin: 0;
          overflow: hidden;
          background: #F8FAFA;
        }
        .sbs-example-image-grid-1 .sbs-example-image {
          min-height: 330px;
        }
        .sbs-example-copy {
          display: grid;
          gap: 13px;
          padding: 16px;
        }
        .sbs-example-eyebrow {
          margin: 0;
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .sbs-example-copy h4 {
          font-size: 2.2rem;
        }
        .sbs-trait-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .sbs-trait-list span {
          padding: 7px 8px;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.35);
          color: #282728;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .sbs-decision-tool {
          display: grid;
          grid-template-columns: minmax(0, 0.45fr) minmax(0, 0.55fr);
          gap: 24px;
          padding: clamp(18px, 3vw, 28px);
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-decision-tool h4,
        .sbs-mini-planner h3 {
          margin-bottom: 14px;
          font-size: clamp(2.2rem, 4vw, 3.8rem);
        }
        .sbs-decision-list,
        .sbs-source-checklist {
          display: grid;
          gap: 1px;
          background: rgba(197,198,200,0.35);
        }
        .sbs-decision-list label,
        .sbs-source-checklist label {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          padding: 14px;
          background: #FFFFFF;
          color: #282728;
          font-size: 13px;
          line-height: 1.65;
        }
        .sbs-decision-list input,
        .sbs-source-checklist input {
          width: 15px;
          height: 15px;
          margin-top: 3px;
          accent-color: #0D0E10;
        }
        .sbs-source-checklist {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .sbs-taste-note {
          padding: clamp(24px, 3.5vw, 40px) clamp(22px, 3vw, 38px);
          background: #0D0E10;
          border-radius: 14px;
        }
        .sbs-taste-note p {
          margin: 0;
          color: #F8FAFA;
          font-family: var(--font-cormorant), Georgia, "Times New Roman", serif;
          font-size: clamp(1.6rem, 3vw, 2.4rem);
          font-weight: 300;
          font-style: italic;
          line-height: 1.3;
          letter-spacing: -0.01em;
        }
        .sbs-taste-note-light {
          background: #FFFFFF;
          border: 1px solid rgba(40, 39, 40, 0.12);
        }
        .sbs-taste-note-light p {
          color: #0D0E10;
        }
        .sbs-world-lesson {
          display: grid;
          gap: 20px;
        }
        .sbs-world-lesson > div:first-child {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .sbs-world-lesson > div:first-child p {
          padding: 20px;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.35);
          color: #282728;
          font-size: clamp(1rem, 1.6vw, 1.35rem);
          line-height: 1.65;
        }
        .sbs-world-comparison {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          align-items: start;
        }
        .sbs-ig-mockup {
          display: grid;
          gap: 14px;
          padding: clamp(14px, 2.4vw, 22px);
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-ig-mockup header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sbs-profile-mark {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          border-radius: 999px;
          border: 1px solid rgba(13,14,16,0.2);
          background: linear-gradient(135deg, #FFFFFF, #C5C6C8);
        }
        .sbs-ig-mockup header p {
          margin: 0 0 3px;
          color: #0D0E10;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sbs-ig-mockup header span {
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .sbs-ig-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 2px;
          background: rgba(197,198,200,0.45);
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-ig-grid figure {
          position: relative;
          aspect-ratio: 1;
          margin: 0;
          overflow: hidden;
          background: #F8FAFA;
        }
        .sbs-ig-grid figure.is-center {
          outline: 2px solid #0D0E10;
          outline-offset: -2px;
        }
        .sbs-ig-grid figcaption {
          position: absolute;
          left: 6px;
          right: 6px;
          bottom: 6px;
          padding: 5px 6px;
          background: rgba(13,14,16,0.58);
          color: #F8FAFA;
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.12em;
          line-height: 1.25;
          text-transform: uppercase;
        }
        .sbs-ig-mockup > p {
          margin: 0;
          color: #4F5052;
          font-size: 13px;
          line-height: 1.7;
        }
        .sbs-brand-world-grid {
          display: grid;
          gap: 18px;
        }
        .sbs-brand-world-card {
          display: grid;
          grid-template-columns: minmax(300px, 0.42fr) minmax(0, 1fr);
          gap: clamp(16px, 3vw, 28px);
          padding: clamp(14px, 2.4vw, 22px);
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-brand-world-images {
          display: grid;
          gap: 8px;
        }
        .sbs-brand-world-hero,
        .sbs-brand-world-thumbs figure,
        .sbs-best-use-row figure,
        .sbs-one-world-uses figure {
          position: relative;
          margin: 0;
          overflow: hidden;
          background: #F8FAFA;
        }
        .sbs-brand-world-hero {
          min-height: 440px;
        }
        .sbs-brand-world-thumbs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .sbs-brand-world-thumbs figure {
          aspect-ratio: 4 / 4.6;
        }
        .sbs-brand-world-copy {
          display: grid;
          gap: 16px;
          align-content: start;
        }
        .sbs-brand-world-copy h4 {
          margin: 0;
          color: #0D0E10;
          font-size: clamp(2.7rem, 5vw, 4.8rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.95;
        }
        .sbs-brand-world-copy > p {
          max-width: 680px;
          color: #4F5052;
          font-size: 15px;
          line-height: 1.8;
        }
        .sbs-brand-world-specs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-brand-world-specs span,
        .sbs-choose-note,
        .sbs-consistency-code label,
        .sbs-world-decision-selector article,
        .sbs-volume-grid article {
          display: grid;
          gap: 7px;
          padding: 13px;
          background: #F8FAFA;
          color: #4F5052;
          font-size: 12px;
          line-height: 1.6;
        }
        .sbs-brand-world-specs strong,
        .sbs-choose-note span,
        .sbs-consistency-code span,
        .sbs-world-decision-selector span,
        .sbs-volume-grid span {
          display: block;
          color: #0D0E10;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-choose-note {
          background: #282728;
          color: rgba(248,250,250,0.82);
        }
        .sbs-choose-note span,
        .sbs-choose-note p {
          color: #F8FAFA;
        }
        .sbs-starting-code {
          display: grid;
          gap: 12px;
          padding: 14px;
          border: 1px solid rgba(197,198,200,0.45);
          background: #FFFFFF;
        }
        .sbs-starting-code > span {
          color: #0D0E10;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-visual-code-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-visual-code-summary.is-compact {
          grid-template-columns: 1fr;
          border: 0;
        }
        .sbs-visual-code-summary span {
          display: grid;
          gap: 7px;
          padding: 12px;
          background: #F8FAFA;
          color: #4F5052;
          font-size: 12px;
          line-height: 1.55;
        }
        .sbs-visual-code-summary:not(.is-compact) span:last-child {
          grid-column: 1 / -1;
        }
        .sbs-visual-code-summary strong {
          display: block;
          color: #0D0E10;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-visual-code-examples {
          display: grid;
          gap: 12px;
        }
        .sbs-visual-code-examples article {
          display: grid;
          grid-template-columns: minmax(230px, 0.75fr) minmax(0, 1.25fr);
          gap: 1px;
          border: 1px solid rgba(197,198,200,0.45);
          background: rgba(197,198,200,0.35);
        }
        .sbs-visual-code-examples article > div:first-child {
          display: grid;
          align-content: start;
          gap: 12px;
          padding: 18px;
          background: #FFFFFF;
        }
        .sbs-visual-code-examples h4 {
          margin: 0;
          color: #0D0E10;
          font-size: clamp(2.2rem, 4vw, 3.6rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.95;
        }
        .sbs-visual-code-examples p {
          margin: 0;
          color: #4F5052;
          font-size: 13px;
          line-height: 1.7;
        }
        .sbs-best-use-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .sbs-best-use-row figure {
          aspect-ratio: 1;
        }
        .sbs-best-use-row figcaption,
        .sbs-one-world-uses figcaption {
          position: absolute;
          left: 7px;
          right: 7px;
          bottom: 7px;
          padding: 6px 7px;
          background: rgba(13,14,16,0.62);
          color: #F8FAFA;
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .sbs-worksheet-intro {
          margin-bottom: 16px;
        }
        .sbs-consistency-code {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-world-decision-selector {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-world-decision-selector article {
          min-height: 112px;
          align-content: space-between;
        }
        .sbs-world-decision-selector p {
          margin: 0;
        }
        .sbs-world-decision-selector span {
          width: fit-content;
          padding-top: 12px;
          border-top: 1px solid rgba(13,14,16,0.22);
        }
        .sbs-consistency-code label {
          min-height: 116px;
        }
        .sbs-consistency-code small {
          display: block;
          color: #818283;
          font-size: 11px;
          font-style: normal;
          line-height: 1.45;
        }
        .sbs-consistency-code textarea,
        .sbs-concierge-input-grid textarea {
          min-height: 72px;
          width: 100%;
          resize: vertical;
          border: 1px solid rgba(197,198,200,0.55);
          border-radius: 0;
          background: #FFFFFF;
          color: #0D0E10;
          font: inherit;
          font-size: 12px;
          line-height: 1.55;
          outline: none;
          padding: 10px;
        }
        .sbs-concierge-input-grid textarea::placeholder {
          color: rgba(79,80,82,0.48);
        }
        .sbs-consistency-code textarea:focus,
        .sbs-concierge-input-grid textarea:focus {
          border-color: rgba(13,14,16,0.72);
          box-shadow: 0 0 0 1px rgba(13,14,16,0.14);
        }
        .sbs-code-builder {
          display: grid;
          gap: 14px;
        }
        .sbs-code-builder-actions {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          padding: 14px;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-code-builder-actions button {
          min-height: 42px;
          border: 0;
          background: #0D0E10;
          color: #F8FAFA;
          cursor: pointer;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          padding: 0 18px;
          text-transform: uppercase;
        }
        .sbs-code-builder-actions button:disabled,
        .sbs-concierge-build-button:disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }
        .sbs-code-builder-actions p {
          margin: 0;
          color: #4F5052;
          font-size: 12px;
          line-height: 1.65;
        }
        .sbs-consistency-code i,
        .sbs-signature-line {
          display: block;
          height: 1px;
          margin-top: auto;
          background: rgba(13,14,16,0.25);
        }
        .sbs-one-world-uses {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
        }
        .sbs-one-world-uses figure {
          aspect-ratio: 4 / 5;
        }
        .sbs-volume-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-signature-line {
          width: min(420px, 100%);
          margin: 14px 0;
          background: rgba(248,250,250,0.42);
        }
        .sbs-action-step {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
        }
        .sbs-module-three {
          margin-top: 14px;
        }
        .sbs-module-three-hero {
          grid-template-columns: 1fr;
        }
        .sbs-module3-sequence {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          min-height: 520px;
        }
        .sbs-module3-sequence figure,
        .sbs-prompt-card figure,
        .sbs-starter-board figure {
          position: relative;
          min-height: 100%;
          margin: 0;
          overflow: hidden;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-module3-sequence figcaption,
        .sbs-starter-board figcaption {
          position: absolute;
          left: 8px;
          right: 8px;
          bottom: 8px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          padding: 7px 8px;
          background: rgba(13,14,16,0.64);
          color: #F8FAFA;
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1.3;
          text-transform: uppercase;
        }
        .sbs-module3-outcome {
          display: grid;
          gap: 16px;
        }
        .sbs-module3-outcome > div {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-module3-outcome span,
        .sbs-step-flow article,
        .sbs-prompt-meta span,
        .sbs-concierge-input-grid label,
        .sbs-concierge-note {
          display: grid;
          gap: 8px;
          padding: 14px;
          background: #F8FAFA;
          color: #4F5052;
          font-size: 12px;
          line-height: 1.6;
        }
        .sbs-module3-outcome span,
        .sbs-step-flow span,
        .sbs-prompt-meta strong,
        .sbs-concierge-input-grid span,
        .sbs-concierge-note span {
          color: #0D0E10;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-step-flow {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-step-flow article {
          min-height: 138px;
          align-content: space-between;
        }
        .sbs-prompt-card-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .sbs-prompt-card {
          display: grid;
          grid-template-rows: minmax(310px, auto) 1fr;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-prompt-card-copy {
          display: grid;
          gap: 14px;
          align-content: start;
          padding: 16px;
        }
        .sbs-prompt-card h4,
        .sbs-starter-board h4,
        .sbs-concierge h4 {
          margin: 0;
          color: #0D0E10;
          font-size: clamp(2.1rem, 4vw, 3.6rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.96;
        }
        .sbs-prompt-meta {
          display: grid;
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-prompt-text {
          border: 1px solid rgba(197,198,200,0.45);
          background: #F8FAFA;
        }
        .sbs-prompt-text summary {
          cursor: pointer;
          padding: 12px;
          color: #0D0E10;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          list-style: none;
        }
        .sbs-prompt-text summary::-webkit-details-marker {
          display: none;
        }
        .sbs-prompt-text p {
          max-height: 260px;
          overflow: auto;
          padding: 0 12px 12px;
          color: #282728;
          font-size: 12px;
          line-height: 1.7;
          white-space: pre-wrap;
        }
        .sbs-copy-button {
          min-height: 44px;
          width: 100%;
          border: 0;
          background: #0D0E10;
          color: #F8FAFA;
          cursor: pointer;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .sbs-copy-button:hover {
          opacity: 0.86;
          transform: translateY(-1px);
        }
        .sbs-copy-button.is-secondary {
          min-height: 38px;
          background: #282728;
          font-size: 9px;
        }
        .sbs-starter-board {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .sbs-starter-board article {
          display: grid;
          grid-template-rows: minmax(300px, auto) 1fr;
          border: 1px solid rgba(197,198,200,0.45);
          background: #FFFFFF;
        }
        .sbs-starter-board article > div {
          display: grid;
          gap: 12px;
          padding: 16px;
        }
        .sbs-starter-board span {
          display: block;
          padding-top: 12px;
          border-top: 1px solid rgba(13,14,16,0.16);
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1.55;
          text-transform: uppercase;
        }
        .sbs-fix-prompt-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-fix-prompt-grid article {
          display: grid;
          gap: 12px;
          align-content: start;
          padding: 16px;
          background: #FFFFFF;
        }
        .sbs-fix-prompt-grid h4,
        .sbs-concierge-output h4 {
          margin: 0;
          color: #0D0E10;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1.45;
          text-transform: uppercase;
        }
        .sbs-fix-prompt-grid p,
        .sbs-concierge-output p {
          color: #4F5052;
          font-size: 12px;
          line-height: 1.7;
        }
        .sbs-concierge {
          display: grid;
          grid-template-columns: minmax(280px, 0.88fr) minmax(0, 1.12fr);
          gap: 14px;
        }
        .sbs-concierge-form,
        .sbs-concierge-output {
          display: grid;
          align-content: start;
          gap: 14px;
          padding: 18px;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-concierge-input-grid {
          display: grid;
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-concierge-step {
          display: grid;
          gap: 12px;
          padding: 14px;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-concierge-step > span,
        .sbs-concierge-output-group h6 {
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-concierge-step h5,
        .sbs-concierge-output > div:first-child h5 {
          margin: 0;
          color: #0D0E10;
          font-size: clamp(1.9rem, 3.5vw, 3rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .sbs-concierge-input-grid i {
          display: block;
          height: 1px;
          margin-top: 18px;
          background: rgba(13,14,16,0.24);
        }
        .sbs-use-case-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-use-case-grid label {
          display: grid;
          grid-template-columns: 16px minmax(0, 1fr);
          gap: 9px;
          align-items: center;
          padding: 12px;
          background: #F8FAFA;
          color: #282728;
          font-size: 12px;
          line-height: 1.5;
        }
        .sbs-use-case-grid input {
          width: 14px;
          height: 14px;
          accent-color: #0D0E10;
        }
        .sbs-concierge-build-button {
          min-height: 46px;
          width: 100%;
          border: 0;
          background: #0D0E10;
          color: #F8FAFA;
          cursor: pointer;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-concierge-output {
          gap: 18px;
        }
        .sbs-concierge-output > div:first-child {
          display: grid;
          gap: 10px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-concierge-output-group {
          display: grid;
          gap: 10px;
        }
        .sbs-concierge-output-group h6 {
          margin: 0;
          color: #0D0E10;
        }
        .sbs-concierge-output-group > div:first-child {
          display: grid;
          gap: 8px;
        }
        .sbs-concierge-output-group > div:last-child {
          display: grid;
          gap: 10px;
        }
        .sbs-concierge-output-group article {
          display: grid;
          gap: 10px;
          padding: 14px;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-concierge-output-group.is-primary article {
          padding: 16px;
          border-color: rgba(13,14,16,0.22);
          background: #FFFFFF;
        }
        .sbs-concierge-output-group:not(.is-primary) article {
          background: rgba(255,255,255,0.72);
        }
        .sbs-concierge-output-group article > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: baseline;
        }
        .sbs-concierge-output span {
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1.4;
          text-transform: uppercase;
        }
        .sbs-upgrade-bridge {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
          padding: 18px;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-upgrade-bridge > span {
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          line-height: 1.5;
          text-transform: uppercase;
        }
        .sbs-module-four {
          margin-top: 14px;
        }
        .sbs-module-four-hero {
          grid-template-columns: minmax(0, 0.72fr) minmax(300px, 0.58fr);
        }
        .sbs-module4-sequence {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          min-height: 430px;
        }
        .sbs-module4-sequence figure,
        .sbs-module4-example-grid figure {
          position: relative;
          min-height: 100%;
          margin: 0;
          overflow: hidden;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-module4-sequence figcaption,
        .sbs-module4-example-grid figcaption {
          position: absolute;
          left: 8px;
          right: 8px;
          bottom: 8px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          padding: 7px 8px;
          background: rgba(13,14,16,0.64);
          color: #F8FAFA;
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1.3;
          text-transform: uppercase;
        }
        .sbs-kfd-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-kfd-grid article {
          display: grid;
          align-content: start;
          gap: 18px;
          padding: 18px;
          background: #FFFFFF;
        }
        .sbs-kfd-grid h4,
        .sbs-module4-example-grid h4,
        .sbs-maya-review-layer h4 {
          margin: 0;
          color: #0D0E10;
          font-size: clamp(2.2rem, 4vw, 3.7rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.96;
        }
        .sbs-kfd-intro {
          max-width: 24ch;
          margin: 12px 0 0;
          color: #4F5052;
          font-size: 13px;
          line-height: 1.65;
        }
        .sbs-kfd-checks {
          display: grid;
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-kfd-checks span {
          display: block;
          padding: 11px 12px;
          background: #F8FAFA;
          color: #282728;
          font-size: 12px;
          line-height: 1.55;
        }
        .sbs-module4-example-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .sbs-module4-example-grid article {
          display: grid;
          grid-template-rows: minmax(310px, auto) 1fr;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-module4-example-grid article > div {
          display: grid;
          align-content: start;
          gap: 13px;
          padding: 16px;
        }
        .sbs-module4-example-grid span {
          display: grid;
          gap: 7px;
          padding: 12px;
          background: #F8FAFA;
          color: #4F5052;
          font-size: 12px;
          line-height: 1.6;
        }
        .sbs-module4-example-grid strong {
          color: #0D0E10;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-module4-checklist {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-module4-checklist label {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          padding: 14px;
          background: #FFFFFF;
          color: #282728;
          font-size: 13px;
          line-height: 1.65;
        }
        .sbs-module4-checklist input {
          width: 15px;
          height: 15px;
          margin-top: 3px;
          accent-color: #0D0E10;
        }
        .sbs-maya-review-layer {
          display: grid;
          grid-template-columns: minmax(250px, 0.58fr) minmax(0, 1fr);
          gap: 14px;
          padding: 18px;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-maya-review-layer > div:first-child {
          display: grid;
          align-content: start;
          gap: 12px;
        }
        .sbs-maya-review-steps {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-maya-review-steps article {
          min-height: 104px;
          display: grid;
          align-content: space-between;
          padding: 13px;
          background: #FFFFFF;
        }
        .sbs-maya-review-steps span {
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-maya-review-steps p {
          color: #282728;
          font-size: 12px;
          line-height: 1.55;
        }
        .sbs-maya-review-layer .sbs-prompt-text,
        .sbs-maya-review-layer .sbs-copy-button {
          grid-column: 1 / -1;
        }
        .sbs-final-selects {
          display: grid;
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-final-selects article {
          display: grid;
          grid-template-columns: minmax(210px, 0.46fr) minmax(0, 1fr);
          gap: 1px;
          background: rgba(197,198,200,0.35);
        }
        .sbs-final-selects header,
        .sbs-final-selects article > div {
          background: #FFFFFF;
          padding: 15px;
        }
        .sbs-final-selects header {
          display: grid;
          align-content: start;
          gap: 18px;
        }
        .sbs-final-selects header span {
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
        }
        .sbs-final-selects h4 {
          margin: 0;
          color: #0D0E10;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1.45;
          text-transform: uppercase;
        }
        .sbs-final-selects article > div {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1px;
          padding: 0;
          background: rgba(197,198,200,0.35);
        }
        .sbs-final-selects label {
          min-height: 86px;
          display: grid;
          align-content: space-between;
          gap: 12px;
          padding: 13px;
          background: #F8FAFA;
        }
        .sbs-final-selects label span {
          color: #4F5052;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1.45;
          text-transform: uppercase;
        }
        .sbs-final-selects i {
          display: block;
          height: 1px;
          background: rgba(13,14,16,0.25);
        }
        .sbs-module-five {
          margin-top: 14px;
        }
        .sbs-module-five-hero {
          grid-template-columns: minmax(0, 0.76fr) minmax(300px, 0.54fr);
        }
        .sbs-module5-hero-board {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          min-height: 430px;
        }
        .sbs-module5-hero-board figure,
        .sbs-module5-use-grid figure,
        .sbs-module5-overlay-grid figure,
        .sbs-module5-feed-planner figure {
          position: relative;
          min-height: 100%;
          margin: 0;
          overflow: hidden;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-module5-hero-board figcaption,
        .sbs-module5-feed-planner figcaption {
          position: absolute;
          left: 8px;
          right: 8px;
          bottom: 8px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          padding: 7px 8px;
          background: rgba(13,14,16,0.64);
          color: #F8FAFA;
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1.3;
          text-transform: uppercase;
        }
        .sbs-module5-use-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-module5-use-grid article {
          display: grid;
          grid-template-rows: minmax(210px, auto) 1fr;
          background: #FFFFFF;
        }
        .sbs-module5-use-grid article > div {
          display: grid;
          align-content: start;
          gap: 10px;
          padding: 13px;
        }
        .sbs-module5-use-grid h4,
        .sbs-module5-plan h4,
        .sbs-module5-story-sequence h4,
        .sbs-module5-hook-grid h4 {
          margin: 0;
          color: #0D0E10;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1.45;
          text-transform: uppercase;
        }
        .sbs-module5-use-grid p,
        .sbs-module5-plan p,
        .sbs-module5-story-sequence p,
        .sbs-module5-hook-grid p {
          color: #4F5052;
          font-size: 12px;
          line-height: 1.65;
        }
        .sbs-module5-overlay-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .sbs-module5-overlay-grid article {
          min-height: 560px;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-module5-overlay-grid figcaption {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 10px;
          padding: 18px;
          background: linear-gradient(180deg, rgba(13,14,16,0.04) 0%, rgba(13,14,16,0.18) 42%, rgba(13,14,16,0.72) 100%);
          color: #F8FAFA;
        }
        .sbs-module5-overlay-grid span,
        .sbs-module5-overlay-grid em {
          font-size: 9px;
          font-style: normal;
          font-weight: 700;
          letter-spacing: 0.18em;
          line-height: 1.4;
          text-transform: uppercase;
        }
        .sbs-module5-overlay-grid strong {
          max-width: 10ch;
          font-size: clamp(3rem, 5vw, 5.4rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.92;
          text-transform: none;
        }
        .sbs-module5-feed-planner {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.45);
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-module5-feed-planner figure {
          aspect-ratio: 4 / 5;
          border: 0;
        }
        .sbs-module5-plan,
        .sbs-module5-story-sequence,
        .sbs-module5-hook-grid {
          display: grid;
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-module5-plan {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .sbs-module5-story-sequence {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }
        .sbs-module5-hook-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .sbs-module5-plan article,
        .sbs-module5-story-sequence article,
        .sbs-module5-hook-grid article {
          min-height: 150px;
          display: grid;
          align-content: start;
          gap: 12px;
          padding: 15px;
          background: #FFFFFF;
        }
        .sbs-module5-plan article {
          min-height: 310px;
        }
        .sbs-module5-plan span,
        .sbs-module5-story-sequence span {
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-module5-plan-detail {
          display: grid;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-module5-plan-detail strong {
          color: #0D0E10;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sbs-module5-final-checklist {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-module5-final-checklist label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-height: 82px;
          padding: 18px;
          background: #FFFFFF;
          color: #4F5052;
          font-size: 13px;
          line-height: 1.6;
        }
        .sbs-module5-final-checklist input {
          margin-top: 4px;
          accent-color: #0D0E10;
        }
        .sbs-module5-hook-grid .sbs-copy-button {
          align-self: end;
          margin-top: 4px;
        }
        .sbs-trouble-list {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
        }
        .sbs-trouble-list article {
          min-height: 170px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
          background: #FFFFFF;
        }
        .sbs-trouble-list span {
          color: #0D0E10;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1.45;
          text-transform: uppercase;
        }
        .sbs-module-next,
        .sbs-mini-planner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: end;
          margin-top: 14px;
          padding: clamp(20px, 4vw, 34px);
          background: #282728;
        }
        .sbs-module-next .sbs-kicker,
        .sbs-module-next p,
        .sbs-mini-planner .sbs-kicker,
        .sbs-mini-planner p {
          color: rgba(248,250,250,0.76);
        }
        .sbs-module-next h3,
        .sbs-mini-planner h3 {
          color: #F8FAFA;
        }
        .sbs-module-next .sbs-primary {
          background: #F8FAFA;
          color: #0D0E10;
        }
        .sbs-module-next .sbs-secondary {
          border-color: rgba(248,250,250,0.38);
          color: #F8FAFA;
        }
        .sbs-placeholder-stack {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }
        .sbs-placeholder-module {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 20px;
          align-items: center;
          padding: 18px;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-placeholder-module h3 {
          margin-bottom: 10px;
          font-size: clamp(2rem, 3.8vw, 3.4rem);
        }
        .sbs-placeholder-module > span {
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-mini-planner {
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-mini-planner .sbs-kicker,
        .sbs-mini-planner h3,
        .sbs-mini-planner p {
          color: #0D0E10;
        }
        .sbs-mini-planner p {
          color: #4F5052;
        }
        .sbs-mini-grid {
          width: min(220px, 42vw);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(197,198,200,0.45);
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-mini-grid span {
          aspect-ratio: 1;
          background: #F8FAFA;
        }
        .sbs-final-resources {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 26px;
          align-items: end;
          margin-bottom: 42px;
        }
        @media (max-width: 1180px) {
          .sbs-module-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .sbs-trouble-list,
          .sbs-volume-grid,
          .sbs-step-flow,
          .sbs-prompt-card-grid,
          .sbs-starter-board,
          .sbs-kfd-grid,
          .sbs-module4-example-grid,
          .sbs-module5-use-grid,
          .sbs-module5-plan {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .sbs-maya-review-steps,
          .sbs-final-selects article > div,
          .sbs-module5-story-sequence,
          .sbs-module5-hook-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .sbs-one-world-uses {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
        @media (max-width: 980px) {
          .sbs-buyer-home,
          .sbs-course-player,
          .sbs-lesson-hero,
          .sbs-decision-tool,
          .sbs-world-comparison,
          .sbs-brand-world-card,
          .sbs-concierge,
          .sbs-module-four-hero,
          .sbs-module-five-hero,
          .sbs-maya-review-layer,
          .sbs-final-selects article,
          .sbs-module-next,
          .sbs-mini-planner,
          .sbs-upgrade-bridge,
          .sbs-final-resources {
            grid-template-columns: 1fr;
          }
          .sbs-course-sidebar {
            display: none;
          }
          .sbs-mobile-module-list {
            display: block;
            margin-top: 14px;
          }
          .sbs-mobile-player-progress {
            display: block;
            margin-bottom: 14px;
            padding: 16px;
            background: #FFFFFF;
            border: 1px solid rgba(197,198,200,0.35);
          }
          .sbs-mobile-player-progress .sbs-course-progress {
            margin: 0;
          }
          .sbs-mobile-module-list details {
            background: #FFFFFF;
            border: 1px solid rgba(197,198,200,0.35);
          }
          .sbs-mobile-module-list summary {
            cursor: pointer;
            padding: 16px;
            color: #0D0E10;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            list-style: none;
          }
          .sbs-mobile-module-list summary::-webkit-details-marker {
            display: none;
          }
          .sbs-mobile-module-list nav {
            display: grid;
            border-top: 1px solid rgba(197,198,200,0.35);
          }
          .sbs-mobile-module-list a {
            display: flex;
            gap: 12px;
            padding: 13px 16px;
            color: #4F5052;
            border-bottom: 1px solid rgba(197,198,200,0.35);
            font-size: 12px;
            text-decoration: none;
          }
          .sbs-home-board {
            min-height: 500px;
          }
          .sbs-example-grid {
            grid-template-columns: 1fr;
          }
          .sbs-source-checklist,
          .sbs-world-lesson > div:first-child,
          .sbs-brand-world-specs,
          .sbs-visual-code-summary,
          .sbs-visual-code-examples article,
          .sbs-module3-outcome > div,
          .sbs-module4-checklist,
          .sbs-module5-final-checklist,
          .sbs-module5-overlay-grid,
          .sbs-world-decision-selector,
          .sbs-consistency-code {
            grid-template-columns: 1fr;
          }
          .sbs-brand-world-hero {
            min-height: 520px;
          }
          .sbs-one-world-uses {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .sbs-top-links {
            display: none;
          }
          .sbs-buyer-home,
          .sbs-home-modules,
          .sbs-course-player,
          .sbs-final-resources {
            padding-left: 14px;
            padding-right: 14px;
          }
          .sbs-home-copy h1 {
            font-size: clamp(3.1rem, 15vw, 4.8rem);
          }
          .sbs-home-actions,
          .sbs-final-actions {
            display: grid;
            grid-template-columns: 1fr;
          }
          .sbs-primary,
          .sbs-secondary {
            width: 100%;
          }
          .sbs-home-board {
            min-height: 430px;
          }
          .sbs-home-image-0 {
            left: 0;
            width: 58%;
          }
          .sbs-home-image-1 {
            top: 18%;
            width: 50%;
          }
          .sbs-home-image-2 {
            left: 30%;
            width: 52%;
          }
          .sbs-module-card-grid,
          .sbs-quick-links,
          .sbs-trouble-list,
          .sbs-world-decision-selector,
          .sbs-volume-grid,
          .sbs-step-flow,
          .sbs-prompt-card-grid,
          .sbs-starter-board,
          .sbs-fix-prompt-grid,
          .sbs-kfd-grid,
          .sbs-module4-example-grid,
          .sbs-maya-review-steps,
          .sbs-final-selects article > div,
          .sbs-module5-use-grid,
          .sbs-module5-plan,
          .sbs-module5-story-sequence,
          .sbs-module5-hook-grid,
          .sbs-module5-final-checklist {
            grid-template-columns: 1fr;
          }
          .sbs-module-card-image {
            aspect-ratio: 4 / 4.4;
          }
          .sbs-lesson-panel {
            padding: 12px;
          }
          .sbs-lesson-hero,
          .sbs-lesson-section summary,
          .sbs-action-step,
          .sbs-placeholder-module {
            grid-template-columns: 1fr;
          }
          .sbs-lesson-hero {
            padding: 16px;
          }
          .sbs-lesson-hero h2,
          .sbs-section-heading h2,
          .sbs-final-resources h2 {
            font-size: clamp(2.8rem, 13vw, 4.4rem);
          }
          .sbs-lesson-hero-image {
            min-height: 390px;
          }
          .sbs-module3-sequence {
            min-height: auto;
            grid-template-columns: 0.82fr 0.74fr 1fr;
          }
          .sbs-module3-sequence figure {
            min-height: 255px;
          }
          .sbs-module3-sequence figcaption {
            display: grid;
          }
          .sbs-module4-sequence {
            min-height: auto;
          }
          .sbs-module4-sequence figure {
            min-height: 250px;
          }
          .sbs-module4-sequence figcaption {
            display: grid;
          }
          .sbs-module5-hero-board {
            min-height: auto;
          }
          .sbs-module5-hero-board figure {
            min-height: 250px;
          }
          .sbs-module5-hero-board figcaption,
          .sbs-module5-feed-planner figcaption {
            display: grid;
          }
          .sbs-module5-use-grid article {
            grid-template-rows: minmax(360px, auto) 1fr;
          }
          .sbs-module5-overlay-grid article {
            min-height: 520px;
          }
          .sbs-lesson-section summary {
            gap: 10px;
            padding: 15px;
          }
          .sbs-lesson-body {
            padding: 14px;
          }
          .sbs-example-image-grid {
            min-height: auto;
          }
          .sbs-example-image {
            min-height: 245px;
          }
          .sbs-example-image-grid-1 .sbs-example-image {
            min-height: 390px;
          }
          .sbs-ig-mockup {
            padding: 12px;
          }
          .sbs-ig-grid figcaption {
            display: none;
          }
          .sbs-brand-world-card {
            padding: 12px;
          }
          .sbs-brand-world-hero {
            min-height: 430px;
          }
          .sbs-best-use-row {
            gap: 4px;
          }
          .sbs-one-world-uses {
            gap: 6px;
          }
          .sbs-prompt-card,
          .sbs-starter-board article {
            grid-template-rows: minmax(360px, auto) 1fr;
          }
          .sbs-concierge-output article > div {
            display: grid;
          }
          .sbs-mini-grid {
            width: 100%;
          }
        }
      `}</style>

      <style>{`
        /* ====================================================================
           Editorial redesign (sbs2-*) — calm light-luxury course experience.
           Layered on top of the legacy block CSS above, which still styles the
           interactive lesson blocks (prompt cards, grids, checklists, etc).
        ==================================================================== */
        .sbs2-page {
          --ink: #0D0E10;
          --ink-soft: #282728;
          --body: #4F5052;
          --muted: #818283;
          --line: rgba(40, 39, 40, 0.12);
          --line-soft: rgba(40, 39, 40, 0.07);
          --surface: #FFFFFF;
          --field: #F8FAFA;
          min-height: 100vh;
          background: #F8FAFA;
          color: var(--ink);
          -webkit-font-smoothing: antialiased;
        }
        .sbs2-page *:focus-visible {
          outline: 2px solid var(--ink);
          outline-offset: 3px;
          border-radius: 2px;
        }

        .sbs2-eyebrow {
          margin: 0 0 14px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.34em;
          line-height: 1.6;
          text-transform: uppercase;
        }

        /* ----- Header ----- */
        .sbs2-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
          padding: 16px clamp(18px, 4vw, 48px);
          background: rgba(248, 250, 250, 0.82);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--line-soft);
        }
        .sbs2-logo {
          justify-self: start;
          color: var(--ink);
          font-size: 16px;
          font-weight: 300;
          letter-spacing: 0.36em;
          text-decoration: none;
          text-transform: uppercase;
        }
        .sbs2-header-label {
          justify-self: center;
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.42em;
          text-transform: uppercase;
        }
        .sbs2-header-link {
          justify-self: end;
          color: var(--ink-soft);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          text-decoration: none;
          border-bottom: 1px solid var(--line);
          padding-bottom: 3px;
          transition: border-color 0.18s ease;
        }
        .sbs2-header-link:hover {
          border-color: var(--ink);
        }

        /* ----- Hero ----- */
        .sbs2-hero {
          display: grid;
          grid-template-columns: 1.04fr 0.96fr;
          gap: clamp(28px, 5vw, 72px);
          align-items: center;
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(48px, 7vw, 104px) clamp(20px, 5vw, 64px) clamp(36px, 5vw, 72px);
        }
        .sbs2-hero-figure {
          position: relative;
          margin: 0;
          width: 100%;
          aspect-ratio: 4 / 5;
          max-height: 560px;
          border-radius: 18px;
          overflow: hidden;
          background: #ECEEEE;
        }
        .sbs2-resume-title {
          margin: 0 0 14px;
          color: var(--ink);
          font-size: clamp(2.6rem, 5.4vw, 4.6rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.98;
        }
        .sbs2-resume-sub {
          margin: 0 0 30px;
          max-width: 460px;
          color: var(--body);
          font-size: 16px;
          line-height: 1.8;
        }

        /* ----- Progress bar ----- */
        .sbs2-progress {
          margin: 0 0 30px;
          max-width: 440px;
        }
        .sbs2-progress-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .sbs2-progress-head span {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .sbs2-progress-head strong {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--ink);
        }
        .sbs2-progress-track {
          height: 4px;
          border-radius: 999px;
          background: #E3E6E6;
          overflow: hidden;
        }
        .sbs2-progress-track span {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: var(--ink);
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ----- Buttons ----- */
        .sbs2-btn {
          appearance: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          padding: 0 36px;
          border: 1px solid transparent;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          text-decoration: none;
          cursor: pointer;
          transition: opacity 0.18s ease, background 0.18s ease, transform 0.18s ease;
        }
        .sbs2-btn-primary {
          background: var(--ink);
          color: #FFFFFF;
        }
        .sbs2-btn-primary:hover {
          opacity: 0.88;
        }
        .sbs2-btn-primary:active {
          transform: translateY(1px);
        }

        /* ----- Path / table of contents ----- */
        .sbs2-pathwrap {
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(40px, 5vw, 72px) clamp(20px, 5vw, 64px);
        }
        .sbs2-section-head {
          margin-bottom: 8px;
        }
        .sbs2-section-title {
          margin: 0 0 16px;
          color: var(--ink);
          font-size: clamp(2rem, 3.6vw, 3.1rem);
          font-weight: 300;
          letter-spacing: -0.015em;
          line-height: 1;
        }
        .sbs2-section-sub {
          margin: 0;
          max-width: 640px;
          color: var(--body);
          font-size: 16px;
          line-height: 1.8;
        }
        .sbs2-path {
          list-style: none;
          margin: 28px 0 0;
          padding: 0;
          border-top: 1px solid var(--line);
        }
        .sbs2-path li {
          margin: 0;
        }
        .sbs2-path-card {
          width: 100%;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: clamp(16px, 3vw, 30px);
          padding: clamp(18px, 2.4vw, 24px) clamp(6px, 1.4vw, 14px);
          border: none;
          border-bottom: 1px solid var(--line);
          background: transparent;
          text-align: left;
          cursor: pointer;
          transition: background 0.18s ease, padding-left 0.18s ease;
        }
        .sbs2-path-card:hover {
          background: #FFFFFF;
          padding-left: clamp(12px, 2vw, 22px);
        }
        .sbs2-path-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 46px;
          border: 1px solid var(--line);
          border-radius: 50%;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--muted);
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
        .sbs2-path-card.is-current .sbs2-path-num {
          border-color: var(--ink);
          color: var(--ink);
        }
        .sbs2-path-card.is-done .sbs2-path-num {
          background: var(--ink);
          border-color: var(--ink);
          color: #FFFFFF;
        }
        .sbs2-path-copy strong {
          display: block;
          color: var(--ink);
          font-size: clamp(15px, 1.6vw, 17px);
          font-weight: 500;
          letter-spacing: -0.005em;
        }
        .sbs2-path-copy small {
          display: block;
          margin-top: 4px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }
        .sbs2-path-status {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--muted);
          white-space: nowrap;
        }
        .sbs2-path-card.is-current .sbs2-path-status {
          color: var(--ink);
        }

        /* ----- Module panels ----- */
        .sbs2-modules {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 clamp(20px, 5vw, 64px) clamp(56px, 8vw, 104px);
        }
        .sbs2-module {
          border-top: 1px solid var(--line);
        }
        .sbs2-module-head {
          width: 100%;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: start;
          gap: clamp(16px, 3vw, 32px);
          padding: clamp(26px, 3.4vw, 40px) 0;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
        }
        .sbs2-module-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border: 1px solid var(--line);
          border-radius: 50%;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--muted);
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
        .sbs2-module.is-open .sbs2-module-num {
          border-color: var(--ink);
          color: var(--ink);
        }
        .sbs2-module.is-done .sbs2-module-num {
          background: var(--ink);
          border-color: var(--ink);
          color: #FFFFFF;
        }
        .sbs2-module-headcopy {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }
        .sbs2-module-headcopy .sbs2-eyebrow {
          margin: 0;
        }
        .sbs2-module-title {
          color: var(--ink);
          font-size: clamp(1.7rem, 3vw, 2.6rem);
          font-weight: 300;
          letter-spacing: -0.01em;
          line-height: 1.03;
        }
        .sbs2-module-outcome {
          max-width: 580px;
          color: var(--body);
          font-size: 15px;
          line-height: 1.65;
        }
        .sbs2-module-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 14px;
          padding-top: 6px;
        }
        .sbs2-module-time {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--muted);
          white-space: nowrap;
        }
        .sbs2-module-caret {
          width: 11px;
          height: 11px;
          border-right: 1.5px solid var(--muted);
          border-bottom: 1.5px solid var(--muted);
          transform: rotate(45deg);
          transition: transform 0.25s ease, border-color 0.2s ease;
          margin-bottom: 4px;
        }
        .sbs2-module.is-open .sbs2-module-caret {
          transform: rotate(225deg);
          border-color: var(--ink);
        }
        .sbs2-module-collapsed {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 0 clamp(24px, 3vw, 34px) 66px;
          color: var(--muted);
          font-size: 14px;
        }
        .sbs2-module-open-hint {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ink);
          white-space: nowrap;
        }
        .sbs2-module-body {
          padding: 4px 0 clamp(36px, 5vw, 64px);
        }
        .sbs2-module-cover {
          margin: 0 0 clamp(28px, 4vw, 44px);
        }
        .sbs2-cover-figure {
          position: relative;
          margin: 0;
          width: 100%;
          aspect-ratio: 16 / 10;
          max-height: 460px;
          border-radius: 16px;
          overflow: hidden;
          background: #ECEEEE;
        }
        .sbs2-module-content {
          /* interactive lesson blocks keep their own widths; text is constrained below */
        }
        .sbs2-module-foot {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px 24px;
          margin-top: clamp(28px, 4vw, 48px);
          padding-top: clamp(24px, 3vw, 32px);
          border-top: 1px solid var(--line);
        }
        .sbs2-foot-next {
          color: var(--muted);
          font-size: 14px;
        }
        .sbs2-foot-next strong {
          color: var(--ink);
          font-weight: 500;
        }

        /* ----- Inline lesson block (replaces the old accordion) ----- */
        .sbs2-block {
          margin: clamp(26px, 4vw, 44px) 0;
        }
        .sbs2-block:first-child {
          margin-top: 0;
        }
        .sbs2-block-head {
          margin-bottom: 16px;
        }
        .sbs2-block-head .sbs2-eyebrow {
          margin: 0 0 10px;
        }
        .sbs2-block-title {
          margin: 0;
          color: var(--ink);
          font-size: clamp(1.4rem, 2.3vw, 1.95rem);
          font-weight: 400;
          letter-spacing: -0.005em;
          line-height: 1.12;
        }
        .sbs2-block-body {
          color: var(--body);
          font-size: 15.5px;
          line-height: 1.8;
        }
        .sbs2-block-body > p {
          margin: 0 0 14px;
          max-width: 68ch;
        }
        .sbs2-block-body > p:last-child {
          margin-bottom: 0;
        }

        /* ----- Saved look recap ----- */
        .sbs2-recap {
          margin: 4px 0 8px;
          padding: clamp(20px, 3vw, 30px);
          background: #FFFFFF;
          border: 1px solid var(--line);
          border-radius: 16px;
        }
        .sbs2-recap .sbs2-eyebrow {
          margin: 0 0 12px;
        }
        .sbs2-recap-empty {
          background: transparent;
          border-style: dashed;
        }
        .sbs2-recap-empty p {
          margin: 0 0 12px;
          color: var(--body);
          font-size: 15px;
          line-height: 1.7;
          max-width: 60ch;
        }
        .sbs2-recap-world {
          margin: 0;
          color: var(--ink);
          font-size: clamp(1.5rem, 2.6vw, 2.1rem);
          font-weight: 300;
          line-height: 1.15;
        }
        .sbs2-recap-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 18px;
          margin: 22px 0 0;
        }
        .sbs2-recap-grid div {
          border-top: 1px solid var(--line-soft);
          padding-top: 10px;
        }
        .sbs2-recap-grid dt {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 6px;
        }
        .sbs2-recap-grid dd {
          margin: 0;
          color: var(--ink);
          font-size: 15px;
          line-height: 1.5;
        }
        .sbs2-recap-note {
          margin: 18px 0 0;
          color: var(--muted);
          font-size: 13.5px;
        }
        .sbs2-text-link {
          display: inline-flex;
          align-items: center;
          color: var(--ink);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          text-decoration: none;
          border-bottom: 1px solid var(--ink);
          padding-bottom: 2px;
        }
        .sbs2-text-link:hover {
          opacity: 0.7;
        }

        /* ----- Final resources ----- */
        .sbs2-final-resources {
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(48px, 6vw, 80px) clamp(20px, 5vw, 64px) clamp(64px, 8vw, 104px);
          border-top: 1px solid var(--line);
        }
        .sbs2-final-resources h2 {
          margin: 0 0 28px;
          color: var(--ink);
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 300;
          letter-spacing: -0.015em;
          line-height: 1;
        }

        /* ----- Look picker (tap to choose your look) ----- */
        .sbs2-lookpicker {
          margin-top: 4px;
        }
        .sbs2-look-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
          gap: 16px;
        }
        .sbs2-look-card {
          display: flex;
          flex-direction: column;
          padding: 0;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #FFFFFF;
          text-align: left;
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .sbs2-look-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 40px -28px rgba(13, 14, 16, 0.5);
          border-color: var(--stone, #8A8780);
        }
        .sbs2-look-card.is-selected {
          border-color: var(--ink);
          box-shadow: inset 0 0 0 1px var(--ink);
        }
        .sbs2-look-img {
          position: relative;
          display: block;
          aspect-ratio: 4 / 5;
          background: #ECEEEE;
          overflow: hidden;
        }
        .sbs2-look-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }
        .sbs2-look-check {
          position: absolute;
          top: 12px;
          right: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--ink);
          color: #FFFFFF;
          opacity: 0;
          transform: scale(0.7);
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .sbs2-look-card.is-selected .sbs2-look-check {
          opacity: 1;
          transform: scale(1);
        }
        .sbs2-look-body {
          display: flex;
          flex-direction: column;
          gap: 9px;
          padding: 18px 18px 20px;
          flex: 1;
        }
        .sbs2-look-swatches {
          display: flex;
          gap: 6px;
          margin-bottom: 2px;
        }
        .sbs2-look-swatches span {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: 1px solid rgba(40, 39, 40, 0.14);
        }
        .sbs2-look-name {
          color: var(--ink);
          font-size: clamp(1.35rem, 2vw, 1.7rem);
          font-weight: 400;
          line-height: 1.05;
        }
        .sbs2-look-feeling {
          color: var(--body);
          font-size: 13.5px;
          line-height: 1.55;
        }
        .sbs2-look-choose {
          color: var(--muted);
          font-size: 12.5px;
          line-height: 1.5;
        }
        .sbs2-look-choose em {
          display: inline;
          font-style: normal;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: 9.5px;
          color: var(--ink);
        }
        .sbs2-look-cta {
          margin-top: auto;
          padding-top: 6px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .sbs2-look-card.is-selected .sbs2-look-cta {
          color: var(--ink);
        }
        .sbs2-look-hint {
          margin: 16px 0 0;
          color: var(--muted);
          font-size: 13.5px;
        }
        .sbs2-look-saved {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px 20px;
          margin-top: 18px;
          padding: 18px 22px;
          background: #FFFFFF;
          border: 1px solid var(--line);
          border-radius: 12px;
        }
        .sbs2-look-saved p {
          margin: 0;
          color: var(--body);
          font-size: 14.5px;
        }
        .sbs2-look-saved strong {
          color: var(--ink);
          font-weight: 600;
        }
        .sbs2-look-tune {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 16px;
          padding-top: 22px;
          border-top: 1px solid var(--line);
        }
        .sbs2-look-tune label {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .sbs2-look-tune label span {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .sbs2-look-tune textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: #FFFFFF;
          color: var(--ink);
          font: inherit;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
        }
        .sbs2-look-tune textarea:focus {
          outline: none;
          border-color: var(--ink);
        }
        .sbs2-look-tune-foot {
          grid-column: 1 / -1;
        }

        /* ----- Step 0 (brand strategy gate) ----- */
        .sbs2-path-card {
          text-decoration: none;
          color: inherit;
        }
        .sbs2-path-card.is-locked {
          cursor: not-allowed;
          opacity: 0.55;
        }
        .sbs2-path-card.is-locked:hover {
          background: transparent;
          padding-left: clamp(6px, 1.4vw, 14px);
        }
        .sbs2-step0 {
          margin: 0 0 8px;
          padding: clamp(26px, 4vw, 44px);
          background: #FFFFFF;
          border: 1px solid var(--ink);
          border-radius: 18px;
        }
        .sbs2-step0.is-done {
          border-color: var(--line);
          background: #FBFCFC;
        }
        .sbs2-step0-head {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 18px;
        }
        .sbs2-step0-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--ink);
          color: #FFFFFF;
          font-size: 16px;
          font-weight: 600;
        }
        .sbs2-step0-num.is-done {
          background: var(--ink);
        }
        .sbs2-step0-head .sbs2-eyebrow {
          margin: 0 0 6px;
        }
        .sbs2-step0-title {
          margin: 0;
          color: var(--ink);
          font-size: clamp(1.7rem, 3vw, 2.5rem);
          font-weight: 300;
          line-height: 1.04;
        }
        .sbs2-step0-copy {
          margin: 0 0 18px;
          color: var(--body);
          font-size: 15.5px;
          line-height: 1.75;
          max-width: 64ch;
        }
        .sbs2-step0-list {
          list-style: none;
          margin: 0 0 24px;
          padding: 0;
          display: grid;
          gap: 10px;
        }
        .sbs2-step0-list li {
          position: relative;
          padding-left: 22px;
          color: var(--ink);
          font-size: 14.5px;
          line-height: 1.5;
        }
        .sbs2-step0-list li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 8px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--ink);
        }
        .sbs2-step0-note {
          margin: 16px 0 0;
          color: var(--muted);
          font-size: 13px;
        }
        .sbs2-step0-pillars {
          margin-top: 22px;
        }
        .sbs2-step0-pillars .sbs2-eyebrow {
          margin-bottom: 10px;
        }
        .sbs2-pillar-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 18px;
        }
        .sbs2-pillar-chips span {
          padding: 7px 14px;
          border: 1px solid var(--line);
          border-radius: 999px;
          font-size: 13px;
          color: var(--ink);
          background: #FFFFFF;
        }
        .sbs2-step0.is-done .sbs2-recap-grid {
          margin: 8px 0 4px;
        }

        /* ----- Locked module rows ----- */
        .sbs2-module.is-locked {
          opacity: 0.72;
        }
        .sbs2-module-head.is-locked {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: start;
          gap: clamp(16px, 3vw, 32px);
          padding: clamp(26px, 3.4vw, 40px) 0;
          cursor: default;
        }
        .sbs2-module.is-locked .sbs2-module-num {
          border-color: var(--line);
          color: var(--muted);
        }
        .sbs2-module-unlock {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink);
          text-decoration: none;
          border: 1px solid var(--ink);
          border-radius: 999px;
          padding: 8px 16px;
          white-space: nowrap;
          transition: background 0.18s ease, color 0.18s ease;
        }
        .sbs2-module-unlock:hover {
          background: var(--ink);
          color: #FFFFFF;
        }

        /* ----- Personalized 7-day content plan ----- */
        .sbs2-plan-intro {
          margin: 0 0 22px;
          color: var(--body);
          font-size: 15px;
          line-height: 1.7;
          max-width: 66ch;
        }
        .sbs2-plan-days {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 12px;
        }
        .sbs2-plan-day {
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 20px 22px;
          background: #FFFFFF;
        }
        .sbs2-plan-daytop {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 6px 14px;
          margin-bottom: 12px;
        }
        .sbs2-plan-daynum {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .sbs2-plan-daytitle {
          color: var(--ink);
          font-size: clamp(1.25rem, 2vw, 1.55rem);
          font-weight: 400;
          line-height: 1.1;
        }
        .sbs2-plan-use {
          flex-basis: 100%;
          color: var(--muted);
          font-size: 13.5px;
          line-height: 1.5;
        }
        .sbs2-plan-caption {
          border-top: 1px solid var(--line-soft);
          padding-top: 12px;
        }
        .sbs2-plan-caption .sbs2-eyebrow {
          margin: 0 0 6px;
        }
        .sbs2-plan-caption p {
          margin: 0;
          color: var(--ink);
          font-size: 15px;
          line-height: 1.65;
        }

        @media (max-width: 640px) {
          .sbs2-look-tune {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .sbs2-header {
            grid-template-columns: 1fr auto;
          }
          .sbs2-header-label {
            display: none;
          }
          .sbs2-hero {
            grid-template-columns: 1fr;
          }
          .sbs2-hero-figure {
            order: -1;
            aspect-ratio: 16 / 11;
            max-height: 340px;
          }
        }

        @media (max-width: 640px) {
          .sbs2-module-head {
            grid-template-columns: auto 1fr;
            gap: 14px 18px;
          }
          .sbs2-module-meta {
            grid-column: 1 / -1;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding-top: 4px;
            padding-left: 64px;
          }
          .sbs2-module-collapsed {
            padding-left: 0;
          }
          .sbs2-path-card {
            grid-template-columns: auto 1fr;
            row-gap: 6px;
          }
          .sbs2-path-status {
            grid-column: 2;
          }
        }
      `}</style>
    </main>
  )
}
