import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-black">
      <div className="w-full max-w-sm">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Check Your Email</CardTitle>
            <CardDescription className="text-zinc-400">We&apos;ve sent you a confirmation link</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-300">
              Please check your email and click the confirmation link to activate your account. Once confirmed, you can
              sign in and start creating.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
