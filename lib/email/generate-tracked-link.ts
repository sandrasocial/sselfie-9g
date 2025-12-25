/**
 * Generate tracked email links with UTM parameters and campaign attribution
 * 
 * This ensures all email links can be tracked for conversion attribution
 */

export interface TrackedLinkParams {
  baseUrl: string
  campaignId: number
  campaignName: string
  campaignType: string
  linkType: 'cta' | 'text' | 'image' | 'footer'
  productType?: 'studio_membership' | 'one_time' | 'blueprint' | 'freebie'
}

export function generateTrackedLink(params: TrackedLinkParams): string {
  const {
    baseUrl,
    campaignId,
    campaignName,
    campaignType,
    linkType,
    productType,
  } = params

  // Create campaign name slug (URL-safe)
  const campaignSlug = campaignName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // Build URL with tracking parameters
  const url = new URL(baseUrl, process.env.NEXT_PUBLIC_SITE_URL || 'https://sselfie.ai')
  
  // Add checkout parameter if product type specified
  if (productType) {
    url.searchParams.set('checkout', productType)
  }

  // Add UTM parameters for attribution
  url.searchParams.set('utm_source', 'email')
  url.searchParams.set('utm_medium', 'email')
  url.searchParams.set('utm_campaign', campaignSlug)
  url.searchParams.set('utm_content', linkType)
  
  // Add campaign ID for conversion tracking
  url.searchParams.set('campaign_id', campaignId.toString())
  url.searchParams.set('campaign_type', campaignType)

  return url.toString()
}

/**
 * Generate tracked checkout link for email campaigns
 */
export function generateTrackedCheckoutLink(
  campaignId: number,
  campaignName: string,
  campaignType: string,
  productType: 'studio_membership' | 'one_time',
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sselfie.ai'
  const baseUrl = `${siteUrl}/studio`
  
  return generateTrackedLink({
    baseUrl,
    campaignId,
    campaignName,
    campaignType,
    linkType: 'cta',
    productType,
  })
}







































