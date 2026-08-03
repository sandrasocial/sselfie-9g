export type VaultMayaPersonalPhoto = {
  id: string
  url: string
  createdAt: string
  generationRef?: string | null
  vaultMayaCardKey?: string | null
  title?: string | null
}

export type VaultMayaPersonalLook = {
  cardKey: string
  title: string
  collectionTitle: string
}

function isPhotoForLook(photo: VaultMayaPersonalPhoto, look: VaultMayaPersonalLook): boolean {
  if (photo.vaultMayaCardKey === look.cardKey) return true
  if (photo.generationRef?.includes(`-vault-maya-${look.cardKey}-`)) return true

  const savedTitle = photo.title?.trim()
  if (!savedTitle) return false
  return savedTitle === look.title || savedTitle === `${look.collectionTitle} · ${look.title}`
}

/**
 * One collection card represents one Vault look. Keep every generated version in My photos,
 * but let the newest version fill that look's card when the member returns.
 */
export function indexLatestVaultPhotosByCardKey<T extends VaultMayaPersonalPhoto>(
  photos: T[],
  looks: VaultMayaPersonalLook[]
): Record<string, T> {
  const newestFirst = [...photos].sort((a, b) => {
    const aTime = Date.parse(a.createdAt) || 0
    const bTime = Date.parse(b.createdAt) || 0
    return bTime - aTime
  })
  const result: Record<string, T> = {}

  for (const look of looks) {
    const photo = newestFirst.find(candidate => isPhotoForLook(candidate, look))
    if (photo) result[look.cardKey] = photo
  }

  return result
}
