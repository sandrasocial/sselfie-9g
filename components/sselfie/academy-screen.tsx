"use client"

import { useState } from "react"
import useSWR from "swr"
import type { AcademyView } from "./types"
import CourseCard from "../academy/course-card"
import CourseDetail from "../academy/course-detail"
import UnifiedLoading from "./unified-loading"
import { createLandingCheckout } from "@/app/actions/landing-checkout"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const getFriendlyTierName = (tier: string): string => {
  const tierMap: Record<string, string> = {
    sselfie_studio_membership: "Studio Member",
    one_time_session: "One-Time Session",
    starter: "Starter",
    pro: "Pro",
    elite: "Elite",
  }
  return tierMap[tier.toLowerCase()] || tier
}

export default function AcademyScreen() {
  const [selectedView, setSelectedView] = useState<AcademyView>("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [isUpgrading, setIsUpgrading] = useState(false)

  const { data: coursesData, error: coursesError, isLoading: coursesLoading } = useSWR("/api/academy/courses", fetcher)
  const { data: myCoursesData } = useSWR("/api/academy/my-courses", fetcher)
  const { data: userInfoData } = useSWR("/api/user/info", fetcher)

  const hasAccess = coursesData?.hasAccess ?? false
  const productType = coursesData?.productType || userInfoData?.product_type || "one_time_session"
  const isOneTimeUser = productType === "one_time_session"

  const userTier = (coursesData?.userTier || userInfoData?.plan || "starter") as string
  const allCourses = coursesData?.courses || []
  const myCourses = myCoursesData?.courses || []
  const inProgressCourses = myCourses.filter((c: any) => c.progress_percentage > 0 && c.progress_percentage < 100)

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true)
      const checkoutUrl = await createLandingCheckout("sselfie_studio_membership")
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      }
    } catch (error) {
      console.error("[v0] Error creating checkout:", error)
      alert("Failed to start checkout. Please try again.")
    } finally {
      setIsUpgrading(false)
    }
  }

  if (!hasAccess && !coursesLoading) {
    return (
      <div className="pb-32">
        {/* Full-bleed hero */}
        <div className="relative h-[50vh] sm:h-[60vh] w-full overflow-hidden">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/887-JHliMtQOFFLmPDRmabtQ9DAuiPDTOv-I0ltnA6ru3zz4C0YmuHYD8y66QZDB7.png"
            alt="Academy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <h1 className="font-serif text-5xl sm:text-7xl tracking-wider text-white">Academy</h1>
          </div>
        </div>

        {/* Upgrade Prompt */}
        <div className="px-4 sm:px-6 -mt-12 relative z-10 max-w-2xl mx-auto">
          <div className="bg-white border border-stone-200 rounded-2xl p-8 sm:p-12 text-center space-y-6">
            <div className="space-y-3">
              <h2 className="font-serif text-3xl sm:text-4xl tracking-wider text-stone-950">Unlock the Academy</h2>
              <p className="text-stone-600 text-base leading-relaxed">
                Access our complete library of professional photography courses, tutorials, and resources. Available
                exclusively to Studio Members.
              </p>
            </div>

            <div className="border-t border-stone-200 pt-6 space-y-4">
              <div className="text-sm text-stone-600 space-y-2">
                <p>✓ Complete course library</p>
                <p>✓ Step-by-step video tutorials</p>
                <p>✓ Professional photography techniques</p>
                <p>✓ Personal branding strategies</p>
                <p>✓ Unlimited access to all content</p>
              </div>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full bg-stone-950 text-stone-50 py-4 rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpgrading ? "Loading..." : "Upgrade to Studio Membership"}
            </button>

            <p className="text-xs text-stone-500">Your current plan: {getFriendlyTierName(productType)}</p>
          </div>
        </div>
      </div>
    )
  }

  const filteredCourses = allCourses.filter((course: any) => {
    const matchesSearch =
      searchQuery === "" ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleCourseClick = (courseId: string) => {
    setSelectedCourseId(courseId)
  }

  const handleBackToCourses = () => {
    setSelectedCourseId(null)
  }

  if (selectedView === "courses") {
    if (selectedCourseId) {
      return <CourseDetail courseId={selectedCourseId} onBack={handleBackToCourses} />
    }

    if (coursesLoading) {
      return <UnifiedLoading message="Loading courses..." />
    }

    if (coursesError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-stone-600">We couldn't load the courses right now</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 text-sm tracking-wider uppercase bg-stone-950 text-stone-50 rounded-xl hover:bg-stone-800 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-10 pb-32 px-4 sm:px-6">
        <div className="pt-8">
          <button
            onClick={() => setSelectedView("overview")}
            className="text-sm tracking-wider uppercase text-stone-600 hover:text-stone-950 transition-colors"
          >
            ← Back
          </button>
        </div>

        <div className="space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-stone-950">Courses</h1>
          <p className="text-stone-600 text-base font-light leading-relaxed">
            Learn at your own pace with our curated collection
          </p>
        </div>

        <div className="border border-stone-200 rounded-xl p-4">
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none"
          />
        </div>

        {/* Continue Learning section */}
        {inProgressCourses.length > 0 && (
          <div className="space-y-6">
            <h2 className="font-serif text-2xl tracking-wider text-stone-950">Continue Learning</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inProgressCourses.map((course: any) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  userTier={userTier}
                  progress={{
                    completed_lessons: course.completed_lessons,
                    total_lessons: course.total_lessons,
                    progress_percentage: course.progress_percentage,
                  }}
                  onCourseClick={handleCourseClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* All courses */}
        <div className="space-y-6">
          <h2 className="font-serif text-2xl tracking-wider text-stone-950">All Courses</h2>
          {filteredCourses.length === 0 ? (
            <div className="border border-stone-200 rounded-2xl p-16 text-center">
              <p className="text-stone-600 text-sm">No courses found. Try adjusting your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCourses.map((course: any) => {
                const enrolledCourse = myCourses.find((c: any) => c.id === course.id)
                return (
                  <CourseCard
                    key={course.id}
                    course={course}
                    userTier={userTier}
                    progress={
                      enrolledCourse
                        ? {
                            completed_lessons: enrolledCourse.completed_lessons,
                            total_lessons: enrolledCourse.total_lessons,
                            progress_percentage: enrolledCourse.progress_percentage,
                          }
                        : undefined
                    }
                    onCourseClick={handleCourseClick}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  const completedCoursesCount = myCourses.filter((c: any) => c.progress_percentage >= 100).length
  const totalEnrolledCourses = myCourses.length

  return (
    <div className="pb-32">
      {/* Full-bleed hero with dark overlay and white text */}
      <div className="relative h-[50vh] sm:h-[60vh] w-full overflow-hidden">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/887-JHliMtQOFFLmPDRmabtQ9DAuiPDTOv-I0ltnA6ru3zz4C0YmuHYD8y66QZDB7.png"
          alt="Academy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <h1 className="font-serif text-5xl sm:text-7xl tracking-wider text-white">Academy</h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 -mt-12 relative z-10">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-2xl mx-auto">
          <div className="bg-white border border-stone-200 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs tracking-wider uppercase text-stone-500 mb-1">Your Plan</div>
            <div className="font-serif text-base sm:text-lg text-stone-950">{getFriendlyTierName(userTier)}</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs tracking-wider uppercase text-stone-500 mb-1">Completed</div>
            <div className="font-serif text-base sm:text-lg text-stone-950">
              {completedCoursesCount}/{totalEnrolledCourses}
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-[10px] sm:text-xs tracking-wider uppercase text-stone-500 mb-1">Learning</div>
            <div className="font-serif text-base sm:text-lg text-stone-950">{inProgressCourses.length}</div>
          </div>
        </div>
      </div>

      <div className="space-y-8 mt-12 px-4 sm:px-6">
        <button
          onClick={() => setSelectedView("courses")}
          className="w-full border border-stone-200 rounded-2xl p-8 sm:p-10 text-left bg-stone-50 hover:bg-stone-100 hover:border-stone-300 transition-all"
        >
          <h2 className="font-serif text-2xl sm:text-3xl tracking-wider text-stone-950 mb-3">Browse Courses</h2>
          <p className="text-stone-600 text-sm sm:text-base font-light leading-relaxed mb-6">
            Explore our complete library of courses designed to help you master professional photography and personal
            branding
          </p>
          <div className="text-xs tracking-wider uppercase text-stone-600">See All Courses →</div>
        </button>

        {(inProgressCourses[0] || allCourses[0]) && (
          <div className="border border-stone-950 bg-stone-950 text-stone-50 rounded-2xl p-8 sm:p-10">
            <div className="space-y-6">
              <div>
                <div className="inline-block px-3 py-1 bg-stone-800 rounded-full text-xs tracking-wider uppercase mb-4">
                  {inProgressCourses[0] ? "Continue Learning" : "Recommended"}
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl tracking-wider mb-3">
                  {(inProgressCourses[0] || allCourses[0])?.title}
                </h2>
                <p className="text-stone-300 text-sm leading-relaxed">
                  {(inProgressCourses[0] || allCourses[0])?.lesson_count} lessons •{" "}
                  {Math.floor((inProgressCourses[0] || allCourses[0])?.total_duration / 60)}h{" "}
                  {(inProgressCourses[0] || allCourses[0])?.total_duration % 60}m
                </p>
              </div>

              <button
                onClick={() => handleCourseClick((inProgressCourses[0] || allCourses[0])?.id)}
                className="w-full bg-stone-50 text-stone-950 py-4 rounded-xl text-sm tracking-wider uppercase hover:bg-stone-100 transition-all"
              >
                {inProgressCourses[0] ? "Continue" : "Start Learning"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
