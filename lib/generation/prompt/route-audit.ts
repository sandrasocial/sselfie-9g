import { createHash } from "crypto"
import { createAuthorityAudit } from "./audit"

interface AuditPromptRouteParams {
  routeId: string
  mode: string
  feature: string
  userId?: string | number
  builder: string
  prompt: string
  input?: unknown
  startedAt?: number
}

function hashPayload(value: string): string {
  return createHash("sha256").update(value).digest("hex").substring(0, 16)
}

export function auditPromptRoute(params: AuditPromptRouteParams): void {
  const promptFingerprint = hashPayload(params.prompt)
  const inputHash = params.input !== undefined ? hashPayload(JSON.stringify(params.input)) : undefined
  const executionTimeMs = params.startedAt ? Date.now() - params.startedAt : 0

  createAuthorityAudit(params.routeId, promptFingerprint, {
    mode: params.mode,
    feature: params.feature,
    userId: params.userId,
    builder: params.builder,
    executionTimeMs,
    success: true,
    promptLength: params.prompt.length,
    inputHash,
  })
}
