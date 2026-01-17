/**
 * Internal-Only Endpoint Guard
 * 
 * Phase 4A: Soft enforcement for internal-only endpoints.
 * Phase 5C: Enhanced with admin route support and route metadata.
 * 
 * When ENFORCE_INTERNAL_ONLY_ENDPOINTS=true, requires internal API secret header.
 * When false (default), allows all requests (non-breaking).
 * 
 * Usage:
 *   import { checkInternalOnly } from '@/lib/maya/internal-only-guard'
 *   
 *   // For internal routes:
 *   export async function POST(req: NextRequest) {
 *     const internalCheck = checkInternalOnly(req, { routeId: 'EP-02', routePath: '/api/maya/generate-prompt-suggestions', kind: 'internal' })
 *     if (!internalCheck.allowed) {
 *       return NextResponse.json({ error: internalCheck.error }, { status: 403 })
 *     }
 *     // ... rest of route
 *   }
 *   
 *   // For admin routes (requires admin auth separately):
 *   export async function GET(req: NextRequest) {
 *     const adminCheck = checkInternalOnly(req, { kind: 'admin' })
 *     if (!adminCheck.allowed) {
 *       return NextResponse.json({ error: adminCheck.error }, { status: 403 })
 *     }
 *     // ... admin auth check + rest of route
 *   }
 */

import type { NextRequest } from 'next/server'

interface InternalOnlyOptions {
  routeId?: string
  routePath?: string
  kind?: 'internal' | 'admin'
}

interface InternalOnlyResult {
  allowed: boolean
  error?: string
}

/**
 * Check if request is from internal source or admin.
 * 
 * Phase 5C: Enhanced with route metadata and admin support.
 * 
 * For INTERNAL routes (kind='internal'):
 *   When ENFORCE_INTERNAL_ONLY_ENDPOINTS=true:
 *     Requires x-sselfie-internal header matching INTERNAL_API_SECRET env var.
 *   When false (default):
 *     Allows all requests (non-breaking behavior).
 * 
 * For ADMIN routes (kind='admin'):
 *   When ENFORCE_ADMIN_ONLY_ENDPOINTS=true (default: true):
 *     Requires admin authentication (caller must verify admin separately).
 *     This guard only checks if enforcement is enabled.
 *   When false:
 *     Allows all requests (non-breaking behavior).
 * 
 * @param req - Next.js request object
 * @param options - Route metadata and kind (internal/admin)
 * @returns Result with allowed flag and optional error message
 */
export function checkInternalOnly(
  req: NextRequest,
  options?: InternalOnlyOptions
): InternalOnlyResult {
  const kind = options?.kind || 'internal'
  
  // ADMIN routes: Check if admin enforcement is enabled
  if (kind === 'admin') {
    const enforceAdminOnly = process.env.ENFORCE_ADMIN_ONLY_ENDPOINTS !== 'false' // Default: true
    if (!enforceAdminOnly) {
      return { allowed: true } // Non-breaking default
    }
    // Admin auth is checked separately by route handlers
    // This guard only confirms enforcement is enabled
    return { allowed: true }
  }
  
  // INTERNAL routes: Check internal secret header
  const enforceInternalOnly = process.env.ENFORCE_INTERNAL_ONLY_ENDPOINTS === 'true'
  const safeModeEnabled = process.env.SAFE_MODE === 'true'
  
  // Phase 6A: Safe mode enforces internal-only endpoints even if flag is off
  const shouldEnforce = enforceInternalOnly || safeModeEnabled
  
  // Default: allow all requests (non-breaking)
  if (!shouldEnforce) {
    return { allowed: true }
  }
  
  // When enforcement is enabled, require internal secret header
  const internalSecret = process.env.INTERNAL_API_SECRET
  if (!internalSecret) {
    console.warn('[INTERNAL-ONLY] ENFORCE_INTERNAL_ONLY_ENDPOINTS=true but INTERNAL_API_SECRET not set')
    return { allowed: true } // Fail open if secret not configured
  }
  
  const providedSecret = req.headers.get('x-sselfie-internal')
  
  if (providedSecret !== internalSecret) {
    return {
      allowed: false,
      error: 'Internal API only. This endpoint is not available for external use.',
    }
  }
  
  return { allowed: true }
}
