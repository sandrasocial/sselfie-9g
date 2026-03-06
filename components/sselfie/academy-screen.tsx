"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import type { AcademyView } from "./types"
import CourseCard from "../academy/course-card"
import CourseDetail from "../academy/course-detail"
import ResourceCard from "../academy/resource-card"
import ProductAccessCard from "./product-access-card"
import type { ProductAccessId } from "./product-access-card"
import MiniProductCard from "./mini-product-card"
import UnifiedLoading from "./unified-loading"
import { useRouter, useSearchParams } from 'next/navigation'
import { parseAcademyViewParam } from "@/lib/academy/view-routing"
import { handleCheckoutFailure } from "@/lib/checkout-failure"

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

/** Copy for "You Have Access" cards (docs/in-app-funnel/02-content-copy §1). Only products we show in-app with deep links. */
const PRODUCT_ACCESS_COPY: Record<
  "what_to_say" | "show_up" | "get_paid" | "ai_photo_prompts",
  { subText: string; ctaLabel: string }
> = {
  what_to_say: {
    subText: "Your caption framework and messaging workbook.",
    ctaLabel: "Open workbook",
  },
  show_up: {
    subText: "Your 30-day content rhythm and batching workflow.",
    ctaLabel: "Open workbook",
  },
  get_paid: {
    subText: "Your revenue path map and 90-day execution plan.",
    ctaLabel: "Open workbook",
  },
  ai_photo_prompts: {
    subText: "50 done-for-you prompts across 10 brand scenarios.",
    ctaLabel: "Open prompts",
  },
}

const PRODUCT_IDS_WITH_ACCESS: Set<string> = new Set(Object.keys(PRODUCT_ACCESS_COPY))

