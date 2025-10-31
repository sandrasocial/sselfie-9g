"use client"

import { useState } from "react"
import { Aperture, Grid, ChevronRight } from "lucide-react"
import useSWR from "swr"
import type { AcademyView } from "./types"
import CourseCard from "../academy/course-card"
import CourseDetail from "../academy/course-detail"
import UnifiedLoading from "./unified-loading"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AcademyScreen() {
  const [selectedView, setSelectedView] = useState<AcademyView>("overview")
  const [selectedTier, setSelectedTier] = useState<"all" | "foundation" | "professional" | "enterprise">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  const { data: coursesData, error: coursesError, isLoading: coursesLoading } = useSWR("/api/academy/courses", fetcher)
  const { data: myCoursesData } = useSWR("/api/academy/my-courses", fetcher)
  const { data: userData } = useSWR("/api/user", fetcher)

  const userTier = (userData?.user?.membership_tier || "foundation") as "foundation" | "professional" | "enterprise"
  const allCourses = coursesData?.courses || []
  const myCourses = myCoursesData?.courses || []
  const inProgressCourses = myCourses.filter((c: any) => c.progress_percentage > 0 && c.progress_percentage < 100)

  // Filter courses
  const filteredCourses = allCourses.filter((course: any) => {
    const matchesTier = selectedTier === "all" || course.tier === selectedTier
    const matchesSearch =
      searchQuery === "" ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTier && matchesSearch
  })

  const handleCourseClick = (courseId: string) => {
    setSelectedCourseId(courseId)
  }

  const handleBackToCourses = () => {
    setSelectedCourseId(null)
  }

  const membershipTiers = [
    {
      name: "Studio Essential",
      price: "$49",
      period: "month",
      description: "Perfect for getting started with AI photography",
      features: [
        "50 AI photo generations per month",
        "Basic training tutorials",
        "Email support",
        "Standard quality exports",
      ],
      highlighted: false,
    },
    {
      name: "Studio Professional",
      price: "$99",
      period: "month",
      description: "For professionals who need more power",
      features: [
        "200 AI photo generations per month",
        "All Academy courses included",
        "Priority support",
        "High-quality exports",
        "Advanced editing tools",
        "Commercial usage rights",
      ],
      highlighted: true,
    },
    {
      name: "Studio Enterprise",
      price: "$299",
      period: "month",
      description: "Unlimited creation for agencies and teams",
      features: [
        "Unlimited AI photo generations",
        "Team collaboration tools",
        "1-on-1 coaching sessions",
        "API access",
        "White-label options",
        "Dedicated account manager",
      ],
      highlighted: false,
    },
  ]

  if (selectedView === "membership") {
    return (
      <div className="space-y-8 pb-24">
        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={() => setSelectedView("overview")}
            className="p-4 bg-stone-100/50 rounded-2xl border border-stone-200/40 hover:bg-stone-100/70 transition-all duration-200"
          >
            <ChevronRight size={18} className="text-stone-600 transform rotate-180" strokeWidth={1.5} />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase">
              Membership Plans
            </h2>
            <p className="text-xs tracking-[0.15em] uppercase font-light text-stone-500 mt-2">Choose Your Plan</p>
          </div>
        </div>

        <div className="space-y-4">
          {membershipTiers.map((tier, i) => (
            <div
              key={i}
              className={`bg-stone-100/50 border rounded-3xl p-6 sm:p-8 transition-all duration-200 ${
                tier.highlighted
                  ? "border-stone-950 bg-stone-950 text-stone-50"
                  : "border-stone-200/40 hover:border-stone-300/60"
              }`}
            >
              {tier.highlighted && (
                <div className="inline-block px-4 py-1.5 bg-stone-50 text-stone-950 rounded-full text-xs tracking-[0.15em] uppercase font-light mb-4">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl sm:text-2xl font-serif font-extralight tracking-[0.15em] uppercase mb-2">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-4xl sm:text-5xl font-serif font-extralight">{tier.price}</span>
                  <span
                    className={`text-sm font-light tracking-wide ${tier.highlighted ? "opacity-80" : "text-stone-600"}`}
                  >
                    / {tier.period}
                  </span>
                </div>
                <p className={`text-sm font-light ${tier.highlighted ? "opacity-90" : "text-stone-600"}`}>
                  {tier.description}
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {tier.features.map((feature, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                        tier.highlighted ? "bg-stone-50" : "bg-stone-950"
                      }`}
                    ></div>
                    <span className={`text-sm font-light ${tier.highlighted ? "opacity-90" : "text-stone-950"}`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <a
                href="https://your-gohighlevel-link.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full text-center py-4 rounded-2xl font-light tracking-[0.15em] uppercase text-sm transition-all duration-200 ${
                  tier.highlighted
                    ? "bg-stone-50 text-stone-950 hover:bg-stone-100"
                    : "bg-stone-950 text-stone-50 hover:bg-stone-800"
                }`}
              >
                Choose {tier.name}
              </a>
            </div>
          ))}
        </div>
      </div>
    )
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
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <p className="text-sm font-light text-red-600">Failed to load courses</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-100/50 border border-stone-200/40 rounded-xl hover:bg-stone-100/70 transition-all duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-8 pb-24">
        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={() => setSelectedView("overview")}
            className="p-4 bg-stone-100/50 rounded-2xl border border-stone-200/40 hover:bg-stone-100/70 transition-all duration-200"
          >
            <ChevronRight size={18} className="text-stone-600 transform rotate-180" strokeWidth={1.5} />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase">
              All Courses
            </h2>
            <p className="text-xs tracking-[0.15em] uppercase font-light text-stone-500 mt-2">Professional Training</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="bg-stone-100/50 border border-stone-200/40 rounded-2xl p-4">
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-light text-stone-950 placeholder:text-stone-400 focus:outline-none"
          />
        </div>

        {/* Tier filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { key: "all", label: "All Courses" },
            { key: "foundation", label: "Foundation" },
            { key: "professional", label: "Professional" },
            { key: "enterprise", label: "Enterprise" },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedTier(filter.key as any)}
              className={`px-4 py-2 text-xs tracking-[0.15em] uppercase font-light border border-stone-200/40 rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 min-h-[40px] ${
                selectedTier === filter.key ? "bg-stone-950 text-white" : "bg-stone-50 hover:bg-stone-100"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Continue Learning section */}
        {inProgressCourses.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-serif font-extralight tracking-[0.15em] uppercase text-stone-950">
              Continue Learning
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* All courses grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-serif font-extralight tracking-[0.15em] uppercase text-stone-950">
            {selectedTier === "all" ? "All Courses" : `${selectedTier} Courses`}
          </h3>
          {filteredCourses.length === 0 ? (
            <div className="bg-stone-100/40 rounded-3xl p-12 text-center border border-stone-200/40">
              <Grid size={48} className="mx-auto mb-6 text-stone-400" strokeWidth={1.5} />
              <h3 className="text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase mb-3">
                No Courses Found
              </h3>
              <p className="text-sm font-light text-stone-600 mb-6">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
    <div className="space-y-8 pb-24">
      <div className="pt-4 sm:pt-6 text-center">
        <h1 className="text-3xl sm:text-5xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase leading-none mb-3">
          Academy
        </h1>
        <p className="text-xs tracking-[0.2em] uppercase font-light text-stone-500">Master Professional Photography</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Membership", value: userTier, desc: "Current Tier" },
          { label: "Completed", value: `${completedCoursesCount}/${totalEnrolledCourses}`, desc: "Courses" },
          { label: "In Progress", value: inProgressCourses.length, desc: "Learning" },
        ].map((stat, i) => (
          <div key={i} className="bg-stone-100/50 border border-stone-200/40 rounded-2xl p-4 sm:p-5">
            <div className="text-xs tracking-[0.1em] uppercase font-light mb-2 text-stone-500">{stat.label}</div>
            <div className="text-2xl sm:text-3xl font-serif font-extralight text-stone-950 mb-1 capitalize">
              {stat.value}
            </div>
            <div className="text-xs font-light text-stone-600">{stat.desc}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setSelectedView("membership")}
          className="group relative bg-white/50 backdrop-blur-2xl border border-white/60 rounded-[1.75rem] p-8 text-left hover:bg-white/70 hover:border-white/80 transition-all duration-300 shadow-xl shadow-stone-900/10 hover:shadow-2xl hover:shadow-stone-900/20 overflow-hidden hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-stone-200/20 rounded-full blur-3xl"></div>
          <div className="relative z-10 w-14 h-14 bg-stone-950 rounded-[1.25rem] flex items-center justify-center mb-6 shadow-xl shadow-stone-900/30 group-hover:scale-110 transition-transform duration-300">
            <Aperture size={26} className="text-white" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-stone-950 mb-3 relative z-10">Membership Plans</h3>
          <p className="text-sm font-medium text-stone-600 mb-6 relative z-10">
            Upgrade your plan for unlimited AI generations and exclusive features
          </p>
          <div className="flex items-center gap-2 text-xs tracking-wider uppercase font-semibold text-stone-600 group-hover:text-stone-950 transition-colors relative z-10">
            <span>View Plans</span>
            <ChevronRight size={14} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <button
          onClick={() => setSelectedView("courses")}
          className="group relative bg-white/50 backdrop-blur-2xl border border-white/60 rounded-[1.75rem] p-8 text-left hover:bg-white/70 hover:border-white/80 transition-all duration-300 shadow-xl shadow-stone-900/10 hover:shadow-2xl hover:shadow-stone-900/20 overflow-hidden hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-stone-200/20 rounded-full blur-3xl"></div>
          <div className="relative z-10 w-14 h-14 bg-stone-950 rounded-[1.25rem] flex items-center justify-center mb-6 shadow-xl shadow-stone-900/30 group-hover:scale-110 transition-transform duration-300">
            <Grid size={26} className="text-white" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-stone-950 mb-3 relative z-10">All Courses</h3>
          <p className="text-sm font-medium text-stone-600 mb-6 relative z-10">
            Access our complete library of professional photography courses
          </p>
          <div className="flex items-center gap-2 text-xs tracking-wider uppercase font-semibold text-stone-600 group-hover:text-stone-950 transition-colors relative z-10">
            <span>Browse Courses</span>
            <ChevronRight size={14} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Featured course - show first in-progress or first available course */}
      {(inProgressCourses[0] || allCourses[0]) && (
        <div className="relative bg-stone-950 text-white rounded-[1.75rem] p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-stone-800/50 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-stone-700/30 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-xl rounded-full text-xs tracking-wider uppercase font-semibold mb-4 border border-white/20">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                {inProgressCourses[0] ? "Continue Learning" : "Recommended"}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3">{(inProgressCourses[0] || allCourses[0])?.title}</h3>
              <p className="text-sm font-medium opacity-90 mb-6 max-w-md">
                {(inProgressCourses[0] || allCourses[0])?.lesson_count} lessons •{" "}
                {Math.floor((inProgressCourses[0] || allCourses[0])?.total_duration / 60)}h{" "}
                {(inProgressCourses[0] || allCourses[0])?.total_duration % 60}m •{" "}
                {(inProgressCourses[0] || allCourses[0])?.description}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleCourseClick((inProgressCourses[0] || allCourses[0])?.id)}
            className="group relative block w-full text-center bg-white text-stone-950 py-4 rounded-[1.25rem] font-semibold text-sm transition-all duration-300 hover:shadow-2xl hover:shadow-white/30 min-h-[56px] hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-stone-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10">{inProgressCourses[0] ? "Continue Learning" : "Start Learning"}</span>
          </button>
        </div>
      )}
    </div>
  )
}
