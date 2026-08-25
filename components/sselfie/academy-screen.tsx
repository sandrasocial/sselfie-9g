"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import type { AcademyView } from "./types"
import CourseCard from "../academy/course-card"
import CourseDetail from "../academy/course-detail"
import ResourceCard from "../academy/resource-card"
import MiniProductCard from "./mini-product-card"
import { VISIBILITY_MINI_PRODUCT_BY_SLUG } from "@/lib/visibility-products"
import UnifiedLoading from "./unified-loading"
import { useRouter, useSearchParams } from "next/navigation"
import { parseAcademyViewParam } from "@/lib/academy/view-routing"
import { handleCheckoutFailure } from "@/lib/checkout-failure"
import { notifyAnalyticsLogout } from "@/lib/analytics/auth-browser-signal"

const fetcher = async (url: string) => {
  console.log("[v0] Fetching Academy data from:", url)
  try {
    const res = await fetch(url, { credentials: "include" })
    console.log("[v0] Academy fetch response status:", res.status, "for", url)

    const data = await res.json().catch(() => ({}))

    if (res.status === 401 || res.status === 403) {
      console.log("[v0] Academy access-controlled response:", res.status, data)
      return data
    }

    if (!res.ok) {
      console.error("[v0] Academy fetch error:", res.status, data)
      throw new Error(`Failed to fetch: ${res.status}`)
    }

    console.log("[v0] Academy data received from", url, ":", data)
    return data
  } catch (error) {
    console.error("[v0] Academy fetcher error for", url, ":", error)
    throw error
  }
}

const getFriendlyTierName = (tier: string): string => {
  const tierMap: Record<string, string> = {
    sselfie_studio_membership: "Studio",
    academy_purchases: "Academy",
    one_time_session: "One-Time",
    starter: "Starter",
    pro: "Pro",
    elite: "Elite",
  }
  // Strip suffixes like "/2" that some API responses append
  const base = tier.split("/")[0].toLowerCase().trim()
  return tierMap[base] ?? tierMap[tier.toLowerCase().trim()] ?? "Member"
}

type AcademyTier = "starter" | "pro" | "elite"

function normalizeAcademyTier(value: unknown): AcademyTier {
  if (value === "starter" || value === "pro" || value === "elite") {
    return value
  }

  if (
    value === "sselfie_studio_membership" ||
    value === "brand_studio_membership" ||
    value === "one_time_session"
  ) {
    return "elite"
  }

  return "starter"
}

const PRODUCT_ACCESS_COPY: Record<string, { subText: string; ctaLabel: string }> = {
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
  visibility_suite: {
    subText: "What To Say, Show Up, and Get Paid - your full visibility path.",
    ctaLabel: "Open suite",
  },
  prompt_vault: {
    subText: "Your copy-paste editorial AI photoshoot prompts.",
    ctaLabel: "Open vault",
  },
  selfie_to_brand_shoot_system: {
    subText: "Your guided path from one selfie to polished brand images.",
    ctaLabel: "Open system",
  },
  selfie_guide: {
    subText: "Your full selfie training and challenge flow.",
    ctaLabel: "Open guide",
  },
  brand_strategy_pack: {
    subText: "Your personalized brand strategy output.",
    ctaLabel: "Open strategy foundation",
  },
}

const COURSE_PRODUCT_IDS = new Set(["branded_by_sselfie", "editing_masterclass"])
const FEATURED_PRODUCT_IDS = [
  "masterclass",
  "starter_kit",
  "selfie_to_brand_shoot_system",
  "prompt_vault",
  "selfie_guide_bundle",
  "selfie_guide",
  "brand_strategy_pack",
  "what_to_say",
  "show_up",
  "get_paid",
  "ai_photo_prompts",
]

