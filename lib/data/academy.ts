import { neon } from "@neondatabase/serverless"
import { getRedisClient, CacheKeys, CacheTTL } from "@/lib/redis"

const sql = neon(process.env.DATABASE_URL!)

// Type Definitions

export interface AcademyCourse {
  id: number
  title: string
  description: string | null
  duration_minutes: number | null
  level: "Beginner" | "Intermediate" | "Advanced" | null
  category: string | null
  tier: "starter" | "pro" | "elite" | null
  thumbnail_url: string | null
  instructor_name: string | null
  total_lessons: number
  order_index: number
  status: "draft" | "published" | "archived"
  created_at: Date
  updated_at: Date
}

export interface AcademyLesson {
  id: number
  course_id: number
  title: string
  description: string | null
  lesson_number: number
  lesson_type: "video" | "interactive"
  video_url: string | null
  duration_minutes: number | null
  content: any | null // JSONB for interactive lessons
  resources: any | null // JSONB array of resources
  created_at: Date
  updated_at: Date
}

export interface UserEnrollment {
  id: number
  user_id: string // Keeping as string for compatibility with UUID handling
  course_id: number
  enrolled_at: Date
  completed_at: Date | null
  progress_percentage: number
  last_accessed_at: Date
}

export interface UserLessonProgress {
  id: number
  user_id: string // Keeping as string for compatibility with UUID handling
  lesson_id: number
  watch_time_seconds: number
  completed_steps: any // JSONB array
  status: "not_started" | "in_progress" | "completed"
  completed_at: Date | null
  last_accessed_at: Date
}

export interface AcademyExercise {
  id: number
  lesson_id: number
  exercise_type: "multiple_choice" | "text_input" | "checkbox" | "image_selection"
  question: string
  options: any | null // JSONB
  correct_answer: string | null
  explanation: string | null
  order_index: number
  created_at: Date
}

export interface CourseWithProgress extends AcademyCourse {
  enrollment?: UserEnrollment
  lessons?: AcademyLesson[]
}

// Course Functions

/**
 * Get all published courses, optionally filtered by tier or level
 */
export async function getCourses(filters?: {
  tier?: string
  level?: string
  status?: string
}): Promise<AcademyCourse[]> {
  try {
    const redis = getRedisClient()
    const cacheKey = CacheKeys.academyCourses(JSON.stringify(filters || {}))
    const cached = await redis.get<AcademyCourse[]>(cacheKey)

    if (cached) {
      console.log("[v0] Cache hit for academy courses")
      return cached
    }

    console.log("[v0] Cache miss for academy courses - fetching from Neon")

    let query = sql`
      SELECT * FROM academy_courses
      WHERE status = ${filters?.status || "published"}
    `

    if (filters?.tier) {
      query = sql`
        SELECT * FROM academy_courses
        WHERE status = ${filters?.status || "published"} AND tier = ${filters.tier}
      `
    }

    if (filters?.level) {
      query = sql`
        SELECT * FROM academy_courses
        WHERE status = ${filters?.status || "published"} AND level = ${filters.level}
      `
    }

    const courses = await query

    const sortedCourses = (courses as AcademyCourse[]).sort((a, b) => a.order_index - b.order_index)

    await redis.setex(cacheKey, CacheTTL.courses || 3600, sortedCourses)
    console.log("[v0] Cached academy courses")

    return sortedCourses
  } catch (error) {
    console.error("[v0] Error fetching academy courses:", error)
    return []
  }
}

/**
 * Get courses available for a specific tier
 * Starter tier: only starter courses
 * Pro tier: starter + pro courses
 * Elite tier: all courses
 */
export async function getCoursesForTier(tier: "starter" | "pro" | "elite"): Promise<AcademyCourse[]> {
  try {
    console.log("[v0] Fetching courses for tier:", tier)

    let query

    if (tier === "starter") {
      query = sql`
        SELECT * FROM academy_courses
        WHERE status = 'published' AND tier = 'starter'
        ORDER BY order_index ASC
      `
    } else if (tier === "pro") {
      query = sql`
        SELECT * FROM academy_courses
        WHERE status = 'published' AND tier IN ('starter', 'pro')
        ORDER BY order_index ASC
      `
    } else {
      // Elite gets all courses
      query = sql`
        SELECT * FROM academy_courses
        WHERE status = 'published'
        ORDER BY order_index ASC
      `
    }

    const courses = await query
    console.log("[v0] Found", courses.length, "courses for tier:", tier)

    return courses as AcademyCourse[]
  } catch (error) {
    console.error("[v0] Error fetching courses for tier:", error)
    return []
  }
}

/**
 * Get a single course by ID with all its lessons
 */
export async function getCourseWithLessons(courseId: number): Promise<CourseWithProgress | null> {
  try {
    const courses = await sql`
      SELECT * FROM academy_courses
      WHERE id = ${courseId}
      LIMIT 1
    `

    if (courses.length === 0) {
      return null
    }

    const course = courses[0] as AcademyCourse

    // Get all lessons for this course
    const lessons = await sql`
      SELECT * FROM academy_lessons
      WHERE course_id = ${courseId}
      ORDER BY lesson_number ASC
    `

    return {
      ...course,
      lessons: lessons as AcademyLesson[],
    }
  } catch (error) {
    console.error("[v0] Error fetching course with lessons:", error)
    return null
  }
}

