"use client"

interface CourseCardProps {
  course: {
    id: string
    title: string
    description: string
    thumbnail_url: string | null
    tier: "starter" | "pro" | "elite"
    lesson_count: number
    total_duration: number
    is_published: boolean
  }
  userTier: "starter" | "pro" | "elite"
  progress?: {
    completed_lessons: number
    total_lessons: number
    progress_percentage: number
  }
  onCourseClick: (courseId: string) => void
}

const tierOrder = { starter: 1, pro: 2, elite: 3 }

export default function CourseCard({ course, userTier, progress, onCourseClick }: CourseCardProps) {
  const isLocked = tierOrder[course.tier] > tierOrder[userTier]
  const hasStarted = progress && progress.completed_lessons > 0
  const progressPercentage = progress?.progress_percentage ?? 0
  const isCompleted = progressPercentage >= 100

  const formatDuration = (minutes: number | null | undefined) => {
    // Handle null, undefined, NaN, or non-positive values
    if (minutes == null || isNaN(Number(minutes)) || Number(minutes) <= 0) {
      return "0m"
    }

    const mins = Number(minutes)
    const hours = Math.floor(mins / 60)
    const remainingMins = Math.round(mins % 60)

    if (hours > 0) {
      return `${hours}h ${remainingMins}m`
    }
    return `${remainingMins}m`
  }

  const lessonCount = Number(course.lesson_count) || 0
  const totalDuration = Number(course.total_duration) || 0

  return (
    <button
      onClick={() => !isLocked && onCourseClick(course.id)}
      disabled={isLocked}
      className={`group relative bg-[rgba(255,255,255,0.04)] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden text-left transition-all duration-300 shadow-xl shadow-black/30 ${
        isLocked
          ? "opacity-60 cursor-not-allowed"
          : "hover:bg-[rgba(255,255,255,0.07)] hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 hover:scale-[1.02]"
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden bg-[rgba(255,255,255,0.07)]">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url || "/placeholder.svg"}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[rgba(255,255,255,0.08)] to-[rgba(255,255,255,0.04)]">
            <span className="text-4xl font-serif font-extralight tracking-[0.2em] uppercase text-white/30">
              {course.title.charAt(0)}
            </span>
          </div>
        )}

        {/* Lock overlay for higher-tier courses */}
        {isLocked && (
          <div className="absolute inset-0 bg-[rgba(11,13,16,0.70)] backdrop-blur-sm flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto border border-white/20">
                <span className="text-[10px] tracking-[0.12em] uppercase text-white/80">Locked</span>
              </div>
              <p className="text-xs tracking-[0.15em] uppercase font-light text-white">{course.tier} tier required</p>
            </div>
          </div>
        )}

        {/* Completion badge */}
        {isCompleted && !isLocked && (
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-[rgba(11,13,16,0.80)] backdrop-blur-xl rounded-full border border-white/20">
            <span className="text-xs tracking-[0.15em] uppercase font-light text-white">Completed</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Title */}
        <h3 className="text-lg font-serif font-extralight tracking-[0.15em] uppercase text-white leading-tight">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-sm font-light text-white/50 leading-relaxed line-clamp-2">{course.description}</p>

        {/* Meta info */}
        <div className="flex items-center gap-6 text-xs tracking-[0.1em] uppercase font-light text-white/40">
          <span>{formatDuration(totalDuration)}</span>
          <span>{lessonCount} Lessons</span>
        </div>

        {/* Progress bar */}
        {progress && !isLocked && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="tracking-[0.1em] uppercase font-light text-white/40">Progress</span>
              <span className="font-light text-white/50">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/55 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action button */}
        {!isLocked && (
          <div className="pt-2">
            <div className="w-full text-center bg-[rgba(255,255,255,0.07)] border border-white/10 text-white/75 py-3 rounded-2xl font-light tracking-[0.15em] uppercase text-sm transition-all duration-200 group-hover:bg-[rgba(255,255,255,0.1)] min-h-[48px] flex items-center justify-center">
              {isCompleted ? "Review" : hasStarted ? "Continue" : "Start"}
            </div>
          </div>
        )}
      </div>
    </button>
  )
}
