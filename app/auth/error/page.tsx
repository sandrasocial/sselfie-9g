import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LIVE_MEMBER_APP_PATH,
  normalizeLegacyStudioRedirect,
  sanitizeRedirect,
} from "@/lib/security/url-validator"
import Link from "next/link"

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const params = await searchParams
  const safeNext = normalizeLegacyStudioRedirect(
    sanitizeRedirect(params.next, LIVE_MEMBER_APP_PATH)
  )
  const recoveryHref = `/auth/forgot-password?next=${encodeURIComponent(safeNext)}`
  const isPromptVaultRecovery = safeNext === "/prompt-vault"

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[color:var(--app-bg-primary)] p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl uppercase tracking-[0.08em]">
              This link is no longer working.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 text-sm leading-6 text-[color:var(--color-smoke)]">
              <p>Your purchase is safe.</p>
              {isPromptVaultRecovery ? (
                <p>
                  Prompt Vault does not need a password. Open your private access email, or use
                  purchase access below.
                </p>
              ) : (
                <p>Password links expire for security. Ask for a fresh one below.</p>
              )}
            </div>
            <div className="grid gap-3">
              {!isPromptVaultRecovery && (
                <Link
                  href={recoveryHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-5 text-xs font-medium uppercase tracking-[0.16em] text-white"
                >
                  Send a fresh password link
                </Link>
              )}
              <Link
                href="/access"
                className={
                  isPromptVaultRecovery
                    ? "inline-flex min-h-11 items-center justify-center rounded-full bg-black px-5 text-xs font-medium uppercase tracking-[0.16em] text-white"
                    : "inline-flex min-h-11 items-center justify-center rounded-full border border-black/20 px-5 text-xs font-medium uppercase tracking-[0.16em] text-black"
                }
              >
                Open my purchase
              </Link>
            </div>
            <p className="text-xs leading-5 text-[color:var(--color-smoke)]">
              Still stuck? Email{" "}
              <a className="underline" href="mailto:support@sselfie.ai">
                support@sselfie.ai
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
