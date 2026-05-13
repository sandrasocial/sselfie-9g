/**
 * Email Link Library
 *
 * Centralized link management for all marketing emails.
 * - Ensures consistent URLs across all campaigns
 * - Adds UTM tracking automatically
 * - Supports dynamic campaign_id and email placeholders
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sselfie.ai'

export interface LinkConfig {
  /** Link identifier */
  id: string
  /** Base URL (without UTM params) */
  url: string
  /** Default UTM source */
  utmSource?: string
  /** Default UTM medium */
  utmMedium?: string
  /** Description for documentation */
  description: string
}

/**
 * Standard email links with UTM tracking
 */
export const EMAIL_LINKS: Record<string, LinkConfig> = {
  // Main CTAs
  blueprint: {
    id: 'blueprint',
    url: `${BASE_URL}/blueprint`,
    utmSource: 'email',
    utmMedium: 'newsletter',
    description: 'Blueprint landing page (free offering - educational)'
  },

  studioMembershipCheckout: {
    id: 'studio-membership-checkout',
    url: `${BASE_URL}/checkout/membership`,
    utmSource: 'email',
    utmMedium: 'newsletter',
    description: 'Studio membership checkout (direct purchase intent)'
  },

  studio: {
    id: 'studio',
    url: `${BASE_URL}/studio`,
    utmSource: 'email',
    utmMedium: 'newsletter',
    description: 'Studio landing/features page or dashboard (for logged-in users)'
  },

  whyStudio: {
    id: 'why-studio',
    url: `${BASE_URL}/why-studio`,
    utmSource: 'email',
    utmMedium: 'newsletter',
    description: 'Why Studio page (overcome objections, detailed benefits)'
  },

  membership: {
    id: 'membership',
    url: `${BASE_URL}/checkout/membership`,
    utmSource: 'email',
    utmMedium: 'newsletter',
    description: 'Membership checkout (direct purchase intent)'
  },

  // Content pages
  instagramGuide: {
    id: 'instagram-guide',
    url: `${BASE_URL}/guides/instagram`,
    utmSource: 'email',
    utmMedium: 'newsletter',
    description: 'Instagram strategy guide'
  },

  contentStrategy: {
    id: 'content-strategy',
    url: `${BASE_URL}/strategy`,
    utmSource: 'email',
    utmMedium: 'newsletter',
    description: 'Content strategy resources'
  },

  blogPost: {
    id: 'blog',
    url: `${BASE_URL}/blog`,
    utmSource: 'email',
    utmMedium: 'newsletter',
    description: 'Blog post (append slug as needed)'
  },

  // Account/Settings
  dashboard: {
    id: 'dashboard',
    url: `${BASE_URL}/studio`,
    utmSource: 'email',
    utmMedium: 'transactional',
    description: 'User dashboard/app (logged-in users)'
  },

  preferences: {
    id: 'preferences',
    url: `${BASE_URL}/email-preferences`,
    utmSource: 'email',
    utmMedium: 'transactional',
    description: 'Email preferences/settings'
  },

  unsubscribe: {
    id: 'unsubscribe',
    url: `${BASE_URL}/unsubscribe`,
    utmSource: 'email',
    utmMedium: 'transactional',
    description: 'Unsubscribe page'
  },

  // Social
  instagram: {
    id: 'instagram',
    url: 'https://instagram.com/ssasocial',
    utmSource: 'email',
    utmMedium: 'newsletter',
    description: 'Instagram profile'
  },

  // Support
  support: {
    id: 'support',
    url: `${BASE_URL}/support`,
    utmSource: 'email',
    utmMedium: 'transactional',
    description: 'Support/help center'
  }
}

/**
 * Build tracked URL with UTM parameters
 *
 * @param linkId - Link identifier from EMAIL_LINKS
 * @param campaignId - Campaign ID for tracking
 * @param userEmail - User email (for personalized unsubscribe links)
 * @param additionalParams - Additional URL parameters
 * @returns Fully formatted URL with UTM tracking
 */