const PRODUCT_VISUALS: Record<string, { image: string; label: string; href?: string }> = {
  masterclass: {
    image: "/academy/sselfie-minimalism/academy-masterclass.jpg",
    label: "Product home",
    href: "/academy/access/masterclass",
  },
  starter_kit: {
    image: "/academy/sselfie-minimalism/academy-starter-kit.jpg",
    label: "Product home",
    href: "/academy/access/starter-kit",
  },
  prompt_vault: {
    image: "/images/ai-prompts/marble-wine-shot-1.jpg",
    label: "Prompt vault",
    href: "/academy/access/prompt-vault",
  },
  selfie_to_brand_shoot_system: {
    image: "/images/ai-prompts/noir-femme-shot-3.png",
    label: "System home",
    href: "/academy/access/selfie-to-brand-shoot",
  },
  selfie_guide_bundle: {
    image: "/academy/sselfie-minimalism/academy-selfie-guide.jpg",
    label: "Product home",
    href: "/academy/access/selfie-guide",
  },
  selfie_guide: {
    image: "/academy/sselfie-minimalism/academy-selfie-guide.jpg",
    label: "Product home",
    href: "/academy/access/selfie-guide",
  },
  brand_strategy_pack: {
    image: "/academy/sselfie-minimalism/academy-brand-strategy.jpg",
    label: "Product home",
    // LEGACY_ACCESS_ONLY: keep direct access for confirmed Brand Strategy Pack buyers.
    href: "/academy/access/brand-strategy",
  },
  what_to_say: {
    image: "/academy/sselfie-minimalism/academy-workbook.jpg",
    label: "Workbook",
    href: "/academy/access/what-to-say",
  },
  show_up: {
    image: "/academy/sselfie-minimalism/academy-workbook.jpg",
    label: "Workbook",
    href: "/academy/access/show-up",
  },
  get_paid: {
    image: "/academy/sselfie-minimalism/academy-workbook.jpg",
    label: "Workbook",
    href: "/academy/access/get-paid",
  },
  ai_photo_prompts: {
    image: "/academy/sselfie-minimalism/academy-studio-resources.jpg",
    label: "Prompt pack",
    href: "/academy/access/ai-photo-prompts",
  },
  visibility_suite: {
    image: "/academy/visibility-suite/hero.png",
    label: "Bundle",
  },
}

const COURSE_VISUALS: Record<string, { image: string; eyebrow: string }> = {
  branded_by_sselfie: {
    image: "/academy/sselfie-minimalism/academy-course.jpg",
    eyebrow: "Course",
  },
  editing_masterclass: {
    image: "/academy/sselfie-minimalism/academy-starter-kit.jpg",
    eyebrow: "Course",
  },
}

const RESOURCE_HUB_CARDS = [
  {
    id: "masterclass-bonus-library",
    title: "Masterclass bonus library",
    description: "Workbooks, downloads, and bonus files from Branded by SSELFIE.",
    cta: "Open library",
    href: "/academy/access/masterclass",
    image: "/academy/sselfie-minimalism/academy-bonus-library.jpg",
    visibleFor: ["masterclass", "branded_by_sselfie"],
  },
  {
    id: "starter-kit-downloads",
    title: "Starter Kit downloads",
    description: "Presets, DNG files, PDFs, and the editing masterclass in one place.",
    cta: "Open downloads",
    href: "/academy/access/starter-kit",
    image: "/academy/sselfie-minimalism/academy-workbook.jpg",
    visibleFor: ["starter_kit"],
  },
  {
    id: "brand-strategy",
    title: "Strategy Foundation",
    description: "Your personal brand output and strategy assets.",
    cta: "Open strategy foundation",
    href: "/academy/access/brand-strategy",
    image: "/academy/sselfie-minimalism/academy-brand-strategy.jpg",
    visibleFor: ["brand_strategy_pack"],
  },
  {
    id: "templates",
    title: "Studio templates",
    description: "Canva and PDF assets for members.",
    cta: "Browse templates",
    view: "templates" as AcademyView,
    image: "/academy/sselfie-minimalism/academy-studio-resources.jpg",
    studioOnly: true,
  },
]

function getProductAccessCopy(product: any) {
  const override = PRODUCT_ACCESS_COPY[product.id]
  if (override) {
    return override
  }

  return {
    subText: product.tagline || product.description || "Ready in your library.",
    ctaLabel: product.deliveryKind === "direct_private" ? "Open now" : "Open product",
  }
}

const academyPrimaryActionClass =
  "rounded-[6px] bg-[color:var(--app-btn-primary-bg)] px-8 py-4 text-sm tracking-[0.18em] uppercase text-[color:var(--app-btn-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-50"

const academyCompactActionClass =
  "rounded-[6px] bg-[color:var(--app-btn-primary-bg)] px-6 py-3 text-sm tracking-[0.18em] uppercase text-[color:var(--app-btn-primary-text)] transition-opacity hover:opacity-90"

const academyBackLinkClass =
  "text-sm tracking-wider uppercase text-[color:var(--app-text-secondary)] transition-colors hover:text-[color:var(--app-text-primary)]"

const academySearchShellClass = "stone-chip rounded-[8px] p-4"

const academyEmptyStateClass = "stone-panel rounded-[16px] p-16 text-center"

const academyPromoCardClass = "stone-panel rounded-[16px] p-8 text-center space-y-6 sm:p-10"

