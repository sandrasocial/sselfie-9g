import { ACADEMY_PRODUCTS, type AcademyProductId } from "@/lib/products"

export type VisibilityMiniProductId =
  | "what_to_say"
  | "show_up"
  | "get_paid"
  | "concept_cards_pack"
  | "caption_sprint"
  | "feed_reset_9grid"
  | "ai_photo_refresh"

export type MiniProductWorkspaceKind =
  | "message"
  | "weekly-plan"
  | "sales-path"
  | "concept-cards"
  | "captions"
  | "feed-reset"
  | "photo-refresh"

export type VisibilityMiniProductConfig = {
  id: VisibilityMiniProductId
  slug: string
  eyebrow: string
  title: string
  problem: string
  promise: string
  price: string
  ctaKeyword: "SAY" | "CONTENT" | "PAID" | "PHOTOS"
  heroImage: string
  heroImageAlt: string
  supportImage: string
  supportImageAlt: string
  outcomes: string[]
  proof: string[]
  steps: Array<{ title: string; body: string }>
  bestFor: string[]
  workspaceKind: MiniProductWorkspaceKind
  firstAction: string
  nextStep: {
    title: string
    body: string
    href: string
    label: string
  }
}

export const VISIBILITY_MINI_PRODUCTS: VisibilityMiniProductConfig[] = [
  {
    id: "what_to_say",
    slug: "what-to-say",
    eyebrow: "SAY",
    title: "Make your offer easier to understand.",
    problem:
      "People can see your content and still not understand what you do, who it is for, or why it matters now.",
    promise: "Turn vague content into one clear offer line, hooks, and CTAs.",
    price: "€47",
    ctaKeyword: "SAY",
    heroImage: "/images/selfie-guide/notebook-window-closeup.jpg",
    heroImageAlt: "Notebook and coffee by a window",
    supportImage: "/academy/visibility-suite/what-to-say.png",
    supportImageAlt: "What To Say workbook preview",
    outcomes: [
      "A simple sentence that explains what you help with.",
      "Hooks you can use when your content feels too vague.",
      "A clear CTA so people know the next step.",
    ],
    proof: [
      "Your bio, captions, and sales posts start saying the same thing.",
      "You stop explaining from scratch every time you post.",
      "Your next content decision gets easier because the message is clear.",
    ],
    steps: [
      { title: "Name the problem", body: "Start with the thing your buyer already feels and wants fixed." },
      { title: "Write the promise", body: "Turn your work into one clear line people can repeat." },
      { title: "Post with direction", body: "Use hooks and CTAs that lead somewhere real." },
    ],
    bestFor: [
      "You post, but people still ask what you actually do.",
      "Your offer feels clear in your head, but vague in your content.",
      "You want one quick win before buying the full Suite.",
    ],
    workspaceKind: "message",
    firstAction: "Fix my message",
    nextStep: {
      title: "Need the full path?",
      body: "What To Say is Step 01. The Suite gives you message, content, sales, and execution in order.",
      href: "/visibility-suite",
      label: "See The Suite",
    },
  },
  {
    id: "show_up",
    slug: "show-up",
    eyebrow: "CONTENT",
    title: "Know what to post this week.",
    problem:
      "You are not lazy. You are trying to create from scratch too often, without a rhythm your business can repeat.",
    promise: "Plan posts that connect your message, your proof, and your offer.",
    price: "€67",
    ctaKeyword: "CONTENT",
    heroImage: "/images/selfie-guide/laptop-lifestyle.png",
    heroImageAlt: "Laptop and coffee on a work table",
    supportImage: "/academy/visibility-suite/show-up.png",
    supportImageAlt: "Show Up workbook preview",
    outcomes: [
      "A weekly rhythm you can actually keep.",
      "Post ideas tied to your message and offer.",
      "A simple plan for showing up without starting over every Monday.",
    ],
    proof: [
      "Your posts stop feeling random.",
      "You can see what each post is supposed to do.",
      "You have a week of content before the week starts.",
    ],
    steps: [
      { title: "Pick the rhythm", body: "Choose how often you can post without burning out." },
      { title: "Choose the angles", body: "Map what people need to believe before they buy." },
      { title: "Plan the week", body: "Leave with your next posts in a clear order." },
    ],
    bestFor: [
      "You keep disappearing because planning takes too much energy.",
      "You have ideas, but they do not connect to a buyer path.",
      "You want content that supports sales without sounding pushy.",
    ],
    workspaceKind: "weekly-plan",
    firstAction: "Plan this week",
    nextStep: {
      title: "Ready to sell from it?",
      body: "Show Up gives you the rhythm. Get Paid gives that rhythm a clear path from post to buyer.",
      href: "/get-paid",
      label: "Go To Get Paid",
    },
  },
  {
    id: "get_paid",
    slug: "get-paid",
    eyebrow: "PAID",
    title: "Turn visibility into a buyer path.",
    problem:
      "Views are not the same as sales. If people are watching but not buying, they may not know what the next step is.",
    promise: "Map one post, one keyword, one offer, and one checkout path.",
    price: "€97",
    ctaKeyword: "PAID",
    heroImage: "/black-laptop-with-coffee-minimalist-desk-setup.jpg",
    heroImageAlt: "Laptop and coffee on a minimalist desk",
    supportImage: "/academy/visibility-suite/get-paid.png",
    supportImageAlt: "Get Paid workbook preview",
    outcomes: [
      "One offer people can understand quickly.",
      "One CTA keyword connected to the right landing page.",
      "A 7-day path that tells people what to buy next.",
    ],
    proof: [
      "Your sales posts have one clear job.",
      "Your CTA leads somewhere specific.",
      "You can track which content is creating buyer intent.",
    ],
    steps: [
      { title: "Choose the offer", body: "Pick the offer you want your content to support now." },
      { title: "Map the path", body: "Connect post, keyword, page, checkout, and next step." },
      { title: "Sell simply", body: "Use a sales post that feels clear instead of forced." },
    ],
    bestFor: [
      "You get attention, but your audience does not move toward buying.",
      "You have an offer, but the path to it feels messy.",
      "You want each monetization post to have one clear job.",
    ],
    workspaceKind: "sales-path",
    firstAction: "Make this sales post better",
    nextStep: {
      title: "Want all three steps?",
      body: "The Suite includes What To Say, Show Up, Get Paid, and your Maya Visibility Plan.",
      href: "/visibility-suite",
      label: "Get The Suite",
    },
  },
  {
    id: "concept_cards_pack",
    slug: "concept-cards",
    eyebrow: "CONCEPTS",
    title: "Turn one topic into ten post angles.",
    problem:
      "When every idea sounds the same, you do not need more noise. You need sharper angles for the same message.",
    promise: "Choose a topic and leave with ten concept cards you can turn into posts.",
    price: "€29",
    ctaKeyword: "CONTENT",
    heroImage: "/assets/brand-strategy/woman.png",
    heroImageAlt: "Editorial portrait of Sandra",
    supportImage: "/images/selfie-guide/cream-shirt-closeup.jpg",
    supportImageAlt: "Editorial close-up portrait",
    outcomes: [
      "Ten post concepts from one topic.",
      "A clear angle for each post.",
      "One chosen concept ready to write.",
    ],
    proof: [
      "You stop abandoning topics because they feel too broad.",
      "Your content has more range without changing your offer.",
      "You know which concept to write first.",
    ],
    steps: [
      { title: "Pick the topic", body: "Start with one idea, offer, belief, or problem." },
      { title: "Get the angles", body: "Maya turns it into concept cards with a clear job." },
      { title: "Choose one", body: "Pick the concept you can post today." },
    ],
    bestFor: [
      "You have a topic but no angle.",
      "Your posts keep repeating the same point.",
      "You want a quick content win before planning the week.",
    ],
    workspaceKind: "concept-cards",
    firstAction: "Generate concept cards",
    nextStep: {
      title: "Need the week around it?",
      body: "Concept Cards gives you angles. Show Up turns the best angles into a weekly rhythm.",
      href: "/show-up",
      label: "See Show Up",
    },
  },
  {
    id: "caption_sprint",
    slug: "captions",
    eyebrow: "CAPTIONS",
    title: "Write captions without starting blank.",
    problem:
      "You know what you mean, but the caption still takes too long because the structure is missing.",
    promise: "Turn your offer, tone, and CTA into a small caption bank.",
    price: "€29",
    ctaKeyword: "CONTENT",
    heroImage: "/images/selfie-guide/window-editorial-portrait.jpg",
    heroImageAlt: "Editorial portrait by a window",
    supportImage: "/images/selfie-guide/notebook-window-closeup.jpg",
    supportImageAlt: "Notebook on a desk by a window",
    outcomes: [
      "Five ready-to-edit captions.",
      "A CTA matched to the next step.",
      "A repeatable structure for the next writing session.",
    ],
    proof: [
      "You can write from a frame instead of a blank page.",
      "Every caption has a job.",
      "Your CTA stops being an afterthought.",
    ],
    steps: [
      { title: "Choose the offer", body: "Name what the caption should lead to." },
      { title: "Pick the tone", body: "Choose how direct, soft, or educational it should feel." },
      { title: "Draft the bank", body: "Leave with captions you can edit and post." },
    ],
    bestFor: [
      "You freeze at the caption box.",
      "Your posts need clearer CTAs.",
      "You want captions for one offer, not a full content system yet.",
    ],
    workspaceKind: "captions",
    firstAction: "Write my next post",
    nextStep: {
      title: "Want the buyer path too?",
      body: "Caption Sprint helps you write. Get Paid helps each post lead to a simple offer path.",
      href: "/get-paid",
      label: "See Get Paid",
    },
  },
  {
    id: "feed_reset_9grid",
    slug: "feed-reset",
    eyebrow: "FEED RESET",
    title: "Plan the next nine posts with direction.",
    problem:
      "Your profile can look busy and still not tell people what to do next. The next nine posts need a job.",
    promise: "Create a 9-grid reset plan that makes your message, proof, and offer easier to see.",
    price: "€49",
    ctaKeyword: "CONTENT",
    heroImage: "/academy/visibility-suite/hero.png",
    heroImageAlt: "Woman planning content at a desk",
    supportImage: "/images/selfie-guide/laptop-lifestyle.png",
    supportImageAlt: "Laptop workspace with coffee",
    outcomes: [
      "A nine-post profile reset.",
      "A content mix people can understand quickly.",
      "A checklist for what to post first.",
    ],
    proof: [
      "Your profile has a clearer first impression.",
      "Your next posts stop competing with each other.",
      "You can see the path from visibility to offer.",
    ],
    steps: [
      { title: "Audit the now", body: "Name what your profile currently makes clear or confusing." },
      { title: "Map the nine", body: "Balance message, proof, connection, and offer posts." },
      { title: "Post in order", body: "Use the checklist to publish without rearranging daily." },
    ],
    bestFor: [
      "Your feed does not reflect what you sell now.",
      "You want a clean next nine posts, not a full rebrand.",
      "You need visible direction before inviting people to buy.",
    ],
    workspaceKind: "feed-reset",
    firstAction: "Reset my next nine posts",
    nextStep: {
      title: "Need the whole system?",
      body: "Feed Reset cleans up the surface. The Suite gives you the message, content, and sales path behind it.",
      href: "/visibility-suite",
      label: "See The Suite",
    },
  },
  {
    id: "ai_photo_refresh",
    slug: "ai-photo-refresh",
    eyebrow: "PHOTOS",
    title: "Create better visual direction fast.",
    problem:
      "If your visuals do not match the message, your content can feel unclear before people read the caption.",
    promise: "Build a simple AI photo prompt set for your next five usable visuals.",
    price: "€59",
    ctaKeyword: "PHOTOS",
    heroImage: "/academy/visibility-suite/sandra-founder.webp",
    heroImageAlt: "Sandra sitting in an editorial portrait",
    supportImage: "/minimalist-photography-studio-with-lighting-equipm.jpg",
    supportImageAlt: "Minimalist photography studio lighting",
    outcomes: [
      "A visual direction for your current offer.",
      "Five AI photo prompts with styling notes.",
      "A checklist for what to create first.",
    ],
    proof: [
      "Your images start supporting the message.",
      "You know what to generate before opening the tool.",
      "Your next visuals feel more intentional.",
    ],
    steps: [
      { title: "Choose the style", body: "Name the tone, setting, and visual cues you want repeated." },
      { title: "Build prompts", body: "Maya turns the direction into usable image prompts." },
      { title: "Create the set", body: "Generate the first visuals and choose what belongs in the feed." },
    ],
    bestFor: [
      "Your photos feel disconnected from your offer.",
      "You need fresh visuals without a full Studio setup.",
      "You want prompts before committing to a bigger content reset.",
    ],
    workspaceKind: "photo-refresh",
    firstAction: "Generate images for this concept",
    nextStep: {
      title: "Want the feed around it?",
      body: "AI Photo Refresh gives you the visuals. Feed Reset turns them into a clear nine-post direction.",
      href: "/feed-reset",
      label: "See Feed Reset",
    },
  },
]

export const VISIBILITY_MINI_PRODUCT_IDS = VISIBILITY_MINI_PRODUCTS.map((product) => product.id)

export const VISIBILITY_MINI_PRODUCT_BY_ID = Object.fromEntries(
  VISIBILITY_MINI_PRODUCTS.map((product) => [product.id, product])
) as Record<VisibilityMiniProductId, VisibilityMiniProductConfig>

export const VISIBILITY_MINI_PRODUCT_BY_SLUG = Object.fromEntries(
  VISIBILITY_MINI_PRODUCTS.map((product) => [product.slug, product])
) as Record<string, VisibilityMiniProductConfig>

export function getMiniProductCheckoutHref(productId: VisibilityMiniProductId) {
  return `/checkout/academy-product/${productId}`
}

export function hasConfiguredMiniProductPrice(productId: VisibilityMiniProductId) {
  const product = ACADEMY_PRODUCTS[productId as AcademyProductId]
  return Boolean(product?.stripePriceId?.trim())
}
