import { randomUUID } from "node:crypto"

import { sql } from "@/lib/db/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { findAuthUserByEmail } from "@/lib/supabase/find-auth-user-by-email"

type LocalUser = {
  id: string
  email: string
  supabase_user_id: string | null
  password_setup_complete: boolean | null
}

export type SkoolAccountProvisioningResult = {
  userId: string
  authUserId: string
  accountState: "ready" | "recovery_required"
}

export async function ensureSkoolMemberAccount(input: {
  email: string
}): Promise<SkoolAccountProvisioningResult> {
  const email = input.email.trim().toLowerCase()
  const localRows = (await sql`
    SELECT id, email, supabase_user_id, password_setup_complete
    FROM users
    WHERE LOWER(email) = LOWER(${email})
    ORDER BY created_at ASC
    LIMIT 2
  `) as LocalUser[]
  if (localRows.length > 1) throw new Error("SKOOL_IDENTITY_CONFLICT")

  const localUser = localRows[0] || null
  const admin = createAdminClient().auth.admin
  let authUser = null as Awaited<ReturnType<typeof admin.getUserById>>["data"]["user"] | null

  if (localUser?.supabase_user_id) {
    const { data, error } = await admin.getUserById(localUser.supabase_user_id)
    if (!error && data.user) {
      if (data.user.email?.trim().toLowerCase() !== email) {
        throw new Error("SKOOL_IDENTITY_CONFLICT")
      }
      authUser = data.user
    }
  }

  if (!authUser) {
    const found = await findAuthUserByEmail({
      email,
      listUsers: params => admin.listUsers(params),
    })
    if (found) {
      const { data, error } = await admin.getUserById(found.id)
      if (error || !data.user || data.user.email?.trim().toLowerCase() !== email) {
        throw new Error("SKOOL_IDENTITY_CONFLICT")
      }
      authUser = data.user
    } else {
      const { data, error } = await admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { created_via: "skool_membership" },
      })
      if (error || !data.user) {
        const recovered = await findAuthUserByEmail({
          email,
          listUsers: params => admin.listUsers(params),
        })
        if (!recovered) throw error || new Error("SKOOL_AUTH_PROVISIONING_FAILED")
        const verified = await admin.getUserById(recovered.id)
        if (
          verified.error ||
          !verified.data.user ||
          verified.data.user.email?.trim().toLowerCase() !== email
        ) {
          throw new Error("SKOOL_IDENTITY_CONFLICT")
        }
        authUser = verified.data.user
      } else {
        authUser = data.user
      }
    }
  }

  if (!authUser) throw new Error("SKOOL_AUTH_PROVISIONING_FAILED")

  let userId = localUser?.id || randomUUID()
  if (localUser) {
    if (localUser.supabase_user_id !== authUser.id) {
      const updated = await sql`
        UPDATE users
        SET supabase_user_id = ${authUser.id}, updated_at = NOW()
        WHERE id = ${localUser.id}
          AND (supabase_user_id IS NULL OR supabase_user_id = ${localUser.supabase_user_id})
        RETURNING id
      `
      if (updated.length !== 1) throw new Error("SKOOL_IDENTITY_CONFLICT")
    }
  } else {
    const inserted = await sql`
      INSERT INTO users (
        id, email, supabase_user_id, password_setup_complete, created_at, updated_at
      )
      VALUES (${userId}, ${email}, ${authUser.id}, FALSE, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        supabase_user_id = EXCLUDED.supabase_user_id,
        updated_at = NOW()
      WHERE users.supabase_user_id IS NULL
         OR users.supabase_user_id = EXCLUDED.supabase_user_id
      RETURNING id
    `
    if (inserted.length !== 1) throw new Error("SKOOL_IDENTITY_CONFLICT")
    userId = String(inserted[0].id)
  }

  if (authUser.last_sign_in_at || localUser?.password_setup_complete === true) {
    if (localUser?.password_setup_complete !== true && authUser.last_sign_in_at) {
      await sql`
        UPDATE users SET password_setup_complete = TRUE, updated_at = NOW()
        WHERE id = ${userId}
      `
    }
    return { userId, authUserId: authUser.id, accountState: "ready" }
  }

  // Do not mint a provider recovery credential during webhook processing.
  // Retries must be able to return the same account state without invalidating
  // an already-delivered setup email. A one-time recovery token is generated
  // only after the customer opens the stable SSELFIE setup entry link.
  await sql`
    UPDATE users SET password_setup_complete = FALSE, updated_at = NOW()
    WHERE id = ${userId}
  `

  return {
    userId,
    authUserId: authUser.id,
    accountState: "recovery_required",
  }
}
