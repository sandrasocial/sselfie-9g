import type { Metadata } from "next"
import { TransformLanding } from "@/components/transform/transform-landing"

export const metadata: Metadata = {
  title: "SSELFIE Transform",
  description:
    "Upload your selfie, choose an aesthetic, and get a polished editorial edit you can post today.",
}

export default async function TransformPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const params = await searchParams
  const checkoutError = params.checkout === "error" || params.checkout === "failed"
  return <TransformLanding checkoutError={checkoutError} />
}
