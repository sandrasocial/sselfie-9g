import { sql } from "@/lib/db/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { findAuthUserByEmail } from "@/lib/supabase/find-auth-user-by-email"
import { VISIBILITY_MINI_PRODUCT_BY_ID } from "@/lib/visibility-products"

type ProvisionExistingCheckoutAccountParams = {
  neonUserId: string
  currentSupabaseUserId: string | null
  passwordSetupComplete: boolean | null
  email: string
  sessionId: string
  stripeCustomerId: string | null
  productType: string | null
  productId: string | null
  productionUrl: string
}

type ProvisionExistingCheckoutAccountResult = {
  supabaseUserId: string
  shouldUseSetupLink: boolean
  passwordSetupLink: string
}

function checkoutSetupNext(productType: string | null, productId: string | null): string {
  const academyMiniProductSlug =
    productType === "academy_mini_product" && productId
      ? VISIBILITY_MINI_PRODUCT_BY_ID[productId as keyof typeof VISIBILITY_MINI_PRODUCT_BY_ID]?.slug
      : null

  if (productType === "visibility_suite") return "/academy/access/visibility-suite"
  if (productType === "selfie_visibility_bundle") return "/academy/access/one-selfie"
  if (academyMiniProductSlug) return `/academy/access/${academyMiniProductSlug}`
  if (productType === "starter_kit") return "/academy/access/starter-kit"
  if (productType === "masterclass") return "/academy/access/brand-strategy"
  if (productType === "prompt_vault") return "/prompt-vault"
  if (productType === "selfie_ai_photos_kit") return "/selfie-to-ai-photos-kit"
  if (productType === "presets_single" || productType === "presets_bundle") return "/presets"
  if (productType === "selfie_to_brand_shoot_system") {
    return "/academy/access/selfie-to-brand-shoot"
  }
  if (productType === "work_with_me") return "/academy/access/masterclass"
  if (productType === "transform_starter" || productType === "transform_topup") {
    return "/transform/studio"
  }
  if (productType === "selfie_guide" || productType === "selfie_guide_bundle") {
    return "/selfie-guide"
  }
  return "/app"
}

function firstPartySetupLink(actionLink: string, productionUrl: string, nextPath: string): string {
  try {
    const url = new URL(actionLink)
    const token = url.searchParams.get("token")
    const type = url.searchParams.get("type") || "recovery"
    if (token) {
      return `${productionUrl}/auth/confirm?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(`/auth/setup-password?next=${encodeURIComponent(nextPath)}`)}`
    }
  } catch {
    // Supabase's action link remains a valid fallback if its URL shape changes.
  }
  return actionLink
}

function normalizedEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() || ""
}

/**
 * Existing lead rows can predate Supabase Auth. Before a public paid checkout is
 * fulfilled, verify the stored Auth mapping, repair a dangling mapping, or create
 * the missing Auth identity. Password setup is delivered only through the buyer's
 * email unless this exact checkout created the account marker used by the success page.
 */
export async function ensureExistingNeonPublicCheckoutAuth(
  params: ProvisionExistingCheckoutAccountParams,
): Promise<ProvisionExistingCheckoutAccountResult> {
  const email = normalizedEmail(params.email)
  if (!email) throw new Error("Cannot provision checkout account without an email")

  const supabaseAdmin = createAdminClient()
  const admin = supabaseAdmin.auth.admin
  let authUser = null as Awaited<ReturnType<typeof admin.getUserById>>["data"]["user"] | null

  if (params.currentSupabaseUserId) {
    const { data, error } = await admin.getUserById(params.currentSupabaseUserId)
    if (!error && data.user && normalizedEmail(data.user.email) === email) {
      authUser = data.user
    }
  }

  if (!authUser) {
    const found = await findAuthUserByEmail({
      email,
      listUsers: page => admin.listUsers(page),
    })

    if (found) {
      const { data, error } = await admin.getUserById(found.id)
      if (error || !data.user || normalizedEmail(data.user.email) !== email) {
        throw new Error("Could not safely verify the checkout Auth account")
      }
      authUser = data.user
    } else {
      const { data: createData, error: createError } = await admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          created_via: "stripe_one_time_purchase",
          stripe_customer_id: params.stripeCustomerId,
          product_type: params.productType,
        },
        app_metadata: {
          account_setup_checkout_session_id: params.sessionId,
        },
      })

      if (createError || !createData.user) {
        const recovered = await findAuthUserByEmail({
          email,
          listUsers: page => admin.listUsers(page),
        })
        if (!recovered) throw createError || new Error("Supabase did not return a created user")

        const { data, error } = await admin.getUserById(recovered.id)
        if (error || !data.user || normalizedEmail(data.user.email) !== email) {
          throw createError || new Error("Could not recover the checkout Auth account")
        }
        authUser = data.user
      } else {
        authUser = createData.user
      }
    }
  }

  if (!authUser) throw new Error("Could not provision the checkout Auth account")

  if (params.currentSupabaseUserId !== authUser.id) {
    await sql`
      UPDATE users
      SET supabase_user_id = ${authUser.id}, updated_at = NOW()
      WHERE id = ${params.neonUserId}
    `
  }

  if (authUser.last_sign_in_at) {
    if (params.passwordSetupComplete !== true) {
      await sql`
        UPDATE users
        SET password_setup_complete = TRUE, updated_at = NOW()
        WHERE id = ${params.neonUserId}
      `
    }
    return {
      supabaseUserId: authUser.id,
      shouldUseSetupLink: false,
      passwordSetupLink: "",
    }
  }

  if (params.passwordSetupComplete === true) {
    return {
      supabaseUserId: authUser.id,
      shouldUseSetupLink: false,
      passwordSetupLink: "",
    }
  }

  const nextPath = checkoutSetupNext(params.productType, params.productId)
  const { data: resetData, error: resetError } = await admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${params.productionUrl}/auth/setup-password?next=${encodeURIComponent(nextPath)}`,
    },
  })
  const actionLink = resetData?.properties?.action_link
  if (resetError || !actionLink) {
    throw resetError || new Error("Supabase did not return an account setup link")
  }

  await sql`
    UPDATE users
    SET password_setup_complete = FALSE, updated_at = NOW()
    WHERE id = ${params.neonUserId}
  `

  return {
    supabaseUserId: authUser.id,
    shouldUseSetupLink: true,
    passwordSetupLink: firstPartySetupLink(actionLink, params.productionUrl, nextPath),
  }
}