const academyHubCardClass =
  "stone-panel group relative overflow-hidden text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-[color:var(--app-glass-bg)]"

export default function AcademyScreen() {
  const searchParams = useSearchParams()
  const initialAcademyView = parseAcademyViewParam(
    searchParams.get("academy_view") ?? searchParams.get("academyView")
  )
  // Deep-link support: ?academy_course_id=X opens a course, ?academy_workbook=slug opens a workbook.
  // Access gate pages redirect here so everything stays inside the app shell.
  const initialCourseId = searchParams.get("academy_course_id") ?? null
  const initialWorkbookSlug = searchParams.get("academy_workbook") ?? null
  const [selectedView, setSelectedView] = useState<AcademyView>(
    initialCourseId ? "courses" : initialWorkbookSlug ? "workbook" : (initialAcademyView ?? "overview")
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>("all")
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(initialCourseId)
  const [selectedWorkbookSlug, setSelectedWorkbookSlug] = useState<string | null>(initialWorkbookSlug)
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

  useEffect(() => {
    if (!initialCourseId || typeof window === "undefined") return
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete("academy_course_id")
    window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
  }, [initialCourseId])

  useEffect(() => {
    if (!initialWorkbookSlug || typeof window === "undefined") return
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete("academy_workbook")
    window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
  }, [initialWorkbookSlug])

  // Load membership status first so studio-only endpoints can be conditionally gated.
  const { data: myProductsData } = useSWR("/api/academy/my-products", fetcher)
  const hasStudioMembership = myProductsData?.hasStudioMembership ?? false

  const {
    data: coursesData,
    error: coursesError,
    isLoading: coursesLoading,
  } = useSWR("/api/academy/courses", fetcher)
  const {
    data: templatesData,
    error: templatesError,
    isLoading: templatesLoading,
    // Only call if the user is a Studio member - non-members get 403 from this endpoint.
  } = useSWR(hasStudioMembership ? "/api/academy/templates" : null, fetcher)
  const {
    data: monthlyDropsData,
    error: monthlyDropsError,
    isLoading: monthlyDropsLoading,
  } = useSWR("/api/academy/monthly-drops", fetcher)
  const {
    data: flatlayImagesData,
    error: flatlayImagesError,
    isLoading: flatlayImagesLoading,
    // Only call if the user is a Studio member - non-members get 403 from this endpoint.
  } = useSWR(hasStudioMembership ? "/api/academy/flatlay-images" : null, fetcher)
  const { data: myCoursesData } = useSWR("/api/academy/my-courses", fetcher)
  const { data: userInfoData } = useSWR("/api/user/info", fetcher)

  useSWR("/api/user/credits", fetcher, {
    onSuccess: data => setCreditBalance(data?.balance || 0),
  })

  const templatesHasAccess = templatesData?.hasAccess ?? false
  const monthlyDropsHasAccess = monthlyDropsData?.hasAccess ?? false
  const flatlayImagesHasAccess = flatlayImagesData?.hasAccess ?? false
  const userTier = normalizeAcademyTier(
    coursesData?.userTier || (hasStudioMembership ? "sselfie_studio_membership" : userInfoData?.plan || "starter"),
  )
  const allCourses = coursesData?.courses || []
  const templates = templatesData?.templates || []
  const monthlyDrops = monthlyDropsData?.monthlyDrops || []
  const flatlayImages = flatlayImagesData?.flatlayImages || []
  const myCourses = myCoursesData?.courses || []
  const inProgressCourses = myCourses.filter(
    (c: any) => c.progress_percentage > 0 && c.progress_percentage < 100
  )

  const ownedProducts = (myProductsData?.products ?? []).filter(
    (product: { hasAccess: boolean }) => product.hasAccess
  )
  const ownedProductIds = new Set(ownedProducts.map((product: { id: string }) => product.id))
  const hasProductAccess = (productId: string) =>
    hasStudioMembership || ownedProductIds.has(productId)
  const ownedForAccess = ownedProducts
    .filter((product: { id: string }) => !COURSE_PRODUCT_IDS.has(product.id))
    .sort(
      (a: { id: string }, b: { id: string }) =>
        (FEATURED_PRODUCT_IDS.indexOf(a.id) === -1
          ? FEATURED_PRODUCT_IDS.length
          : FEATURED_PRODUCT_IDS.indexOf(a.id)) -
        (FEATURED_PRODUCT_IDS.indexOf(b.id) === -1
          ? FEATURED_PRODUCT_IDS.length
          : FEATURED_PRODUCT_IDS.indexOf(b.id))
    )
  const resourceHubCards = RESOURCE_HUB_CARDS.filter(resource => {
    if (resource.studioOnly) return hasStudioMembership
    return resource.visibleFor?.some(productId => hasProductAccess(productId))
  })
  const canonicalCourses = allCourses.filter((course: any) =>
    ["branded_by_sselfie", "editing_masterclass"].includes(course.product_id)
  )
  /** Products the user can still buy (not owned); from my-products API */
  const availableProducts = myProductsData?.availableProducts ?? []
  /** Show "Get More" section when user does not have Studio and there are products to buy */
  const showGetMore = !hasStudioMembership && availableProducts.length > 0

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
    resourceType: "template" | "monthly_drop" | "flatlay_image"
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
    templates.map((t: any) => ({ id: t.id, title: t.title, category: t.category }))
  )
  console.log("[v0] Selected template category:", selectedTemplateCategory)

  const filteredTemplates = templates.filter((template: any) => {
    const matchesSearch =
      searchQuery === "" ||
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description &&
        template.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory =
      selectedTemplateCategory === "all" || template.category === selectedTemplateCategory

    console.log(
      "[v0] Template:",
      template.title,
      "Category:",
      template.category,
      "Matches category:",
      matchesCategory,
      "Selected:",
      selectedTemplateCategory
    )

    return matchesSearch && matchesCategory
  })

  console.log("[v0] Filtered templates count:", filteredTemplates.length)
  console.log(
    "[v0] Filtered templates:",
    filteredTemplates.map((t: any) => ({ id: t.id, title: t.title, category: t.category }))
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
      image:
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2847%29-kGWMLFs2EnK6NrtqNjsIyS4kfQxer8.jpeg",
    },
    {
      value: "social-media",
      label: "Social Media",
      image:
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2847%29-kGWMLFs2EnK6NrtqNjsIyS4kfQxer8.jpeg",
    },
    {
      value: "email-marketing",
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
      value: "content-creation",
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

  if (selectedView === "templates") {
    if (templatesLoading) {
      return <UnifiedLoading message="Loading templates..." />
    }

    if (templatesError || !templatesHasAccess) {
      return (
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className={`max-w-md ${academyPromoCardClass}`}>
            <div className="space-y-3">
              <h3 className="font-serif text-2xl tracking-wider text-[color:var(--app-text-primary)]">Studio access only</h3>
              <p className="text-sm text-[color:var(--app-text-secondary)] leading-relaxed">
                This library is part of Studio. Upgrade to unlock templates, drops, and flatlays.
              </p>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className={academyPrimaryActionClass}
            >
              {isUpgrading ? "Processing..." : "Upgrade to Studio"}
            </button>
          </div>
        </div>
      )
    }

    if (showCategoryGrid && selectedTemplateCategory === "all") {
      return (
        <div className="space-y-10 pb-32 px-4 sm:px-6 text-[color:var(--app-text-primary)]">
          <div className="pt-8">
            <button onClick={() => setSelectedView("overview")} className={academyBackLinkClass}>
              ← Back
            </button>
          </div>

          <div className="space-y-3">
            <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-[color:var(--app-text-primary)]">
              Template library
            </h1>
            <p className="text-[color:var(--app-text-secondary)] text-base font-light leading-relaxed">
              Pick a category and grab what you need for your next post.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {templateCategories
              .filter(cat => cat.value !== "all")
              .map(category => (
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
                    <h3 className="text-left text-sm sm:text-base font-semibold uppercase tracking-wider text-[color:var(--color-porcelain)]">
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
      <div className="space-y-10 pb-32 px-4 sm:px-6 text-[color:var(--app-text-primary)]">
        <div className="pt-8">
          <button
            onClick={() => {
              setShowCategoryGrid(true)
              setSelectedTemplateCategory("all")
            }}
            className={academyBackLinkClass}
          >
            ← Back to Categories
          </button>
        </div>

        <div className="space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-[color:var(--app-text-primary)]">
            {templateCategories.find(cat => cat.value === selectedTemplateCategory)?.label ||
              "Templates"}
          </h1>
          <p className="text-[color:var(--app-text-secondary)] text-base font-light leading-relaxed">
            Find a template and make it yours.
          </p>
        </div>

        <div className={academySearchShellClass}>
          <input
            type="text"
            placeholder="Search your library..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[color:var(--app-text-primary)] placeholder:text-[color:var(--app-text-muted)] focus:outline-none"
          />
        </div>

        {filteredTemplates.length === 0 ? (
          <div className={academyEmptyStateClass}>
            <p className="text-[color:var(--app-text-secondary)] text-sm">
              No templates match that yet. Try another keyword.
            </p>
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

    if (monthlyDropsError || !monthlyDropsHasAccess) {
      return (
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className={`max-w-md ${academyPromoCardClass}`}>
            <div className="space-y-3">
              <h3 className="font-serif text-2xl tracking-wider text-[color:var(--app-text-primary)]">SUITE access only</h3>
              <p className="text-sm text-[color:var(--app-text-secondary)] leading-relaxed">
                Monthly drops are part of SSELFIE SUITE.
              </p>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className={academyPrimaryActionClass}
            >
              {isUpgrading ? "Processing..." : "Upgrade to Studio"}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-10 pb-32 px-4 sm:px-6 text-[color:var(--app-text-primary)]">
        <div className="pt-8">
          <button onClick={() => setSelectedView("overview")} className={academyBackLinkClass}>
            ← Back
          </button>
        </div>

        <div className="space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-[color:var(--app-text-primary)]">
            Monthly drops
          </h1>
          <p className="text-[color:var(--app-text-secondary)] text-base font-light leading-relaxed">
            Fresh resources curated for your current season.
          </p>
        </div>

        <div className={academySearchShellClass}>
          <input
            type="text"
            placeholder="Search your library..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[color:var(--app-text-primary)] placeholder:text-[color:var(--app-text-muted)] focus:outline-none"
          />
        </div>

        {filteredMonthlyDrops.length === 0 ? (
          <div className={academyEmptyStateClass}>
            <p className="text-[color:var(--app-text-secondary)] text-sm">
              No drops found for that search. Try another phrase.
            </p>
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

    if (flatlayImagesError || !flatlayImagesHasAccess) {
      return (
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className={`max-w-md ${academyPromoCardClass}`}>
            <div className="space-y-3">
              <h3 className="font-serif text-2xl tracking-wider text-[color:var(--app-text-primary)]">SUITE access only</h3>
              <p className="text-sm text-[color:var(--app-text-secondary)] leading-relaxed">
                Flatlay packs are included with SSELFIE SUITE.
              </p>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className={academyPrimaryActionClass}
            >
              {isUpgrading ? "Processing..." : "Upgrade to Studio"}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-10 pb-32 px-4 sm:px-6 text-[color:var(--app-text-primary)]">
        <div className="pt-8">
          <button onClick={() => setSelectedView("overview")} className={academyBackLinkClass}>
            ← Back
          </button>
        </div>

        <div className="space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-[color:var(--app-text-primary)]">
            Flatlay images
          </h1>
          <p className="text-[color:var(--app-text-secondary)] text-base font-light leading-relaxed">
            Ready-to-use flatlays for stories, posts, and promos.
          </p>
        </div>

        <div className={academySearchShellClass}>
          <input
            type="text"
            placeholder="Search your library..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[color:var(--app-text-primary)] placeholder:text-[color:var(--app-text-muted)] focus:outline-none"
          />
        </div>

        {filteredFlatlayImages.length === 0 ? (
          <div className={academyEmptyStateClass}>
            <p className="text-[color:var(--app-text-secondary)] text-sm">
              No flatlays match that yet. Try another keyword.
            </p>
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

  // ── Workbook view - embeds the correct static workbook HTML via iframe ────────
  // Maps product slug → the static workbook URL (served from /public/academy/*)
  const WORKBOOK_IFRAME_URLS: Record<string, string> = {
    "what-to-say": "/academy/what_to_say/",
    "show-up": "/academy/show_up/",
    "get-paid": "/academy/get_paid/",
    "visibility-suite": "/academy/access/visibility-suite",
  }

  if (selectedView === "workbook" && selectedWorkbookSlug) {
    const iframeSrc = WORKBOOK_IFRAME_URLS[selectedWorkbookSlug]
    if (iframeSrc) {
      return (
        <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
          <div className="flex items-center gap-4 px-1 py-3 shrink-0">
            <button
              type="button"
              onClick={() => { setSelectedView("overview"); setSelectedWorkbookSlug(null) }}
              className="font-['Inter'] text-xs font-semibold uppercase tracking-[0.5em] text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text-primary)] transition-colors"
            >
              ← Academy
            </button>
          </div>
          <iframe
            src={iframeSrc}
            title="Workbook"
            className="flex-1 w-full border-0"
            style={{ borderTop: "1px solid var(--app-border, #e5e5e5)" }}
          />
        </div>
      )
    }
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
          <div className={academyPromoCardClass}>
            <p className="text-sm text-[color:var(--app-text-secondary)]">We couldn&apos;t load the courses right now</p>
            <button onClick={() => window.location.reload()} className={academyCompactActionClass}>
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-10 pb-32 px-4 sm:px-6 text-[color:var(--app-text-primary)]">
        <div className="pt-8">
          <button onClick={() => setSelectedView("overview")} className={academyBackLinkClass}>
            ← Back
          </button>
        </div>

        <div className="space-y-3">
          <h1 className="font-serif text-4xl sm:text-5xl tracking-wider text-[color:var(--app-text-primary)]">Courses</h1>
          <p className="text-[color:var(--app-text-secondary)] text-base font-light leading-relaxed">
            Learn at your own pace with our curated collection
          </p>
        </div>

        <div className={academySearchShellClass}>
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[color:var(--app-text-primary)] placeholder:text-[color:var(--app-text-muted)] focus:outline-none"
          />
        </div>

        {inProgressCourses.length > 0 && (
          <div className="space-y-6">
            <h2 className="font-serif text-2xl tracking-wider text-[color:var(--app-text-primary)]">Continue Learning</h2>
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
          <h2 className="font-serif text-2xl tracking-wider text-[color:var(--app-text-primary)]">All Courses</h2>
          {filteredCourses.length === 0 ? (
            <div className={academyEmptyStateClass}>
              <p className="text-[color:var(--app-text-secondary)] text-sm">No courses found. Try adjusting your search.</p>
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
        notifyAnalyticsLogout()
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
    <div className="pb-32 text-[color:var(--app-text-primary)]">
      {showNavMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setShowNavMenu(false)}
          />

          <div className="stone-shell-panel fixed top-0 right-0 bottom-0 z-50 flex w-80 animate-in slide-in-from-right flex-col border-l border-[color:var(--app-glass-border)] shadow-[var(--app-shadow-soft)] duration-300">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-[color:var(--app-glass-border)] px-6 py-4">
              <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-[color:var(--app-text-primary)]">
                Menu
              </h3>
              <button
                onClick={() => setShowNavMenu(false)}
                className="stone-chip inline-flex h-8 items-center justify-center rounded-[6px] px-3 text-[11px] tracking-[0.12em] uppercase text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)]"
                aria-label="Close menu"
              >
                Close
              </button>
            </div>

            <div className="flex-shrink-0 border-b border-[color:var(--app-glass-border)] px-6 py-6">
              <div className="text-[10px] tracking-[0.15em] uppercase font-light text-[color:var(--app-text-muted)] mb-2">
                Your Credits
              </div>
              <div className="text-3xl font-serif font-extralight text-[color:var(--app-text-primary)] tabular-nums">
                {creditBalance.toFixed(1)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 py-2">
              <button
                onClick={() => handleNavigation("studio")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-[color:var(--app-btn-secondary-bg)] transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-[color:var(--app-text-muted)]">
                  Studio
                </span>
                <span className="text-sm font-medium text-[color:var(--app-text-secondary)]">Studio</span>
              </button>
              <button
                onClick={() => handleNavigation("training")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-[color:var(--app-btn-secondary-bg)] transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-[color:var(--app-text-muted)]">Train</span>
                <span className="text-sm font-medium text-[color:var(--app-text-secondary)]">Training</span>
              </button>
              <button
                onClick={() => handleNavigation("maya")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-[color:var(--app-btn-secondary-bg)] transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-[color:var(--app-text-muted)]">Chat</span>
                <span className="text-sm font-medium text-[color:var(--app-text-secondary)]">Maya</span>
              </button>
              <button
                onClick={() => handleNavigation("gallery")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-[color:var(--app-btn-secondary-bg)] transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-[color:var(--app-text-muted)]">Media</span>
                <span className="text-sm font-medium text-[color:var(--app-text-secondary)]">Gallery</span>
              </button>
              {/* B-Roll moved to Maya Videos tab */}
              <button
                onClick={() => {
                  handleNavigation("maya")
                  setTimeout(() => {
                    window.location.hash = "#maya/videos"
                  }, 100)
                }}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-[color:var(--app-btn-secondary-bg)] transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-[color:var(--app-text-muted)]">Video</span>
                <span className="text-sm font-medium text-[color:var(--app-text-secondary)]">Videos</span>
              </button>
              <button
                onClick={() => handleNavigation("academy")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left bg-[color:var(--app-btn-secondary-bg)] border-l-2 border-[color:var(--app-text-primary)]"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-[color:var(--app-text-primary)]">Learn</span>
                <span className="text-sm font-medium text-[color:var(--app-text-primary)]">Academy</span>
              </button>
              <button
                onClick={() => handleNavigation("profile")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-[color:var(--app-btn-secondary-bg)] transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-[color:var(--app-text-muted)]">
                  Profile
                </span>
                <span className="text-sm font-medium text-[color:var(--app-text-secondary)]">Profile</span>
              </button>
              <button
                onClick={() => handleNavigation("settings")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-[color:var(--app-btn-secondary-bg)] transition-colors touch-manipulation"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-[color:var(--app-text-muted)]">Prefs</span>
                <span className="text-sm font-medium text-[color:var(--app-text-secondary)]">Settings</span>
              </button>
            </div>

            <div className="flex-shrink-0 border-t border-[color:var(--app-glass-border)] px-6 py-4">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-[6px] text-sm font-medium text-red-700 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </>
      )}

      <div className="px-4 pt-16 sm:px-6">
        <div className="stone-shell-panel overflow-hidden rounded-[20px]">
          <section className="grid min-h-[360px] lg:grid-cols-[1fr_0.78fr]">
            <div className="flex flex-col justify-between gap-10 p-6 sm:p-8 lg:p-10">
              <div className="space-y-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--app-text-muted)]">
                  Maya Academy
                </p>
                <h1 className="max-w-2xl font-serif text-4xl leading-[0.98] tracking-wider text-[color:var(--app-text-primary)] sm:text-6xl">
                  Your Academy hub.
                </h1>
                <p className="max-w-xl text-sm leading-7 text-[color:var(--app-text-secondary)] sm:text-base">
                  Product homes, video courses, and downloads are separated so you always know where
                  you are.
                </p>
              </div>

              <div className="grid max-w-2xl grid-cols-3 border-y border-[color:var(--app-glass-border)]">
                <div className="min-w-0 overflow-hidden border-r border-[color:var(--app-glass-border)] py-4 pr-3">
                  <div className="text-[9px] uppercase tracking-[0.22em] text-[color:var(--app-text-muted)]">Plan</div>
                  <div className="mt-1.5 truncate font-serif text-base text-[color:var(--app-text-primary)] sm:text-lg">
                    {getFriendlyTierName(userTier)}
                  </div>
                </div>
                <div className="min-w-0 overflow-hidden border-r border-[color:var(--app-glass-border)] px-3 py-4">
                  <div className="text-[9px] uppercase tracking-[0.22em] text-[color:var(--app-text-muted)]">
                    Completed
                  </div>
                  <div className="mt-1.5 font-serif text-base text-[color:var(--app-text-primary)] sm:text-lg">
                    {completedCoursesCount}/{totalEnrolledCourses}
                  </div>
                </div>
                <div className="min-w-0 overflow-hidden py-4 pl-3">
                  <div className="text-[9px] uppercase tracking-[0.22em] text-[color:var(--app-text-muted)]">
                    In progress
                  </div>
                  <div className="mt-1.5 font-serif text-base text-[color:var(--app-text-primary)] sm:text-lg">
                    {inProgressCourses.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative min-h-[320px] overflow-hidden">
              <img
                src="/images/selfie-guide/notebook-window-closeup.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-obsidian)_18%,transparent)_0%,color-mix(in_srgb,var(--color-obsidian)_42%,transparent)_100%)]" />
            </div>
          </section>

          <div className="space-y-14 px-6 py-10 sm:px-10 lg:px-12">
            {ownedForAccess.length > 0 && (
              <section className="space-y-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--app-text-muted)]">
                      Start here
                    </p>
                    <h2 className="mt-2 font-serif text-3xl text-[color:var(--app-text-primary)]">Your products</h2>
                  </div>
                  <p className="max-w-md text-sm leading-6 text-[color:var(--app-text-secondary)]">
                    Product homes hold the downloads, bonuses, and next steps for what you bought.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {ownedForAccess.map((product: any) => {
                    const copy = getProductAccessCopy(product)
                    const visual = PRODUCT_VISUALS[product.id]
                    const href = visual?.href || product.accessUrl
                    // Workbook products open directly in-app without a page navigation
                    // Individual workbooks (what-to-say, show-up, get-paid) + the Visibility Suite bundle hub
                    const workbookSlug =
                      (product.slug && VISIBILITY_MINI_PRODUCT_BY_SLUG[product.slug]) ? product.slug :
                      (product.id === "visibility_suite") ? "visibility-suite" :
                      null
                    const handleClick = workbookSlug
                      ? () => { setSelectedWorkbookSlug(workbookSlug); setSelectedView("workbook") }
                      : () => href && router.push(href)
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={handleClick}
                        className={`${academyHubCardClass} min-h-[260px]`}
                      >
                        <img
                          src={
                            visual?.image ||
                            "/academy/sselfie-minimalism/academy-studio-resources.jpg"
                          }
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-obsidian)_6%,transparent)_0%,color-mix(in_srgb,var(--color-obsidian)_82%,transparent)_100%)]" />
                        <div className="relative flex min-h-[260px] flex-col justify-end p-6 text-[color:var(--color-porcelain)]">
                          <span className="mb-4 w-fit rounded-[4px] border border-[color:var(--glass-border)] bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-whisper)]">
                            {visual?.label || "Product"}
                          </span>
                          <h3 className="font-serif text-3xl leading-tight text-[color:var(--color-porcelain)]">
                            {product.name}
                          </h3>
                          <p className="mt-2 max-w-sm text-sm leading-6 text-[color:var(--color-whisper)]">
                            {copy.subText}
                          </p>
                          <span className="mt-5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-porcelain)]">
                            {copy.ctaLabel} →
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--app-text-muted)]">Courses</p>
                  <h2 className="mt-2 font-serif text-3xl text-[color:var(--app-text-primary)]">Video lessons</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedView("courses")}
                  className="w-fit rounded-[6px] border border-[color:var(--app-glass-border)] px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)] transition hover:bg-[color:var(--app-btn-secondary-bg)] hover:text-[color:var(--app-text-primary)]"
                >
                  Open all courses →
                </button>
              </div>

              {canonicalCourses.length === 0 ? (
                <div className="stone-panel rounded-[16px] p-8 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                  No video courses are active for this account yet.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {canonicalCourses.map((course: any) => {
                    const visual =
                      COURSE_VISUALS[course.product_id] || COURSE_VISUALS.branded_by_sselfie
                    const enrolledCourse = myCourses.find((c: any) => c.id === course.id)
                    return (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => {
                          setSelectedView("courses")
                          handleCourseClick(String(course.id))
                        }}
                        className={`${academyHubCardClass} grid min-h-[230px] md:grid-cols-[0.9fr_1.1fr]`}
                      >
                        <div className="relative min-h-[180px] overflow-hidden">
                          <img
                            src={visual.image}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                          />
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,color-mix(in_srgb,var(--color-obsidian)_18%,transparent)_100%)]" />
                        </div>
                        <div className="flex flex-col justify-between p-6">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--app-text-muted)]">
                              {visual.eyebrow}
                            </p>
                            <h3 className="mt-3 font-serif text-3xl leading-tight text-[color:var(--app-text-primary)]">
                              {course.title}
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                              {course.description || "Step-by-step lessons with Sandra."}
                            </p>
                          </div>
                          <div className="mt-6 flex items-center justify-between border-t border-[color:var(--app-glass-border)] pt-4">
                            <span className="text-xs text-[color:var(--app-text-muted)]">
                              {course.lesson_count || course.total_lessons || 0} lessons
                              {enrolledCourse?.progress_percentage
                                ? ` • ${enrolledCourse.progress_percentage}%`
                                : ""}
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--app-text-primary)]">
                              Open course →
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            {resourceHubCards.length > 0 && (
              <section className="space-y-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--app-text-muted)]">Resources</p>
                  <h2 className="mt-2 font-serif text-3xl text-[color:var(--app-text-primary)]">Downloads and bonuses</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {resourceHubCards.map(resource => (
                    <button
                      key={resource.id}
                      type="button"
                      onClick={() =>
                        resource.view ? setSelectedView(resource.view) : router.push(resource.href)
                      }
                      className={`${academyHubCardClass} min-h-[240px]`}
                    >
                      <img
                        src={resource.image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-obsidian)_10%,transparent)_0%,color-mix(in_srgb,var(--color-obsidian)_84%,transparent)_100%)]" />
                      <div className="relative flex min-h-[240px] flex-col justify-end p-5 text-[color:var(--color-porcelain)]">
                        <h3 className="font-serif text-2xl leading-tight">{resource.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--color-whisper)]">
                          {resource.description}
                        </p>
                        <span className="mt-5 text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-porcelain)]">
                          {resource.cta} →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {showGetMore && (
              <section className="space-y-5 border-t border-[color:var(--app-glass-border)] pt-10">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--app-text-muted)]">Add more</p>
                  <h2 className="mt-2 font-serif text-3xl text-[color:var(--app-text-primary)]">Available products</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-[380px]">
                  {availableProducts.map(
                    (p: { id: string; name: string; price: number; purchaseUrl: string }) => (
                      <MiniProductCard
                        key={p.id}
                        productId={p.id}
                        name={p.name}
                        price={p.price ?? 0}
                        href={p.purchaseUrl}
                        currency="€"
                      />
                    )
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
