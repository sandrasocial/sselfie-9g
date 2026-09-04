import "server-only"

import { redirect } from "next/navigation"

import { getAcademyEntitlementState, userHasAcademyProductAccess } from "@/lib/academy-entitlements"
import { createServerClient } from "@/lib/supabase/server"
import {
  getCourseWithLessons,
  getCourses,
  getUserCourseProgress,
  type AcademyLesson,
} from "@/lib/data/academy"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getLessonContent, type CourseLesson } from "@/app/academy/_lib/client-utils"
import type { AcademyResolvedCatalogEntry } from "@/lib/academy-entitlements"

export type LibraryCourse = {
  id: number
  productId: string
  title: string
  description: string | null
  orderIndex: number
  lessonCount: number
  totalDurationSeconds: number
  progressPercentage: number
  completedLessons: number
  started: boolean
  firstIncompleteLessonId: number | null
}

export type CourseDetail = {
  id: number
  title: string
  description: string | null
  productId: string
  lessonCount: number
  totalDurationSeconds: number
  completedLessons: number
  progressPercentage: number
  firstIncompleteLessonId: number | null
  lessons: CourseLesson[]
}

export type AcademyHomeLink = {
  href: string
  label: string
}

export type OwnedLibraryProduct = Pick<
  AcademyResolvedCatalogEntry,
  "id" | "name" | "tagline" | "description" | "accessUrl" | "purchaseUrl" | "thumbnailUrl" | "type"
> & {
  eyebrow: string
  actionLabel: string
}

export type AcademyHomeState = {
  hasAccess: boolean
  membershipActive: boolean
  courses: LibraryCourse[]
  ownedProducts: OwnedLibraryProduct[]
  nextStep: {
    eyebrow: string
    title: string
    description: string
    href: string
    ctaLabel: string
  } | null
  lockedProducts: Array<{
    id: string
    eyebrow: string
    title: string
    description: string
    thumbnailUrl: string | null
    href: string
    ctaLabel: string
  }>
  hero: {
    eyebrow: string
    title: string
    description: string
    primaryLink: AcademyHomeLink | null
    secondaryLink: AcademyHomeLink | null
  }
  mayaCard: {
    eyebrow: string
    title: string
    description: string
    href: string
    ctaLabel: string
  } | null
  implementationPath: Array<{
    step: string
    title: string
    description: string
    href: string
    ctaLabel: string
    status: "start" | "next" | "later"
  }>
}

export async function requireAcademyPageUser(redirectPath: string) {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(redirectPath)}`)
  }

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(redirectPath)}`)
  }

  return {
    authUser,
    neonUser: {
      id: String(neonUser.id),
      email: neonUser.email,
    },
  }
}

export function getTotalDurationSeconds(lessons: AcademyLesson[] | undefined): number {
  return (lessons || []).reduce((sum, lesson) => sum + Number(lesson.duration_seconds || 0), 0)
}

export async function getAccessibleLibraryCourses(userId: string): Promise<{
  hasAccess: boolean
  courses: LibraryCourse[]
}> {
  const [courses, entitlementState] = await Promise.all([
    getCourses(),
    getAcademyEntitlementState(userId),
  ])

  const accessibleProductIds = new Set(entitlementState.accessibleProductIds)
  const visibleCourses = courses.filter(
    course => typeof course.product_id === "string" && accessibleProductIds.has(course.product_id)
  )

  const enrichedCourses = await Promise.all(
    visibleCourses.map(async course => {
      const [courseWithLessons, progressData] = await Promise.all([
        getCourseWithLessons(course.id),
        getUserCourseProgress(userId, course.id),
      ])

      const lessons = courseWithLessons?.lessons || []
      const lessonCount = lessons.length
      const totalDurationSeconds = getTotalDurationSeconds(lessons)
      const completedLessonIds = new Set(
        (progressData?.lessonProgress || [])
          .filter((lessonProgress: Record<string, unknown>) => lessonProgress.status === "completed")
          .map((lessonProgress: Record<string, unknown>) => Number(lessonProgress.lesson_id))
      )
      const completedLessons = completedLessonIds.size
      const firstIncompleteLessonId =
        lessons.find(lesson => !completedLessonIds.has(lesson.id))?.id || lessons[0]?.id || null

      return {
        id: course.id,
        productId: course.product_id!,
        title: course.title,
        description: course.description,
        orderIndex: course.order_index,
        lessonCount,
        totalDurationSeconds,
        progressPercentage: Number(progressData?.enrollment?.progress_percentage || 0),
        completedLessons,
        started:
          completedLessons > 0 || Number(progressData?.enrollment?.progress_percentage || 0) > 0,
        firstIncompleteLessonId,
      } satisfies LibraryCourse
    })
  )

  return {
    hasAccess: entitlementState.membershipActive || enrichedCourses.length > 0,
    courses: enrichedCourses.sort((a, b) => a.orderIndex - b.orderIndex),
  }
}

