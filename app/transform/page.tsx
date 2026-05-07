import type { Metadata } from "next"
import { TransformLanding } from "@/components/transform/transform-landing"

export const metadata: Metadata = {
  title: "SSELFIE Transform",
  description:
    "Upload your selfie. Pick today's style. See yourself transformed in 30 seconds. Professional editorial photos — no camera crew, no studio.",
}

export default function TransformPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  return <TransformLanding />
}
