import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { sql } from "@/lib/db/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNeonUserByEmail, getOrCreateNeonUser } from "@/lib/user-mapping"
import { ACADEMY_PRODUCTS } from "@/lib/products"
import { generateShopifyMigrationEmail } from "@/lib/email/templates/shopify-migration-welcome"
import { sendEmail } from "@/lib/email/send-email"

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

function unauthorized(error?: string) {
  return NextResponse.json(
    { error: error || "Admin access required" },
    { status: error === "Not authenticated" ? 401 : 403 },
  )
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return unauthorized(adminCheck.error)
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string
    courseId?: string
    reason?: string
  }

  const email = body.email?.trim().toLowerCase() || ""
  const courseId = body.courseId?.trim() || ""
  const reason = body.reason?.trim() || ""

  if (!email || !email.includes("@")) {
    return badRequest("Valid email is required")
  }

  if (!courseId || !(courseId in ACADEMY_PRODUCTS)) {
    return badRequest("Valid courseId is required")
  }

  if (!reason) {
    return badRequest("Reason is required")
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const academyProduct = ACADEMY_PRODUCTS[courseId as keyof typeof ACADEMY_PRODUCTS]

  let userId = ""
  let wasCreated = false
  let passwordSetupLink: string | undefined
  let firstName = email.split("@")[0]

  try {
    const existingNeonUser = await getNeonUserByEmail(email)

    if (existingNeonUser) {
      userId = existingNeonUser.id
      firstName = existingNeonUser.first_name || existingNeonUser.display_name || firstName
    } else {
      const supabaseAdmin = createAdminClient()
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

      if (listError) {
        console.error("[v0] Error listing users:", listError)
      }

      const existingUser = existingUsers?.users?.find((user) => user.email?.toLowerCase() === email)

      if (existingUser) {
        const neonUser = await getOrCreateNeonUser(existingUser.id, email, null)
        userId = neonUser.id
        firstName = neonUser.first_name || neonUser.display_name || firstName
      } else {
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            created_via: "admin_grant_access",
          },
        })

        if (createError) {
          console.error("[v0] Supabase create user error details:", {
            message: createError.message,
            status: createError.status,
            name: createError.name,
            code: (createError as any).code,
          })
          throw createError
        }

        if (!createData.user) {
          throw new Error("No user data returned from Supabase create")
        }

        wasCreated = true

        const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: `${siteUrl}/auth/setup-password`,
          },
        })

        if (resetError) {
          throw resetError
        }

        const neonUser = await getOrCreateNeonUser(createData.user.id, email, null)
        userId = neonUser.id

        await sql`
          UPDATE users
          SET password_setup_complete = FALSE
          WHERE id = ${userId}
        `

        passwordSetupLink = resetData.properties.action_link

        if (passwordSetupLink.includes("localhost") || passwordSetupLink.includes("supabase.co")) {
          const url = new URL(passwordSetupLink)
          const token = url.searchParams.get("token")
          const type = url.searchParams.get("type") || "recovery"

          if (token) {
            passwordSetupLink = `${siteUrl}/auth/confirm?token=${token}&type=${type}&redirect_to=/auth/setup-password`
          }
        }
      }
    }

    await sql`
      CREATE TABLE IF NOT EXISTS academy_course_purchases (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        purchased_at TIMESTAMP DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb,
        UNIQUE(user_id, course_id)
      )
    `

    const metadata = JSON.stringify({ granted_by: "admin", reason })

    const existingPurchase = await sql`
      SELECT id FROM academy_course_purchases
      WHERE user_id = ${userId}
        AND course_id = ${courseId}
      LIMIT 1
    `

    if (existingPurchase.length > 0) {
      await sql`
        UPDATE academy_course_purchases
        SET status = 'active',
            purchased_at = NOW(),
            metadata = ${metadata}::jsonb
        WHERE id = ${existingPurchase[0].id}
      `
    } else {
      await sql`
        INSERT INTO academy_course_purchases (user_id, course_id, status, purchased_at, metadata)
        VALUES (${userId}, ${courseId}, 'active', NOW(), ${metadata}::jsonb)
      `
    }

    const emailContent = generateShopifyMigrationEmail({
      firstName,
      courseName: academyProduct.name,
      courseId,
      isNewAccount: wasCreated,
      passwordSetupUrl: wasCreated ? passwordSetupLink : undefined,
      siteUrl,
    })

    await sendEmail({
      to: email,
      subject: `Your ${academyProduct.name} is waiting for you ✨`,
      html: emailContent.html,
      text: emailContent.text,
      emailType: "shopify_migration_welcome",
      tags: ["shopify-migration", courseId],
    })

    return NextResponse.json({ success: true, userId, created: wasCreated })
  } catch (error: any) {
    console.error("[v0] Error granting academy access:", error)
    return NextResponse.json(
      {
        error: "Failed to grant access",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
