import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle2, Mail } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6 bg-stone-50">
      <div className="w-full max-w-md">
        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
              <Mail className="w-8 h-8 text-stone-600" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-serif text-stone-900">Check Your Email</CardTitle>
              <CardDescription className="text-stone-600">We&apos;ve sent you a confirmation link</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex gap-3 p-4 bg-stone-50 rounded-lg border border-stone-100">
                <CheckCircle2 className="w-5 h-5 text-stone-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-stone-700 leading-relaxed">
                  Click the confirmation link in your email to activate your account. Once confirmed, you&apos;ll be ready to
                  start creating professional selfies.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <p className="text-sm font-medium text-stone-900">What&apos;s Next?</p>
                <p className="text-sm text-stone-600 leading-relaxed">
                  After confirming your email, you can purchase a One-Time Session ($24.50) to start creating your
                  professional feed with our AI photo generator.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/checkout/one-time" className="w-full">
                <Button className="w-full bg-stone-900 text-white hover:bg-stone-800 h-12">
                  View Pricing & Get Started
                </Button>
              </Link>
              <p className="text-xs text-center text-stone-500 mt-3">
                Already confirmed?{" "}
                <Link href="/auth/login" className="text-stone-900 underline underline-offset-2">
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