export function buildTrackedUrl(
  linkId: keyof typeof EMAIL_LINKS,
  campaignId: string | number,
  userEmail?: string,
  additionalParams?: Record<string, string>
): string {
  const linkConfig = EMAIL_LINKS[linkId]
  if (!linkConfig) {
    console.warn(`[Link Library] Unknown link ID: ${linkId}`)
    return '#'
  }

  const url = new URL(linkConfig.url)

  // Add UTM parameters
  if (linkConfig.utmSource) {
    url.searchParams.set('utm_source', linkConfig.utmSource)
  }
  if (linkConfig.utmMedium) {
    url.searchParams.set('utm_medium', linkConfig.utmMedium)
  }
  url.searchParams.set('utm_campaign', String(campaignId))

  // Add email for unsubscribe/preferences
  if (userEmail && (linkId === 'unsubscribe' || linkId === 'preferences')) {
    url.searchParams.set('email', userEmail)
  }

  // Add any additional parameters
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  return url.toString()
}

/**
 * Process email HTML and replace link placeholders with tracked URLs
 *
 * Placeholders format: [link_blueprint]Click here[/link_blueprint]
 *
 * @param html - Email HTML content
 * @param campaignId - Campaign ID for tracking
 * @param userEmail - User email (optional, for personalized links)
 * @returns Processed HTML with tracked links
 */
export function processEmailLinks(
  html: string,
  campaignId: string | number,
  userEmail?: string
): string {
  let processed = html

  // Replace each link placeholder
  Object.keys(EMAIL_LINKS).forEach((linkId) => {
    const regex = new RegExp(`\\[link_${linkId}\\](.*?)\\[\\/link_${linkId}\\]`, 'g')

    processed = processed.replace(regex, (match, linkText) => {
      const trackedUrl = buildTrackedUrl(
        linkId as keyof typeof EMAIL_LINKS,
        campaignId,
        userEmail
      )
      return `<a href="${trackedUrl}">${linkText}</a>`
    })
  })

  return processed
}

/**
 * Validate email content for required links and proper formatting
 *
 * @param html - Email HTML content
 * @returns Array of validation issues (empty if valid)
 */
export function validateEmailLinks(html: string): string[] {
  const issues: string[] = []

  // Check for required links
  const requiredLinks = ['unsubscribe', 'preferences']
  requiredLinks.forEach((linkId) => {
    if (!html.includes(`link_${linkId}`) && !html.includes(`href=`)) {
      // Only warn if no links at all, might be using direct hrefs
      if (!html.includes('unsubscribe') && linkId === 'unsubscribe') {
        issues.push(`Missing required link: ${linkId}`)
      }
    }
  })

  // Check for unprocessed placeholders
  const unprocessedPlaceholders = html.match(/\[link_\w+\]/g)
  if (unprocessedPlaceholders) {
    issues.push(`Unprocessed link placeholders found: ${unprocessedPlaceholders.join(', ')}`)
  }

  // Check for unprocessed variables
  const unprocessedVars = html.match(/\{\{[^}]+\}\}/g)
  if (unprocessedVars) {
    issues.push(`Unprocessed template variables found: ${unprocessedVars.join(', ')}`)
  }

  // Check for UTM tracking on links
  if (html.includes('href=') && !html.includes('utm_campaign=')) {
    issues.push('Links missing UTM tracking parameters')
  }

  // Validate URLs are properly formed
  const urlRegex = /href="([^"]+)"/g
  const urls = [...html.matchAll(urlRegex)].map(m => m[1])

  urls.forEach((url) => {
    if (url === '#' || url === '') {
      issues.push('Empty or placeholder href found')
      return
    }

    // Skip anchor links
    if (url.startsWith('#')) return

    try {
      new URL(url)
    } catch {
      issues.push(`Invalid URL found: ${url}`)
    }
  })

  return issues
}

/**
 * Get all available link IDs for documentation/reference
 */
export function getAvailableLinks(): LinkConfig[] {
  return Object.values(EMAIL_LINKS)
}
