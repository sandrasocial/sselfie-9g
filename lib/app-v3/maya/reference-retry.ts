/**
 * Retry an image request after the server retires permanently missing identity Blobs.
 * The 422 is emitted before credits are touched, so reusing the same client request id is safe
 * and preserves idempotency. Four recovery passes cover the face plus all three optional identity
 * angles. All other failures pass through unchanged.
 */
export async function retryWithRecoveredIdentity<TReferences>(input: {
  references: TReferences
  request: (references: TReferences) => Promise<Response>
  recover: () => Promise<TReferences | null>
  maxRecoveries?: number
}): Promise<Response> {
  let references = input.references
  let response = await input.request(references)
  const maxRecoveries = input.maxRecoveries ?? 4

  for (let attempt = 0; attempt < maxRecoveries && !response.ok; attempt += 1) {
    const failure = (await response
      .clone()
      .json()
      .catch(() => null)) as { code?: string } | null
    if (failure?.code !== "reference_selfie_unavailable") return response

    const recovered = await input.recover()
    if (!recovered) return response
    references = recovered
    response = await input.request(references)
  }

  return response
}