function getCourseHref(course: Pick<LibraryCourse, "id" | "firstIncompleteLessonId">): string {
  return course.firstIncompleteLessonId
    ? `/academy/courses/${course.id}/lessons/${course.firstIncompleteLessonId}`
    : `/academy/courses/${course.id}`
}

const SUITE_PRODUCT_IDS = ["what_to_say", "show_up", "get_paid"] as const

function getOwnedProductEyebrow(productId: string): string {
  switch (productId) {
    case "selfie_to_brand_shoot_system":
      return "Selfie to Brand Shoot"
    case "starter_kit":
      return "Starter Kit"
    case "masterclass":
      return "Masterclass"
    case "selfie_guide":
      return "Selfie Guide"
    case "brand_strategy_pack":
      return "Strategy Foundation"
    case "what_to_say":
      return "Message Clarity"
    case "show_up":
      return "Content System"
    case "get_paid":
      return "Monetisation"
    default:
      return "Owned"
  }
}

function getOwnedProductActionLabel(productId: string): string {
  switch (productId) {
    case "selfie_to_brand_shoot_system":
      return "Open System"
    case "starter_kit":
      return "Open Kit"
    case "masterclass":
      return "Open Library"
    case "selfie_guide":
      return "Open Guide"
    case "brand_strategy_pack":
      return "Start Strategy"
    case "what_to_say":
    case "show_up":
    case "get_paid":
      return "Open Suite"
    default:
      return "Open"
  }
}

function getSuiteProductAccessUrl(productId: string): string {
  if (productId === "what_to_say") return "/academy/what_to_say"
  if (productId === "show_up") return "/academy/show_up"
  if (productId === "get_paid") return "/academy/get_paid"
  return "/academy/access/visibility-suite"
}

export function getMasterclassImplementationPath({
  hasBrandStrategyAccess,
  primaryCourseHref,
}: {
  hasBrandStrategyAccess: boolean
  primaryCourseHref: string
}): AcademyHomeState["implementationPath"] {
  return [
    {
      step: "01",
      title: "Clarify your offer",
      description:
        "Start with your strategy foundation so you know who you help, what you sell, and what your content needs to make clear.",
      href: hasBrandStrategyAccess ? "/academy/access/brand-strategy" : "/academy/access/masterclass",
      ctaLabel: hasBrandStrategyAccess ? "Open Strategy Foundation" : "Open Masterclass",
      status: "start",
    },
    {
      step: "02",
      title: "Move through the lessons",
      description:
        "Use the Masterclass for visibility, confidence, content structure, and the weekly rhythm that supports your offer.",
      href: primaryCourseHref,
      ctaLabel: "Open Lessons",
      status: "next",
    },
    {
      step: "03",
      title: "Publish for 30 days",
      description:
        "Turn the work into action: posts, simple calls to action, follow-up conversations, and a rhythm you can measure.",
      href: "/academy",
      ctaLabel: "Use The Plan",
      status: "later",
    },
  ]
}