/**
 * Get user's enrolled courses with progress
 */
export async function getUserEnrolledCourses(userId: string): Promise<CourseWithProgress[]> {
  try {
    const enrollments = await sql`
      SELECT 
        c.*,
        e.enrolled_at,
        e.completed_at,
        e.progress_percentage,
        e.last_accessed_at
      FROM academy_courses c
      JOIN user_academy_enrollments e ON c.id = e.course_id
      WHERE e.user_id = ${userId}
      ORDER BY e.last_accessed_at DESC
    `

    return enrollments as CourseWithProgress[]
  } catch (error) {
    console.error("[v0] Error fetching user enrolled courses:", error)
    return []
  }
}

/**
 * Enroll user in a course
 */
export async function enrollUserInCourse(userId: string, courseId: number): Promise<UserEnrollment | null> {
  try {
    const enrollment = await sql`
      INSERT INTO user_academy_enrollments (user_id, course_id)
      VALUES (${userId}, ${courseId})
      ON CONFLICT (user_id, course_id) DO UPDATE
      SET last_accessed_at = NOW()
      RETURNING *
    `

    return enrollment[0] as UserEnrollment
  } catch (error) {
    console.error("[v0] Error enrolling user in course:", error)
    return null
  }
}

// Lesson Progress Functions

/**
 * Get user's progress for a specific lesson
 */
export async function getUserLessonProgress(userId: string, lessonId: number): Promise<UserLessonProgress | null> {
  try {
    const progress = await sql`
      SELECT * FROM user_lesson_progress
      WHERE user_id = ${userId} AND lesson_id = ${lessonId}
      LIMIT 1
    `

    return progress.length > 0 ? (progress[0] as UserLessonProgress) : null
  } catch (error) {
    console.error("[v0] Error fetching lesson progress:", error)
    return null
  }
}

/**
 * Update video watch time for a lesson
 */
export async function updateVideoWatchTime(userId: string, lessonId: number, watchTimeSeconds: number): Promise<void> {
  try {
    await sql`
      INSERT INTO user_lesson_progress (user_id, lesson_id, watch_time_seconds, status, last_accessed_at)
      VALUES (${userId}, ${lessonId}, ${watchTimeSeconds}, 'in_progress', NOW())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET
        watch_time_seconds = ${watchTimeSeconds},
        status = CASE 
          WHEN user_lesson_progress.status = 'completed' THEN 'completed'
          ELSE 'in_progress'
        END,
        last_accessed_at = NOW()
    `

    console.log("[v0] Updated video watch time:", { userId, lessonId, watchTimeSeconds })
  } catch (error) {
    console.error("[v0] Error updating video watch time:", error)
  }
}

/**
 * Mark a lesson as completed
 */
export async function completLesson(userId: string, lessonId: number): Promise<void> {
  try {
    await sql`
      INSERT INTO user_lesson_progress (user_id, lesson_id, status, completed_at, last_accessed_at)
      VALUES (${userId}, ${lessonId}, 'completed', NOW(), NOW())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET
        status = 'completed',
        completed_at = NOW(),
        last_accessed_at = NOW()
    `

    console.log("[v0] Marked lesson as completed:", { userId, lessonId })

    // Update course progress
    await updateCourseProgress(userId, lessonId)
  } catch (error) {
    console.error("[v0] Error completing lesson:", error)
  }
}

/**
 * Update interactive lesson progress (completed steps)
 */
export async function updateInteractiveLessonProgress(
  userId: string,
  lessonId: number,
  completedSteps: number[],
): Promise<void> {
  try {
    await sql`
      INSERT INTO user_lesson_progress (user_id, lesson_id, completed_steps, status, last_accessed_at)
      VALUES (${userId}, ${lessonId}, ${JSON.stringify(completedSteps)}, 'in_progress', NOW())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET
        completed_steps = ${JSON.stringify(completedSteps)},
        status = CASE 
          WHEN user_lesson_progress.status = 'completed' THEN 'completed'
          ELSE 'in_progress'
        END,
        last_accessed_at = NOW()
    `

    console.log("[v0] Updated interactive lesson progress:", { userId, lessonId, completedSteps })
  } catch (error) {
    console.error("[v0] Error updating interactive lesson progress:", error)
  }
}

/**
 * Update course progress percentage based on completed lessons
 */
