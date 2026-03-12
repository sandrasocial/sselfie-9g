const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{3,32}$/

export const REFERRAL_COOKIE_NAME = "sselfie_referral"

type SearchParamsLike =
  | URLSearchParams
  | ReadonlyURLSearchParams
  | { get(name: string): string | null }
  | null
  | undefined

type CallbackUrlOptions = {
  referralCode?: string | null
  utmSource?: string | null
}

type AuthHrefOptions = {
  referralCode?: string | null
  returnTo?: string
}

interface ReadonlyURLSearchParams {
  get(name: string): string | null
}

export function normalizeReferralCode(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim().toUpperCase()

  if (!REFERRAL_CODE_PATTERN.test(normalized)) {
    return null
  }

  return normalized
}

export function appendReferralParam(path: string, referralCode?: string | null): string {
  const normalizedReferralCode = normalizeReferralCode(referralCode)

  if (!normalizedReferralCode) {
    return path
  }

  const isAbsoluteUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(path)
  const url = new URL(path, isAbsoluteUrl ? undefined : "https://sselfie.ai")

  url.searchParams.set("ref", normalizedReferralCode)

  if (isAbsoluteUrl) {
    return url.toString()
  }

  return `${url.pathname}${url.search}${url.hash}`
}

export function buildReferralLoginHref(options: AuthHrefOptions = {}): string {
  return buildAuthHref("/auth/login", options)
}

export function buildReferralSignUpHref(options: AuthHrefOptions = {}): string {
  return buildAuthHref("/auth/sign-up", options)
}

export function buildReferralCallbackUrl(origin: string, options: CallbackUrlOptions = {}): string {
  const url = new URL("/auth/callback", origin)
  const normalizedReferralCode = normalizeReferralCode(options.referralCode)

  if (normalizedReferralCode) {
    url.searchParams.set("ref", normalizedReferralCode)
  }

  if (options.utmSource) {
    url.searchParams.set("utm_source", options.utmSource)
  }

  return url.toString()
}

export function readReferralCodeFromCookie(cookieHeader?: string | null): string | null {
  if (typeof cookieHeader !== "string" || cookieHeader.trim().length === 0) {
    return null
  }

  const cookieValue = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${REFERRAL_COOKIE_NAME}=`))
    ?.slice(REFERRAL_COOKIE_NAME.length + 1)

  return normalizeReferralCode(cookieValue || null)
}

export function getReferralCodeFromSearchParams(searchParams?: SearchParamsLike): string | null {
  if (!searchParams || typeof searchParams.get !== "function") {
    return null
  }

  return normalizeReferralCode(searchParams.get("ref"))
}

export function getReferralCodeFromBrowser(searchParams?: SearchParamsLike): string | null {
  const fromQuery = getReferralCodeFromSearchParams(searchParams)

  if (fromQuery) {
    return fromQuery
  }

  if (typeof document === "undefined") {
    return null
  }

  return readReferralCodeFromCookie(document.cookie)
}

export function persistReferralCode(referralCode?: string | null): void {
  const normalizedReferralCode = normalizeReferralCode(referralCode)

  if (!normalizedReferralCode || typeof document === "undefined") {
    return
  }

  document.cookie = `${REFERRAL_COOKIE_NAME}=${normalizedReferralCode}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`
}

function buildAuthHref(basePath: string, options: AuthHrefOptions = {}): string {
  const url = new URL(basePath, "https://sselfie.ai")

  if (options.returnTo) {
    url.searchParams.set("returnTo", options.returnTo)
  }

  const normalizedReferralCode = normalizeReferralCode(options.referralCode)
  if (normalizedReferralCode) {
    url.searchParams.set("ref", normalizedReferralCode)
  }

  return `${url.pathname}${url.search}${url.hash}`
}
