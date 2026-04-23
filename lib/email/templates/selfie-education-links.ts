const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function starterKitLandingUrl() {
  return `${SITE_URL}/starter-kit`
}

export function starterKitCheckoutUrl() {
  return `${SITE_URL}/checkout/starter-kit`
}

export function masterclassLandingUrl() {
  return `${SITE_URL}/masterclass`
}

export function masterclassCheckoutUrl() {
  return `${SITE_URL}/checkout/masterclass`
}

export function studioLandingUrl() {
  return `${SITE_URL}/join/studio`
}

export function workWithMeUrl() {
  return `${SITE_URL}/work-with-me`
}