export async function getAcademyHomeState(userId: string): Promise<AcademyHomeState> {
  const [{ hasAccess: hasCourseAccess, courses }, entitlementState] = await Promise.all([
    getAccessibleLibraryCourses(userId),
    getAcademyEntitlementState(userId),
  ])

  const explicitIds = new Set(entitlementState.explicitProductIds)
  const accessibleIds = new Set(entitlementState.accessibleProductIds)
  const membershipActive = entitlementState.membershipActive

  const ownedProducts = entitlementState.catalog
    .filter(
      product =>
        product.hasAccess &&
        (product.deliveryKind !== "academy_course" ||
          (SUITE_PRODUCT_IDS as readonly string[]).includes(product.id)) &&
        product.deliveryKind !== "collection" &&
        product.id !== "selfie_guide_bundle"
    )
    .map(product => ({
      id: product.id,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      accessUrl: (SUITE_PRODUCT_IDS as readonly string[]).includes(product.id)
        ? getSuiteProductAccessUrl(product.id)
        : product.accessUrl,
      purchaseUrl: product.purchaseUrl,
      thumbnailUrl: product.thumbnailUrl,
      type: product.type,
      eyebrow: getOwnedProductEyebrow(product.id),
      actionLabel: getOwnedProductActionLabel(product.id),
    }))

  const hasStarterKit = accessibleIds.has("starter_kit")
  const hasMasterclass =
    explicitIds.has("masterclass") ||
    accessibleIds.has("masterclass") ||
    accessibleIds.has("branded_by_sselfie") ||
    accessibleIds.has("editing_masterclass")
  const hasDirectGuide =
    accessibleIds.has("selfie_guide") || accessibleIds.has("selfie_guide_bundle")

  const primaryCourse = courses.find(course => course.started) || courses[0] || null
  const primaryOwnedProduct = ownedProducts[0] || null
  const hasAccess = hasCourseAccess || ownedProducts.length > 0
  const primaryCourseHref = primaryCourse ? getCourseHref(primaryCourse) : "/academy"
  const implementationPath = hasMasterclass
    ? getMasterclassImplementationPath({
        hasBrandStrategyAccess: accessibleIds.has("brand_strategy_pack"),
        primaryCourseHref,
      })
    : []

  let heroDescription = "Everything you own lives here. Start where it feels easiest."
  let primaryLink: AcademyHomeLink | null = null
  let secondaryLink: AcademyHomeLink | null = null

  if (primaryCourse) {
    if (hasMasterclass && accessibleIds.has("brand_strategy_pack")) {
      heroDescription =
        "Your Masterclass home now holds the course path, strategy foundation, bonuses, workbooks, and presets in one place."
      primaryLink = {
        href: "/academy/access/masterclass",
        label: "Open Masterclass",
      }
      secondaryLink = {
        href: "/academy/access/brand-strategy",
        label: "Strategy Foundation",
      }
    } else {
      heroDescription = primaryCourse.started
        ? "Pick up where you left off and keep moving through your content."
        : "Start with your first lesson and build momentum one step at a time."
      primaryLink = {
        href: primaryCourseHref,
        label: primaryCourse.started ? "Continue Lesson" : "Start Your Course",
      }
    }
  } else if (primaryOwnedProduct) {
    heroDescription =
      primaryOwnedProduct.id === "selfie_to_brand_shoot_system"
        ? "Your Selfie to Brand Shoot System is ready. Start with one source selfie, choose one signature visual world, then let Maya help you build the prompts."
        : primaryOwnedProduct.id === "starter_kit"
        ? "Your Starter Kit is ready. Start with the quick win and then move into the fuller method."
        : "Your paid content is ready inside SSELFIE."
    primaryLink = {
      href: primaryOwnedProduct.accessUrl,
      label: primaryOwnedProduct.actionLabel,
    }
  }

  if (membershipActive) {
    secondaryLink = secondaryLink || {
      href: "/studio?tab=maya",
      label: "Open Maya",
    }
  }

  let nextStep: AcademyHomeState["nextStep"] = null

  if (!membershipActive && hasMasterclass) {
    nextStep = {
      eyebrow: "Next Step",
      title: "Activate the SUITE",
      description:
        "You have the method. The SUITE is the AI layer that helps you execute faster with Maya, Feed Planner, and image generation.",
      href: "/join/studio",
      ctaLabel: "Join the SUITE",
    }
  } else if (hasStarterKit) {
    nextStep = {
      eyebrow: "Next Step",
      title: "Go deeper with the Masterclass",
      description:
        "Starter Kit gets you the first result. The Masterclass gives you the full system for light, pose, edit, post, and repeat.",
      href: "/masterclass",
      ctaLabel: "See Masterclass",
    }
  } else if (hasDirectGuide) {
    nextStep = {
      eyebrow: "Next Step",
      title: "Turn this into a real result",
      description:
        "The Starter Kit is the fastest paid step after the guide: presets, quick-start, and a cleaner path into the full method.",
      href: "/starter-kit",
      ctaLabel: "See Starter Kit",
    }
  }

  const lockedProducts: AcademyHomeState["lockedProducts"] = []
  const catalogById = new Map(entitlementState.catalog.map(product => [product.id, product]))

  if (!hasStarterKit) {
    lockedProducts.push({
      id: "starter_kit",
      eyebrow: "$37 one-time",
      title: "Starter Kit",
      description: "Presets, quick-start, and the first practical step after the guide.",
      thumbnailUrl: catalogById.get("starter_kit")?.thumbnailUrl ?? null,
      href: "/starter-kit",
      ctaLabel: "See Starter Kit",
    })
  }

  if (!hasMasterclass) {
    lockedProducts.push({
      id: "masterclass",
      eyebrow: "$147 one-time",
      title: "Selfie Masterclass",
      description: "The complete method, already waiting inside Academy once you unlock it.",
      thumbnailUrl: catalogById.get("masterclass")?.thumbnailUrl ?? null,
      href: "/masterclass",
      ctaLabel: "See Masterclass",
    })
  }

  if (!membershipActive) {
    lockedProducts.push({
      id: "studio",
      eyebrow: "€97 / month",
      title: "SSELFIE SUITE",
      description:
        "Maya, Feed Planner, and your AI execution layer when you're ready for the advanced step.",
      thumbnailUrl: "/images/email/studio-visual-workspace.jpg",
      href: "/join/studio",
      ctaLabel: "Join the SUITE",
    })
  }

  const mayaCard =
    membershipActive || hasStarterKit || hasMasterclass || hasDirectGuide
      ? membershipActive
        ? {
            eyebrow: "Maya",
            title: "Your AI layer is live",
            description:
              "Maya already knows your brand context. Use her to create faster without starting from a blank page.",
            href: "/studio?tab=maya",
            ctaLabel: "Open Maya",
          }
        : {
            eyebrow: "Maya",
            title: "Maya lives inside the SUITE",
            description:
              "When you want AI help with image generation, planning, and execution, the SUITE is the next layer.",
            href: "/join/studio",
            ctaLabel: "See the SUITE",
          }
      : null

  return {
    hasAccess,
    membershipActive,
    courses,
    ownedProducts,
    nextStep,
    lockedProducts: lockedProducts.slice(0, 2),
    hero: {
      eyebrow: "My Library",
      title: "Your SSELFIE home.",
      description: heroDescription,
      primaryLink,
      secondaryLink,
    },
    mayaCard,
    implementationPath,
  }
}

