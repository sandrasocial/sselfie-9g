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
    // 1) Get latest version from versions list
    const encodedModel = encodeURIComponent(replicateModelId)
    const modelResponse = await fetch(`https://api.replicate.com/v1/models/${encodedModel}/versions`, {
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

    const versionId = latestVersion.id
    const extractVersionHash = (id: string) => (id.includes(":") ? id.split(":")[1] : id)
    const versionHash = extractVersionHash(versionId)

    // 2) Fetch the detailed version object (helps ensure files & metadata are present)
    const versionDetailResp = await fetch(
      `https://api.replicate.com/v1/models/${encodedModel}/versions/${encodeURIComponent(versionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          Accept: "application/json",
        },
      },
    )

    let versionDetail: any = latestVersion
    if (versionDetailResp.ok) {
      versionDetail = await versionDetailResp.json()
    } else {
      // fallback to list result (we already have latestVersion) but prefer detail when possible
      console.warn("[v0] Could not fetch version detail, falling back to list entry", {
        status: versionDetailResp.status,
        statusText: versionDetailResp.statusText,
      })
    }

    // 3) Inspect files for a strong LoRA candidate
    const files = versionDetail.files || []
    const isLikelyLora = (f: any) => {
      const name = String(f.name || f.filename || "").toLowerCase()
      const contentType = String(f.content_type || f.mime || "").toLowerCase()
      return (
        name.includes("lora") ||
        name.includes("weights") ||
        name.endsWith(".tar") ||
        contentType.includes("tar") ||
        contentType.includes("application/x-tar")
      )
    }

    let candidate = files.find(isLikelyLora) || files.find((f: any) => (f.url || f.download_url)) || null
    let loraUrl: string | null = null

    if (candidate) {
      loraUrl = candidate.url || candidate.download_url || null
    }

    // 4) If no candidate URL found, try conservative constructed pbxt fallback using version hash
    // But verify any URL with a quick HEAD request before trusting it.
    const tryVerify = async (url: string | null) => {
      if (!url) return false
      try {
        const resp = await fetch(url, { method: "HEAD" })
        return resp.ok
      } catch (e) {
        return false
      }
    }

    let verified = false
    if (loraUrl) {
      verified = await tryVerify(loraUrl)
      if (!verified) {
        console.warn("[v0] Candidate LoRA URL failed HEAD check, ignoring:", loraUrl)
        loraUrl = null
      }
    }

    if (!loraUrl) {
      // constructed fallback
      const constructed = `https://replicate.delivery/pbxt/${versionHash}/flux-lora.tar`
      const ok = await tryVerify(constructed)
      if (ok) {
        loraUrl = constructed
        verified = true
        console.log("[v0] Using constructed pbxt fallback and verified it exists:", constructed)
      } else {
        console.warn("[v0] No verifiable LoRA file found for version", versionId)
      }
    }

    // 5) Only update DB and mark completed if we actually verified a usable LoRA URL.
    if (!loraUrl) {
      console.log("[v0] Aborting sync: no verified lora_weights_url available for", {
        replicateModelId,
        versionId,
      })
      return null
    }

    const result = await sql`
      UPDATE user_models
      SET
        replicate_version_id = ${versionHash},
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
      replicate_version_id: versionHash,
      lora_weights_url: loraUrl,
    })

    return result[0]
  } catch (error: any) {
    console.error("[v0] Error in trySyncReplicateVersionToUserModel:", error?.message || String(error))
    return null
  }
}