async function updateCourseProgress(userId: string, lessonId: number): Promise<void> {
  try {
    // Get the course ID from the lesson
    const lessons = await sql`
      SELECT course_id FROM academy_lessons WHERE id = ${lessonId}
    `

    if (lessons.length === 0) return

    const courseId = lessons[0].course_id

    // Count total lessons and completed lessons
    const stats = await sql`
      SELECT 
        COUNT(al.id) as total_lessons,
        COUNT(ulp.id) FILTER (WHERE ulp.status = 'completed') as completed_lessons
      FROM academy_lessons al
      LEFT JOIN user_lesson_progress ulp ON al.id = ulp.lesson_id AND ulp.user_id = ${userId}
      WHERE al.course_id = ${courseId}
    `

    const totalLessons = stats[0].total_lessons
    const completedLessons = stats[0].completed_lessons
    const progressPercentage = Math.round((completedLessons / totalLessons) * 100)

    // Update enrollment progress
    await sql`
      UPDATE user_academy_enrollments
      SET 
        progress_percentage = ${progressPercentage},
        completed_at = CASE WHEN ${progressPercentage} = 100 THEN NOW() ELSE NULL END,
        last_accessed_at = NOW()
      WHERE user_id = ${userId} AND course_id = ${courseId}
    `

    console.log("[v0] Updated course progress:", { userId, courseId, progressPercentage })
  } catch (error) {
    console.error("[v0] Error updating course progress:", error)
  }
}

// Exercise Functions

/**
 * Get exercises for a lesson
 */
export async function getLessonExercises(lessonId: number): Promise<AcademyExercise[]> {
  try {
    const exercises = await sql`
      SELECT * FROM academy_exercises
      WHERE lesson_id = ${lessonId}
      ORDER BY order_index ASC
    `

    return exercises as AcademyExercise[]
  } catch (error) {
    console.error("[v0] Error fetching lesson exercises:", error)
    return []
  }
}

/**
 * Submit exercise answer
 */
export async function submitExercise(
  userId: string,
  exerciseId: number,
  answer: string,
  isCorrect: boolean,
): Promise<void> {
  try {
    await sql`
      INSERT INTO academy_exercise_submissions (user_id, exercise_id, answer, is_correct)
      VALUES (${userId}, ${exerciseId}, ${answer}, ${isCorrect})
      ON CONFLICT (user_id, exercise_id)
      DO UPDATE SET
        answer = ${answer},
        is_correct = ${isCorrect},
        submitted_at = NOW()
    `

    console.log("[v0] Submitted exercise:", { userId, exerciseId, isCorrect })
  } catch (error) {
    console.error("[v0] Error submitting exercise:", error)
  }
}

// Certificate Functions

/**
 * Generate and store certificate for completed course
 */
export async function generateCertificate(userId: string, courseId: number, certificateUrl: string): Promise<void> {
  try {
    await sql`
      INSERT INTO academy_certificates (user_id, course_id, certificate_url)
      VALUES (${userId}, ${courseId}, ${certificateUrl})
      ON CONFLICT (user_id, course_id) DO NOTHING
    `

    console.log("[v0] Generated certificate:", { userId, courseId })
  } catch (error) {
    console.error("[v0] Error generating certificate:", error)
  }
}

/**
 * Get user's certificates
 */
export async function getUserCertificates(userId: string) {
  try {
    const certificates = await sql`
      SELECT 
        c.*,
        ac.title as course_title,
        ac.instructor_name
      FROM academy_certificates c
      JOIN academy_courses ac ON c.course_id = ac.id
      WHERE c.user_id = ${userId}
      ORDER BY c.issued_at DESC
    `

    return certificates
  } catch (error) {
    console.error("[v0] Error fetching user certificates:", error)
    return []
  }
}

/**
 * Get a single lesson by ID
 */
export async function getLessonById(lessonId: number): Promise<AcademyLesson | null> {
  try {
    const lessons = await sql`
      SELECT * FROM academy_lessons
      WHERE id = ${lessonId}
      LIMIT 1
    `

    return lessons.length > 0 ? (lessons[0] as AcademyLesson) : null
  } catch (error) {
    console.error("[v0] Error fetching lesson by ID:", error)
    return null
  }
}

/**
 * Get user's progress for a specific course
 */
export async function getUserCourseProgress(userId: string, courseId: number) {
  try {
    const enrollment = await sql`
      SELECT * FROM user_academy_enrollments
      WHERE user_id = ${userId} AND course_id = ${courseId}
      LIMIT 1
    `

    if (enrollment.length === 0) {
      return null
    }

    // Get lesson progress details
    const lessonProgress = await sql`
      SELECT 
        ulp.*,
        al.title as lesson_title,
        al.lesson_number
      FROM user_lesson_progress ulp
      JOIN academy_lessons al ON ulp.lesson_id = al.id
      WHERE ulp.user_id = ${userId} AND al.course_id = ${courseId}
      ORDER BY al.lesson_number ASC
    `

    return {
      enrollment: enrollment[0],
      lessonProgress: lessonProgress,
    }
  } catch (error) {
    console.error("[v0] Error fetching user course progress:", error)
    return null
  }
}

/**
 * Alias for updateVideoWatchTime - updates lesson progress
 */
export const updateLessonProgress = updateVideoWatchTime

/**
 * Alias for completLesson - marks lesson as complete
 */
export const markLessonComplete = completLesson
