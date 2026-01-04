/**
 * Google Analytics 4 Event Tracking
 * 
 * Helper functions for tracking user interactions and events
 */

// Extend Window interface for gtag
declare global {
  interface Window {
    dataLayer: any[]
    gtag: (...args: any[]) => void
    fbq?: (...args: any[]) => void
  }
}

/**
 * Track a custom event in Google Analytics 4
 * 
 * @param eventName - Name of the event (e.g., 'cta_click', 'pricing_view')
 * @param params - Optional event parameters
 * 
 * @example
 * trackEvent('cta_click', {
 *   button_location: 'hero',
 *   button_text: 'GET STARTED'
 * })
 */
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return

  // Google Analytics 4
  if (window.gtag) {
    window.gtag("event", eventName, params)
    console.log(`[Analytics] Tracked event: ${eventName}`, params)
  } else {
    console.warn(`[Analytics] gtag not loaded, event not tracked: ${eventName}`)
  }
}

/**
 * Track Facebook Pixel event
 * 
 * @param eventName - Name of the Facebook Pixel event
 * @param params - Optional event parameters
 * 
 * @example
 * trackFacebookEvent('Lead', {
 *   content_name: 'Free Guide',
 *   value: 0
 * })
 */
export const trackFacebookEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return

  if (window.fbq) {
    window.fbq("track", eventName, params)
    console.log(`[Facebook Pixel] Tracked event: ${eventName}`, params)
  } else {
    console.warn(`[Facebook Pixel] fbq not loaded, event not tracked: ${eventName}`)
  }
}

/**
 * Track page view (usually automatic, but can be called manually for SPA navigation)
 */
export const trackPageView = (url: string) => {
  if (typeof window === "undefined") return

  if (window.gtag) {
    window.gtag("config", process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "", {
      page_path: url,
    })
  }
}

/**
 * Track CTA button click
 */
export const trackCTAClick = (location: string, buttonText: string, destination?: string) => {
  trackEvent("cta_click", {
    button_location: location,
    button_text: buttonText,
    destination: destination,
  })
  trackFacebookEvent("Lead", {
    content_name: buttonText,
    content_category: location,
  })
}

/**
 * Track pricing section view
 */
export const trackPricingView = () => {
  trackEvent("pricing_view", {
    section: "pricing",
  })
  trackFacebookEvent("ViewContent", {
    content_name: "Pricing Section",
    content_category: "Pricing",
  })
}

/**
 * Track checkout start
 */
export const trackCheckoutStart = (productType: string, value?: number) => {
  trackEvent("checkout_start", {
    product_type: productType,
    value: value,
    currency: "USD",
  })
  trackFacebookEvent("InitiateCheckout", {
    content_name: productType,
    value: value,
    currency: "USD",
  })
}

/**
 * Track email signup
 */
export const trackEmailSignup = (source: string, formType: string) => {
  trackEvent("email_signup", {
    source: source,
    form_type: formType,
  })
  trackFacebookEvent("Lead", {
    content_name: formType,
    content_category: source,
  })
}

/**
 * Track social media link click
 */
export const trackSocialClick = (platform: string, destination: string) => {
  trackEvent("social_click", {
    platform: platform,
    destination: destination,
  })
}

/**
 * Track purchase completion
 */
export const trackPurchase = (value: number, currency: string = "USD", items?: any[]) => {
  trackEvent("purchase", {
    value: value,
    currency: currency,
    items: items,
  })
  trackFacebookEvent("Purchase", {
    value: value,
    currency: currency,
  })
}
