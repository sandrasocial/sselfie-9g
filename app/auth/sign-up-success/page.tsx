import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle2, Mail } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[color:var(--app-bg-primary)] p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-4 pb-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-input-bg)]">
              <Mail className="h-8 w-8 text-[color:var(--color-whisper)]" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl uppercase tracking-[0.08em]">Check Your Email</CardTitle>
              <CardDescription>We&apos;ve sent you a confirmation link</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex gap-3 rounded-xl border border-[color:var(--glass-border-subtle)] bg-[color:var(--glass-input-bg)] p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[color:var(--color-whisper)]" />
                <p className="text-sm leading-relaxed text-[color:var(--color-smoke)]">
                  Click the confirmation link in your email to activate your account. Once confirmed, you&apos;ll be ready to
                  start creating professional selfies.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.12em] text-[color:var(--color-porcelain)]">
                  What&apos;s Next?
                </p>
                <p className="text-sm leading-relaxed text-[color:var(--color-smoke)]">
                  After confirming your email, start with the Selfie Guide or join the SUITE when you&apos;re ready for Maya.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild className="h-12 w-full">
                <Link href="/selfie-guide">
                  Start With The Selfie Guide
                </Link>
              </Button>
              <p className="mt-3 text-center text-xs text-[color:var(--color-smoke)]">
                Already confirmed?{" "}
                <Link href="/auth/login" className="text-[color:var(--color-whisper)] underline underline-offset-2">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
