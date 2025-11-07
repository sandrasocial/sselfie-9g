"use client"

import { useState } from "react"
import useSWR from "swr"
import type { AcademyView } from "./types"
import CourseCard from "../academy/course-card"
import CourseDetail from "../academy/course-detail"
import ResourceCard from "../academy/resource-card"
import UnifiedLoading from "./unified-loading"
import { createLandingCheckout } from "@/app/actions/landing-checkout"

const fetcher = async (url: string) => {
  console.log("[v0] Fetching Academy data from:", url)
  try {
    const res = await fetch(url, { credentials: "include" })
    console.log("[v0] Academy fetch response status:", res.status, "for", url)

    if (!res.ok) {
      const errorText = await res.text()
      console.error("[v0] Academy fetch error:", res.status, errorText)
      throw new Error(`Failed to fetch: ${res.status}`)
    }

    const data = await res.json()
    console.log("[v0] Academy data received from", url, ":", data)
    return data
  } catch (error) {
    console.error("[v0] Academy fetcher error for", url, ":", error)
    throw error
  }
}

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
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>("all")
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [showCategoryGrid, setShowCategoryGrid] = useState(true)

  const {
    data: coursesData,
    error: coursesError,
    isLoading: coursesLoading,
  } = useSWR("/api/academy/courses", fetcher, {
    onSuccess: (data) => console.log("[v0] Courses data loaded successfully:", data),
    onError: (error) => console.error("[v0] Courses SWR error:", error),
  })
  const {
    data: templatesData,
    error: templatesError,
    isLoading: templatesLoading,
  } = useSWR("/api/academy/templates", fetcher, {
    onSuccess: (data) => console.log("[v0] Templates data loaded successfully:", data),
    onError: (error) => console.error("[v0] Templates SWR error:", error),
  })
  const {
    data: monthlyDropsData,
    error: monthlyDropsError,
    isLoading: monthlyDropsLoading,
  } = useSWR("/api/academy/monthly-drops", fetcher, {
    onSuccess: (data) => console.log("[v0] Monthly drops data loaded successfully:", data),
    onError: (error) => console.error("[v0] Monthly drops SWR error:", error),
  })
  const {
    data: flatlayImagesData,
    error: flatlayImagesError,
    isLoading: flatlayImagesLoading,
  } = useSWR("/api/academy/flatlay-images", fetcher, {
    onSuccess: (data) => console.log("[v0] Flatlay images data loaded successfully:", data),
    onError: (error) => console.error("[v0] Flatlay images SWR error:", error),
  })
  const { data: myCoursesData } = useSWR("/api/academy/my-courses", fetcher)
  const { data: userInfoData } = useSWR("/api/user/info", fetcher)

  const hasAccess = coursesData?.hasAccess ?? false
  const productType = coursesData?.productType || userInfoData?.product_type || "one_time_session"
  const isOneTimeUser = productType === "one_time_session"

  const userTier = (coursesData?.userTier || userInfoData?.plan || "starter") as string
  const allCourses = coursesData?.courses || []
  const templates = templatesData?.templates || []
  const monthlyDrops = monthlyDropsData?.monthlyDrops || []
  const flatlayImages = flatlayImagesData?.flatlayImages || []
  const myCourses = myCoursesData?.courses || []
  const inProgressCourses = myCourses.filter((c: any) => c.progress_percentage > 0 && c.progress_percentage < 100)

  if (flatlayImages.length > 0) {
    console.log("[v0] Flatlay images data received:", flatlayImages)
    console.log("[v0] First flatlay thumbnail_url:", flatlayImages[0]?.thumbnail_url)
  }

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

  const handleResourceDownload = async (
    resourceId: string,
    resourceUrl: string,
    resourceType: "template" | "monthly_drop" | "flatlay_image",
  ) => {
    console.log("[v0] handleResourceDownload called:", { resourceId, resourceUrl, resourceType })

    try {
      // Track download
      const endpoint =
        resourceType === "template"
          ? `/api/academy/templates/${resourceId}/download`
          : resourceType === "monthly_drop"
            ? `/api/academy/monthly-drops/${resourceId}/download`
            : `/api/academy/flatlay-images/${resourceId}/download`

      console.log("[v0] Tracking download at endpoint:", endpoint)

      const trackResponse = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("[v0] Track download response:", trackResponse.status)

      if (!trackResponse.ok) {
        const errorText = await trackResponse.text()
        console.error("[v0] Error tracking download:", trackResponse.status, errorText)
      }

      // Open resource in new tab
      console.log("[v0] Opening resource URL:", resourceUrl)
      window.open(resourceUrl, "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error("[v0] Error in handleResourceDownload:", error)
      alert("Failed to download resource. Please try again.")
    }
  }

  const filteredCourses = allCourses.filter((course: any) => {
    const matchesSearch =
      searchQuery === "" ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  console.log("[v0] All templates:", templates)
  console.log(
    "[v0] Templates with categories:",
    templates.map((t: any) => ({ id: t.id, title: t.title, category: t.category })),
  )
  console.log("[v0] Selected template category:", selectedTemplateCategory)

  const filteredTemplates = templates.filter((template: any) => {
    const matchesSearch =
      searchQuery === "" ||
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedTemplateCategory === "all" || template.category === selectedTemplateCategory

    console.log(
      "[v0] Template:",
      template.title,
      "Category:",
      template.category,
      "Matches category:",
      matchesCategory,
      "Selected:",
      selectedTemplateCategory,
    )

    return matchesSearch && matchesCategory
  })

  console.log("[v0] Filtered templates count:", filteredTemplates.length)
  console.log(
    "[v0] Filtered templates:",
    filteredTemplates.map((t: any) => ({ id: t.id, title: t.title, category: t.category })),
  )

  const filteredMonthlyDrops = monthlyDrops.filter((drop: any) => {
    const matchesSearch =
      searchQuery === "" ||
      drop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (drop.description && drop.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  const filteredFlatlayImages = flatlayImages.filter((flatlay: any) => {
    const matchesSearch =
      searchQuery === "" ||
      flatlay.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flatlay.description && flatlay.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  const handleCourseClick = (courseId: string) => {
    setSelectedCourseId(courseId)
  }

  const handleBackToCourses = () => {
    setSelectedCourseId(null)
  }

  if (selectedView === "templates") {
    if (templatesLoading) {
      return <UnifiedLoading message="Loading templates..." />
    }

    if (templatesError) {
      console.error("[v0] Templates error:", templatesError)
      return (
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-stone-600">Failed to load templates. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 text-sm tracking-wider uppercase bg-stone-950 text-stone-50 rounded-xl hover:bg-stone-800 transition-all"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    const templateCategories = [
      {
        value: "all",
        label: "All Templates",
        image:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2847%29-kGWMLFs2EnK6NrtqNjsIyS4kfQxer8.jpeg",
      },
      {
        value: "social_media",
        label: "Social Media",
        image:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2847%29-kGWMLFs2EnK6NrtqNjsIyS4kfQxer8.jpeg",
      },
      {
        value: "email_marketing",
        label: "Email Marketing",
        image:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-9YjBZswCzTL0RY7fbkRjXC2uzoaSdO.jpeg",
      },
      {
        value: "branding",
        label: "Branding",
        image:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/887-JHliMtQOFFLmPDRmabtQ9DAuiPDTOv-WK6zYM31cXxUOP8ZIy4vGzN60qYe75.png",
      },
      {
        value: "content_creation",
        label: "Content Creation",
        image:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2841%29-GJFGAsjbFNigSGQs5jVo1Y9u3agBq6.jpeg",
      },
      {
        value: "business",
        label: "Business",
        image:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/885-BRNmqKHXcPLB1Ff5XK1UYWRrSOnfVm-iOOarwktPIBXUZk0hyYqzL3ycGL9Ab.png",
      },
      {
        value: "education",
        label: "Education",
        image:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2843%29-L0w1kYOCCcM1XOPiqyzHcJ1CW9YU5T.jpeg",
      },
      {
        value: "other",
        label: "Other",
        image:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/888-2PU4IDaX9DXr7N86jedTuQDak6KWxP-e8JM3OpuHd120n4RGK7QBY0dtrlHJ3.png",
      },
    ]

    if (showCategoryGrid && selectedTemplateCategory === "all") {
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
            <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-stone-950">Templates</h1>
            <p className="text-stone-600 text-base font-light leading-relaxed">
              Select a category to explore professional templates
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {templateCategories
              .filter((cat) => cat.value !== "all")
              .map((category) => (
                <button
                  key={category.value}
                  onClick={() => {
                    setSelectedTemplateCategory(category.value)
                    setShowCategoryGrid(false)
                  }}
                  className="group relative aspect-square overflow-hidden rounded-xl transition-all active:scale-95 touch-manipulation"
                >
                  <img
                    src={category.image || "/placeholder.svg"}
                    alt={category.label}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute inset-0 flex items-end p-4">
                    <h3 className="text-left text-sm sm:text-base font-semibold uppercase tracking-wider text-white">
                      {category.label}
                    </h3>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-10 pb-32 px-4 sm:px-6">
        <div className="pt-8">
          <button
            onClick={() => {
              setShowCategoryGrid(true)
              setSelectedTemplateCategory("all")
            }}
            className="text-sm tracking-wider uppercase text-stone-600 hover:text-stone-950 transition-colors"
          >
            ← Back to Categories
          </button>
        </div>

        <div className="space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-stone-950">
            {templateCategories.find((cat) => cat.value === selectedTemplateCategory)?.label || "Templates"}
          </h1>
          <p className="text-stone-600 text-base font-light leading-relaxed">
            Download professional templates for your brand
          </p>
        </div>

        <div className="border border-stone-200 rounded-xl p-4">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none"
          />
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="border border-stone-200 rounded-2xl p-16 text-center">
            <p className="text-stone-600 text-sm">No templates found in this category. Try adjusting your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template: any) => (
              <ResourceCard
                key={template.id}
                resource={template}
                onDownload={(id, url) => {
                  console.log("[v0] Template download clicked:", id, url)
                  handleResourceDownload(id, url, "template")
                }}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (selectedView === "monthly-drops") {
    if (monthlyDropsLoading) {
      return <UnifiedLoading message="Loading monthly drops..." />
    }

    if (monthlyDropsError) {
      console.error("[v0] Monthly drops error:", monthlyDropsError)
      return (
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-stone-600">Failed to load monthly drops. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 text-sm tracking-wider uppercase bg-stone-950 text-stone-50 rounded-xl hover:bg-stone-800 transition-all"
            >
              Reload
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
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-stone-950">Monthly Drops</h1>
          <p className="text-stone-600 text-base font-light leading-relaxed">
            Exclusive monthly resources and content drops for Studio Members
          </p>
        </div>

        <div className="border border-stone-200 rounded-xl p-4">
          <input
            type="text"
            placeholder="Search monthly drops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none"
          />
        </div>

        {filteredMonthlyDrops.length === 0 ? (
          <div className="border border-stone-200 rounded-2xl p-16 text-center">
            <p className="text-stone-600 text-sm">No monthly drops found. Try adjusting your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMonthlyDrops.map((drop: any) => (
              <ResourceCard
                key={drop.id}
                resource={drop}
                onDownload={(id, url) => {
                  console.log("[v0] Monthly drop download clicked:", id, url)
                  handleResourceDownload(id, url, "monthly_drop")
                }}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (selectedView === "flatlay-images") {
    if (flatlayImagesLoading) {
      return <UnifiedLoading message="Loading flatlay images..." />
    }

    if (flatlayImagesError) {
      console.error("[v0] Flatlay images error:", flatlayImagesError)
      return (
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-stone-600">Failed to load flatlay images. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 text-sm tracking-wider uppercase bg-stone-950 text-stone-50 rounded-xl hover:bg-stone-800 transition-all"
            >
              Reload
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
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-stone-950">Flatlay Images</h1>
          <p className="text-stone-600 text-base font-light leading-relaxed">
            Professional flatlay images for your content and brand aesthetic
          </p>
        </div>

        <div className="border border-stone-200 rounded-xl p-4">
          <input
            type="text"
            placeholder="Search flatlay images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none"
          />
        </div>

        {filteredFlatlayImages.length === 0 ? (
          <div className="border border-stone-200 rounded-2xl p-16 text-center">
            <p className="text-stone-600 text-sm">No flatlay images found. Try adjusting your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFlatlayImages.map((flatlay: any) => (
              <ResourceCard
                key={flatlay.id}
                resource={flatlay}
                onDownload={(id, url) => {
                  console.log("[v0] Flatlay download clicked:", id, url)
                  handleResourceDownload(id, url, "flatlay_image")
                }}
              />
            ))}
          </div>
        )}
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

        <button
          onClick={() => setSelectedView("templates")}
          className="w-full border border-stone-200 rounded-2xl p-8 sm:p-10 text-left bg-white hover:bg-stone-50 hover:border-stone-300 transition-all"
        >
          <h2 className="font-serif text-2xl sm:text-3xl tracking-wider text-stone-950 mb-3">Templates</h2>
          <p className="text-stone-600 text-sm sm:text-base font-light leading-relaxed mb-6">
            Download professional templates for Canva, PDFs, and more to elevate your brand
          </p>
          <div className="text-xs tracking-wider uppercase text-stone-600">Browse Templates →</div>
        </button>

        <button
          onClick={() => setSelectedView("monthly-drops")}
          className="w-full border border-stone-200 rounded-2xl p-8 sm:p-10 text-left bg-white hover:bg-stone-50 hover:border-stone-300 transition-all"
        >
          <h2 className="font-serif text-2xl sm:text-3xl tracking-wider text-stone-950 mb-3">Monthly Drops</h2>
          <p className="text-stone-600 text-sm sm:text-base font-light leading-relaxed mb-6">
            Exclusive monthly resources and content drops for Studio Members
          </p>
          <div className="text-xs tracking-wider uppercase text-stone-600">View Monthly Drops →</div>
        </button>

        <button
          onClick={() => setSelectedView("flatlay-images")}
          className="w-full border border-stone-200 rounded-2xl p-8 sm:p-10 text-left bg-white hover:bg-stone-50 hover:border-stone-300 transition-all"
        >
          <h2 className="font-serif text-2xl sm:text-3xl tracking-wider text-stone-950 mb-3">Flatlay Images</h2>
          <p className="text-stone-600 text-sm sm:text-base font-light leading-relaxed mb-6">
            Professional flatlay images to elevate your content and brand aesthetic
          </p>
          <div className="text-xs tracking-wider uppercase text-stone-600">Browse Flatlay Images →</div>
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
