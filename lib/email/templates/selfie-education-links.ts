const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
  .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
  .replace(/\/+$/, "")

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

export function academyLibraryUrl() {
  return `${SITE_URL}/academy`
}

export function academyStarterKitUrl() {
  return `${SITE_URL}/academy/access/starter-kit`
}

export function studioLandingUrl() {
  return `${SITE_URL}/join/studio`
}

export function workWithMeUrl() {
  return `${SITE_URL}/work-with-me`
}

export function promptVaultLandingUrl() {
  return `${SITE_URL}/prompt-vault`
}

export function promptVaultCheckoutUrl() {
  return `${SITE_URL}/checkout/prompt-vault`
}
