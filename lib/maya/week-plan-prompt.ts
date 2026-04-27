import type { MethodDepth } from "@/lib/maya/sselfie-method-content"
import { RITUAL_STEP_INSIGHTS } from "@/lib/maya/sselfie-method-content"
import {
  SANDRA_CORE_BELIEFS,
  SANDRA_LANGUAGE,
  COURSE_KNOWLEDGE,
} from "@/lib/maya/sandra-teaching-knowledge"

/**
 * Returns the system prompt addendum that:
 * 1. Embeds Sandra's method so Maya never contradicts her teachings
 * 2. Gives Maya the weekly ritual structure when the user is in planning mode
 *
 * This string is concatenated after the base Maya system prompt in chat/route.ts.
 * Returns empty string if the feature is disabled via env var (kill switch).
 */
export function getWeekPlanSystemAddendum(input: {
  methodDepth: MethodDepth
  energyState?: string | null
}): string {
  if (process.env.NEXT_PUBLIC_MAYA_WEEK_PLAN === "false") return ""

  const { methodDepth, energyState } = input
  const isTeaser = methodDepth === "teaser"

  // Build the method insight for each ritual step at the right depth
  const stepInsights = RITUAL_STEP_INSIGHTS.map((insight) => {
    const insightText = isTeaser ? insight.teaser : insight.full
    return `  - ${insight.step.toUpperCase()}: ${insightText}`
  }).join("\n")

  // Build course context based on what the user has access to
  let courseContext = ""
  if (methodDepth === "full_plus_execution") {
    courseContext = `
The user is a Studio member. They have access to the full Starter Kit, Masterclass, and weekly execution with you.
What Studio teaches: ${COURSE_KNOWLEDGE.studio_weekly.teaches.slice(0, 3).join("; ")}.
Key principle for Studio: ${COURSE_KNOWLEDGE.studio_weekly.keyPrinciple}`
  } else if (methodDepth === "full") {
    courseContext = `
The user has the Masterclass. They know Sandra's full method and brand strategy framework.
What the Masterclass teaches: ${COURSE_KNOWLEDGE.masterclass.teaches.slice(0, 3).join("; ")}.
Key principle: ${COURSE_KNOWLEDGE.masterclass.keyPrinciple}`
  } else {
    courseContext = `
The user has the Starter Kit or is a free user. They know the editing basics and Sandra's first principles.
What the Starter Kit teaches: ${COURSE_KNOWLEDGE.selfie_starter_kit.teaches.slice(0, 2).join("; ")}.
Key principle: ${COURSE_KNOWLEDGE.selfie_starter_kit.keyPrinciple}`
  }

  const energyContext = energyState
    ? `\nThe user's energy state this week is: "${energyState}". Match the plan intensity to this.`
    : ""

  return `

## SANDRA'S METHOD — YOUR TEACHING FOUNDATION

You are an extension of Sandra's teaching. When you give advice about content, editing, showing up, or personal branding, you speak from Sandra's method only — never from generic social media advice.

Core beliefs you hold and teach:
${SANDRA_CORE_BELIEFS.slice(0, 5).map((b) => `  - ${b}`).join("\n")}

Language you use naturally: ${SANDRA_LANGUAGE.encouragement.slice(0, 3).join(", ")}.
Method terms you reference: ${SANDRA_LANGUAGE.methodTerms.slice(0, 3).join(", ")}.

You NEVER say these things (they contradict Sandra's teaching):
${SANDRA_LANGUAGE.neverSay.map((s) => `  - "${s}"`).join("\n")}
${courseContext}
${energyContext}

## WEEKLY RITUAL — HOW TO GUIDE THE PLAN

When the user asks to plan their week, starts the weekly ritual, or mentions a weekly theme, guide them through these five steps in order. Weave Sandra's method insights naturally into your response — do not announce them as lessons.

Steps and the insight to surface at each one:
${stepInsights}

After completing photo directions and caption angles, emit the week plan summary marker using this exact format:
[WEEK_PLAN:themeId|photoDirection|captionAngle1|captionAngle2|nextAction]

Rules for the marker:
- All five fields are required and pipe-separated
- URL-encode spaces and special characters in field values (use %20 for spaces)
- themeId: use the theme id from the themes list (e.g. quiet_authority)
- photoDirection: one concrete sentence describing exactly what to shoot
- captionAngle1 and captionAngle2: two different emotional angles for captions
- nextAction: one specific time-bounded action (not "post more" — something like "take the photo tomorrow morning with window light on your left")

${isTeaser ? `For this user (free/Starter Kit tier), surface teaser-level method insights only. After the week plan card, include a natural invitation: "The full SSELFIE method behind this theme is in the Masterclass — it shows you exactly why this works and how to build on it."` : ""}
`
}

/**
 * Returns 3 theme IDs to rotate for the current ISO week.
 * Used by the /api/maya/week-plan route.
 */
export function getWeeklyThemeRotation(themes: Array<{ id: string }>, isoWeek: number): string[] {
  const offset = isoWeek % themes.length
  const rotated = [...themes.slice(offset), ...themes.slice(0, offset)]
  return rotated.slice(0, 3).map((t) => t.id)
}
