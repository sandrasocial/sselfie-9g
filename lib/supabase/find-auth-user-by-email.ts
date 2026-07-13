type AuthUserSummary = {
  id: string
  email?: string | null
}

type ListUsersResult = {
  data: { users: AuthUserSummary[] } | null
  error: { message: string } | null
}

type ListUsers = (params: {
  page: number
  perPage: number
}) => PromiseLike<ListUsersResult>

/**
 * Supabase's admin listUsers endpoint is paginated and email casing is not guaranteed.
 * Scan every available page so paid fulfillment reuses an existing account instead of
 * attempting a duplicate create when that account is outside the first page.
 */
export async function findAuthUserByEmail({
  email,
  listUsers,
  perPage = 1000,
  maxPages = 100,
}: {
  email: string
  listUsers: ListUsers
  perPage?: number
  maxPages?: number
}): Promise<AuthUserSummary | null> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return null

  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await listUsers({ page, perPage })
    if (error) {
      throw new Error(`Could not check Supabase accounts: ${error.message}`)
    }

    const users = data?.users || []
    const match = users.find(
      user => user.email?.trim().toLowerCase() === normalizedEmail,
    )
    if (match) return match
    if (users.length < perPage) return null
  }

  throw new Error(
    `Could not safely check every Supabase account page for ${normalizedEmail}`,
  )
}
