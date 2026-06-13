import type { Shoot, ShootShot } from "@/lib/content-kit/types"

export const MIN_VAULT_PUBLISH_SHOTS = 6

export function getApprovedPublishableShots(shoot: Shoot): ShootShot[] {
  return shoot.shots.filter(
    (shot) =>
      shot.status === "approved" &&
      typeof shot.imageUrl === "string" &&
      shot.imageUrl.length > 0 &&
      typeof shot.prompt === "string" &&
      shot.prompt.trim().length > 0,
  )
}

export function getShootPublishReadiness(shoot: Shoot) {
  const approvedShots = getApprovedPublishableShots(shoot)
  const needed = Math.max(0, MIN_VAULT_PUBLISH_SHOTS - approvedShots.length)
  const giveawayShot = approvedShots[0] ?? null
  return {
    ready: needed === 0 && giveawayShot !== null,
    approvedCount: approvedShots.length,
    needed,
    minShots: MIN_VAULT_PUBLISH_SHOTS,
    giveawayShotId: giveawayShot?.id ?? null,
    reason:
      needed > 0
        ? `Approve ${needed} more rendered shot${needed === 1 ? "" : "s"} before publishing.`
        : "Ready to publish to the Vault.",
  }
}