export async function getAccessibleCourseDetail(
  userId: string,
  courseId: number
): Promise<CourseDetail | null> {
  const course = await getCourseWithLessons(courseId)
  if (!course?.product_id) {
    return null
  }

  const hasAccess = await userHasAcademyProductAccess(userId, course.product_id)
  if (!hasAccess) {
    return null
  }

  const progressData = await getUserCourseProgress(userId, courseId)
  const completedLessonIds = new Set(
    (progressData?.lessonProgress || [])
      .filter((lessonProgress: Record<string, unknown>) => lessonProgress.status === "completed")
      .map((lessonProgress: Record<string, unknown>) => Number(lessonProgress.lesson_id))
  )
  const firstIncompleteLessonId =
    course.lessons?.find(lesson => !completedLessonIds.has(lesson.id))?.id ||
    course.lessons?.[0]?.id ||
    null

  const lessons = (course.lessons || []).map(lesson => ({
    ...lesson,
    durationSeconds: Number(lesson.duration_seconds || 0),
    content: getLessonContent(lesson.content),
    completed: completedLessonIds.has(lesson.id),
    current: false,
    startHere: lesson.id === firstIncompleteLessonId,
  }))

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    productId: course.product_id,
    lessonCount: lessons.length,
    totalDurationSeconds: getTotalDurationSeconds(lessons),
    completedLessons: completedLessonIds.size,
    progressPercentage: Number(progressData?.enrollment?.progress_percentage || 0),
    firstIncompleteLessonId,
    lessons,
  }
}
