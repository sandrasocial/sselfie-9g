export type FacebookPageCandidate = {
  id?: string
  name?: string
  access_token?: string
  instagram_business_account?: {
    id?: string
    username?: string
  } | null
}

export function selectPageWithInstagramAccount(
  pages: FacebookPageCandidate[] | undefined | null,
  preferredUsernames: string[] = [],
): FacebookPageCandidate | null {
  if (!Array.isArray(pages)) return null

  const pagesWithInstagram = pages.filter(
    (page) =>
      typeof page?.id === "string" &&
      typeof page?.instagram_business_account?.id === "string",
  )

  if (pagesWithInstagram.length === 0) return null

  const preferred = new Set(
    preferredUsernames.map((username) => username.trim().toLowerCase()).filter(Boolean),
  )

  if (preferred.size > 0) {
    const preferredPage = pagesWithInstagram.find((page) => {
      const username = page.instagram_business_account?.username?.toLowerCase()
      return username ? preferred.has(username) : false
    })

    if (preferredPage) return preferredPage
  }

  return pagesWithInstagram[0] || null
}
