import { redirect } from "next/navigation"

import { getAcademyEntitlementState, userHasAcademyProductAccess } from "@/lib/academy-entitlements"
import { createServerClient } from "@/lib/supabase/server"
import {
  getCourseWithLessons,
  getCourses,
  getUserCourseProgress,
  type AcademyLesson,
} from "@/lib/data/academy"
import { getUserByAuthId } from "@/lib/user-mapping"

export type LessonContent = {
  key_takeaways?: string[]
  action_step?: {
    bare_minimum?: string
    bold_move?: string
    bonus_vibe?: string
  }
  reflection_prompt?: string
  profile_field?: string | null
  profile_question?: string | null
  resources?: Array<{
    title: string
    type?: string
    url: string
  }>
}

export type LibraryCourse = {
  id: number
  productId: string
  title: string
  description: string | null
  orderIndex: number
  lessonCount: number
  totalDurationSeconds: number
  progressPercentage: number
  completedLessons: number
  started: boolean
  firstIncompleteLessonId: number | null
}

export type CourseLesson = AcademyLesson & {
  durationSeconds: number
  content: LessonContent | null
  completed: boolean
  current: boolean
  startHere: boolean
}

export type CourseDetail = {
  id: number
  title: string
  description: string | null
  productId: string
  lessonCount: number
  totalDurationSeconds: number
  completedLessons: number
  progressPercentage: number
  firstIncompleteLessonId: number | null
  lessons: CourseLesson[]
}

export async function requireAcademyPageUser(redirectPath: string) {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`)
  }

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) {
    redirect(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`)
  }

  return {
    authUser,
    neonUser: {
      id: String(neonUser.id),
      email: neonUser.email,
    },
  }
}

export function getLessonContent(content: unknown): LessonContent | null {
  if (!content || typeof content !== "object") {
    return null
  }

  return content as LessonContent
}

export function getTotalDurationSeconds(lessons: AcademyLesson[] | undefined): number {
  return (lessons || []).reduce((sum, lesson) => sum + Number(lesson.duration_seconds || 0), 0)
}

export async function getAccessibleLibraryCourses(userId: string): Promise<{
  hasAccess: boolean
  courses: LibraryCourse[]
}> {
  const [courses, entitlementState] = await Promise.all([
    getCourses(),
    getAcademyEntitlementState(userId),
  ])

  const accessibleProductIds = new Set(entitlementState.accessibleProductIds)
  const visibleCourses = courses.filter(
    course => typeof course.product_id === "string" && accessibleProductIds.has(course.product_id)
  )

  const enrichedCourses = await Promise.all(
    visibleCourses.map(async course => {
      const [courseWithLessons, progressData] = await Promise.all([
        getCourseWithLessons(course.id),
        getUserCourseProgress(userId, course.id),
      ])

      const lessons = courseWithLessons?.lessons || []
      const lessonCount = lessons.length
      const totalDurationSeconds = getTotalDurationSeconds(lessons)
      const completedLessonIds = new Set(
        (progressData?.lessonProgress || [])
          .filter((lessonProgress: { status?: string }) => lessonProgress.status === "completed")
          .map((lessonProgress: { lesson_id: number }) => lessonProgress.lesson_id)
      )
      const completedLessons = completedLessonIds.size
      const firstIncompleteLessonId =
        lessons.find(lesson => !completedLessonIds.has(lesson.id))?.id || lessons[0]?.id || null

      return {
        id: course.id,
        productId: course.product_id!,
        title: course.title,
        description: course.description,
        orderIndex: course.order_index,
        lessonCount,
        totalDurationSeconds,
        progressPercentage: Number(progressData?.enrollment?.progress_percentage || 0),
        completedLessons,
        started: completedLessons > 0 || Number(progressData?.enrollment?.progress_percentage || 0) > 0,
        firstIncompleteLessonId,
      } satisfies LibraryCourse
    })
  )

  return {
    hasAccess: entitlementState.membershipActive || enrichedCourses.length > 0,
    courses: enrichedCourses.sort((a, b) => a.orderIndex - b.orderIndex),
  }
}

export async function getAccessibleCourseDetail(
  userId: string,
  courseId: number
): Promise<CourseDetail | null> {
  const course = await getCourseWithLessons(courseId)
  if (!course?.product_id) {
    return null
  }

  const hasAccess = await userHasAcademyProductAccess(userId, course.product_id)
  if (!hasAccess) {
    return null
  }

  const progressData = await getUserCourseProgress(userId, courseId)
  const completedLessonIds = new Set(
    (progressData?.lessonProgress || [])
      .filter((lessonProgress: { status?: string }) => lessonProgress.status === "completed")
      .map((lessonProgress: { lesson_id: number }) => lessonProgress.lesson_id)
  )
  const firstIncompleteLessonId =
    course.lessons?.find(lesson => !completedLessonIds.has(lesson.id))?.id || course.lessons?.[0]?.id || null

  const lessons = (course.lessons || []).map(lesson => ({
    ...lesson,
    durationSeconds: Number(lesson.duration_seconds || 0),
    content: getLessonContent(lesson.content),
    completed: completedLessonIds.has(lesson.id),
    current: false,
    startHere: lesson.id === firstIncompleteLessonId,
  }))

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    productId: course.product_id,
    lessonCount: lessons.length,
    totalDurationSeconds: getTotalDurationSeconds(lessons),
    completedLessons: completedLessonIds.size,
    progressPercentage: Number(progressData?.enrollment?.progress_percentage || 0),
    firstIncompleteLessonId,
    lessons,
  }
}

export function formatDurationLabel(totalSeconds: number): string {
  const totalMinutes = Math.max(0, Math.round(totalSeconds / 60))
  if (totalMinutes < 60) {
    return `${totalMinutes} min`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`
}

export function formatLessonDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}