export default function AcademyScreen() {
  const searchParams = useSearchParams()
  const initialAcademyView = parseAcademyViewParam(
    searchParams.get("academy_view") ?? searchParams.get("academyView"),
  )
  const [selectedView, setSelectedView] = useState<AcademyView>(initialAcademyView ?? "overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>("all")
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [showCategoryGrid, setShowCategoryGrid] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const router = useRouter()

  useEffect(() => {
    if (!initialAcademyView || typeof window === "undefined") return
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete("academy_view")
    nextUrl.searchParams.delete("academyView")
    window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
  }, [initialAcademyView])

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

  const { data: creditsData } = useSWR("/api/user/credits", fetcher, {
    onSuccess: (data) => setCreditBalance(data?.balance || 0),
  })
  const { data: myProductsData } = useSWR("/api/academy/my-products", fetcher)

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

  /** Owned Academy mini-products that have in-app "You Have Access" copy and deep links */
  const ownedForAccess = (myProductsData?.purchases ?? []).filter((p: { id: string }) =>
    PRODUCT_IDS_WITH_ACCESS.has(p.id),
  ) as Array<{ id: string; name: string }>
  /** Products the user can still buy (not owned); from my-products API */
  const availableProducts = myProductsData?.availableProducts ?? []
  /** Show "Get More" section when user does not have Studio and there are products to buy */
  const showGetMore = !hasAccess && availableProducts.length > 0

  if (flatlayImages.length > 0) {
    console.log("[v0] Flatlay images data received:", flatlayImages)
    console.log("[v0] First flatlay thumbnail_url:", flatlayImages[0]?.thumbnail_url)
  }

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true)
      const response = await fetch("/api/landing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "sselfie_studio_membership" }),
      })

      const data = await response.json()
      if (response.ok && data?.clientSecret) {
        window.location.href = `/checkout?client_secret=${data.clientSecret}`
      } else {
        throw new Error(data?.error || "Failed to start checkout")
      }
    } catch (error) {
      console.error("[v0] Error creating checkout:", error)
      handleCheckoutFailure({
        error,
        source: "academy_upgrade",
        productId: "sselfie_studio_membership",
        fallbackPath: "/checkout/membership",
      })
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
      const endpoint =
        resourceType === "template"
          ? `/api/academy/templates/${resourceId}/download`
          : resourceType === "monthly_drop"
            ? `/api/academy/monthly-drops/${resourceId}/download`
            : `/api/academy/flatlay-images/${resourceId}/download`

      console.log("[v0] Track download endpoint:", endpoint)

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

      console.log("[v0] Downloading resource as blob from:", resourceUrl)
      const response = await fetch(resourceUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch resource: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      // Extract filename from URL or use type-based default
      const urlPath = new URL(resourceUrl).pathname
      const filename = urlPath.split("/").pop() || `${resourceType}-${resourceId}.download`

      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log("[v0] Resource download initiated successfully")
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

  const templateCategories = [
    {
      value: "all",
      label: "All Templates",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2847%29-kGWMLFs2EnK6NrtqNjsIyS4kfQxer8.jpeg",
    },
    {
      value: "social-media",
      label: "Social Media",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2847%29-kGWMLFs2EnK6NrtqNjsIyS4kfQxer8.jpeg",
    },
    {
      value: "email-marketing",
      label: "Email Marketing",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-9YjBZswCzTL0RY7fbkRjXC2uzoaSdO.jpeg",
    },
    {
      value: "branding",
      label: "Branding",
      image:
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/887-JHliMtQOFFLmPDRmabtQ9DAuiPDTOv-WK6zYM31cXxUOP8ZIy4vGzN60qYe75.png",
    },
    {
      value: "content-creation",
      label: "Content Creation",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2841%29-GJFGAsjbFNigSGQs5jVo1Y9u3agBq6.jpeg",
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
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2843%29-L0w1kYOCCcM1XOPiqyzHcJ1CW9YU5T.jpeg",
    },
    {
      value: "other",
      label: "Other",
      image:
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/888-2PU4IDaX9DXr7N86jedTuQDak6KWxP-e8JM3OpuHd120n4RGK7QBY0dtrlHJ3.png",
    },
  ]

  if (selectedView === "templates") {
    if (templatesLoading) {
      return <UnifiedLoading message="Loading templates..." />
    }

    if (templatesError || !hasAccess) {
      return (
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className="text-center space-y-6 max-w-md bg-[rgba(255,255,255,0.07)] border border-white/15 rounded-2xl p-8 backdrop-blur-xl">
            <div className="space-y-3">
              <h3 className="font-serif text-2xl tracking-wider text-white">Studio Membership Required</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Access exclusive templates, monthly drops, and flatlay images with a Studio Membership
              </p>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="px-8 py-4 text-sm tracking-wider uppercase bg-white/90 text-[#0b0d10] rounded-xl hover:bg-white transition-all disabled:opacity-50"
            >
              {isUpgrading ? "Processing..." : "Upgrade to Studio"}
            </button>
          </div>
        </div>
      )
    }

    if (showCategoryGrid && selectedTemplateCategory === "all") {
      return (
        <div className="space-y-10 pb-32 px-4 sm:px-6 text-white">
          <div className="pt-8">
            <button
              onClick={() => setSelectedView("overview")}
              className="text-sm tracking-wider uppercase text-white/70 hover:text-white transition-colors"
            >
              ← Back
            </button>
          </div>

          <div className="space-y-3">
            <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-white">Templates</h1>
            <p className="text-white/70 text-base font-light leading-relaxed">
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
      <div className="space-y-10 pb-32 px-4 sm:px-6 text-white">
        <div className="pt-8">
          <button
            onClick={() => {
              setShowCategoryGrid(true)
              setSelectedTemplateCategory("all")
            }}
            className="text-sm tracking-wider uppercase text-white/70 hover:text-white transition-colors"
          >
            ← Back to Categories
          </button>
        </div>

        <div className="space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-white">
            {templateCategories.find((cat) => cat.value === selectedTemplateCategory)?.label || "Templates"}
          </h1>
          <p className="text-white/70 text-base font-light leading-relaxed">
            Download professional templates for your brand
          </p>
        </div>

        <div className="bg-[rgba(255,255,255,0.04)] border border-white/10 rounded-xl p-4 backdrop-blur-xl">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="bg-[rgba(255,255,255,0.04)] border border-white/10 rounded-2xl p-16 text-center">
            <p className="text-white/70 text-sm">No templates found in this category. Try adjusting your search.</p>
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

    if (monthlyDropsError || !hasAccess) {
      return (
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className="text-center space-y-6 max-w-md bg-[rgba(255,255,255,0.07)] border border-white/15 rounded-2xl p-8 backdrop-blur-xl">
            <div className="space-y-3">
              <h3 className="font-serif text-2xl tracking-wider text-white">Studio Membership Required</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Get exclusive monthly content drops with a Studio Membership
              </p>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="px-8 py-4 text-sm tracking-wider uppercase bg-white/90 text-[#0b0d10] rounded-xl hover:bg-white transition-all disabled:opacity-50"
            >
              {isUpgrading ? "Processing..." : "Upgrade to Studio"}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-10 pb-32 px-4 sm:px-6 text-white">
        <div className="pt-8">
          <button
            onClick={() => setSelectedView("overview")}
            className="text-sm tracking-wider uppercase text-white/70 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>

        <div className="space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-white">Monthly Drops</h1>
          <p className="text-white/70 text-base font-light leading-relaxed">
            Exclusive monthly resources and content drops for Studio Members
          </p>
        </div>

        <div className="bg-[rgba(255,255,255,0.04)] border border-white/10 rounded-xl p-4 backdrop-blur-xl">
          <input
            type="text"
            placeholder="Search monthly drops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        {filteredMonthlyDrops.length === 0 ? (
          <div className="bg-[rgba(255,255,255,0.04)] border border-white/10 rounded-2xl p-16 text-center">
            <p className="text-white/70 text-sm">No monthly drops found. Try adjusting your search.</p>
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

    if (flatlayImagesError || !hasAccess) {
      return (
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className="text-center space-y-6 max-w-md bg-[rgba(255,255,255,0.07)] border border-white/15 rounded-2xl p-8 backdrop-blur-xl">
            <div className="space-y-3">
              <h3 className="font-serif text-2xl tracking-wider text-white">Studio Membership Required</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Access professional flatlay images with a Studio Membership
              </p>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="px-8 py-4 text-sm tracking-wider uppercase bg-white/90 text-[#0b0d10] rounded-xl hover:bg-white transition-all disabled:opacity-50"
            >
              {isUpgrading ? "Processing..." : "Upgrade to Studio"}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-10 pb-32 px-4 sm:px-6 text-white">
        <div className="pt-8">
          <button
            onClick={() => setSelectedView("overview")}
            className="text-sm tracking-wider uppercase text-white/70 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>

        <div className="space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-white">Flatlay Images</h1>
          <p className="text-white/70 text-base font-light leading-relaxed">
            Professional flatlay images for your content and brand aesthetic
          </p>
        </div>

        <div className="bg-[rgba(255,255,255,0.04)] border border-white/10 rounded-xl p-4 backdrop-blur-xl">
          <input
            type="text"
            placeholder="Search flatlay images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        {filteredFlatlayImages.length === 0 ? (
          <div className="bg-[rgba(255,255,255,0.04)] border border-white/10 rounded-2xl p-16 text-center">
            <p className="text-white/70 text-sm">No flatlay images found. Try adjusting your search.</p>
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
          <div className="text-center space-y-4 bg-[rgba(255,255,255,0.07)] border border-white/15 rounded-2xl p-8 backdrop-blur-xl">
            <p className="text-sm text-white/70">We couldn&apos;t load the courses right now</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 text-sm tracking-wider uppercase bg-white/90 text-[#0b0d10] rounded-xl hover:bg-white transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-10 pb-32 px-4 sm:px-6 text-white">
        <div className="pt-8">
          <button
            onClick={() => setSelectedView("overview")}
            className="text-sm tracking-wider uppercase text-white/70 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>

        <div className="space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-white">Courses</h1>
          <p className="text-white/70 text-base font-light leading-relaxed">
            Learn at your own pace with our curated collection
          </p>
        </div>

        <div className="bg-[rgba(255,255,255,0.04)] border border-white/10 rounded-xl p-4 backdrop-blur-xl">
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        {inProgressCourses.length > 0 && (
          <div className="space-y-6">
            <h2 className="font-serif text-2xl tracking-wider text-white">Continue Learning</h2>
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
          <h2 className="font-serif text-2xl tracking-wider text-white">All Courses</h2>
          {filteredCourses.length === 0 ? (
            <div className="bg-[rgba(255,255,255,0.04)] border border-white/10 rounded-2xl p-16 text-center">
              <p className="text-white/70 text-sm">No courses found. Try adjusting your search.</p>
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

  const handleNavigation = (tab: string) => {
    window.location.hash = tab
    setSelectedView(tab as AcademyView) // Update selectedView based on the tab
    setShowNavMenu(false)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        router.push("/auth/login")
      } else {
        console.error("[v0] Logout failed")
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error("[v0] Error during logout:", error)
      setIsLoggingOut(false)
    }
  }

  const completedCoursesCount = myCourses.filter((c: any) => c.progress_percentage >= 100).length
  const totalEnrolledCourses = myCourses.length

  return (
    <div className="pb-32 bg-[#0b0d10] text-white">
      {showNavMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setShowNavMenu(false)}
          />

          <div className="fixed top-0 right-0 bottom-0 w-80 bg-[rgba(11,13,16,0.95)] backdrop-blur-3xl border-l border-white/10 shadow-2xl shadow-black/40 z-50 animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-white">Menu</h3>
              <button
                onClick={() => setShowNavMenu(false)}
                className="h-8 px-3 inline-flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-[11px] tracking-[0.12em] uppercase text-white/70"
                aria-label="Close menu"
              >
                Close
              </button>
            </div>

            <div className="flex-shrink-0 px-6 py-6 border-b border-white/10">
              <div className="text-[10px] tracking-[0.15em] uppercase font-light text-white/50 mb-2">Your Credits</div>
              <div className="text-3xl font-serif font-extralight text-white tabular-nums">
                {creditBalance.toFixed(1)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 py-2">
              <button
                onClick={() => handleNavigation("studio")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-white/5 transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-white/45">Studio</span>
                <span className="text-sm font-medium text-white/70">Studio</span>
              </button>
              <button
                onClick={() => handleNavigation("training")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-white/5 transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-white/45">Train</span>
                <span className="text-sm font-medium text-white/70">Training</span>
              </button>
              <button
                onClick={() => handleNavigation("maya")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-white/5 transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-white/45">Chat</span>
                <span className="text-sm font-medium text-white/70">Maya</span>
              </button>
              <button
                onClick={() => handleNavigation("gallery")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-white/5 transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-white/45">Media</span>
                <span className="text-sm font-medium text-white/70">Gallery</span>
              </button>
              {/* B-Roll moved to Maya Videos tab */}
              <button
                onClick={() => {
                  handleNavigation("maya")
                  setTimeout(() => {
                    window.location.hash = "#maya/videos"
                  }, 100)
                }}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-white/5 transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-white/45">Video</span>
                <span className="text-sm font-medium text-white/70">Videos</span>
              </button>
              <button
                onClick={() => handleNavigation("academy")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left bg-white/10 border-l-2 border-white/40"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-white">Learn</span>
                <span className="text-sm font-medium text-white">Academy</span>
              </button>
              <button
                onClick={() => handleNavigation("profile")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-white/5 transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-white/45">Profile</span>
                <span className="text-sm font-medium text-white/70">Profile</span>
              </button>
              <button
                onClick={() => handleNavigation("settings")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-white/5 transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-white/45">Prefs</span>
                <span className="text-sm font-medium text-white/70">Settings</span>
              </button>
            </div>

            <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 bg-[rgba(11,13,16,0.92)]">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add top padding to content to account for fixed header */}
      <div className="pt-16">
        <div className="relative h-[40vh] sm:h-[45vh] w-full overflow-hidden">
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

        <div className="px-4 sm:px-6 -mt-8 relative z-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-2xl mx-auto">
            <div className="bg-[rgba(13,15,19,0.92)] backdrop-blur-xl border border-white/15 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-[10px] sm:text-xs tracking-wider uppercase text-white/50 mb-1">Your Plan</div>
              <div className="font-serif text-base sm:text-lg text-white">{getFriendlyTierName(userTier)}</div>
            </div>
            <div className="bg-[rgba(13,15,19,0.92)] backdrop-blur-xl border border-white/15 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-[10px] sm:text-xs tracking-wider uppercase text-white/50 mb-1">Completed</div>
              <div className="font-serif text-base sm:text-lg text-white">
                {completedCoursesCount}/{totalEnrolledCourses}
              </div>
            </div>
            <div className="bg-[rgba(13,15,19,0.92)] backdrop-blur-xl border border-white/15 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-[10px] sm:text-xs tracking-wider uppercase text-white/50 mb-1">Learning</div>
              <div className="font-serif text-base sm:text-lg text-white">{inProgressCourses.length}</div>
            </div>
          </div>
        </div>

        <div className="space-y-6 mt-8 px-4 sm:px-6">
          {/* Slice 1.2: You Have Access — owned Academy mini-products with deep-link CTAs */}
          {ownedForAccess.length > 0 && (
            <section className="pt-6 pb-3">
              <h2
                className="font-serif text-[12px] font-extralight uppercase tracking-[0.2em] text-white/50 pb-6"
                style={{ letterSpacing: "0.2em" }}
              >
                YOU HAVE ACCESS
              </h2>
              <div
                className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                  scrollSnapType: "x proximity",
                }}
              >
                {ownedForAccess.map((p: { id: string; name: string }) => {
                  const id = p.id as ProductAccessId
                  const copy = PRODUCT_ACCESS_COPY[id]
                  if (!copy) return null
                  return (
                    <div key={p.id} className="scroll-snap-align-start flex-shrink-0">
                      <ProductAccessCard
                        productId={id}
                        name={p.name}
                        subText={copy.subText}
                        ctaLabel={copy.ctaLabel}
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Get More — non-Studio users: mini-product grid */}
          {showGetMore && (
            <section className="pt-6 pb-3">
              <h2
                className="font-serif text-[12px] font-extralight uppercase tracking-[0.2em] text-white/50 pb-6"
                style={{ letterSpacing: "0.2em" }}
              >
                GET MORE COURSES & RESOURCES
              </h2>
              <div className="grid grid-cols-2 gap-4 max-w-[360px]">
                {availableProducts.map((p: { id: string; name: string; price: number }) => (
                  <MiniProductCard
                    key={p.id}
                    productId={p.id}
                    name={p.name}
                    price={p.price}
                    currency="€"
                  />
                ))}
              </div>
            </section>
          )}

          <button
            onClick={() => setSelectedView("courses")}
            className="w-full border border-white/10 rounded-2xl p-8 sm:p-10 text-left bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] hover:border-white/20 transition-all"
          >
            <h2 className="font-serif text-2xl sm:text-3xl tracking-wider text-white mb-3">Browse Courses</h2>
            <p className="text-white/70 text-sm sm:text-base font-light leading-relaxed mb-6">
              Explore our complete library of courses designed to help you master professional photography and personal
              branding
            </p>
            <div className="text-xs tracking-wider uppercase text-white/70">See All Courses →</div>
          </button>

          <button
            onClick={() => setSelectedView("templates")}
            className="w-full border border-white/10 rounded-2xl p-8 sm:p-10 text-left bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] hover:border-white/20 transition-all"
          >
            <h2 className="font-serif text-2xl sm:text-3xl tracking-wider text-white mb-3">Templates</h2>
            <p className="text-white/70 text-sm sm:text-base font-light leading-relaxed mb-6">
              Download professional templates for Canva, PDFs, and more to elevate your brand
            </p>
            <div className="text-xs tracking-wider uppercase text-white/70">Browse Templates →</div>
          </button>

          <button
            onClick={() => setSelectedView("monthly-drops")}
            className="w-full border border-white/10 rounded-2xl p-8 sm:p-10 text-left bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] hover:border-white/20 transition-all"
          >
            <h2 className="font-serif text-2xl sm:text-3xl tracking-wider text-white mb-3">Monthly Drops</h2>
            <p className="text-white/70 text-sm sm:text-base font-light leading-relaxed mb-6">
              Exclusive monthly resources and content drops for Studio Members
            </p>
            <div className="text-xs tracking-wider uppercase text-white/70">View Monthly Drops →</div>
          </button>

          <button
            onClick={() => setSelectedView("flatlay-images")}
            className="w-full border border-white/10 rounded-2xl p-8 sm:p-10 text-left bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] hover:border-white/20 transition-all"
          >
            <h2 className="font-serif text-2xl sm:text-3xl tracking-wider text-white mb-3">Flatlay Images</h2>
            <p className="text-white/70 text-sm sm:text-base font-light leading-relaxed mb-6">
              Professional flatlay images to elevate your content and brand aesthetic
            </p>
            <div className="text-xs tracking-wider uppercase text-white/70">Browse Flatlay Images →</div>
          </button>

          {(inProgressCourses[0] || allCourses[0]) && (
            <div className="border border-white/15 bg-[rgba(255,255,255,0.07)] text-white rounded-2xl p-8 sm:p-10">
              <div className="space-y-6">
                <div>
                  <div className="inline-block px-3 py-1 bg-white/10 border border-white/10 rounded-full text-xs tracking-wider uppercase text-white/70 mb-4">
                    {inProgressCourses[0] ? "Continue Learning" : "Recommended"}
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl tracking-wider mb-3">
                    {(inProgressCourses[0] || allCourses[0])?.title}
                  </h2>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {(inProgressCourses[0] || allCourses[0])?.lesson_count || 0} lessons • {(() => {
                      const duration = (inProgressCourses[0] || allCourses[0])?.total_duration
                      if (!duration || isNaN(Number(duration)) || Number(duration) <= 0) {
                        return "0m"
                      }
                      const hours = Math.floor(Number(duration) / 60)
                      const mins = Number(duration) % 60
                      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
                    })()}
                  </p>
                </div>

                <button
                  onClick={() => handleCourseClick((inProgressCourses[0] || allCourses[0])?.id)}
                  className="w-full bg-white/90 text-[#0b0d10] py-4 rounded-xl text-sm tracking-wider uppercase hover:bg-white transition-all"
                >
                  {inProgressCourses[0] ? "Continue" : "Start Learning"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
