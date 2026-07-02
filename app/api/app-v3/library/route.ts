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

    const state = await getAcademyHomeState(String(neonUser.id))

    // Weekly drops are a membership collection; non-members see the locked empty state.
    let drops: Array<Record<string, unknown>> = []
    let vaultDrops: Awaited<ReturnType<typeof getPublishedVaultCollections>> = []
    if (state.membershipActive) {
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
      membershipActive: state.membershipActive,
      courses: state.courses.map((c) => ({
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
      ownedProducts: state.ownedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        eyebrow: p.eyebrow,
        actionLabel: p.actionLabel,
        thumbnailUrl: p.thumbnailUrl,
        accessUrl: p.accessUrl,
      })),
      // The membership tile is excluded: the Library's single upgrade CTA covers it.
      lockedProducts: state.lockedProducts
        .filter((p) => p.id !== "studio")
        .map((p) => ({
          id: p.id,
          eyebrow: p.eyebrow,
          title: p.title,
          description: p.description,
          thumbnailUrl: p.thumbnailUrl,
          href: p.href,
          ctaLabel: p.ctaLabel,
        })),
      drops: [
        ...vaultDrops.map((d) => ({
          id: `vault-${d.slug}`,
          title: d.title,
          description: d.moodLine,
          thumbnailUrl: d.heroImage,
          month: d.publishedAt.slice(0, 7),
          category: "Prompt Vault",
          publishedAt: d.publishedAt,
        })),
        ...drops.map((d) => ({
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
