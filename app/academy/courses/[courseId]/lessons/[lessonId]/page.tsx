import { notFound, redirect } from "next/navigation"

import {
  getAccessibleCourseDetail,
  requireAcademyPageUser,
} from "@/app/academy/_lib/course-library"

import { LessonViewerClient } from "./lesson-viewer-client"

export default async function AcademyLessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params
  const parsedCourseId = Number.parseInt(courseId, 10)
  const parsedLessonId = Number.parseInt(lessonId, 10)

  if (
    !Number.isFinite(parsedCourseId) ||
    parsedCourseId <= 0 ||
    !Number.isFinite(parsedLessonId) ||
    parsedLessonId <= 0
  ) {
    notFound()
  }

  const path = `/academy/courses/${parsedCourseId}/lessons/${parsedLessonId}`
  const { neonUser } = await requireAcademyPageUser(path)
  const course = await getAccessibleCourseDetail(neonUser.id, parsedCourseId)

  if (!course) {
    redirect("/academy")
  }

  const currentLessonIndex = course.lessons.findIndex(lesson => lesson.id === parsedLessonId)
  if (currentLessonIndex === -1) {
    notFound()
  }

  const currentLesson = course.lessons[currentLessonIndex]
  const prevLesson = currentLessonIndex > 0 ? course.lessons[currentLessonIndex - 1] : null
  const nextLesson =
    currentLessonIndex < course.lessons.length - 1 ? course.lessons[currentLessonIndex + 1] : null

  const lessons = course.lessons.map(lesson => ({
    ...lesson,
    current: lesson.id === currentLesson.id,
  }))

  return (
    <LessonViewerClient
      course={{
        id: course.id,
        title: course.title,
        description: course.description,
      }}
      lesson={currentLesson}
      lessons={lessons}
      previousLesson={
        prevLesson
          ? {
              id: prevLesson.id,
              title: prevLesson.title,
            }
          : null
      }
      nextLesson={
        nextLesson
          ? {
              id: nextLesson.id,
              title: nextLesson.title,
            }
          : null
      }
    />
  )
}
