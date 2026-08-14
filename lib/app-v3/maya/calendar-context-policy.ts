import {
  mayaContextMatchesCalendarPost,
  sanitizeMayaContextEnvelope,
  type MayaContextEnvelope,
} from "@/lib/app-v3/maya/context-envelope"

/**
 * Calendar is a dormant legacy surface. Its visual plan may influence Maya only when the
 * member deliberately entered an explicit Calendar task; ordinary Maya creation stays neutral.
 */
export function getExplicitCalendarCreativeContext(value: unknown): MayaContextEnvelope | null {
  const context = sanitizeMayaContextEnvelope(value)
  if (
    !context ||
    context.job !== "finish_calendar_post" ||
    context.surface !== "calendar" ||
    !context.feedId ||
    !context.postId
  ) {
    return null
  }
  return mayaContextMatchesCalendarPost(context, context.feedId, context.postId) ? context : null
}

export function shouldUseCalendarCreativeContext(value: unknown): boolean {
  return getExplicitCalendarCreativeContext(value) !== null
}
