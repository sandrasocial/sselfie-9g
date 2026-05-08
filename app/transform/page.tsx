import type { Metadata } from "next"
import { TransformLanding } from "@/components/transform/transform-landing"

export const metadata: Metadata = {
  title: "SSELFIE Edit Studio",
  description:
    "Upload your photo, choose a professional edit finish, and download a polished result that still looks like you.",
}

export default async function TransformPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; reason?: string }>
}) {
  const params = await searchParams
  const checkoutError = params.checkout === "error" || params.checkout === "failed"
  const checkoutErrorReason = params.reason ?? null
  return <TransformLanding checkoutError={checkoutError} checkoutErrorReason={checkoutErrorReason} />
}
