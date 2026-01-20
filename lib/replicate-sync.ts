import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Try to sync the latest Replicate model version into our user_models row.
 *
 * When training finished on Replicate but our DB wasn't updated (missing training_id
 * or replicate_version_id), this helper will:
 *  - fetch the model versions from Replicate
 *  - pick the latest version
 *  - if a valid version is found, update user_models with version id, lora url and mark completed
 *
 * Returns the updated row object (or null if no update was performed)
 */
export async function trySyncReplicateVersionToUserModel(
  userModelId: number,
  replicateModelId: string,
) {
  console.log("[v0] trySyncReplicateVersionToUserModel", { userModelId, replicateModelId })

  if (!replicateModelId || !userModelId) {
    console.log("[v0] Missing replicateModelId or userModelId - aborting sync")
    return null
  }

  try {
    const encoded = encodeURIComponent(replicateModelId)
    const modelResponse = await fetch(`https://api.replicate.com/v1/models/${encoded}/versions`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        Accept: "application/json",
      },
    })

    if (!modelResponse.ok) {
      console.log("[v0] Replicate versions fetch failed", {
        status: modelResponse.status,
        statusText: modelResponse.statusText,
      })
      return null
    }

    const versionsData = await modelResponse.json()
    const latestVersion = versionsData.results?.[0]
    if (!latestVersion || !latestVersion.id) {
      console.log("[v0] No versions found on Replicate for", replicateModelId)
      return null
    }

    let loraUrl: string | null = null
    try {
      const files = latestVersion.files || []
      const candidate = files.find((f: any) => {
        const name = (f.name || f.filename || "").toLowerCase()
        return name.includes("lora") || name.includes("weights") || name.endsWith(".tar")
      }) || files[0]

      loraUrl = candidate?.url || candidate?.download_url || null
    } catch (e) {
      console.log("[v0] Error extracting lora url from version.files:", String(e))
      loraUrl = null
    }

    const replicateVersionId = latestVersion.id

    const result = await sql`
      UPDATE user_models
      SET
        replicate_version_id = ${replicateVersionId},
        lora_weights_url = ${loraUrl},
        training_status = 'completed',
        training_progress = 100,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${userModelId}
      RETURNING *
    `

    if (result.length === 0) {
      console.log("[v0] No user_models row updated for id", userModelId)
      return null
    }

    console.log("[v0] Synced replicate version to user_models:", {
      id: userModelId,
      replicate_version_id: replicateVersionId,
      lora_weights_url: loraUrl,
    })

    return result[0]
  } catch (error: any) {
    console.error("[v0] Error in trySyncReplicateVersionToUserModel:", error?.message || String(error))
    return null
  }
}