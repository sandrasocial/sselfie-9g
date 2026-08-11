// SSELFIE Studio 3.0 - /app Library (BRIDGE-01 Phase C).
// Surfaces everything she owns (courses with progress, one-time products, weekly drops)
// plus locked previews of what she doesn't. D3: members have every product open, so for an
// active member every catalog entry resolves to owned. Data comes from the same entitlement
// layer Academy uses; links point at the existing /academy and /access routes (v3-native
// rendering of lesson content is a later iteration - surfacing comes first).

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { sql } from "@/lib/db/client"
import { getAcademyHomeState } from "@/app/academy/_lib/course-library"
import { getPublishedVaultCollections } from "@/lib/vault/published-collections"
import { hasFullStudioMembership } from "@/lib/subscription"
import { isAdminEmail } from "@/lib/admin-feature-flags"

export const dynamic = "force-dynamic"

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({
        membershipActive: false,
        courses: [],
        ownedProducts: [],
        lockedProducts: [],
        drops: [],
      })
    }

    const fullMembership = isAdminEmail(user.email) || (await hasFullStudioMembership(String(neonUser.id)))
    if (!fullMembership) {
      return NextResponse.json({ error: "Maya Pro membership required" }, { status: 403 })
    }

    const state = await getAcademyHomeState(String(neonUser.id))
    const vaultMayaIncluded =
      fullMembership
    const membershipActive = state.membershipActive || vaultMayaIncluded

    const [learningPlan] = await sql`
      SELECT goal, recommendation, status, updated_at
      FROM suite_learning_plans
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    // Weekly drops are a membership collection; non-members see the locked empty state.
    let drops: Array<Record<string, unknown>> = []
    let vaultDrops: Awaited<ReturnType<typeof getPublishedVaultCollections>> = []
    if (membershipActive) {
      ;[drops, vaultDrops] = await Promise.all([
        sql`
          SELECT id, title, description, thumbnail_url, month, category, created_at
          FROM academy_monthly_drops
          WHERE status = 'published'
          ORDER BY created_at DESC, order_index ASC
          LIMIT 12
        `,
        getPublishedVaultCollections(),
      ])
    }

    return NextResponse.json({
      membershipActive,
      learningPlan: learningPlan ?? null,
      courses: state.courses.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        lessonCount: c.lessonCount,
        completedLessons: c.completedLessons,
        progressPercentage: c.progressPercentage,
        started: c.started,
        href: c.firstIncompleteLessonId
          ? `/academy/courses/${c.id}/lessons/${c.firstIncompleteLessonId}`
          : `/academy/courses/${c.id}`,
      })),
      ownedProducts: [
        ...(vaultMayaIncluded
          ? [
              {
                id: "vault_maya",
                name: "Vault Maya",
                tagline: "Choose a Vault look, add one selfie and let Maya create it for you.",
                eyebrow: "Included with your SUITE",
                actionLabel: "Open Vault Maya",
                thumbnailUrl:
                  vaultDrops[0]?.heroImage ||
                  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/content-kit/shoots/1785423447575-876892.png",
                accessUrl: "/vault-maya/studio",
              },
            ]
          : []),
        ...state.ownedProducts
          .filter(p => p.id !== "vault_maya")
          .map(p => ({
            id: p.id,
            name: p.name,
            tagline: p.tagline,
            eyebrow: p.eyebrow,
            actionLabel: p.actionLabel,
            thumbnailUrl: p.thumbnailUrl,
            accessUrl: p.accessUrl,
          })),
      ],
      // The membership tile is excluded: the Library's single upgrade CTA covers it.
      lockedProducts: state.lockedProducts
        .filter(p => p.id !== "studio")
        .map(p => ({
          id: p.id,
          eyebrow: p.eyebrow,
          title: p.title,
          description: p.description,
          thumbnailUrl: p.thumbnailUrl,
          href: p.href,
          ctaLabel: p.ctaLabel,
        })),
      drops: [
        ...vaultDrops.map(d => ({
          id: `vault-${d.slug}`,
          title: d.title,
          description: d.moodLine,
          thumbnailUrl: d.heroImage,
          month: d.publishedAt.slice(0, 7),
          category: "Prompt Vault",
          publishedAt: d.publishedAt,
        })),
        ...drops.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description,
          thumbnailUrl: d.thumbnail_url ?? null,
          month: d.month ?? null,
          category: d.category ?? null,
          publishedAt: d.created_at ? new Date(d.created_at as string | Date).toISOString() : null,
        })),
      ],
    })
  } catch (e) {
    console.error("[app-v3 library] load failed:", e)
    return NextResponse.json({ error: "Failed to load library" }, { status: 500 })
  }
}
