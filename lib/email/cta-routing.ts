/**
 * CTA Routing Helper
 * 
 * Routes CTAs based on user account status:
 * - Account holders (paid members, active users) → /studio or /checkout/
 * - Non-account holders (freebie, blueprint, non-members) → / (landing page with pricing)
 * 
 * NEVER send non-account holders to /studio or /login - they can't access it and it kills revenue
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export interface CTARoutingParams {
  /**
   * User account status
   * - 'has_account': User has an account (paid member, active user, cancelled member with account)
   * - 'no_account': User does NOT have an account (freebie subscriber, blueprint subscriber, non-member)
   */
  userType: 'has_account' | 'no_account'
  
  /**
   * Campaign tracking
   */
  campaignName?: string
  campaignId?: number
  
  /**
   * Product type for checkout
   */
  productType?: 'membership' | 'one-time'
  
  /**
   * Optional promo code
   */
  promoCode?: string
}

/**
 * Generate appropriate CTA URL based on user account status
 */
export function getCTALink(params: CTARoutingParams): string {
  const { userType, campaignName, campaignId, productType, promoCode } = params

  // Account holders can go to studio or checkout
  if (userType === 'has_account') {
    if (productType) {
      // Direct checkout for account holders
      return getCheckoutLink(productType, campaignName || 'email', campaignId, promoCode)
    } else {
      // Studio for account holders
      return getStudioLink(campaignName, campaignId)
    }
  }

  // Non-account holders MUST go to landing page (homepage with pricing)
  // Landing page will handle signup flow
  return getLandingPageLink(campaignName, campaignId, productType, promoCode)
}

/**
 * Generate checkout link (for account holders only)
 */
function getCheckoutLink(
  type: 'membership' | 'one-time',
  campaignName: string,
  campaignId?: number,
  promoCode?: string
): string {
  const campaignSlug = campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const baseUrl = `${SITE_URL}/checkout/${type}`
  const params = new URLSearchParams({
    utm_source: 'email',
    utm_medium: 'email',
    utm_campaign: campaignSlug,
    utm_content: 'cta_button',
  })
  if (campaignId) {
    params.append('campaign_id', campaignId.toString())
  }
  if (promoCode) {
    params.append('promo', promoCode)
  }
  return `${baseUrl}?${params.toString()}`
}

/**
 * Generate studio link (for account holders only)
 */
function getStudioLink(campaignName?: string, campaignId?: number): string {
  const baseUrl = `${SITE_URL}/studio`
  const params = new URLSearchParams({
    utm_source: 'email',
    utm_medium: 'email',
    utm_content: 'cta_button',
  })
  if (campaignName) {
    const campaignSlug = campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    params.append('utm_campaign', campaignSlug)
  }
  if (campaignId) {
    params.append('campaign_id', campaignId.toString())
  }
  return `${baseUrl}?${params.toString()}`
}

/**
 * Generate landing page link (for non-account holders)
 * Landing page shows pricing and handles signup flow
 */
function getLandingPageLink(
  campaignName?: string,
  campaignId?: number,
  productType?: 'membership' | 'one-time',
  promoCode?: string
): string {
  const baseUrl = SITE_URL // Homepage is landing page
  const params = new URLSearchParams({
    utm_source: 'email',
    utm_medium: 'email',
    utm_content: 'cta_button',
  })
  
  if (campaignName) {
    const campaignSlug = campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    params.append('utm_campaign', campaignSlug)
  }
  if (campaignId) {
    params.append('campaign_id', campaignId.toString())
  }
  if (productType) {
    // Add product hint for landing page to highlight specific pricing
    params.append('product', productType === 'membership' ? 'studio_membership' : 'one_time_session')
  }
  if (promoCode) {
    params.append('promo', promoCode)
  }
  
  return `${baseUrl}?${params.toString()}`
}

/**
 * Helper to determine user type from email context
 * Use this when you know the email sequence type
 */
export function getUserTypeFromSequence(sequenceType: string): 'has_account' | 'no_account' {
  // Sequences that go to account holders
  const accountHolderSequences = [
    'welcome', // Welcome sequence → paid members
    'reengagement', // Re-engagement → inactive members (have accounts)
    'welcome-back', // Welcome back → returning members
  ]

  // Sequences that go to non-account holders
  const nonAccountSequences = [
    'nurture', // Nurture → freebie subscribers
    'blueprint', // Blueprint → blueprint subscribers
    'upsell', // Upsell → freebie/blueprint subscribers
    'freebie', // Freebie guide → freebie subscribers
  ]

  const sequenceLower = sequenceType.toLowerCase()

  if (accountHolderSequences.some(seq => sequenceLower.includes(seq))) {
    return 'has_account'
  }

  if (nonAccountSequences.some(seq => sequenceLower.includes(seq))) {
    return 'no_account'
  }

  // Default to no_account for safety (landing page is safer than broken studio link)
  console.warn(`[CTA Routing] Unknown sequence type: ${sequenceType}, defaulting to no_account`)
  return 'no_account'
}

