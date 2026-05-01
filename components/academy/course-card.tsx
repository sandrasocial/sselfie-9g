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
      className={`group relative stone-panel rounded-[16px] overflow-hidden text-left transition-all duration-300 shadow-[var(--app-shadow-soft)] ${
        isLocked
          ? "opacity-60 cursor-not-allowed"
          : "hover:bg-[color:var(--app-glass-bg)] hover:border-[color:var(--app-border)] hover:shadow-[0_28px_80px_rgba(61,56,48,0.16)] hover:scale-[1.01]"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden rounded-[4px] bg-[color:var(--app-btn-secondary-bg)]">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url || "/placeholder.svg"}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[color:var(--app-btn-secondary-bg)]">
            <span className="text-4xl font-['Cormorant_Garamond'] font-light tracking-[0.2em] uppercase text-[color:var(--app-text-muted)]">
              {course.title.charAt(0)}
            </span>
          </div>
        )}

        {/* Lock overlay for higher-tier courses */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(15,13,11,0.58)] backdrop-blur-md">
            <div className="text-center space-y-2">
              <div className="stone-chip mx-auto flex h-12 w-12 items-center justify-center rounded-[6px]">
                <span className="text-[10px] tracking-[0.5em] uppercase text-[color:var(--app-btn-primary-text)]">Locked</span>
              </div>
              <p className="text-xs tracking-[0.5em] uppercase font-['Inter'] font-medium text-[color:var(--app-btn-primary-text)]">{course.tier} tier required</p>
            </div>
          </div>
        )}

        {/* Completion badge */}
        {isCompleted && !isLocked && (
          <div className="stone-chip absolute right-3 top-3 rounded-[4px] px-3 py-1.5">
            <span className="text-xs tracking-[0.5em] uppercase font-['Inter'] font-medium text-[color:var(--app-text-secondary)]">Completed</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Title */}
        <h3 className="font-['Cormorant_Garamond'] font-light text-xl text-[color:var(--app-text-primary)] leading-tight">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-[color:var(--app-text-secondary)] leading-relaxed line-clamp-2">{course.description}</p>

        {/* Meta info */}
        <div className="flex items-center gap-6 text-xs tracking-[0.4em] uppercase font-['Inter'] font-medium text-[color:var(--app-text-secondary)]">
          <span>{formatDuration(totalDuration)}</span>
          <span>{lessonCount} Lessons</span>
        </div>

        {/* Progress bar */}
        {progress && !isLocked && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="tracking-[0.4em] uppercase font-['Inter'] font-medium text-[color:var(--app-text-secondary)]">Progress</span>
              <span className="font-['Inter'] text-[color:var(--app-text-muted)]">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full h-1.5 bg-[color:var(--app-btn-secondary-bg)] rounded-[4px] overflow-hidden">
              <div
                className="h-full bg-[color:var(--app-text-primary)] rounded-[4px] transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action button */}
        {!isLocked && (
          <div className="pt-2">
            <div className="flex min-h-[48px] w-full items-center justify-center rounded-[6px] bg-[color:var(--app-btn-primary-bg)] py-3 text-center font-['Inter'] text-xs font-medium uppercase tracking-[0.15em] text-[color:var(--app-btn-primary-text)] transition-all duration-200 group-hover:opacity-90">
              {isCompleted ? "Review" : hasStarted ? "Continue" : "Start"}
            </div>
          </div>
        )}
      </div>
    </button>
  )
}
