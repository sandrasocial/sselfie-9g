"use client"
import { Lock } from "lucide-react"

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
  const isCompleted = progress && progress.progress_percentage >= 100

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <button
      onClick={() => !isLocked && onCourseClick(course.id)}
      disabled={isLocked}
      className={`group relative bg-white/50 backdrop-blur-xl border border-white/60 rounded-3xl overflow-hidden text-left transition-all duration-300 shadow-lg shadow-stone-900/5 ${
        isLocked
          ? "opacity-60 cursor-not-allowed"
          : "hover:bg-white/70 hover:border-white/80 hover:shadow-2xl hover:shadow-stone-900/20 hover:scale-[1.02]"
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden bg-stone-200/30">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url || "/placeholder.svg"}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
            <span className="text-4xl font-serif font-extralight tracking-[0.2em] uppercase text-stone-400">
              {course.title.charAt(0)}
            </span>
          </div>
        )}

        {/* Lock overlay for higher-tier courses */}
        {isLocked && (
          <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto border border-white/30">
                <Lock size={20} className="text-white" strokeWidth={1.5} />
              </div>
              <p className="text-xs tracking-[0.15em] uppercase font-light text-white">{course.tier} tier required</p>
            </div>
          </div>
        )}

        {/* Completion badge */}
        {isCompleted && !isLocked && (
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-stone-950/80 backdrop-blur-xl rounded-full border border-white/20">
            <span className="text-xs tracking-[0.15em] uppercase font-light text-white">Completed</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Title */}
        <h3 className="text-lg font-serif font-extralight tracking-[0.15em] uppercase text-stone-950 leading-tight">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-sm font-light text-stone-600 leading-relaxed line-clamp-2">{course.description}</p>

        {/* Meta info */}
        <div className="flex items-center gap-6 text-xs tracking-[0.1em] uppercase font-light text-stone-500">
          <span>{formatDuration(course.total_duration)}</span>
          <span>{course.lesson_count} Lessons</span>
        </div>

        {/* Progress bar */}
        {progress && !isLocked && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="tracking-[0.1em] uppercase font-light text-stone-400">Progress</span>
              <span className="font-light text-stone-500">{Math.round(progress.progress_percentage)}%</span>
            </div>
            <div className="w-full h-1.5 bg-stone-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-950 rounded-full transition-all duration-500"
                style={{ width: `${progress.progress_percentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action button */}
        {!isLocked && (
          <div className="pt-2">
            <div className="w-full text-center bg-stone-950 text-stone-50 py-3 rounded-2xl font-light tracking-[0.15em] uppercase text-sm transition-all duration-200 group-hover:bg-stone-800 min-h-[48px] flex items-center justify-center">
              {isCompleted ? "Review" : hasStarted ? "Continue" : "Start"}
            </div>
          </div>
        )}
      </div>
    </button>
  )
}
