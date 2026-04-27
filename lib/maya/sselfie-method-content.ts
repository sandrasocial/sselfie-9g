/**
 * SSELFIE Method Content — Weekly Themes and Ritual Step Insights
 *
 * HOW TO UPDATE (no coding required):
 * - Paste this file into Claude and say what to add or change.
 * - Example: "Add a new weekly theme called X with this vibe"
 * - Example: "Update the energy step insight to say Y instead"
 * - Claude returns the updated file — paste back and save.
 *
 * ADDING A NEW THEME — what each field means:
 *   id:                 Short unique name, no spaces (e.g. "quiet_authority")
 *   label:              Display name shown in the UI (e.g. "Quiet Authority")
 *   description:        One sentence shown in the week plan card
 *   photoDirectionSeed: Keywords Maya uses when creating photo direction for this theme
 *   captionAngle:       The emotional/strategic angle for captions this week
 *   methodInsight:      The SSELFIE principle this theme teaches (shown for Masterclass + Studio)
 */

export type MethodDepth = "teaser" | "full" | "full_plus_execution"

export interface RitualStepInsight {
  step: "energy" | "theme" | "photo_direction" | "caption" | "next_action"
  /** 1 sentence — shown to free and Starter Kit users */
  teaser: string
  /** 2–3 sentences — shown to Masterclass buyers and Studio members */
  full: string
}

export interface WeeklyTheme {
  id: string
  label: string
  description: string
  photoDirectionSeed: string
  captionAngle: string
  methodInsight: string
}

// ─── Ritual step insights ──────────────────────────────────────────────────────

export const RITUAL_STEP_INSIGHTS: RitualStepInsight[] = [
  {
    step: "energy",
    teaser: "Your energy this week shapes what content is sustainable — and what will look forced.",
    full:
      "The SSELFIE method starts with honesty about capacity. Pushing hard when you are depleted produces content that looks strained. When you name your energy level first, the weekly plan matches what you can actually execute — and that is what builds the habit week after week.",
  },
  {
    step: "theme",
    teaser: "One theme per week gives your feed a spine instead of random posts.",
    full:
      "Visual coherence comes from theme-first thinking, not aesthetic filters. A theme is a story arc — it tells your audience something about you across multiple touchpoints. When every post this week connects to one idea, followers feel a narrative instead of noise.",
  },
  {
    step: "photo_direction",
    teaser: "A photo direction is how you brief yourself — no photographer needed.",
    full:
      "The SSELFIE method treats you as your own creative director. A photo direction is a specific brief: setting, light source, outfit signal, and the emotional register you want the viewer to feel. Without direction you get random content. With direction you get consistency that builds brand recognition.",
  },
  {
    step: "caption",
    teaser: "The caption is where your offer becomes visible without selling.",
    full:
      "Good captions in the SSELFIE method do one thing: connect the visual to the feeling your audience wants. They do not announce your product — they invite the reader into a version of themselves that has already made a decision. Then the call to action becomes obvious, not pushy.",
  },
  {
    step: "next_action",
    teaser: "One next action keeps momentum alive after this session.",
    full:
      "Momentum is not built by finishing the plan — it is built by the first 15 minutes after leaving this conversation. Your next action is always singular and time-bounded. Not 'post more' but 'take the photo at 10am tomorrow with natural window light.' That is what turns strategy into reality.",
  },
]

// ─── Weekly themes ──────────────────────────────────────────────────────────────

export const WEEKLY_THEMES: WeeklyTheme[] = [
  {
    id: "quiet_authority",
    label: "Quiet Authority",
    description: "Confidence without volume — the visual language of someone who does not need to prove anything.",
    photoDirectionSeed:
      "minimal setting, clean lines, direct eye contact or intentional gaze away, neutral palette, no props that distract",
    captionAngle: "Share a belief or decision you made that your audience is afraid to make",
    methodInsight:
      "Authority is communicated before you speak. It lives in posture, setting, and the absence of trying too hard. This week your content should feel like a woman who already knows the answer.",
  },
  {
    id: "behind_the_work",
    label: "Behind The Work",
    description: "Pull the curtain slightly — show the process without oversharing.",
    photoDirectionSeed:
      "desk or working environment, laptop or notes visible, soft ambient light, candid over posed, working hands",
    captionAngle: "What are you actually working on right now and why does it matter to your person",
    methodInsight:
      "Behind-the-scenes content builds trust faster than polished reveals because it shows your decision-making, not just your results. You do not share everything — you share the one detail that makes your process real.",
  },
  {
    id: "transformation_proof",
    label: "Transformation Proof",
    description: "Demonstrate the before/after not with split screens — with one powerful now.",
    photoDirectionSeed:
      "editorial energy, confident posture, outfit that signals a decision made, intentional composition, elevated setting",
    captionAngle: "Name one specific shift — in thinking, behavior, or result — that happened because of a choice you made",
    methodInsight:
      "One strong after image is more compelling than a split-screen comparison. The caption carries the transformation narrative. Show the woman who arrived, not the woman who was struggling — the audience fills in the gap themselves.",
  },
  {
    id: "soft_invite",
    label: "Soft Invite",
    description: "The warmth post — let people in without explaining everything.",
    photoDirectionSeed:
      "warm light, relaxed setting, coffee or lifestyle prop, soft smile or downward gaze, feels approachable and unhurried",
    captionAngle: "Start with 'If you have ever felt…' and end with an open question",
    methodInsight:
      "Vulnerability is a conversion tool when it is specific and boundaried. You do not share everything — you share the one thing that makes your audience feel less alone. This week you are building trust, not selling.",
  },
  {
    id: "offer_signal",
    label: "Offer Signal",
    description: "Your offer visible without announcing it — lifestyle as proof of concept.",
    photoDirectionSeed:
      "elevated setting or outfit that matches your price point, product or context visible naturally, nothing staged or forced",
    captionAngle: "Describe the life or the result — let the offer reveal itself in the final line",
    methodInsight:
      "The most effective sales posts never say 'I have a course.' They show the life that the offer leads to and let the audience close the gap themselves. Your job this week is to be the evidence, not the pitch.",
  },
  {
    id: "expertise_moment",
    label: "Expertise Moment",
    description: "The one thing you know that your audience needs to hear right now.",
    photoDirectionSeed:
      "clean, professional feel, eye contact, approachable but authoritative, light background or simple environment",
    captionAngle: "Lead with the insight, end with the application — what should they do with this information",
    methodInsight:
      "Teaching builds trust faster than storytelling when your audience is in the research phase. One specific, actionable insight this week positions you as the person who actually knows — not just believes.",
  },
  {
    id: "personal_moment",
    label: "Personal Moment",
    description: "The human behind the brand — a glimpse that builds connection without oversharing.",
    photoDirectionSeed:
      "candid, natural light, lifestyle setting, shows personality — something real happening, not performed",
    captionAngle: "One thing about your life that your ideal client would recognize in their own",
    methodInsight:
      "Personal posts perform when they are specific and boundaried. The goal is relatability, not exposure. Share the one moment that shows who you are when you are not being a brand — because that is often when people decide to trust you.",
  },
  {
    id: "results_forward",
    label: "Results Forward",
    description: "Show what is possible — through a client win, a milestone, or a concrete outcome.",
    photoDirectionSeed:
      "celebratory but grounded energy, could include work environment or celebration moment, confident and warm",
    captionAngle: "Name the result first, then the path that made it possible",
    methodInsight:
      "Proof content converts best when it is specific and credited to a decision, not luck. This week your content should make someone think 'that could be me' — and understand exactly what it would take to get there.",
  },
]
