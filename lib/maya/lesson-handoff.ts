/**
 * Lesson → Maya Handoff
 *
 * When a user taps "Do this with Maya →" inside the Academy lesson viewer,
 * we serialise the lesson context into sessionStorage, navigate to Maya, and
 * Maya auto-sends a crafted message so the user lands in an active conversation
 * without re-explaining anything.
 *
 * Sandra can update the prompt shape inside `buildLessonHandoffPrompt` below.
 * No AI calls here — pure data helpers only.
 */

export interface LessonHandoffContext {
  lessonTitle: string
  /** Course title used as module name fallback */
  moduleName: string
  courseId: number
  lessonId: number
  keyTakeaways: string[]
  /** Exact text of the action the user committed to */
  chosenAction: string
  chosenActionLevel: "bare_minimum" | "bold_move" | "bonus_vibe"
  /** lesson.content.reflection_prompt if present */
  reflectionPrompt?: string
}

export const LESSON_HANDOFF_KEY = "sselfie.maya.lessonHandoff"

const ACTION_LABELS: Record<LessonHandoffContext["chosenActionLevel"], string> = {
  bare_minimum: "Bare Minimum",
  bold_move: "Bold Move",
  bonus_vibe: "Bonus Vibe",
}

export function buildLessonHandoffPrompt(ctx: LessonHandoffContext): string {
  const label = ACTION_LABELS[ctx.chosenActionLevel]
  const takeawayList = ctx.keyTakeaways
    .slice(0, 3)
    .map((t) => `• ${t}`)
    .join("\n")

  const lines: string[] = [
    `I just finished the lesson "${ctx.lessonTitle}"${ctx.moduleName ? ` from ${ctx.moduleName}` : ""}.`,
    "",
  ]

  if (ctx.keyTakeaways.length > 0) {
    lines.push(`Key takeaways:\n${takeawayList}`, "")
  }

  lines.push(`I chose the ${label} action: "${ctx.chosenAction}"`)

  if (ctx.reflectionPrompt) {
    lines.push("", `The lesson asked me to reflect on: "${ctx.reflectionPrompt}"`)
  }

  lines.push("", "Help me do this right now. What's my first move?")

  return lines.join("\n")
}
