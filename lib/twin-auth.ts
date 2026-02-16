import type { NextRequest } from "next/server"

type TwinAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

export function requireTwinBearer(req: NextRequest): TwinAuthResult {
  const secret = process.env.TWIN_SHARED_SECRET
  if (!secret || !secret.trim()) {
    return { ok: false, status: 503, error: "Twin auth is not configured." }
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!authHeader) {
    return { ok: false, status: 401, error: "Missing Authorization header." }
  }

  const [scheme, token] = authHeader.split(" ")
  if (scheme !== "Bearer" || !token) {
    return { ok: false, status: 401, error: "Invalid Authorization header format." }
  }

  if (token !== secret) {
    return { ok: false, status: 403, error: "Invalid bearer token." }
  }

  return { ok: true }
}

